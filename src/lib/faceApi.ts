import * as faceapi from 'face-api.js';

// Public CDN that mirrors the official face-api.js weights repository
const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let loadPromise: Promise<void> | null = null;

/**
 * Loads the three face-api.js models we need (tiny detector, landmarks,
 * recognition). Models total ~6MB and are cached by the browser after the
 * first load. Calling this multiple times reuses the same promise.
 */
export const loadFaceModels = (): Promise<void> => {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => undefined);
  return loadPromise;
};

/**
 * Detects the single best-quality face in a video/image element and returns
 * a 128-d descriptor as a plain number array (ready for JSONB storage).
 * Returns null if no face is detected.
 */
export const getFaceDescriptor = async (
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> => {
  await loadFaceModels();
  const result = await faceapi
    .detectSingleFace(
      input,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result?.descriptor) return null;
  return Array.from(result.descriptor);
};

/** Euclidean distance between two 128-d face descriptors. */
export const faceDistance = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

/** Threshold used by face-api.js for "same person" decisions. */
export const FACE_MATCH_THRESHOLD = 0.5;