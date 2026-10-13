/**
 * Error handling utilities for the application.
 * Safely extracts error messages from various error sources.
 */

/**
 * Extracts a human-readable error message from various error types.
 * Handles axios errors, network errors, and regular errors.
 * 
 * @param {Error|Object} error - The error to extract message from
 * @param {string} defaultMessage - Default message if no message can be extracted
 * @returns {string} The extracted error message
 */
export function getErrorMessage(error, defaultMessage = 'Terjadi kesalahan') {
  // Handle axios errors (from api.js interceptor)
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  // Handle errors from api.js interceptor (network errors)
  if (error?.error?.message) {
    return error.error.message;
  }
  
  // Handle regular Error objects
  if (error?.message) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle response data that might be a string
  if (error?.response?.data && typeof error.response.data === 'string') {
    return error.response.data;
  }
  
  // Fallback to default message
  return defaultMessage;
}

/**
 * Extracts error message specifically for axios errors.
 * Useful when you know the error is from axios.
 * 
 * @param {Error} error - Axios error
 * @param {string} defaultMessage - Default message
 * @returns {string} The error message
 */
export function getAxiosErrorMessage(error, defaultMessage = 'Terjadi kesalahan jaringan') {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.statusText) {
    return error.response.statusText;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
}

export default { getErrorMessage, getAxiosErrorMessage };
