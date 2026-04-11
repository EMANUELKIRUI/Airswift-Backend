const adminOnly = (req, res, next) => {
  // 🚨 STEP 5: PROTECT BACKEND (avoid 500)
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

module.exports = adminOnly;