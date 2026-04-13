import { RefObject, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, Upload, Video, VideoOff } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface CameraFeedProps {
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraReady: boolean;
  cameraError: string | null;
  scanning: boolean;
  capturedFrame: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCapture: () => void;
  onUpload: (file: File) => void;
}

const CameraFeed = ({
  cameraActive,
  cameraLoading,
  cameraReady,
  cameraError,
  scanning,
  capturedFrame,
  videoRef,
  canvasRef,
  onStartCamera,
  onStopCamera,
  onCapture,
  onUpload,
}: CameraFeedProps) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showCameraViewport = cameraActive || cameraLoading;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Camera className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t("camera.title")}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {showCameraViewport && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
          <span className="text-xs font-mono text-muted-foreground">
            {scanning
              ? t("camera.analyzing")
              : cameraLoading
                ? t("camera.connecting")
                : cameraReady
                  ? t("camera.live")
                  : cameraActive
                    ? t("camera.starting")
                    : t("camera.off")}
          </span>
        </span>
      </div>

      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
        <canvas ref={canvasRef} className="hidden" />

        {showCameraViewport ? (
          <>
            <video
              ref={videoRef}
              className={`h-full w-full object-cover bg-black ${capturedFrame && scanning ? "hidden" : ""} ${cameraReady ? "opacity-100" : "opacity-0"}`}
              playsInline
              muted
              autoPlay
            />
            {capturedFrame && scanning && (
              <img src={capturedFrame} alt="Captured leaf frame being analyzed for disease" className="h-full w-full object-cover" />
            )}
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-6 text-center">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">{t("camera.startingPreview")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("camera.allowCamera")}</p>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <Camera className="mx-auto mb-3 h-16 w-16 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("camera.clickStart")}</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-destructive/20 bg-background/95 px-3 py-2 text-sm text-destructive shadow-sm">
            {cameraError}
          </div>
        )}

        {scanning && (
          <motion.div
            initial={{ top: 0 }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute left-0 right-0 h-0.5 bg-primary/60"
          />
        )}

        {showCameraViewport && !scanning && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-4 top-4 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-primary/50" />
            <div className="absolute right-4 top-4 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-primary/50" />
            <div className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-primary/50" />
            <div className="absolute bottom-4 right-4 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-primary/50" />
          </div>
        )}
      </div>

      <div className="flex gap-2 p-4">
        {!cameraActive ? (
          <button
            onClick={onStartCamera}
            disabled={cameraLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {cameraLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            {cameraLoading ? t("camera.startStarting") : t("camera.startCamera")}
          </button>
        ) : (
          <>
            <button
              onClick={onCapture}
              disabled={scanning || !cameraReady}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {scanning ? t("camera.analyzingButton") : t("camera.scanPlant")}
            </button>
            <button
              onClick={onStopCamera}
              disabled={scanning}
              className="rounded-xl border border-border px-4 py-3 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <VideoOff className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* upload fallback */}
      <div className="border-t border-border px-4 pb-4 pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {t("camera.uploadFromGallery")}
        </button>
      </div>
    </motion.div>
  );
};

export default CameraFeed;
