import { useState, useEffect, useRef } from "react";
import { getFaceDetector, detectFacesInVideo } from "../utils/faceDetector";

/**
 * Custom hook for real-time client-side face detection using MediaPipe BlazeFace.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Ref to the live webcam video element
 * @param {boolean} isActive - Whether detection should be actively running
 * @returns {Object} Face detection states, stats, and coordinates
 */
export function useFaceDetection(videoRef, isActive) {
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [primaryBox, setPrimaryBox] = useState(null);
  const [allBoxes, setAllBoxes] = useState([]);
  const [lastDetectionTimestamp, setLastDetectionTimestamp] = useState("");

  const animFrameIdRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const isRunningRef = useRef(false);
  const loopRef = useRef(null);

  // Initialize FaceDetector model
  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        setIsLoadingModel(true);
        setModelError(null);
        await getFaceDetector();
        if (isMounted) {
          setIsLoadingModel(false);
        }
      } catch (err) {
        console.error("[useFaceDetection] Failed to load FaceDetector model:", err);
        if (isMounted) {
          setModelError(err.message || "Face detection model failed to load.");
          setIsLoadingModel(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update loop callback ref so it always accesses latest videoRef
  useEffect(() => {
    loopRef.current = () => {
      if (!isRunningRef.current) return;

      const now = performance.now();
      // Run detection roughly every ~90ms (~11 FPS)
      if (now - lastDetectionTimeRef.current >= 90) {
        lastDetectionTimeRef.current = now;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            const detections = detectFacesInVideo(video, now);
            const count = detections.length;
            setFaceCount(count);

            const timeString = `${new Date().toLocaleTimeString()}.${Math.floor(now % 1000).toString().padStart(3, "0")}`;
            setLastDetectionTimestamp(timeString);

            if (count > 0) {
              const vw = video.videoWidth;
              const vh = video.videoHeight;

              // Map all detected bounding boxes
              const mappedBoxes = detections.map((det) => {
                const { originX, originY, width, height } = det.boundingBox || {};
                const score = det.categories?.[0]?.score || 0;
                return {
                  xPercent: (originX / vw) * 100,
                  yPercent: (originY / vh) * 100,
                  widthPercent: (width / vw) * 100,
                  heightPercent: (height / vh) * 100,
                  score,
                };
              });

              setAllBoxes(mappedBoxes);
              setPrimaryBox(mappedBoxes[0]);
              setConfidence(mappedBoxes[0]?.score || 0);
            } else {
              setAllBoxes([]);
              setPrimaryBox(null);
              setConfidence(0);
            }
          } catch (err) {
            console.warn("[useFaceDetection] Detection loop error:", err);
          }
        }
      }

      if (isRunningRef.current && loopRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loopRef.current);
      }
    };
  }, [videoRef]);

  // Start / Stop detection loop based on isActive and model readiness
  useEffect(() => {
    let cancelId = null;

    if (isActive && !isLoadingModel && !modelError) {
      console.log("[useFaceDetection] Activating face detection loop...");
      isRunningRef.current = true;
      if (loopRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loopRef.current);
      }
    } else {
      isRunningRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      cancelId = setTimeout(() => {
        setFaceCount(0);
        setPrimaryBox(null);
        setAllBoxes([]);
        setConfidence(0);
      }, 0);
    }

    return () => {
      isRunningRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (cancelId) {
        clearTimeout(cancelId);
      }
    };
  }, [isActive, isLoadingModel, modelError]);

  const faceDetected = faceCount === 1;
  const multipleFacesDetected = faceCount > 1;

  let statusMessage = "Please position your face inside the camera frame.";
  if (isLoadingModel) {
    statusMessage = "Initializing AI face detector...";
  } else if (modelError) {
    statusMessage = "Face detector error. Please retry.";
  } else if (multipleFacesDetected) {
    statusMessage = "Multiple faces detected. Please ensure only one person is in frame.";
  } else if (faceDetected) {
    statusMessage = "Face detected! Ready to capture attendance.";
  }

  const detectorStatus = isLoadingModel ? "Loading..." : modelError ? "Error" : "Ready";

  return {
    isLoadingModel,
    modelError,
    detectorStatus,
    faceCount,
    faceDetected,
    multipleFacesDetected,
    confidence,
    primaryBox,
    allBoxes,
    statusMessage,
    lastDetectionTimestamp,
  };
}

export default useFaceDetection;
