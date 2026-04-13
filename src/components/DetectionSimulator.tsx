import { useState, useRef, useCallback, useEffect } from "react";
import CameraFeed from "./detection/CameraFeed";
import CropSelector from "./detection/CropSelector";
import ResultPanel from "./detection/ResultPanel";
import SmartFarmSuite from "./detection/SmartFarmSuite";
import { persistScanResult } from "@/lib/scan-api";
import { useI18n } from "@/components/I18nProvider";
import { useWeather } from "@/hooks/use-weather";
import { predictDisease, hasTrainedModel } from "@/lib/ml-model";
import { getCropById, type CropId } from "@/lib/agriculture-knowledge";
import type { DetectionCandidate, DetectionHotspot, DetectionResult } from "@/lib/detection-types";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const SELECTED_CROP_STORAGE_KEY = "agrispray-selected-crop";

const NON_DIAGNOSTIC_RESULTS = new Set([
  "Unable to Analyze",
  "Leaf Not Detected Clearly",
  "Image Overexposed",
  "Image Too Dark",
  "Image Blurry",
]);

// canonical spray decision based on disease name — single source of truth
const shouldSpray = (disease: string): boolean => {
  if (disease === "Healthy") return false;
  if (disease === "Image Blurry") return false;
  if (disease === "Image Too Dark") return false;
  if (disease === "Image Overexposed") return false;
  if (disease === "Leaf Not Detected Clearly") return false;
  if (disease === "Unable to Analyze") return false;
  return true; // all actual diseases → spray
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type CellStats = {
  sampled: number;
  leaf: number;
  vividGreen: number;
  yellow: number;
  brown: number;
  rust: number;
  stress: number;
};

const HOTSPOT_GRID_SIZE = 4;
const HOTSPOT_CELL_SIZE = 100 / HOTSPOT_GRID_SIZE;

const waitForFrame = async (video: HTMLVideoElement, t: TranslateFn) => {
  if ("requestVideoFrameCallback" in video) {
    await new Promise<void>((resolve) => { video.requestVideoFrameCallback(() => resolve()); });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const checkFrame = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { resolve(); return; }
      if (Date.now() - startedAt > 4000) { reject(new Error(t("cameraErrors.noFrames"))); return; }
      requestAnimationFrame(checkFrame);
    };
    checkFrame();
  });
};

const enhanceCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // gentle brightness boost only — do NOT stretch contrast (causes false disease signals)
  let totalL = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalL += (data[i] + data[i + 1] + data[i + 2]) / 3;
    count++;
  }
  const avgL = count > 0 ? totalL / count : 128;
  // only brighten if image is dark (avgL < 100), leave bright/normal images untouched
  if (avgL >= 80) return;
  const boost = Math.min(1.4, 100 / avgL);
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i]     * boost);
    data[i + 1] = Math.min(255, data[i + 1] * boost);
    data[i + 2] = Math.min(255, data[i + 2] * boost);
  }
  ctx.putImageData(imageData, 0, 0);
};

