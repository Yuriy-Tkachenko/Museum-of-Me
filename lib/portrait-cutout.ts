import type { ImageSegmenter } from "@mediapipe/tasks-vision";

let segmenterPromise: Promise<ImageSegmenter> | undefined;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/models/portrait");
      return ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/models/portrait/selfie_segmenter.tflite", delegate: "CPU" },
        runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false,
      });
    })().catch(error => { segmenterPromise = undefined; throw error; });
  }
  return segmenterPromise;
}

// Sample transparency to recognise existing cutouts without a database migration.
export function hasPortraitTransparency(image: CanvasImageSource) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(image, 0, 0, 64, 64);
  const pixels = context.getImageData(0, 0, 64, 64).data;
  let transparent = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 200) transparent++;
  return transparent > 64 * 64 * .01;
}

export async function removePortraitBackground(source: HTMLCanvasElement) {
  if (hasPortraitTransparency(source)) return source;
  const segmenter = await getSegmenter();
  const result = segmenter.segment(source);
  try {
    const masks = result.confidenceMasks;
    if (!masks?.length) throw new Error("No person mask");
    const labels = segmenter.getLabels();
    const labelIndex = labels.findIndex(label => /person|selfie|human/i.test(label));
    const mask = masks[labelIndex >= 0 ? labelIndex : masks.length === 1 ? 0 : 1];
    const probabilities = mask.getAsFloat32Array();
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = mask.width; maskCanvas.height = mask.height;
    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) throw new Error("No mask canvas");
    const pixels = maskContext.createImageData(mask.width, mask.height);
    let foreground = 0;
    for (let i = 0; i < probabilities.length; i++) {
      // Start the transition at a lower confidence so hair, ears and loose
      // clothing are not clipped by the relatively small segmentation mask.
      const confidence = Math.max(0, Math.min(1, (probabilities[i] - .18) / .58));
      const alpha = confidence * confidence * (3 - 2 * confidence);
      pixels.data[i * 4 + 3] = Math.round(alpha * 255);
      if (probabilities[i] > .6) foreground++;
    }
    if (foreground < probabilities.length * .015) throw new Error("No clear person found");
    maskContext.putImageData(pixels, 0, 0);
    const output = document.createElement("canvas");
    output.width = source.width; output.height = source.height;
    const context = output.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No output canvas");
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = "destination-in";
    // Feather the alpha mask only, keeping facial detail and clothing sharp.
    context.filter = `blur(${Math.max(1, Math.min(2, Math.max(output.width, output.height) / 1200))}px)`;
    context.drawImage(maskCanvas, 0, 0, output.width, output.height);
    context.filter = "none";
    context.globalCompositeOperation = "source-over";
    // Remove unused space without trimming hair, shoulders or soft mask edges.
    const rgba = context.getImageData(0, 0, output.width, output.height).data;
    let left = output.width, top = output.height, right = 0, bottom = 0;
    for (let y = 0; y < output.height; y++) for (let x = 0; x < output.width; x++) {
      if (rgba[(y * output.width + x) * 4 + 3] > 20) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    const personWidth = right - left + 1;
    const personHeight = bottom - top + 1;
    const horizontalPadding = Math.max(12, Math.ceil(personWidth * .08));
    const topPadding = Math.max(12, Math.ceil(personHeight * .08));
    const bottomPadding = Math.max(10, Math.ceil(personHeight * .045));
    left = Math.max(0, left - horizontalPadding); top = Math.max(0, top - topPadding);
    right = Math.min(output.width - 1, right + horizontalPadding); bottom = Math.min(output.height - 1, bottom + bottomPadding);
    const cropped = document.createElement("canvas");
    cropped.width = right - left + 1; cropped.height = bottom - top + 1;
    const croppedContext = cropped.getContext("2d");
    if (!croppedContext) throw new Error("No crop canvas");
    croppedContext.drawImage(output, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return cropped;
  } finally { result.close(); }
}
