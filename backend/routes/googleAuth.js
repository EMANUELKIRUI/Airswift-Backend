const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { OAuth2Client } = require("google-auth-library");
const { findUserByEmail, createUser } = require("../utils/userHelpers");
const { generateAccessToken } = require("../utils/tokenHelpers");
const { getPermissions } = require("../config/roles");

const router = express.Router();
router.use(passport.initialize());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://airswift-frontend.vercel.app";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️ Google OAuth is not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  console.log("✅ Google OAuth routes will return 501 (Not Implemented)");
}

// Initialize Google OAuth client for token verification
let googleClient = null;
if (GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
}

// Only initialize Google strategy if credentials are available
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email) {
            return done(new Error("Google profile email not available"));
          }

          const normalizedEmail = email.toLowerCase().trim();
          let user = await findUserByEmail(normalizedEmail);

          if (!user) {
            user = await createUser({
              name: profile.displayName || normalizedEmail,
              email: normalizedEmail,
              role: "user",
              isVerified: true,
              authProvider: "google",
              profilePicture: profile?.photos?.[0]?.value,
            });
          } else {
            user.authProvider = "google";
            user.isVerified = true;
            if (!user.name) user.name = profile.displayName || normalizedEmail;
            if (!user.profilePicture && profile?.photos?.[0]?.value) {
              user.profilePicture = profile.photos[0].value;
            }
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// ✅ POST /auth/google - Verify Google token and return JWT
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    if (!googleClient) {
      return res.status(501).json({ message: "Google OAuth not configured" });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name || email;
    const picture = payload.picture;

    if (!email) {
      return res.status(400).json({ message: "Email not found in Google token" });
    }

    // Find or create user
    let user = await findUserByEmail(email);

    if (!user) {
      user = await createUser({
        name,
        email,
        role: "user",
        isVerified: true,
        authProvider: "google",
        profilePicture: picture,
      });
    } else {
      // Update user with Google info if it's the first time
      if (!user.authProvider || user.authProvider !== "google") {
        user.authProvider = "google";
        user.isVerified = true;
      }
      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
      }
      await user.save();
    }

    // Generate JWT token
    const jwtToken = generateAccessToken(user);
    const permissions = getPermissions(user.role);

    // Return JWT and user info
    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture,
        permissions,
      },
    });
  } catch (error) {
    console.error("Google OAuth verification error:", error.message);

    if (error.message.includes("Invalid token")) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get(
  "/google",
  (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ message: "Google OAuth not configured" });
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ message: "Google OAuth not configured" });
    }
    next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`,
  }),
  (req, res) => {
    const token = generateAccessToken(req.user);
    res.redirect(`${FRONTEND_URL}/oauth-success?token=${token}`);
  }
);

module.exports = router;
