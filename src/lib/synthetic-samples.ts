import type { DiseaseClass } from "./ml-model";

// generates a synthetic 224x224 canvas for a given disease class
const generateSample = (label: DiseaseClass, seed: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d")!;

  // seeded pseudo-random
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  // base leaf color per class
  const baseColors: Record<DiseaseClass, [number, number, number]> = {
    "Healthy":                        [45 + rand() * 30,  120 + rand() * 40, 35 + rand() * 20],
    "Leaf Spot Symptoms Detected":    [80 + rand() * 40,  130 + rand() * 30, 30 + rand() * 20],
    "Bacterial Blight / Late Blight": [90 + rand() * 30,  70 + rand() * 30,  20 + rand() * 15],
    "Mild Leaf Stress":               [100 + rand() * 30, 130 + rand() * 30, 25 + rand() * 20],
    "Rust / Fungal Infection":        [140 + rand() * 30, 80 + rand() * 20,  20 + rand() * 15],
  };

  const [br, bg, bb] = baseColors[label];

  // fill background (soil/background)
  ctx.fillStyle = `rgb(${30 + rand() * 20}, ${25 + rand() * 15}, ${15 + rand() * 10})`;
  ctx.fillRect(0, 0, 224, 224);

  // draw leaf shape (ellipse)
  const cx = 112 + (rand() - 0.5) * 20;
  const cy = 112 + (rand() - 0.5) * 20;
  const rx = 80 + rand() * 20;
  const ry = 95 + rand() * 15;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
  ctx.fill();
  ctx.restore();

  // add texture noise
  const imageData = ctx.getImageData(0, 0, 224, 224);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 18;
    data[i]     = Math.min(255, Math.max(0, data[i]     + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  // add disease-specific patches
  if (label === "Leaf Spot Symptoms Detected") {
    for (let i = 0; i < 8 + rand() * 6; i++) {
      const px = cx + (rand() - 0.5) * rx * 1.4;
      const py = cy + (rand() - 0.5) * ry * 1.4;
      const pr = 4 + rand() * 10;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.7 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${180 + rand() * 40}, ${140 + rand() * 30}, ${20 + rand() * 20}, 0.85)`;
      ctx.fill();
    }
  }

  if (label === "Bacterial Blight / Late Blight") {
    for (let i = 0; i < 5 + rand() * 4; i++) {
      const px = cx + (rand() - 0.5) * rx * 1.2;
      const py = cy + (rand() - 0.5) * ry * 1.2;
      const pr = 10 + rand() * 20;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.5 + rand() * 0.8), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${60 + rand() * 30}, ${40 + rand() * 20}, ${15 + rand() * 10}, 0.9)`;
      ctx.fill();
    }
  }

  if (label === "Mild Leaf Stress") {
    for (let i = 0; i < 12 + rand() * 8; i++) {
      const px = cx + (rand() - 0.5) * rx * 1.5;
      const py = cy + (rand() - 0.5) * ry * 1.5;
      const pr = 3 + rand() * 7;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${160 + rand() * 40}, ${160 + rand() * 30}, ${30 + rand() * 20}, 0.5)`;
      ctx.fill();
    }
  }

  if (label === "Rust / Fungal Infection") {
    for (let i = 0; i < 15 + rand() * 10; i++) {
      const px = cx + (rand() - 0.5) * rx * 1.4;
      const py = cy + (rand() - 0.5) * ry * 1.4;
      const pr = 3 + rand() * 8;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.6 + rand() * 0.8), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${180 + rand() * 50}, ${80 + rand() * 30}, ${10 + rand() * 15}, 0.88)`;
      ctx.fill();
    }
  }

  // add leaf veins
  ctx.strokeStyle = `rgba(${br * 0.7}, ${bg * 0.8}, ${bb * 0.6}, 0.4)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry * 0.9);
  ctx.lineTo(cx, cy + ry * 0.9);
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(cx, cy + i * ry * 0.25);
    ctx.lineTo(cx + (i > 0 ? 1 : -1) * rx * 0.7, cy + i * ry * 0.35);
    ctx.stroke();
  }

  return canvas;
};

export const SAMPLES_PER_CLASS = 15;

export const generateSyntheticSamples = (label: DiseaseClass): HTMLCanvasElement[] => {
  return Array.from({ length: SAMPLES_PER_CLASS }, (_, i) =>
    generateSample(label, (label.length * 31 + i * 97 + 1337))
  );
};
