/**
 * Get the correct API base URL for both development and production
 * @returns {string} The API base URL
 */
export const getApiBaseUrl = () => {
  // Check if we have the environment variable set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Check if we're in production (Vercel, etc.)
  if (process.env.NODE_ENV === 'production') {
    // This is a fallback for production when env var is not set
    return 'https://airswift-backend-fjt3.onrender.com';
  }

  // Development fallback
  return 'http://localhost:5000';
};

/**
 * Construct full API endpoint URL
 * @param {string} path - The API path (e.g., '/auth/login')
 * @returns {string} Full API endpoint URL
 */
export const getApiEndpoint = (path) => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api${path}`;
};
