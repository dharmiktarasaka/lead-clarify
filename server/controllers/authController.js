const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getAndRefillCredits, DAILY_CREDITS } = require("../services/creditService");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || "user"
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Browser";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      status: "active",
      loginCount: 1,
      lastLogin: new Date(),
      credits: DAILY_CREDITS,
      maxDailyCredits: DAILY_CREDITS,
      lastCreditRefill: new Date(),
      loginHistory: [
        {
          timestamp: new Date(),
          ip: clientIp,
          userAgent: userAgent
        }
      ]
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        credits: user.credits || DAILY_CREDITS,
        maxDailyCredits: user.maxDailyCredits || DAILY_CREDITS,
        lastCreditRefill: user.lastCreditRefill
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password"
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact the administrator."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Record login metrics
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Browser";

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.unshift({
      timestamp: new Date(),
      ip: clientIp,
      userAgent: userAgent
    });
    if (user.loginHistory.length > 15) {
      user.loginHistory = user.loginHistory.slice(0, 15);
    }

    await user.save();

    user = await getAndRefillCredits(user);

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        status: user.status || "active",
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        credits: user.credits !== undefined ? user.credits : DAILY_CREDITS,
        maxDailyCredits: user.maxDailyCredits || DAILY_CREDITS,
        lastCreditRefill: user.lastCreditRefill
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended."
      });
    }

    user = await getAndRefillCredits(user);

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { email, name, avatar, uid } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required for Google Sign-In"
      });
    }

    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Browser";

    let user = await User.findOne({ email });

    if (user) {
      if (user.status === "suspended") {
        return res.status(403).json({
          message: "Your account has been suspended. Please contact the administrator."
        });
      }

      if (avatar && !user.avatar) user.avatar = avatar;
      if (uid && !user.googleId) user.googleId = uid;
      user.loginCount = (user.loginCount || 0) + 1;
      user.lastLogin = new Date();

      if (!user.loginHistory) user.loginHistory = [];
      user.loginHistory.push({
        timestamp: new Date(),
        ip: clientIp,
        userAgent: userAgent
      });
      if (user.loginHistory.length > 50) {
        user.loginHistory = user.loginHistory.slice(-50);
      }

      await user.save();
    } else {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        authProvider: "google",
        avatar: avatar || "",
        googleId: uid || "",
        role: "user",
        status: "active",
        loginCount: 1,
        lastLogin: new Date(),
        loginHistory: [
          {
            timestamp: new Date(),
            ip: clientIp,
            userAgent: userAgent
          }
        ]
      });
    }

    user = await getAndRefillCredits(user);

    const token = generateToken(user);

    res.json({
      message: "Google sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        credits: user.credits !== undefined ? user.credits : DAILY_CREDITS,
        maxDailyCredits: user.maxDailyCredits || DAILY_CREDITS,
        lastCreditRefill: user.lastCreditRefill
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  getMe
};