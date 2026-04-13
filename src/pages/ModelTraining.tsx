import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, Brain, CheckCircle, Loader2, AlertCircle, X, BookOpen, Sparkles } from "lucide-react";
import {
  DISEASE_CLASSES,
  type DiseaseClass,
  type TrainingSample,
  type TrainingProgress,
  trainModel,
  hasTrainedModel,
  deleteTrainedModel,
} from "@/lib/ml-model";
import { generateSyntheticSamples, SAMPLES_PER_CLASS } from "@/lib/synthetic-samples";

type SampleStore = Record<DiseaseClass, HTMLCanvasElement[]>;

const CLASS_COLORS: Record<DiseaseClass, string> = {
  "Healthy": "border-green-500/40 bg-green-500/10 text-green-400",
  "Leaf Spot Symptoms Detected": "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  "Bacterial Blight / Late Blight": "border-red-500/40 bg-red-500/10 text-red-400",
  "Mild Leaf Stress": "border-orange-500/40 bg-orange-500/10 text-orange-400",
  "Rust / Fungal Infection": "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

const CLASS_DESC: Record<DiseaseClass, string> = {
  "Healthy": "Upload images of healthy green leaves with no spots or discoloration",
  "Leaf Spot Symptoms Detected": "Upload images with yellow/brown circular spots on leaves",
  "Bacterial Blight / Late Blight": "Upload images with brown necrotic patches or water-soaked lesions",
  "Mild Leaf Stress": "Upload images with slight yellowing or early stress signs",
  "Rust / Fungal Infection": "Upload images with orange/rust-colored powdery patches",
};

const MIN_SAMPLES = 3;

const ModelTraining = () => {
  const [samples, setSamples] = useState<SampleStore>(() =>
    Object.fromEntries(DISEASE_CLASSES.map((c) => [c, []])) as SampleStore
  );
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [trained, setTrained] = useState(hasTrainedModel);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [generating, setGenerating] = useState(false);

  // auto-generate and train on first load if no model exists
  useEffect(() => {
    if (!trained && !training) {
      void (async () => {
        setGenerating(true);
        await new Promise((r) => setTimeout(r, 100));
        const next = {} as SampleStore;
        for (const label of DISEASE_CLASSES) {
          next[label] = generateSyntheticSamples(label);
        }
        setSamples(next);
        setGenerating(false);

        // auto start training
        const allSamples: TrainingSample[] = [];
        for (const label of DISEASE_CLASSES) {
          for (const canvas of next[label]) {
            allSamples.push({ canvas, label });
          }
        }
        allSamples.sort(() => Math.random() - 0.5);
        setTraining(true);
        setError(null);
        setProgress(null);
        try {
          await trainModel(allSamples, (p) => setProgress(p));
          setTrained(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Training failed.");
        } finally {
          setTraining(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSamples = Object.values(samples).reduce((s, arr) => s + arr.length, 0);
  const classesWithEnough = DISEASE_CLASSES.filter((c) => samples[c].length >= MIN_SAMPLES).length;
  const canTrain = classesWithEnough >= 2 && totalSamples >= MIN_SAMPLES * 2;

  const handleFiles = useCallback((files: FileList, label: DiseaseClass) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 224, 224);
        URL.revokeObjectURL(url);
        setSamples((prev) => ({ ...prev, [label]: [...prev[label], canvas] }));
      };
      img.src = url;
    });
  }, []);

  const removeImage = (label: DiseaseClass, index: number) => {
    setSamples((prev) => ({
      ...prev,
      [label]: prev[label].filter((_, i) => i !== index),
    }));
  };

  const handleTrain = async () => {
    setTraining(true);
    setError(null);
    setProgress(null);
    try {
      const allSamples: TrainingSample[] = [];
      for (const label of DISEASE_CLASSES) {
        for (const canvas of samples[label]) {
          allSamples.push({ canvas, label });
        }
      }
      // shuffle
      allSamples.sort(() => Math.random() - 0.5);

      await trainModel(allSamples, (p) => setProgress(p));
      setTrained(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Training failed. Try again.");
    } finally {
      setTraining(false);
    }
  };

  const handleDelete = () => {
    deleteTrainedModel();
    setTrained(false);
    setProgress(null);
  };

  const handleGenerateSamples = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const next = { ...samples };
      for (const label of DISEASE_CLASSES) {
        next[label] = generateSyntheticSamples(label);
      }
      setSamples(next);
      setGenerating(false);
    }, 50);
  }, [samples]);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Model Training</h1>
        <p className="text-muted-foreground">
          Upload sample leaf images for each disease class to train the AI detection model. Minimum {MIN_SAMPLES} images per class.
        </p>
      </div>

      {/* status banner */}
      {trained && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="font-semibold text-green-400">Trained model is active</p>
              <p className="text-sm text-muted-foreground">Detection page is now using your trained model instead of pixel heuristics.</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete model
          </button>
        </motion.div>
      )}

      {/* instructions */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          How to train
        </div>
        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li>1. Upload at least <strong className="text-foreground">{MIN_SAMPLES} images</strong> for each disease class below</li>
          <li>2. More images = better accuracy (10–20 per class recommended)</li>
          <li>3. Use clear, well-lit photos of actual plant leaves</li>
          <li>4. Click <strong className="text-foreground">Train Model</strong> — training runs in your browser (no internet needed)</li>
          <li>5. After training, go to <strong className="text-foreground">Detection</strong> page — it will use your trained model</li>
        </ol>
      </div>

      {/* class upload cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {DISEASE_CLASSES.map((label) => (
          <div key={label} className={`rounded-2xl border p-4 ${CLASS_COLORS[label]}`}>
            <div className="mb-1 font-semibold">{label}</div>
            <p className="mb-3 text-xs opacity-75">{CLASS_DESC[label]}</p>

            {/* image thumbnails */}
            {samples[label].length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {samples[label].map((canvas, i) => (
                  <div key={i} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-white/20">
                    <img src={canvas.toDataURL("image/png")} alt={`${label} training sample ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImage(label, i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">
                {samples[label].length} image{samples[label].length !== 1 ? "s" : ""}
                {samples[label].length > 0 && samples[label].length < MIN_SAMPLES && (
                  <span className="ml-1 text-yellow-400">({MIN_SAMPLES - samples[label].length} more needed)</span>
                )}
                {samples[label].length >= MIN_SAMPLES && (
                  <span className="ml-1 text-green-400">✓ ready</span>
                )}
              </span>
              <button
                onClick={() => fileInputRefs.current[label]?.click()}
                disabled={training}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Add images
              </button>
            </div>

            <input
              ref={(el) => { fileInputRefs.current[label] = el; }}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files, label); e.target.value = ""; }}
            />
          </div>
        ))}
      </div>

      {/* training progress */}
      {training && progress && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Training... Epoch {progress.epoch} / {progress.totalEpochs}
          </div>
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-background/50">
            <motion.div
              animate={{ width: `${(progress.epoch / progress.totalEpochs) * 100}%` }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>Loss: <strong className="text-foreground">{progress.loss}</strong></span>
            <span>Accuracy: <strong className="text-foreground">{progress.accuracy}%</strong></span>
          </div>
        </div>
      )}

      {/* error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* train button */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => void handleGenerateSamples()}
          disabled={generating || training}
          className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-6 py-3 font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {generating ? "Generating..." : `Auto-Generate ${SAMPLES_PER_CLASS} Samples Per Class`}
        </button>
        <button
          onClick={() => void handleTrain()}
          disabled={!canTrain || training}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.28)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
        >
          {training ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
          {training ? `Training... (${progress?.epoch ?? 0}/${progress?.totalEpochs ?? 30})` : "Train Model"}
        </button>
        {!canTrain && !training && (
          <p className="text-sm text-muted-foreground">
            Need at least {MIN_SAMPLES} images in {2} classes to start training.
            Currently: {classesWithEnough} class{classesWithEnough !== 1 ? "es" : ""} ready.
          </p>
        )}
      </div>
    </div>
  );
};

export default ModelTraining;
