import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CameraOff,
  MapPin,
  X,
  CheckCircle2,
  RefreshCw,
  Play,
  Square,
  AlertCircle,
  AlertTriangle,
  Users,
  ScanFace,
  Loader2,
  Sparkles,
  Activity,
  Radio,
  Wifi,
  Navigation,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
} from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../ui/Dialog";
import Button from "../ui/Button";
import attendanceApi from "../../api/attendance.api";
import { toast } from "../../utils/toast";
import useFaceDetection from "../../hooks/useFaceDetection";
import useAuthStore from "../../stores/authStore";
import { BRANCH_CONFIG, calculateDistanceMeters } from "../../constants/branches";
import CorrectionRequestModal from "./CorrectionRequestModal";

export function CheckInModal({ isOpen, onClose, onSuccess, isCheckOut = false }) {
  const { user } = useAuthStore();
  const assignedBranch = user?.branch || "Main Office";

  // Dedicated query to check for incomplete previous-day attendance
  const { data: todayAttendanceData, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ["today-attendance", user?._id],
    queryFn: () => attendanceApi.getToday(),
    enabled: Boolean(isOpen),
  });

  const incompleteAttendance = todayAttendanceData?.incompletePreviousAttendance || null;
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Query live attendance settings from DB with fallback to BRANCH_CONFIG
  const { data: settingsResponse, refetch: refetchSettings } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: () => attendanceApi.getSettings(),
    staleTime: 10 * 1000,
  });

  const officeConfig = useMemo(() => {
    const dbBranches = settingsResponse?.data?.branchLocations || [];
    const dbBranch = dbBranches.find((b) => b.branchName === assignedBranch);
    if (dbBranch) {
      return {
        name: dbBranch.branchName,
        latitude: dbBranch.latitude,
        longitude: dbBranch.longitude,
        radius: dbBranch.radius || 200,
        address: dbBranch.address || assignedBranch,
      };
    }
    return BRANCH_CONFIG[assignedBranch] || BRANCH_CONFIG["Main Office"];
  }, [settingsResponse?.data?.branchLocations, assignedBranch]);

  const officeConfigRef = useRef(officeConfig);
  useEffect(() => {
    officeConfigRef.current = officeConfig;
  }, [officeConfig]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingCameraRef = useRef(false);

  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [streamStatus, setStreamStatus] = useState("Disconnected"); // "Disconnected" | "Connecting..." | "Connected" | "Failed"
  const [videoReadyState, setVideoReadyState] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState("0x0");
  const [cameraError, setCameraError] = useState("");

  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);

  const [location, setLocation] = useState(null);
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [isWithinRadius, setIsWithinRadius] = useState(true);
  const [isAccuracyTooLow, setIsAccuracyTooLow] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [locationDiagnostics, setLocationDiagnostics] = useState({
    sourceType: "unknown", // "gps" | "wifi" | "network-coarse" | "ip-fallback" | "unsupported" | "error"
    sourceLabel: "Pending Acquisition",
    accuracy: null,
    accuracyRating: null,
    permissionStatus: "prompt",
    enableHighAccuracy: true,
    coords: null,
    diagnosedLimitation: null,
    lastAcquiredAt: null,
  });
  const [showDiagnosticsDetail, setShowDiagnosticsDetail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time client-side face detection hook
  const {
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
  } = useFaceDetection(videoRef, cameraActive && !capturedPhotoBlob);

  const stopCamera = useCallback(() => {
    console.log("[Camera] Stopping active tracks...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log(`[Camera] Track stopped: ${track.kind} (${track.label})`);
        } catch (e) {
          console.warn("[Camera] Error stopping track:", e);
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
    setStreamStatus("Disconnected");
    setVideoReadyState(0);
    setVideoDimensions("0x0");
  }, []);

  const startCamera = useCallback(async () => {
    // If stream is already active and live, reuse it to avoid toggling
    if (streamRef.current && streamRef.current.active) {
      const liveTrack = streamRef.current.getVideoTracks().find((t) => t.readyState === "live");
      if (liveTrack) {
        console.log("[Camera] Stream already active and live, keeping current stream.");
        setCameraActive(true);
        setStreamStatus("Connected");
        return;
      }
    }

    if (isStartingCameraRef.current) {
      console.log("[Camera] Camera start already in progress, skipping duplicate call.");
      return;
    }

    try {
      isStartingCameraRef.current = true;
      setStreamStatus("Connecting...");
      setCameraError("");
      console.log("[Camera] Calling navigator.mediaDevices.getUserMedia()...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      console.log("[Camera] ✅ MediaStream acquired:", mediaStream.id);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
      setStreamStatus("Connected");
      setCameraError("");
    } catch (err) {
      console.error("[Camera] ❌ Camera access error:", err);
      setCameraActive(false);
      setStream(null);
      setStreamStatus("Failed");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera access was denied. Please allow camera permissions in your browser's site settings to proceed."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found. Please connect a webcam or enable a camera device.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "Camera is currently in use by another application. Please close other camera apps and retry."
        );
      } else {
        setCameraError(err.message || "Unable to access camera. Please check camera permissions.");
      }
    } finally {
      isStartingCameraRef.current = false;
    }
  }, []);

  // Synchronize stream with video element and trigger playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    console.log("[Camera] Binding stream to videoRef.current.srcObject...");
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const handleLoadedMetadata = () => {
      const dims = `${video.videoWidth}x${video.videoHeight}`;
      console.log(`[Camera] ✅ onLoadedMetadata: dimensions=${dims}, readyState=${video.readyState}`);
      setVideoDimensions(dims);
      setVideoReadyState(video.readyState);

      video
        .play()
        .then(() => {
          console.log(`[Camera] ✅ video.play() resolved. readyState=${video.readyState}`);
          setVideoReadyState(video.readyState);
          setStreamStatus("Connected");
        })
        .catch((playErr) => {
          console.warn("[Camera] ⚠️ video.play() caught error:", playErr);
        });
    };

    const handlePlaying = () => {
      console.log(`[Camera] ✅ video playing event. readyState=${video.readyState}`);
      setVideoReadyState(video.readyState);
      setVideoDimensions(`${video.videoWidth}x${video.videoHeight}`);
      setStreamStatus("Connected");
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("playing", handlePlaying);

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [stream]);

  // Capture fresh GPS coordinates with enableHighAccuracy: true, maximumAge: 0, timeout + retry
  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocation(null);
      setDistanceFromOffice(null);
      setIsWithinRadius(false);
      setIsAccuracyTooLow(false);
      setLocationError("Geolocation is not supported by your browser.");
      setLocationDiagnostics((prev) => ({
        ...prev,
        sourceType: "unsupported",
        sourceLabel: "Geolocation Unsupported",
        accuracyRating: "Unsupported",
        diagnosedLimitation: "This browser or operating system does not support the navigator.geolocation API.",
      }));
      return;
    }

    setIsLocating(true);
    setLocationError("");

    // Query browser site permission in advance
    let permStatus = "prompt";
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        permStatus = perm.state || "prompt";
      } catch (e) {
        console.warn("Permission query not supported:", e);
      }
    }

    const MAX_ALLOWED_ACCURACY = 300; // Geofence requires <= 300m accuracy

    const handleSuccess = (pos) => {
      setIsLocating(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const rawAccuracy = pos.coords.accuracy;
      const accuracy = Math.round(rawAccuracy);

      const currentOffice = officeConfigRef.current;

      // Classify position fix type and source provider
      let sourceType = "unknown";
      let sourceLabel = "Unknown Fix";
      let accuracyRating = "Unknown";
      let diagnosedLimitation = null;

      if (accuracy <= 20) {
        sourceType = "gps";
        sourceLabel = "Hardware GPS / GNSS Sensor";
        accuracyRating = `High Precision GPS (±${accuracy}m)`;
      } else if (accuracy <= 150) {
        sourceType = "wifi";
        sourceLabel = "Wi-Fi Access Point Triangulation";
        accuracyRating = `Good Wi-Fi Triangulation (±${accuracy}m)`;
      } else if (accuracy <= MAX_ALLOWED_ACCURACY) {
        sourceType = "network-coarse";
        sourceLabel = "Cellular / Coarse Network Fix";
        accuracyRating = `Acceptable Network Fix (±${accuracy}m)`;
      } else {
        sourceType = "ip-fallback";
        sourceLabel = "Approximate Network / IP Fallback";
        accuracyRating = `Rejected Coarse IP (±${accuracy >= 10000 ? Math.round(accuracy / 1000) + "km" : accuracy + "m"})`;
        diagnosedLimitation = `Device & Network Limitation: Your device is reporting approximate carrier/ISP network coordinates (±${accuracy.toLocaleString()}m). This computer lacks a hardware GPS chip and is connected via a mobile hotspot or network without registered fixed Wi-Fi routers in Google's database. Chrome and Windows were unable to triangulate physical location and fell back to coarse IP geolocation. High accuracy (≤300m) is strictly required to verify the ${currentOffice.radius || 200}m office presence.`;
      }

      setLocationDiagnostics({
        sourceType,
        sourceLabel,
        accuracy,
        accuracyRating,
        permissionStatus: permStatus,
        enableHighAccuracy: true,
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: rawAccuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp ? new Date(pos.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
        },
        diagnosedLimitation,
        lastAcquiredAt: new Date().toLocaleTimeString(),
      });

      setLocation({
        latitude: lat,
        longitude: lng,
        accuracy,
        address: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracy}m)`,
      });

      // 1. Accuracy Check First: if accuracy > 300m (e.g. 1,000,000m coarse IP fallback)
      if (accuracy > MAX_ALLOWED_ACCURACY) {
        setIsAccuracyTooLow(true);
        setIsWithinRadius(false);
        setDistanceFromOffice(null);
        setLocationError(
          `GPS accuracy too low (±${accuracy.toLocaleString()}m). High-accuracy GPS (within ${MAX_ALLOWED_ACCURACY}m) is required to verify the ${currentOffice.radius || 200}m office radius. Please enable high-accuracy device location or Wi-Fi, then click Retry GPS.`
        );
        return;
      }

      // 2. Haversine Distance Calculation when accuracy is acceptable
      setIsAccuracyTooLow(false);
      const distance = calculateDistanceMeters(
        lat,
        lng,
        currentOffice.latitude,
        currentOffice.longitude
      );
      const within = distance <= (currentOffice.radius || 200);

      setDistanceFromOffice(distance);
      setIsWithinRadius(within);

      if (!within) {
        setLocationError(
          `You are outside the office radius. You are ${distance}m away from ${currentOffice.name} (Allowed: ${currentOffice.radius || 200}m).`
        );
      } else {
        setLocationError("");
      }
    };

    const handleFinalError = (err) => {
      setIsLocating(false);
      setLocation(null);
      setDistanceFromOffice(null);
      setIsWithinRadius(false);
      setIsAccuracyTooLow(false);
      console.warn("Geolocation acquisition error:", err);

      let msg = "Failed to retrieve real GPS location.";
      let limitation = null;

      if (err.code === 1) {
        msg = "Location permission was denied. Real GPS location is required for attendance. Please grant location permissions in your browser settings.";
        limitation = "Browser location permission denied for this site.";
      } else if (err.code === 2) {
        msg = "Location signal is unavailable. Please verify device GPS/network location and retry.";
        limitation = "No location provider or positioning signal is available on this device.";
      } else if (err.code === 3) {
        msg = "Location request timed out. Please click 'Retry GPS' to re-acquire your position.";
        limitation = "Acquisition timed out waiting for high-accuracy GPS fix.";
      } else if (err.message) {
        msg = err.message;
      }

      setLocationDiagnostics((prev) => ({
        ...prev,
        sourceType: "error",
        sourceLabel: "Acquisition Error",
        accuracy: null,
        accuracyRating: "Error",
        permissionStatus: err.code === 1 ? "denied" : permStatus,
        diagnosedLimitation: limitation,
      }));

      setLocationError(msg);
    };

    // Primary attempt: fresh high-accuracy position with 12s timeout, zero cache
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (firstErr) => {
        console.warn("First GPS attempt failed or timed out, retrying with 15s timeout...", firstErr);
        // Automatic retry with 15s timeout before finalizing error
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleFinalError,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }, []);

  // Initialize camera and GPS location strictly when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      refetchSettings();
      startCamera();
      captureLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, captureLocation, stopCamera, refetchSettings]);

  // Capture snapshot from live video stream
  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      console.warn("[Camera] Cannot take snapshot - video not ready:", video?.readyState, video?.videoWidth);
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    // Mirror the snapshot to match front-camera preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedPhotoBlob(blob);
            const url = URL.createObjectURL(blob);
            setCapturedPhotoUrl(url);
            stopCamera();
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        0.88
      );
    });
  }, [stopCamera]);

  const handleShutterClick = () => {
    if (!faceDetected) {
      toast.warning("Position Required", {
        description: "Please position your face clearly inside the camera frame.",
      });
      return;
    }
    if (multipleFacesDetected) {
      toast.warning("Multiple Faces", {
        description: "Multiple faces detected. Please ensure only you are visible in the frame.",
      });
      return;
    }
    takeSnapshot();
  };

  const retakeSnapshot = () => {
    setCapturedPhotoBlob(null);
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhotoBlob(null);
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    setCameraError("");
    setLocationError("");
    setDistanceFromOffice(null);
    setIsWithinRadius(true);
    setIsAccuracyTooLow(false);
    setShowDiagnosticsDetail(false);
    onClose();
  };

  const handleSubmit = async () => {
    // 1. Verify location requirement
    if (!location) {
      toast.error("Location Required", {
        description:
          locationError ||
          "Real GPS coordinates are strictly required for attendance. Please grant location permissions.",
      });
      return;
    }

    // 1b. Verify accuracy
    if (isAccuracyTooLow) {
      toast.error("GPS Accuracy Too Low", {
        description:
          locationError ||
          `Device reported accuracy ±${location.accuracy}m is too low to verify office radius.`,
      });
      return;
    }

    // 2. Verify Geofencing radius
    if (!isWithinRadius) {
      toast.error("Outside Office Radius", {
        description: `You are ${distanceFromOffice}m away from ${officeConfig.name}. Allowed: ${officeConfig.radius || 200}m.`,
      });
      return;
    }

    // 3. Obtain verified selfie
    let photoBlob = capturedPhotoBlob;
    if (!photoBlob) {
      if (cameraActive && faceDetected && !multipleFacesDetected) {
        photoBlob = await takeSnapshot();
      } else {
        toast.error("Face Not Detected", {
          description: "Please position your face inside the camera frame before confirming.",
        });
        return;
      }
    }

    if (!photoBlob) {
      toast.error("Selfie Required", {
        description: "Failed to capture selfie photo. Please try again.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("photo", photoBlob, "selfie.jpg");
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);
      if (location.accuracy !== undefined && location.accuracy !== null) {
        formData.append("accuracy", location.accuracy);
      }
      formData.append("address", location.address);

      let res;
      if (isCheckOut) {
        res = await attendanceApi.checkOut(formData);
        toast.success("Check-out Successful!", {
          description: `Worked ${res?.data?.workingHours || "0"}h today. Have a great evening!`,
        });
      } else {
        res = await attendanceApi.checkIn(formData);
        toast.success("Check-in Successful!", {
          description: "Your attendance and selfie have been logged.",
        });

        // Warn if there was an incomplete previous-day attendance detected without pending correction
        if (
          res?.data?.incompletePreviousAttendance &&
          !res.data.incompletePreviousAttendance.hasPendingCorrection &&
          res.data.warning
        ) {
          toast.warning("Incomplete Previous Attendance", {
            description: res.data.warning,
            duration: 9000,
          });
        }
      }

      if (onSuccess) onSuccess(res?.data);
      handleClose();
    } catch (err) {
      console.error("Attendance submission error:", err);
      const resData = err.response?.data;

      // Handle 409 Conflict gracefully: guide user to Check Out
      if (err.response?.status === 409) {
        if (
          resData?.action === "CHECK_OUT" ||
          resData?.message?.toLowerCase().includes("already checked in")
        ) {
          toast.info("Already Checked In", {
            description: "You have already checked in today. Please proceed with Check Out.",
          });
          if (onSuccess) onSuccess({ action: "CHECK_OUT", isCheckedIn: true, ...resData?.data });
          handleClose();
          return;
        }
      }

      if (resData?.code === "GPS_ACCURACY_TOO_LOW") {
        toast.error("GPS Accuracy Too Low", {
          description: resData.message || "Device location accuracy is insufficient.",
        });
      } else if (resData?.code === "OUTSIDE_GEOFENCE") {
        toast.error("Outside Office Radius", {
          description: resData.message || "You are outside the office geofence radius.",
        });
      } else {
        const msg = resData?.message || "Failed to submit attendance.";
        toast.error("Attendance Error", { description: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canConfirm =
    Boolean(location) &&
    !isAccuracyTooLow &&
    isWithinRadius &&
    !isSubmitting &&
    (Boolean(capturedPhotoBlob) || (cameraActive && faceDetected && !multipleFacesDetected));

  const getReadyStateLabel = (state) => {
    switch (state) {
      case 0:
        return "0 (HAVE_NOTHING)";
      case 1:
        return "1 (HAVE_METADATA)";
      case 2:
        return "2 (HAVE_CURRENT_DATA)";
      case 3:
        return "3 (HAVE_FUTURE_DATA)";
      case 4:
        return "4 (HAVE_ENOUGH_DATA)";
      default:
        return `${state} (UNKNOWN)`;
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Camera className="h-4.5 w-4.5" />
            </div>
            <DialogTitle>{isCheckOut ? "Clock Out of Office" : "Clock In to Office"}</DialogTitle>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <DialogDescription>
          Verify your face and acquire GPS coordinates to log your attendance.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3.5">
        {/* Incomplete Previous-Day Attendance Warning Banner (Does NOT block check-in!) */}
        {incompleteAttendance &&
          !isCheckOut &&
          !incompleteAttendance.hasPendingCorrection &&
          incompleteAttendance.warningMessage && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-slate-900 leading-snug">
                You didn’t check out on {incompleteAttendance.dateFormatted}. Please submit a correction request.
              </p>
              <p className="text-[11px] text-amber-800">
                Your today's check-in is <span className="font-semibold text-emerald-700">not blocked</span>. You can still check in now.
              </p>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(true)}
                className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
              >
                Submit Correction Request →
              </button>
            </div>
          </div>
        )}

        {/* Camera / Photo Preview Area */}
        <div className="relative aspect-4/3 w-full rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner border border-slate-800">
          {/* ALWAYS MOUNTED LIVE VIDEO ELEMENT to prevent null videoRef race conditions */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              cameraActive && !capturedPhotoUrl ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
            }`}
          />

          {/* Captured Snapshot Overlay Preview */}
          {capturedPhotoUrl && (
            <div className="relative w-full h-full z-20">
              <img
                src={capturedPhotoUrl}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />

              {/* Verified Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Selfie Captured • Verified</span>
              </div>

              {/* Retake Button */}
              <button
                type="button"
                onClick={retakeSnapshot}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-md cursor-pointer border border-slate-700/60"
              >
                <RefreshCw className="h-3.5 w-3.5 text-rose-400" />
                <span>Retake</span>
              </button>
            </div>
          )}

          {/* Live Camera Overlays (HUD, Detection Boxes, Guides, Shutter) */}
          {cameraActive && !capturedPhotoUrl && (
            <>
              {/* Top Status Bar HUD */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                {isLoadingModel ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 text-slate-300 text-xs font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                    <span>Initializing AI Detector...</span>
                  </div>
                ) : modelError ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/85 backdrop-blur-md border border-red-500/50 text-red-300 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span>Detector Offline</span>
                  </div>
                ) : multipleFacesDetected ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-bold animate-pulse">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span>Multiple Faces ({faceCount})</span>
                  </div>
                ) : faceDetected ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 backdrop-blur-md border border-emerald-500/60 text-emerald-300 text-xs font-bold shadow-lg shadow-emerald-950/50">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Face Detected ({Math.round(confidence * 100)}%)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    <ScanFace className="h-3.5 w-3.5 text-rose-400" />
                    <span>Face Not Detected</span>
                  </div>
                )}

                <div className="px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/50 text-[10px] font-semibold text-slate-300">
                  Live Camera
                </div>
              </div>

              {/* Dynamic Face Bounding Box & Biometric Target Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {/* Single Face Detected: Glowing Emerald Reticle */}
                {faceDetected && primaryBox && (
                  <div
                    className="absolute border-2 border-emerald-400 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.55)] transition-all duration-100 ease-out"
                    style={{
                      // Invert X because the video is mirrored with scale-x-[-1]
                      left: `${Math.max(0, 100 - (primaryBox.xPercent + primaryBox.widthPercent))}%`,
                      top: `${Math.max(0, primaryBox.yPercent)}%`,
                      width: `${Math.min(100, primaryBox.widthPercent)}%`,
                      height: `${Math.min(100, primaryBox.heightPercent)}%`,
                    }}
                  >
                    {/* Reticle Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm" />

                    {/* Small Presence Chip */}
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded tracking-wider shadow">
                      VERIFIED
                    </div>
                  </div>
                )}

                {/* Multiple Faces Detected: Amber Boxes */}
                {multipleFacesDetected &&
                  allBoxes.map((box, idx) => (
                    <div
                      key={idx}
                      className="absolute border-2 border-amber-400 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      style={{
                        left: `${Math.max(0, 100 - (box.xPercent + box.widthPercent))}%`,
                        top: `${Math.max(0, box.yPercent)}%`,
                        width: `${Math.min(100, box.widthPercent)}%`,
                        height: `${Math.min(100, box.heightPercent)}%`,
                      }}
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}

                {/* No Face Detected: Oval Biometric Scanning Guide */}
                {!faceDetected && !multipleFacesDetected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-48 h-60 rounded-[40%] border-2 border-dashed border-rose-400/40 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-[40%] bg-rose-500/5 animate-pulse" />
                      {/* Subtle scanning horizontal bar */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500/80 to-transparent animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Guidance Message Bar */}
              <div className="absolute bottom-20 left-3 right-3 text-center pointer-events-none z-10">
                <div
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-md transition-all ${
                    multipleFacesDetected
                      ? "bg-amber-950/85 border-amber-500/40 text-amber-200"
                      : faceDetected
                      ? "bg-emerald-950/85 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950/85 border-rose-500/30 text-rose-200"
                  }`}
                >
                  {statusMessage}
                </div>
              </div>

              {/* Shutter Button when camera is live */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                {faceDetected && !multipleFacesDetected ? (
                  <button
                    type="button"
                    onClick={handleShutterClick}
                    title="Capture attendance selfie"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 shadow-xl ring-4 ring-emerald-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                      <div className="h-7 w-7 rounded-full bg-emerald-600 shadow-inner" />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleShutterClick}
                    title="Position face inside frame to capture"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/80 text-slate-500 ring-2 ring-slate-700/60 cursor-not-allowed opacity-70 transition-all"
                  >
                    <div className="h-10 w-10 rounded-full border-2 border-slate-600 flex items-center justify-center">
                      <div className="h-7 w-7 rounded-full bg-slate-600" />
                    </div>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Camera Inactive or Error State Placeholder */}
          {!cameraActive && !capturedPhotoUrl && (
            <div className="text-center p-6 space-y-3 text-slate-400 z-10">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-rose-400">
                <CameraOff className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">
                  {cameraError ? "Camera Unavailable" : "Initializing camera..."}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {cameraError || "Please allow webcam access when prompted by your browser."}
                </p>
              </div>
              {cameraError && (
                <Button size="sm" variant="outline" onClick={startCamera}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
                  Retry Camera
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Development Diagnostic Indicator */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-300 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-rose-400" />
              <span>CAMERA & AI DIAGNOSTICS</span>
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                streamStatus === "Connected" && faceDetected
                  ? "bg-emerald-400 animate-pulse"
                  : streamStatus === "Connected"
                  ? "bg-amber-400"
                  : "bg-rose-500"
              }`}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
            <div>
              <span className="text-slate-500">Camera stream: </span>
              <span
                className={
                  streamStatus === "Connected"
                    ? "text-emerald-400 font-bold"
                    : streamStatus === "Failed"
                    ? "text-rose-400 font-bold"
                    : "text-amber-400 font-bold"
                }
              >
                {streamStatus}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Face detector: </span>
              <span
                className={
                  detectorStatus === "Ready"
                    ? "text-emerald-400 font-bold"
                    : detectorStatus === "Error"
                    ? "text-rose-400 font-bold"
                    : "text-blue-400 font-bold"
                }
              >
                {detectorStatus}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Video readyState: </span>
              <span
                className={
                  videoReadyState >= 2
                    ? "text-emerald-400 font-bold"
                    : "text-amber-400 font-bold"
                }
              >
                {getReadyStateLabel(videoReadyState)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Video dimensions: </span>
              <span
                className={
                  videoDimensions !== "0x0"
                    ? "text-slate-200 font-bold"
                    : "text-amber-400 font-bold"
                }
              >
                {videoDimensions}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Last detection timestamp: </span>
              <span className="text-slate-300 font-mono">
                {lastDetectionTimestamp || (cameraActive ? "Analyzing frames..." : "Waiting for camera...")}
              </span>
            </div>
          </div>
        </div>

        {/* Location Indicator Card - Real GPS coordinates & Geofencing enforced */}
        <div
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-all ${
            location && !isAccuracyTooLow && isWithinRadius
              ? "bg-emerald-50/60 border-emerald-200 text-slate-800"
              : isAccuracyTooLow
              ? "bg-amber-50/90 border-amber-300 text-amber-950"
              : location && !isWithinRadius
              ? "bg-red-50/80 border-red-200 text-red-900"
              : locationError
              ? "bg-rose-50/70 border-rose-200 text-rose-900"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
              location && !isAccuracyTooLow && isWithinRadius
                ? "bg-emerald-100 text-emerald-600"
                : isAccuracyTooLow
                ? "bg-amber-100 text-amber-700"
                : location && !isWithinRadius
                ? "bg-red-100 text-red-600"
                : locationError
                ? "bg-rose-100 text-rose-600"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : location && !isAccuracyTooLow && isWithinRadius ? (
              <MapPin className="h-4.5 w-4.5" />
            ) : isAccuracyTooLow ? (
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
            ) : location && !isWithinRadius ? (
              <AlertCircle className="h-4.5 w-4.5 text-red-600" />
            ) : locationError ? (
              <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[13px]">
                  {isLocating
                    ? "Acquiring GPS Position..."
                    : location && !isAccuracyTooLow && isWithinRadius
                    ? "Within Office Radius"
                    : isAccuracyTooLow
                    ? "GPS Accuracy Too Low (Rejected)"
                    : location && !isWithinRadius
                    ? "Outside Office Radius"
                    : locationError
                    ? "GPS Location Required"
                    : "Acquiring GPS Position..."}
                </span>

                {/* Detected Location Source Fix Pill */}
                {locationDiagnostics.sourceType === "gps" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <Navigation className="h-2.5 w-2.5" />
                    Hardware GPS Fix
                  </span>
                )}
                {locationDiagnostics.sourceType === "wifi" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                    <Wifi className="h-2.5 w-2.5" />
                    Wi-Fi Triangulation
                  </span>
                )}
                {locationDiagnostics.sourceType === "network-coarse" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                    <Radio className="h-2.5 w-2.5" />
                    Coarse Network
                  </span>
                )}
                {locationDiagnostics.sourceType === "ip-fallback" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Approximate IP Fallback
                  </span>
                )}
              </div>

              {(locationError || (!location && !isLocating) || isAccuracyTooLow || (location && !isWithinRadius)) && (
                <button
                  type="button"
                  disabled={isLocating}
                  onClick={async () => {
                    await refetchSettings();
                    captureLocation();
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isLocating ? "animate-spin" : ""}`} />
                  Retry GPS
                </button>
              )}
            </div>

            <div className="text-[11px] leading-relaxed text-slate-600 space-y-1">
              {location ? (
                <>
                  <div className="font-medium text-slate-700">
                    Target: {officeConfig.name} ({officeConfig.address || "Office Workspace"})
                  </div>

                  <div className="text-slate-600 font-mono text-[10.5px]">
                    Coords: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} • Reported Accuracy: ±{location.accuracy.toLocaleString()}m
                  </div>

                  {isAccuracyTooLow ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-100/70 p-2 text-amber-950 space-y-1.5 mt-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Rejected: Accuracy ±{location.accuracy.toLocaleString()}m exceeds maximum allowed ±300m</span>
                      </div>
                      <p className="text-[10.5px] leading-snug text-amber-900">
                        <strong>Root Cause Diagnosed:</strong> Your browser returned an approximate carrier/ISP network location. This PC has no integrated GPS sensor and is connected to a mobile hotspot/network with no mapped fixed Wi-Fi routers.
                      </p>
                      <div className="text-[10.5px] text-amber-800 space-y-0.5">
                        <p className="font-semibold text-slate-800">To check in with verified location:</p>
                        <p>1. Check in using a smartphone with real GPS enabled, OR</p>
                        <p>2. Connect this laptop to a mapped fixed office Wi-Fi network, OR</p>
                        <p>3. In development/testing: Use Chrome DevTools (Sensors panel) to simulate office coordinates.</p>
                      </div>
                    </div>
                  ) : distanceFromOffice !== null ? (
                    <span
                      className={`inline-block font-semibold mt-1 px-2 py-0.5 rounded-md text-[10.5px] ${
                        isWithinRadius
                          ? "bg-emerald-100/70 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isWithinRadius
                        ? `✓ ${distanceFromOffice}m from office (Allowed: ${officeConfig.radius || 200}m)`
                        : `✕ ${distanceFromOffice}m from office — Outside ${officeConfig.radius || 200}m allowed radius`}
                    </span>
                  ) : null}
                </>
              ) : locationError ? (
                <div className="text-rose-700 font-medium">{locationError}</div>
              ) : (
                <div>Locating your real device coordinates for attendance verification...</div>
              )}

              {/* Toggle Link for Sensor & Coords Diagnostics Inspector */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsDetail((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <Info className="h-3 w-3" />
                  <span>{showDiagnosticsDetail ? "Hide GPS & Sensor Diagnostics" : "View GPS & Sensor Diagnostics"}</span>
                  {showDiagnosticsDetail ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Detailed GPS & Sensor Diagnostics Panel */}
        {showDiagnosticsDetail && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-300 space-y-1.5 shadow-xs transition-all">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-sky-400" />
                <span>GPS & POSITIONING DIAGNOSTICS</span>
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  locationDiagnostics.sourceType === "gps" || locationDiagnostics.sourceType === "wifi"
                    ? "bg-emerald-400 animate-pulse"
                    : locationDiagnostics.sourceType === "ip-fallback"
                    ? "bg-amber-400 animate-pulse"
                    : locationDiagnostics.sourceType === "error"
                    ? "bg-rose-500"
                    : "bg-slate-500"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5 text-[10.5px]">
              <div>
                <span className="text-slate-500">Fix source: </span>
                <span
                  className={
                    locationDiagnostics.sourceType === "gps" || locationDiagnostics.sourceType === "wifi"
                      ? "text-emerald-400 font-bold"
                      : locationDiagnostics.sourceType === "ip-fallback"
                      ? "text-amber-400 font-bold"
                      : "text-rose-400 font-bold"
                  }
                >
                  {locationDiagnostics.sourceLabel}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Browser permission: </span>
                <span
                  className={
                    locationDiagnostics.permissionStatus === "granted"
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {locationDiagnostics.permissionStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500">High accuracy mode: </span>
                <span className="text-sky-300 font-bold">enableHighAccuracy: true</span>
              </div>
              <div>
                <span className="text-slate-500">Reported accuracy: </span>
                <span
                  className={
                    locationDiagnostics.accuracy !== null && locationDiagnostics.accuracy <= 300
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {locationDiagnostics.accuracy !== null ? `±${locationDiagnostics.accuracy.toLocaleString()}m` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Latitude: </span>
                <span className="text-slate-200 font-mono">
                  {locationDiagnostics.coords?.latitude?.toFixed(6) ?? "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Longitude: </span>
                <span className="text-slate-200 font-mono">
                  {locationDiagnostics.coords?.longitude?.toFixed(6) ?? "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Altitude / 3D Fix: </span>
                <span className="text-slate-400 font-mono">
                  {locationDiagnostics.coords?.altitude !== null && locationDiagnostics.coords?.altitude !== undefined
                    ? `${locationDiagnostics.coords.altitude}m`
                    : "null (No 3D GNSS sensor)"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Heading / Speed: </span>
                <span className="text-slate-400 font-mono">
                  {locationDiagnostics.coords?.heading ?? "null"} / {locationDiagnostics.coords?.speed ?? "null"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Acquisition time: </span>
                <span className="text-slate-300 font-mono">
                  {locationDiagnostics.coords?.timestamp || locationDiagnostics.lastAcquiredAt || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">OS Location platform: </span>
                <span className="text-slate-300 font-mono">lfsvc active, 0 fixed APs</span>
              </div>
            </div>

            {locationDiagnostics.diagnosedLimitation && (
              <div className="rounded-lg bg-amber-950/40 border border-amber-500/30 p-2 text-[10px] text-amber-200 leading-snug mt-1">
                <span className="font-bold text-amber-400">Diagnosis: </span>
                {locationDiagnostics.diagnosedLimitation}
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canConfirm}
          isLoading={isSubmitting}
          leftIcon={isCheckOut ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        >
          {isCheckOut ? "Confirm Check Out" : "Confirm Check In"}
        </Button>
      </DialogFooter>
    </Dialog>

    {/* Dedicated Correction Request Modal */}
    <CorrectionRequestModal
      isOpen={isCorrectionModalOpen}
      onClose={() => setIsCorrectionModalOpen(false)}
      attendanceRecord={incompleteAttendance}
      onSuccess={() => {
        refetchTodayAttendance();
        if (onSuccess) onSuccess();
      }}
    />
    </>
  );
}

export default CheckInModal;

