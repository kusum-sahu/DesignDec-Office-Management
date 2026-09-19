import AttendanceSetting from "../models/AttendanceSetting.js";

/**
 * Calculate the great-circle distance between two geographic coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of first point in decimal degrees
 * @param {number} lon1 Longitude of first point in decimal degrees
 * @param {number} lat2 Latitude of second point in decimal degrees
 * @param {number} lon2 Longitude of second point in decimal degrees
 * @returns {number} Distance in meters rounded to nearest whole meter
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const DEFAULT_OFFICE_LOCATIONS = {
  "Main Office": {
    branchName: "Main Office",
    latitude: 19.314962,
    longitude: 84.794091,
    radius: 200,
    address: "Main Office, Berhampur, Ganjam, Odisha",
  },
  "Santoshpur Branch": {
    branchName: "Santoshpur Branch",
    latitude: 20.25880,
    longitude: 85.78840,
    radius: 200,
    address: "Santoshpur Branch, Odisha",
  },
};

/**
 * Get active configuration for a branch from DB settings or environment/defaults.
 * @param {string} branchName
 * @returns {Promise<{ branchName: string, latitude: number, longitude: number, radius: number, address: string }>}
 */
export const getBranchLocationConfig = async (branchName = "Main Office") => {
  const normalizedBranch =
    branchName === "Santoshpur Branch" ? "Santoshpur Branch" : "Main Office";

  try {
    const setting = await AttendanceSetting.findOne({ isActive: true }).lean();
    if (setting && Array.isArray(setting.branchLocations)) {
      const match = setting.branchLocations.find(
        (b) => b.branchName === normalizedBranch
      );
      if (match && typeof match.latitude === "number" && typeof match.longitude === "number") {
        return {
          branchName: normalizedBranch,
          latitude: match.latitude,
          longitude: match.longitude,
          radius: match.radius || setting.attendanceRadius || 200,
          address: match.address || (DEFAULT_OFFICE_LOCATIONS[normalizedBranch]?.address || ""),
        };
      }
    }
  } catch (err) {
    console.warn("[Geofence] Could not query AttendanceSetting model, using defaults:", err.message);
  }

  // Check Environment overrides
  if (normalizedBranch === "Main Office") {
    return {
      branchName: "Main Office",
      latitude: process.env.MAIN_OFFICE_LAT
        ? Number(process.env.MAIN_OFFICE_LAT)
        : DEFAULT_OFFICE_LOCATIONS["Main Office"].latitude,
      longitude: process.env.MAIN_OFFICE_LNG
        ? Number(process.env.MAIN_OFFICE_LNG)
        : DEFAULT_OFFICE_LOCATIONS["Main Office"].longitude,
      radius: process.env.GEOFENCE_RADIUS_METERS
        ? Number(process.env.GEOFENCE_RADIUS_METERS)
        : 200,
      address: DEFAULT_OFFICE_LOCATIONS["Main Office"].address,
    };
  }

  return {
    branchName: "Santoshpur Branch",
    latitude: process.env.SANTOSHPUR_BRANCH_LAT
      ? Number(process.env.SANTOSHPUR_BRANCH_LAT)
      : DEFAULT_OFFICE_LOCATIONS["Santoshpur Branch"].latitude,
    longitude: process.env.SANTOSHPUR_BRANCH_LNG
      ? Number(process.env.SANTOSHPUR_BRANCH_LNG)
      : DEFAULT_OFFICE_LOCATIONS["Santoshpur Branch"].longitude,
    radius: process.env.GEOFENCE_RADIUS_METERS
      ? Number(process.env.GEOFENCE_RADIUS_METERS)
      : 200,
    address: DEFAULT_OFFICE_LOCATIONS["Santoshpur Branch"].address,
  };
};

export const MAX_ALLOWED_ACCURACY_METERS = 300;

/**
 * Verify whether given employee GPS coordinates fall within the assigned branch's geofence radius.
 * Production-grade geofencing:
 * 1. Validates GPS accuracy first. If accuracy is too poor (> 300m), flags as accuracy error instead of misleading outside radius.
 * 2. If accuracy is acceptable, calculates Haversine distance and checks if distance <= allowedRadius (200m).
 *
 * @param {string} branchName
 * @param {number} userLat
 * @param {number} userLng
 * @param {number|null} accuracy GPS accuracy in meters reported by device
 * @returns {Promise<{
 *   isValid: boolean,
 *   isAccuracyTooLow: boolean,
 *   isWithinRadius: boolean,
 *   distance: number|null,
 *   allowedRadius: number,
 *   accuracy: number|null,
 *   maxAllowedAccuracy: number,
 *   branchName: string,
 *   officeLocation: Object,
 *   message: string
 * }>}
 */
export const verifyOfficeGeofence = async (branchName, userLat, userLng, accuracy = null) => {
  const officeConfig = await getBranchLocationConfig(branchName);

  // 1. Validate GPS Accuracy First
  const numericAccuracy =
    typeof accuracy === "number" && !isNaN(accuracy) ? Math.round(accuracy) : null;

  if (numericAccuracy !== null && numericAccuracy > MAX_ALLOWED_ACCURACY_METERS) {
    return {
      isValid: false,
      isAccuracyTooLow: true,
      isWithinRadius: false,
      distance: null,
      allowedRadius: officeConfig.radius,
      accuracy: numericAccuracy,
      maxAllowedAccuracy: MAX_ALLOWED_ACCURACY_METERS,
      branchName: officeConfig.branchName,
      officeLocation: officeConfig,
      message: `GPS accuracy too low (±${numericAccuracy}m). High-accuracy GPS (within ${MAX_ALLOWED_ACCURACY_METERS}m) is required to verify office presence. Please turn on device location services / Wi-Fi or try on a mobile phone with GPS.`,
    };
  }

  // 2. Haversine Distance Calculation
  const distance = calculateDistanceMeters(
    userLat,
    userLng,
    officeConfig.latitude,
    officeConfig.longitude
  );

  const isWithinRadius = distance <= officeConfig.radius;

  if (!isWithinRadius) {
    return {
      isValid: false,
      isAccuracyTooLow: false,
      isWithinRadius: false,
      distance,
      allowedRadius: officeConfig.radius,
      accuracy: numericAccuracy,
      maxAllowedAccuracy: MAX_ALLOWED_ACCURACY_METERS,
      branchName: officeConfig.branchName,
      officeLocation: officeConfig,
      message: `You are outside the office radius. You are ${distance}m away from ${officeConfig.branchName} (Allowed: ${officeConfig.radius}m).`,
    };
  }

  return {
    isValid: true,
    isAccuracyTooLow: false,
    isWithinRadius: true,
    distance,
    allowedRadius: officeConfig.radius,
    accuracy: numericAccuracy,
    maxAllowedAccuracy: MAX_ALLOWED_ACCURACY_METERS,
    branchName: officeConfig.branchName,
    officeLocation: officeConfig,
    message: `Within office radius (${distance}m from ${officeConfig.branchName}).`,
  };
};

export default {
  calculateDistanceMeters,
  DEFAULT_OFFICE_LOCATIONS,
  getBranchLocationConfig,
  verifyOfficeGeofence,
  MAX_ALLOWED_ACCURACY_METERS,
};
