const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      }
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    avatar: {
      type: String,
      default: ""
    },

    googleId: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },

    loginCount: {
      type: Number,
      default: 0
    },

    lastLogin: {
      type: Date,
      default: null
    },

    credits: {
      type: Number,
      default: 1000,
      min: 0
    },

    maxDailyCredits: {
      type: Number,
      default: 1000
    },

    lastCreditRefill: {
      type: Date,
      default: Date.now
    },

    loginHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);