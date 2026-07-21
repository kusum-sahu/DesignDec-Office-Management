/**
 * Format Date & Time
 *
 * @param {Date | String} date
 * @param {Object} options
 * @returns {String}
 */

const formatDateTime = (

    date,

    {
        locale = "en-IN",

        timeZone = "Asia/Kolkata",

        dateStyle = "medium",

        timeStyle = "short",

    } = {}

) => {

    if (!date) return "";

    const formattedDate = new Date(date);

    if (Number.isNaN(formattedDate.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(locale, {

        dateStyle,

        timeStyle,

        timeZone,

    }).format(formattedDate);

};

export default formatDateTime;