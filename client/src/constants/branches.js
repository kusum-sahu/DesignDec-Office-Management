export const BRANCHES = [
  "Main Office",
  "Santoshpur Branch",
];

export const BRANCH_CONFIG = {
  "Main Office": {
    name: "Main Office",
    code: "MO",
    description: "DesignDec Central Headquarters & Production",
    color: "brand",
    latitude: 19.314962,
    longitude: 84.794091,
    radius: 200,
    address: "Main Office, Berhampur, Ganjam, Odisha",
  },
  "Santoshpur Branch": {
    name: "Santoshpur Branch",
    code: "SB",
    description: "Santoshpur Retail & Order Booking Unit",
    color: "slate",
    latitude: 20.25880,
    longitude: 85.78840,
    radius: 200,
    address: "Santoshpur Branch, Odisha",
  },
};

/**
 * Calculate distance in meters using the Haversine formula
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
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
}

export default BRANCHES;
