// Run this script to download sample training images
// Usage: node download-training-images.mjs

import { createWriteStream, mkdirSync, existsSync } from "fs";
import { get } from "https";
import { join } from "path";

const CLASSES = {
  "healthy": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Tomato_je.jpg/320px-Tomato_je.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Tomato_plant.jpg/320px-Tomato_plant.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/320px-Cat03.jpg",
  ],
  "leaf_spot": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Cercospora_leaf_spot.jpg/320px-Cercospora_leaf_spot.jpg",
  ],
};

const OUTPUT_DIR = "./training-images";

const download = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });

console.log("Creating training image directories...");
for (const cls of Object.keys(CLASSES)) {
  const dir = join(OUTPUT_DIR, cls);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

console.log("\nNote: Automatic download requires real PlantVillage dataset images.");
console.log("Please download images manually from these sources:\n");
console.log("1. PlantVillage Dataset: https://www.kaggle.com/datasets/emmarex/plantdisease");
console.log("2. Plant Disease Images: https://github.com/spMohanty/PlantVillage-Dataset");
console.log("\nOr use Google Images to search for:");
console.log("  - 'healthy tomato leaf' → save to training-images/healthy/");
console.log("  - 'leaf spot disease plant' → save to training-images/leaf_spot/");
console.log("  - 'bacterial blight plant leaf' → save to training-images/bacterial_blight/");
console.log("  - 'mild leaf stress yellowing' → save to training-images/mild_stress/");
console.log("  - 'rust fungal infection leaf orange' → save to training-images/rust/");
console.log("\nThen upload them on the Training page at http://localhost:8080/training");