const analyzeCapturedLeaf = (canvas: HTMLCanvasElement, t: TranslateFn): Omit<DetectionResult, "capturedImage"> => {
  enhanceCanvas(canvas);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { disease: "Unable to Analyze", confidence: 0, spray: false, details: t("cameraErrors.processFrame") };

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cellWidth = width / HOTSPOT_GRID_SIZE;
  const cellHeight = height / HOTSPOT_GRID_SIZE;
  const cells: CellStats[] = Array.from({ length: HOTSPOT_GRID_SIZE * HOTSPOT_GRID_SIZE }, () => ({
    sampled: 0,
    leaf: 0,
    vividGreen: 0,
    yellow: 0,
    brown: 0,
    rust: 0,
    stress: 0,
  }));
  let sampledPixels = 0, leafPixels = 0, vividGreenPixels = 0;
  let brightPixels = 0, darkPixels = 0, yellowPixels = 0, brownPixels = 0, rustPixels = 0, stressedPixels = 0;
  let blurEnergy = 0, blurSamples = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const index = (y * width + x) * 4;
      const r = data[index], g = data[index + 1], b = data[index + 2], alpha = data[index + 3];
      if (alpha < 20) continue;
      const cellX = Math.min(HOTSPOT_GRID_SIZE - 1, Math.floor(x / cellWidth));
      const cellY = Math.min(HOTSPOT_GRID_SIZE - 1, Math.floor(y / cellHeight));
      const cell = cells[cellY * HOTSPOT_GRID_SIZE + cellX];
      sampledPixels++;
      cell.sampled++;
      if (g > 30 && g >= r * 0.8 && g >= b * 0.8) leafPixels++;
      if (g > 30 && g >= r * 0.8 && g >= b * 0.8) cell.leaf++;
      if (g > 60 && g > r * 1.1 && g > b * 1.05) vividGreenPixels++;
      if (g > 60 && g > r * 1.1 && g > b * 1.05) cell.vividGreen++;
      if (r + g + b > 600) brightPixels++;
      if (r + g + b < 90) darkPixels++;
      const isYellow = r > 160 && g > 130 && b < 80 && r > b * 2.2 && g > b * 1.8 && r > g * 0.85 && g < r * 1.1;
      const isBrown = r > 110 && g > 40 && g < 100 && b < 65 && r > g * 1.3 && r > b * 1.8;
      const isNecrotic = r < 70 && g < 60 && b < 50 && r > b;
      const isRust = r > 160 && g > 60 && g < 110 && b < 55 && r > g * 1.5;
      // only count as stressed if pixel is clearly NOT a healthy green pixel
      const isGreen = g > 80 && g > r * 1.1 && g > b * 1.1;
      const isStressed = !isGreen && (isYellow || isBrown || isNecrotic || isRust);
      if (isYellow) yellowPixels++;
      if (isYellow) cell.yellow++;
      if (isBrown || isNecrotic || isRust) brownPixels++;
      if (isBrown || isNecrotic || isRust) cell.brown++;
      if (isRust) rustPixels++;
      if (isRust) cell.rust++;
      if (isStressed) stressedPixels++;
      if (isStressed) cell.stress++;
      if (x > 0 && y > 0) {
        const li = index - 4, ti = index - width * 4 * 3;
        if (ti >= 0) {
          const lg = (data[li] + data[li + 1] + data[li + 2]) / 3;
          const tg = (data[ti] + data[ti + 1] + data[ti + 2]) / 3;
          blurEnergy += Math.abs((r + g + b) / 3 - lg) + Math.abs((r + g + b) / 3 - tg);
          blurSamples++;
        }
      }
    }
  }

  if (sampledPixels === 0) return { disease: "Unable to Analyze", confidence: 0, spray: false, details: t("cameraErrors.noVisibleData") };

  const leafRatio = leafPixels / sampledPixels;
  const vividGreenRatio = vividGreenPixels / sampledPixels;
  const stressRatio = stressedPixels / sampledPixels;
  const yellowRatio = yellowPixels / sampledPixels;
  const brownRatio = brownPixels / sampledPixels;
  const rustRatio = rustPixels / sampledPixels;
  const glareRatio = brightPixels / sampledPixels;
  const darkRatio = darkPixels / sampledPixels;
  const sharpness = blurSamples > 0 ? blurEnergy / blurSamples : 0;
  const affectedAreaPct = clamp(
    Math.round(Math.max(stressRatio, brownRatio + yellowRatio * 0.35, rustRatio * 1.25) * 100),
    0,
    95,
  );

  const rawCandidates = [
    {
      disease: "Healthy",
      score: clamp(vividGreenRatio * 1.4 + leafRatio * 0.4 - stressRatio * 1.2 - brownRatio * 1.1, 0.02, 2),
    },
    {
      disease: "Bacterial Blight / Late Blight",
      score: clamp(brownRatio * 1.45 + yellowRatio * 0.55 + stressRatio * 0.3, 0.02, 2),
    },
    {
      disease: "Leaf Spot Symptoms Detected",
      score: clamp(yellowRatio * 1.45 + brownRatio * 0.25 + leafRatio * 0.1, 0.02, 2),
    },
    {
      disease: "Mild Leaf Stress",
      score: clamp(stressRatio * 1.2 + Math.max(0, 0.55 - vividGreenRatio) * 0.75, 0.02, 2),
    },
    {
      disease: "Rust / Fungal Infection",
      score: clamp(rustRatio * 1.9 + brownRatio * 0.35 + stressRatio * 0.2, 0.02, 2),
    },
  ];
  const totalCandidateScore = rawCandidates.reduce((sum, item) => sum + item.score, 0.001);
  const candidates: DetectionCandidate[] = rawCandidates
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => ({
      disease: candidate.disease,
      confidence: clamp(Math.round((candidate.score / totalCandidateScore) * 100), candidate.disease === "Healthy" ? 24 : 18, 96),
    }));

  const hotspots: DetectionHotspot[] = cells
    .map((cell, index) => {
      const cellLeafRatio = cell.sampled > 0 ? cell.leaf / cell.sampled : 0;
      if (cellLeafRatio < 0.05) return null;
      const yellowCellRatio = cell.sampled > 0 ? cell.yellow / cell.sampled : 0;
      const brownCellRatio = cell.sampled > 0 ? cell.brown / cell.sampled : 0;
      const rustCellRatio = cell.sampled > 0 ? cell.rust / cell.sampled : 0;
      const stressCellRatio = cell.sampled > 0 ? cell.stress / cell.sampled : 0;
      const cellScores = [
        { disease: "Bacterial Blight / Late Blight", score: brownCellRatio * 1.35 + yellowCellRatio * 0.5 },
        { disease: "Leaf Spot Symptoms Detected", score: yellowCellRatio * 1.35 + brownCellRatio * 0.2 },
        { disease: "Mild Leaf Stress", score: stressCellRatio * 1.15 },
        { disease: "Rust / Fungal Infection", score: rustCellRatio * 1.75 + brownCellRatio * 0.25 },
      ].sort((left, right) => right.score - left.score);
      const topIssue = cellScores[0];
      if (!topIssue || topIssue.score < 0.12) return null;
      const x = index % HOTSPOT_GRID_SIZE;
      const y = Math.floor(index / HOTSPOT_GRID_SIZE);

      return {
        id: `hotspot-${index}`,
        left: x * HOTSPOT_CELL_SIZE,
        top: y * HOTSPOT_CELL_SIZE,
        width: HOTSPOT_CELL_SIZE,
        height: HOTSPOT_CELL_SIZE,
        severity: clamp(Math.round(topIssue.score * 120), 18, 97),
        dominantIssue: topIssue.disease,
      };
    })
    .filter((value): value is DetectionHotspot => Boolean(value))
    .sort((left, right) => right.severity - left.severity)
    .slice(0, 6);

  const enrich = (payload: Omit<DetectionResult, "capturedImage">): Omit<DetectionResult, "capturedImage"> => ({
    ...payload,
    candidates,
    hotspots,
    affectedAreaPct,
    analysisMode: "heuristic",
  });

  if (leafRatio < 0.06 && vividGreenRatio < 0.02 && stressRatio < 0.05)
    return enrich({ disease: "Leaf Not Detected Clearly", confidence: 28, spray: shouldSpray("Leaf Not Detected Clearly"), details: t("cameraErrors.noLeafDetected") });
  if (glareRatio > 0.80)
    return enrich({ disease: "Image Overexposed", confidence: 51, spray: shouldSpray("Image Overexposed"), details: t("cameraErrors.overexposed") });
  if (darkRatio > 0.85)
    return enrich({ disease: "Image Too Dark", confidence: 37, spray: shouldSpray("Image Too Dark"), details: t("cameraErrors.tooDark") });
  if (sharpness < 2)
    return enrich({ disease: "Image Blurry", confidence: 34, spray: shouldSpray("Image Blurry"), details: t("cameraErrors.blurry") });
  if (rustRatio > 0.08)
    return enrich({ disease: "Rust / Fungal Infection", confidence: clamp(Math.round(74 + rustRatio * 200), 74, 97), spray: shouldSpray("Rust / Fungal Infection"), details: t("cropIntel.genericDetails.rust") });
  if (brownRatio > 0.12 || (brownRatio > 0.06 && yellowRatio > 0.06))
    return enrich({ disease: "Bacterial Blight / Late Blight", confidence: clamp(Math.round(75 + brownRatio * 200), 76, 97), spray: shouldSpray("Bacterial Blight / Late Blight"), details: t("cropIntel.genericDetails.blight") });
  if (yellowRatio > 0.15)
    return enrich({ disease: "Leaf Spot Symptoms Detected", confidence: clamp(Math.round(72 + yellowRatio * 180), 74, 96), spray: shouldSpray("Leaf Spot Symptoms Detected"), details: t("cropIntel.genericDetails.leafSpot") });
  // only flag stress if leaf is NOT predominantly green
  if (stressRatio > 0.20 && vividGreenRatio < 0.50)
    return enrich({ disease: "Mild Leaf Stress", confidence: clamp(Math.round(65 + stressRatio * 150), 66, 88), spray: shouldSpray("Mild Leaf Stress"), details: t("cropIntel.genericDetails.stress") });
  return enrich({ disease: "Healthy", confidence: clamp(Math.round(80 + vividGreenRatio * 60 - stressRatio * 100), 72, 97), spray: shouldSpray("Healthy"), details: t("cropIntel.genericDetails.healthy") });
};

