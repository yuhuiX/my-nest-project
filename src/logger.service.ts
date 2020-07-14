/**
 * @description print log with level "DEBUG"
 * @param message
 */
export function debug(message) {
  console.log('[DEBUG]', new Date(), '\n', message);
}

/**
 * @description print log with level "ERROR"
 * @param message
 */
export function error(message) {
  console.log('[ERROR]', new Date(), '\n', message);
}
