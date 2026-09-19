/**
 * Helper to retry an asynchronous function with exponential backoff and jitter
 * @param {Function} fn - Async function returning a result
 * @param {Object} options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 2)
 * @param {number} options.initialDelayMs - Initial delay before retry (default: 300ms)
 * @param {number} options.factor - Exponential multiplication factor (default: 2)
 * @param {string} options.operationName - Human-readable name for logging
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(
  fn,
  {
    maxRetries = 2,
    initialDelayMs = 300,
    factor = 2,
    operationName = "operation",
  } = {}
) {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt > maxRetries) {
        throw error;
      }

      // Check if error is explicitly marked non-retryable (e.g. 400 Bad Request / Invalid phone format)
      if (error.nonRetryable || error.status === 400 || error.statusCode === 400) {
        throw error;
      }

      // Exponential backoff with small random jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const sleepTime = Math.max(50, Math.round(delay + jitter));

      console.warn(
        `[RetryHelper] ${operationName} failed (attempt ${attempt}/${maxRetries + 1}). Retrying in ${sleepTime}ms... Error: ${error.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      delay *= factor;
    }
  }
}
