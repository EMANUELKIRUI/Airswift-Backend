// ✅ GLOBAL AUTH UTILITIES
// Centralized authentication helpers

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null if not found/invalid
 */
export const getUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

/**
 * Check if current user is admin
 * @returns {boolean} True if user is admin
 */
export const isAdmin = () => {
  const user = getUser();
  return user && user.role === "admin";
};

/**
 * Check if user is logged in
 * @returns {boolean} True if user exists
 */
export const isLoggedIn = () => {
  return getUser() !== null;
};

/**
 * Get auth token from localStorage
 * @returns {string|null} Token or null if not found
 */
export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/**
 * Clear all auth data (logout)
 */
export const clearAuth = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("adminToken");
};