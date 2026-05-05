import axios from "axios";

/**
 * Axios instance with automatic refresh token logic
 * Handles 401 responses by attempting to refresh the token
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL + '/api',
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Flag to prevent infinite loop of refresh attempts
 */
let isRefreshing = false;
let failedQueue = [];

/**
 * Queue failed requests while refreshing token
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Request interceptor: Add access token to headers
 */
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📡 API baseURL set to: ${API_BASE_URL}`);
    console.log(`📤 API REQUEST INTERCEPTOR:`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Method: ${config.method?.toUpperCase()}`);
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    console.log(`   Token in localStorage: ${token ? '✓ FOUND' : '✗ MISSING'}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log(`   ℹ️ Skipping Authorization header for auth request`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle 401 errors with token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry once to avoid infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Call refresh token endpoint
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          token: refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in localStorage
        localStorage.setItem("accessToken", accessToken);

        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // Update default header
        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        // Process the queue
        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        processQueue(refreshError, null);

        // Redirect to login page
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Add trigger to manually refresh token
apiClient.refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      token: refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    const token = accessToken;

    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);

    if (newRefreshToken) {
      localStorage.setItem("refreshToken", newRefreshToken);
    }

    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;

    return accessToken;
  } catch (error) {
    console.error("Manual token refresh failed:", error);
    // Clear tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    throw error;
  }
};

/**
 * Utility function to check if token is expired
 */
apiClient.isTokenExpired = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");

  if (!token) return true;

  try {
    // Decode JWT without verification (client-side only for checking expiration)
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const decoded = JSON.parse(jsonPayload);

    // Check if token expires within next 1 minute
    const expiresIn = decoded.exp * 1000 - Date.now();
    return expiresIn < 60000; // 1 minute buffer
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
};

/**
 * Proactive token refresh
 * Call this periodically to refresh token before it expires
 */
apiClient.proactiveRefresh = async () => {
  if (apiClient.isTokenExpired()) {
    try {
      await apiClient.refreshToken();
    } catch (error) {
      console.warn("Proactive token refresh failed:", error);
    }
  }
};

// Setup proactive refresh every 10 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    apiClient.proactiveRefresh();
  }, 10 * 60 * 1000);
}

export default apiClient;
