/**
 * Calculate Employee Overtime Hours
 *
 * @param {Number} workingHours
 * @param {Number} standardWorkingHours
 * @returns {Number}
 */

const calculateOvertime = (
    workingHours,
    standardWorkingHours = 9
) => {

    // Validation
    if (
        typeof workingHours !== "number" ||
        Number.isNaN(workingHours) ||
        workingHours <= 0
    ) {
        return 0;
    }

    // No Overtime
    if (workingHours <= standardWorkingHours) {
        return 0;
    }

    // Calculate Overtime
    const overtimeHours =
        workingHours - standardWorkingHours;

    // Return 2 Decimal Places
    return Number(overtimeHours.toFixed(2));
};

export default calculateOvertime;