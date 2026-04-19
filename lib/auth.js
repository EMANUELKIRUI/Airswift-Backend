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

/**
 * Handle Google OAuth token verification
 * @param {string} googleToken - Google ID token from Google Sign-In
 * @returns {Promise<Object>} Response with JWT token and user data
 */
export const verifyGoogleToken = async (googleToken) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: googleToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Google token verification failed");
    }

    const data = await response.json();

    // Store token and user info
    if (data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error("Google OAuth error:", error.message);
    throw error;
  }
};

/**
 * Handle role-based redirect after successful login
 * @param {Object} user - User object with role
 * @param {Function} router - Next.js router or similar navigation function
 */
export const redirectAfterLogin = (user, router) => {
  if (!user || !router) return;

  if (user.role === "admin") {
    router.push("/admin/dashboard");
  } else {
    router.push("/dashboard");
  }
};