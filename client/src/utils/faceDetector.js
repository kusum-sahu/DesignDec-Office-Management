import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";

let detectorInstance = null;
let initPromise = null;
let lastTimestamp = -1;

/**
 * Initializes and caches the MediaPipe FaceDetector singleton.
 * Uses locally hosted WASM binaries and model weights, with automatic CDN fallback.
 */
export async function getFaceDetector() {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let vision = null;

    // 1. Attempt to load WASM binaries locally first, fallback to CDN
    console.log("[MediaPipe] Step 1: Loading WASM binaries...");
    try {
      vision = await FilesetResolver.forVisionTasks("/wasm");
      console.log("[MediaPipe] ✅ Local /wasm binaries resolved successfully.");
    } catch (localWasmErr) {
      console.warn("[MediaPipe] ⚠️ Local WASM load failed, attempting CDN fallback:", localWasmErr);
      try {
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        console.log("[MediaPipe] ✅ CDN WASM binaries resolved successfully.");
      } catch (cdnWasmErr) {
        console.error("[MediaPipe] ❌ Both local and CDN WASM loading failed:", cdnWasmErr);
        throw cdnWasmErr;
      }
    }

    // 2. Determine model asset path (local first, fallback to CDN)
    const localModelPath = "/models/blaze_face_short_range.tflite";
    const cdnModelPath =
      "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

    const createDetector = async (modelPath, delegate) => {
      console.log(`[MediaPipe] Step 2: Instantiating FaceDetector (model: ${modelPath}, delegate: ${delegate})...`);
      return await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate,
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
    };

    // 3. Try with GPU delegate, fallback to CPU delegate
    try {
      try {
        detectorInstance = await createDetector(localModelPath, "GPU");
        console.log("[MediaPipe] ✅ FaceDetector initialized with local model & GPU delegate.");
      } catch (gpuErr) {
        console.warn("[MediaPipe] ⚠️ GPU delegate failed with local model, trying CPU delegate:", gpuErr.message);
        detectorInstance = await createDetector(localModelPath, "CPU");
        console.log("[MediaPipe] ✅ FaceDetector initialized with local model & CPU delegate.");
      }
    } catch (localModelErr) {
      console.warn("[MediaPipe] ⚠️ Local model load failed, attempting CDN model fallback:", localModelErr);
      try {
        detectorInstance = await createDetector(cdnModelPath, "GPU");
        console.log("[MediaPipe] ✅ FaceDetector initialized with CDN model & GPU delegate.");
      } catch (cdnGpuErr) {
        console.warn("[MediaPipe] ⚠️ CDN GPU delegate failed, trying CDN CPU delegate:", cdnGpuErr.message);
        detectorInstance = await createDetector(cdnModelPath, "CPU");
        console.log("[MediaPipe] ✅ FaceDetector initialized with CDN model & CPU delegate.");
      }
    }

    lastTimestamp = -1;
    return detectorInstance;
  })();

  try {
    const instance = await initPromise;
    return instance;
  } catch (err) {
    initPromise = null;
    detectorInstance = null;
    console.error("[MediaPipe] ❌ FaceDetector initialization completely failed:", err);
    throw err;
  }
}

/**
 * Perform face detection on a video frame.
 * @param {HTMLVideoElement} videoElement
 * @param {number} timestamp
 * @returns {Array} List of detection objects
 */
export function detectFacesInVideo(videoElement, timestamp = performance.now()) {
  if (!detectorInstance || !videoElement) {
    return [];
  }

  if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return [];
  }

  // MediaPipe requires strictly monotonically increasing timestamps in VIDEO mode
  const safeTimestamp = timestamp > lastTimestamp ? timestamp : lastTimestamp + 1;
  lastTimestamp = safeTimestamp;

  try {
    const result = detectorInstance.detectForVideo(videoElement, safeTimestamp);
    return result?.detections || [];
  } catch (err) {
    console.error("[MediaPipe] detectForVideo frame execution error:", err);
    return [];
  }
}

/**
 * Close detector instance and free resources.
 */
export function closeFaceDetector() {
  if (detectorInstance) {
    try {
      detectorInstance.close();
      console.log("[MediaPipe] FaceDetector instance closed successfully.");
    } catch (err) {
      console.warn("[MediaPipe] Error closing FaceDetector instance:", err);
    }
    detectorInstance = null;
    initPromise = null;
    lastTimestamp = -1;
  }
}
