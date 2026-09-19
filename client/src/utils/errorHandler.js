/**
 * Extract clean, user-friendly error message from backend Axios errors
 * @param {Error} error
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function getErrorMessage(error, fallbackMessage = "An unexpected error occurred. Please try again.") {
  if (!error) return fallbackMessage;

  // Handle Axios response error from backend
  if (error.response) {
    const data = error.response.data;

    if (data) {
      // If validation error array exists
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors.join(". ");
      }

      // If error message string exists
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
      }

      // If data itself is a string
      if (typeof data === "string" && data.trim()) {
        return data.trim();
      }
    }

    // Status code fallback
    if (error.response.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (error.response.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.response.status === 404) {
      return "Requested resource was not found.";
    }
    if (error.response.status >= 500) {
      return "Server error occurred. Please contact system administrator.";
    }
  }

  // Network / Connection Error
  if (error.request && !error.response) {
    return "Cannot connect to server. Please check your internet connection or try again later.";
  }

  // Generic Error object
  if (error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export default getErrorMessage;
