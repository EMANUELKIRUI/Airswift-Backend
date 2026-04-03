const router = require("express").Router();
const FirebaseAuthController = require("../controllers/firebaseAuthController");
const { verifyFirebaseToken, syncFirebaseUser } = require("../middleware/firebaseAuth");

// Firebase Authentication Routes

// Verify Firebase ID token
router.post("/verify-token", verifyFirebaseToken, FirebaseAuthController.verifyToken);

// Sync Firebase user with local database
router.post("/sync-user", verifyFirebaseToken, FirebaseAuthController.syncUser);

// Get user profile
router.get("/profile", verifyFirebaseToken, FirebaseAuthController.getProfile);

// Update user profile
router.put("/profile", verifyFirebaseToken, FirebaseAuthController.updateProfile);

// Delete user account
router.delete("/account", verifyFirebaseToken, FirebaseAuthController.deleteAccount);

// Create custom token (for admin use)
router.post("/custom-token", FirebaseAuthController.createCustomToken);

// Generate email sign-in link
router.post("/sign-in-link", FirebaseAuthController.generateSignInLink);

// Protected route example with Firebase auth
router.get("/dashboard", verifyFirebaseToken, syncFirebaseUser, (req, res) => {
  res.json({
    message: "Welcome to Firebase authenticated dashboard",
    user: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name,
      dbUser: req.user.dbUser
    }
  });
});

module.exports = router;