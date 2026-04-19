const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { findUserByEmail, createUser } = require("../utils/userHelpers");
const { generateAccessToken } = require("../utils/tokenHelpers");

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
