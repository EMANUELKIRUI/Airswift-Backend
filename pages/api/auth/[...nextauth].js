import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import api from "../../../api";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  
  // Use JWT for stateless sessions
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Callbacks for custom logic
  callbacks: {
    /**
     * Called when JWT is created or updated
     * Add Google token to JWT
     */
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /**
     * Called when session is accessed
     * Add user info to session
     */
    async session({ session, token }) {
      session.user.id = token.id;
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      return session;
    },

    /**
     * Called when user signs in via OAuth
     * Sync Google user with your backend database
     */
    async signIn({ user, account, profile }) {
      try {
        if (account.provider === "google") {
          console.log("🔐 Google Sign-In Attempt:", {
            email: user.email,
            name: user.name,
            image: user.image,
          });

          // ✅ STEP 1: Check if user exists in your backend DB
          const response = await api.post("/auth/google-login", {
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: profile.sub,
          });

          // ✅ FIX: Handle different response formats from backend
          const data = response.data || response;
          const isSuccess = data.success || !!data.token;
          const token = data.token || data.accessToken;

          if (isSuccess && token) {
            // ✅ STEP 2: Store the backend token for API calls
            if (typeof window === "undefined") {
              // Server-side only: store token in session/database
              user.backendToken = token;
              user.role = data.user?.role || "user";
              user.userId = data.user?.id || data.user?._id;
            }
            console.log("✅ Google SignIn Successful");
            return true;
          } else {
            console.error("❌ Backend rejected Google login:", data.error || data.message);
            return false;
          }
        }
        return true;
      } catch (error) {
        console.error("❌ Error during Google SignIn:", error.message);
        console.error("❌ Full error:", error);
        return false;
      }
    },

    /**
     * Redirect after successful sign in
     */
    async redirect({ url, baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },

  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
