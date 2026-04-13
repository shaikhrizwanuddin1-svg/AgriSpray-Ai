import * as tf from "@tensorflow/tfjs";

export type DiseaseClass =
  | "Healthy"
  | "Leaf Spot Symptoms Detected"
  | "Bacterial Blight / Late Blight"
  | "Mild Leaf Stress"
  | "Rust / Fungal Infection";

export const DISEASE_CLASSES: DiseaseClass[] = [
  "Healthy",
  "Leaf Spot Symptoms Detected",
  "Bacterial Blight / Late Blight",
  "Mild Leaf Stress",
  "Rust / Fungal Infection",
];

export const SPRAY_CLASSES = new Set<DiseaseClass>([
  "Leaf Spot Symptoms Detected",
  "Bacterial Blight / Late Blight",
  "Mild Leaf Stress",
  "Rust / Fungal Infection",
]);

// canonical spray decision — Healthy never sprays, all diseases spray
export const shouldSprayDisease = (disease: DiseaseClass): boolean =>
  disease !== "Healthy";

const MODEL_STORAGE_KEY = "agrispray-tfjs-model";
const IMAGE_SIZE = 224;

let mobileNet: tf.GraphModel | null = null;
let classifier: tf.LayersModel | null = null;

// load MobileNet feature extractor
export const loadMobileNet = async (): Promise<tf.GraphModel> => {
  if (mobileNet) return mobileNet;
  mobileNet = await tf.loadGraphModel(
    "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1",
    { fromTFHub: true }
  );
  return mobileNet;
};

// preprocess image canvas → tensor
export const imageToTensor = (canvas: HTMLCanvasElement): tf.Tensor4D => {
  return tf.tidy(() => {
    const img = tf.browser.fromPixels(canvas);
    const resized = tf.image.resizeBilinear(img, [IMAGE_SIZE, IMAGE_SIZE]);
    const normalized = resized.toFloat().div(255.0);
    return normalized.expandDims(0) as tf.Tensor4D;
  });
};

// extract MobileNet features from canvas
export const extractFeatures = async (canvas: HTMLCanvasElement): Promise<tf.Tensor2D> => {
  const net = await loadMobileNet();
  return tf.tidy(() => {
    const tensor = imageToTensor(canvas);
    const features = net.predict(tensor) as tf.Tensor;
    return features.squeeze() as tf.Tensor2D;
  });
};

// build classifier head
const buildClassifier = (numClasses: number): tf.LayersModel => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [1024], units: 128, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
};

export type TrainingSample = {
  canvas: HTMLCanvasElement;
  label: DiseaseClass;
};

export type TrainingProgress = {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
};

// train model on provided samples
export const trainModel = async (
  samples: TrainingSample[],
  onProgress: (p: TrainingProgress) => void
): Promise<void> => {
  const net = await loadMobileNet();
  const numClasses = DISEASE_CLASSES.length;
  const EPOCHS = 30;

  // extract features for all samples
  const featureArrays: number[][] = [];
  const labelArrays: number[][] = [];

  for (const sample of samples) {
    const tensor = imageToTensor(sample.canvas);
    const features = net.predict(tensor) as tf.Tensor;
    const featureData = await features.squeeze().data();
    featureArrays.push(Array.from(featureData));
    tf.dispose([tensor, features]);

    const labelIndex = DISEASE_CLASSES.indexOf(sample.label);
    const oneHot = new Array(numClasses).fill(0);
    oneHot[labelIndex] = 1;
    labelArrays.push(oneHot);
  }

  const xs = tf.tensor2d(featureArrays);
  const ys = tf.tensor2d(labelArrays);

  classifier = buildClassifier(numClasses);

  await classifier.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: Math.min(8, samples.length),
    shuffle: true,
    validationSplit: samples.length >= 10 ? 0.2 : 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        onProgress({
          epoch: epoch + 1,
          totalEpochs: EPOCHS,
          loss: Number((logs?.loss ?? 0).toFixed(4)),
          accuracy: Number(((logs?.acc ?? logs?.accuracy ?? 0) * 100).toFixed(1)),
        });
      },
    },
  });

  tf.dispose([xs, ys]);

  // save to localStorage
  await classifier.save(`localstorage://${MODEL_STORAGE_KEY}`);
};

// load saved model
export const loadSavedModel = async (): Promise<boolean> => {
  try {
    classifier = await tf.loadLayersModel(`localstorage://${MODEL_STORAGE_KEY}`);
    return true;
  } catch {
    return false;
  }
};

export const hasTrainedModel = (): boolean => {
  return Boolean(localStorage.getItem(`tensorflowjs_models/${MODEL_STORAGE_KEY}/info`));
};

export const deleteTrainedModel = () => {
  classifier = null;
  const keys = Object.keys(localStorage).filter((k) => k.includes(MODEL_STORAGE_KEY));
  keys.forEach((k) => localStorage.removeItem(k));
};

// predict disease from canvas
export const predictDisease = async (
  canvas: HTMLCanvasElement
): Promise<{ disease: DiseaseClass; confidence: number; spray: boolean; details: string } | null> => {
  if (!classifier) {
    const loaded = await loadSavedModel();
    if (!loaded) return null;
  }

  const net = await loadMobileNet();

  const tensor = imageToTensor(canvas);
  const features = net.predict(tensor) as tf.Tensor;
  const squeezed = features.squeeze();
  const prediction = classifier!.predict(squeezed.expandDims(0)) as tf.Tensor;
  const probabilities = await prediction.data();

  tf.dispose([tensor, features, squeezed, prediction]);

  const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
  const disease = DISEASE_CLASSES[maxIndex];
  const confidence = Math.round(probabilities[maxIndex] * 100);

  const detailsMap: Record<DiseaseClass, string> = {
    "Healthy": "Leaf appears healthy with no significant disease markers detected.",
    "Leaf Spot Symptoms Detected": "Yellow or brown spots detected. Possible fungal infection. Spraying recommended.",
    "Bacterial Blight / Late Blight": "Brown or necrotic patches detected. Bacterial or fungal infection. Spraying recommended.",
    "Mild Leaf Stress": "Stress signs detected on the leaf surface. Preventive spraying recommended to avoid further spread.",
    "Rust / Fungal Infection": "Rust-colored or orange patches detected. Fungal infection confirmed. Spraying recommended.",
  };

  return {
    disease,
    confidence,
    spray: shouldSprayDisease(disease),
    details: detailsMap[disease],
  };
};
