/**
 * Calculate Employee Working Hours
 * @param {Date} checkInTime
 * @param {Date} checkOutTime
 * @returns {Number}
 */

const calculateWorkingHours = (checkInTime, checkOutTime) => {

    // Validation
    if (!checkInTime || !checkOutTime) {
        return 0;
    }

    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);

    // Invalid Date Protection
    if (
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime())
    ) {
        return 0;
    }

    // Checkout before Checkin
    if (checkOut <= checkIn) {
        return 0;
    }

    // Difference in Milliseconds
    const difference = checkOut - checkIn;

    // Milliseconds → Hours
    const hours = difference / (1000 * 60 * 60);

    // Return up to 2 decimal places
    return Number(hours.toFixed(2));
};

export default calculateWorkingHours;