const DetectionSimulator = () => {
  const { language, t } = useI18n();
  const { coordinates, weather, loading: weatherLoading, error: weatherError, fetchWeatherForCoords } = useWeather(language);
  const [selectedCropId, setSelectedCropId] = useState<CropId | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SELECTED_CROP_STORAGE_KEY);
    return raw ? (raw as CropId) : null;
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) throw new Error(t("cameraErrors.previewUnavailable"));
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error(t("cameraErrors.loadPreview"))); };
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("canplay", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
        video.addEventListener("canplay", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
      });
    }
    await video.play();
    await waitForFrame(video, t);
  }, [t]);

  const startCamera = useCallback(async () => {
    if (cameraLoading) return;
    setCameraActive(true); setCameraLoading(true); setCameraError(null);
    setResult(null); setCapturedFrame(null); setCameraReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("cameraErrors.unsupportedBrowser"));
      stopStream();
      const constraints: MediaStreamConstraints[] = [
        { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: true },
      ];
      let stream: MediaStream | null = null;
      let lastError: unknown = null;
      for (const c of constraints) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) { lastError = e; }
      }
      if (!stream) throw lastError instanceof Error ? lastError : new Error(t("cameraErrors.accessRequired"));
      streamRef.current = stream;
      await attachStreamToVideo(stream);
      setCameraReady(true);
    } catch (err) {
      stopStream();
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false); setCameraReady(false);
      setCameraError(err instanceof Error ? err.message : t("cameraErrors.accessRequired"));
    } finally {
      setCameraLoading(false);
    }
  }, [attachStreamToVideo, cameraLoading, stopStream, t]);

  const stopCamera = useCallback(() => {
    stopStream();
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false); setCameraLoading(false); setCameraReady(false); setScanning(false);
  }, [stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedCropId) {
      window.localStorage.removeItem(SELECTED_CROP_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SELECTED_CROP_STORAGE_KEY, selectedCropId);
  }, [selectedCropId]);

  useEffect(() => {
    if (weatherError && !coordinates) setCameraError(t("result.geolocationError"));
  }, [coordinates, t, weatherError]);

  const runAnalysis = useCallback(async (canvas: HTMLCanvasElement, dataUrl: string) => {
    const heuristic = analyzeCapturedLeaf(canvas, t);
    if (NON_DIAGNOSTIC_RESULTS.has(heuristic.disease)) {
      setCameraError(heuristic.details);
      setResult(null);
      setScanning(false);
      return;
    }

    // use trained ML model if available, but keep heuristic hotspots and multi-issue context
    if (hasTrainedModel()) {
      try {
        const mlResult = await predictDisease(canvas);
        if (mlResult) {
          const candidateMap = new Map(
            (heuristic.candidates ?? []).map((candidate) => [candidate.disease, candidate.confidence]),
          );
          candidateMap.set(mlResult.disease, Math.max(candidateMap.get(mlResult.disease) ?? 0, mlResult.confidence));
          const mergedCandidates = [...candidateMap.entries()]
            .map(([disease, confidence]) => ({ disease, confidence }))
            .sort((left, right) => right.confidence - left.confidence)
            .slice(0, 3);
          const nextResult: DetectionResult = {
            ...mlResult,
            capturedImage: dataUrl,
            candidates: mergedCandidates,
            hotspots: heuristic.hotspots,
            affectedAreaPct: heuristic.affectedAreaPct,
            analysisMode: "ml-assisted",
          };
          await persistScanResult(nextResult);
          setResult(nextResult);
          setScanning(false);
          return;
        }
      } catch { /* fall through */ }
    }

    try {
      const nextResult: DetectionResult = { ...heuristic, capturedImage: dataUrl };
      await persistScanResult(nextResult);
      setResult(nextResult);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : t("cameraErrors.saveFailed"));
      setResult(null);
    } finally {
      setScanning(false);
    }
  }, [t]);

  const captureAndAnalyze = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError(t("cameraErrors.waitPreview"));
      return;
    }
    const sourceSize = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = (video.videoWidth - sourceSize) / 2;
    const sourceY = (video.videoHeight - sourceSize) / 2;
    canvas.width = sourceSize; canvas.height = sourceSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
    const dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length < 1000) { setCameraError(t("cameraErrors.emptyCapture")); return; }
    setCameraError(null); setCapturedFrame(dataUrl); setScanning(true); setResult(null);
    void runAnalysis(canvas, dataUrl);
  }, [cameraReady, runAnalysis, t]);

  const handleUpload = useCallback((file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = Math.min(img.width, img.height);
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      // validate it's a safe data URL before using
      if (!dataUrl.startsWith("data:image/")) {
        setCameraError(t("cameraErrors.invalidImageFormat"));
        return;
      }
      setCameraError(null); setCapturedFrame(dataUrl); setScanning(true); setResult(null); setCameraActive(false);
      void runAnalysis(canvas, dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setCameraError(t("cameraErrors.couldNotLoadImage")); };
    img.src = url;
  }, [runAnalysis, t]);

  const selectedCrop = getCropById(selectedCropId);

  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <CropSelector selectedCropId={selectedCropId} onSelectCrop={setSelectedCropId} />
        <div className="grid gap-8 md:grid-cols-2">
          <CameraFeed
            cameraActive={cameraActive}
            cameraLoading={cameraLoading}
            cameraReady={cameraReady}
            cameraError={cameraError}
            scanning={scanning}
            capturedFrame={capturedFrame}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCapture={captureAndAnalyze}
            onUpload={handleUpload}
          />
          <ResultPanel
            result={result}
            selectedCrop={selectedCrop}
            scanning={scanning}
            weather={weather}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            coordinates={coordinates}
            onLocationChange={fetchWeatherForCoords}
          />
        </div>
        <SmartFarmSuite
          result={result}
          selectedCrop={selectedCrop}
          weather={weather}
          coordinates={coordinates}
        />
      </div>
    </div>
  );
};

export default DetectionSimulator;
