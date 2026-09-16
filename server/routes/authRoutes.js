const express = require("express");

const {
  register,
  login,
  googleAuth,
  getMe
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, getMe);

module.exports = router;