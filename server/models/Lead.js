const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    companyName: {
      type: String,
      required: true
    },

    contactName: String,

    email: String,

    phone: String,

    website: String,

    industry: String,

    location: String,

    source: {
      type: String,
      default: "manual"
    },

    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "replied",
        "qualified",
        "won",
        "lost"
      ],
      default: "new"
    },

    score: {
      type: Number,
      default: 0
    },

    notes: String,

    aiAnalysis: String,

    aiMessage: String,

    customFields: {
      type: Object,
      default: {}
    },

    isScrap: {
      type: Boolean,
      default: false,
      index: true
    },

    scrapReasons: {
      type: [String],
      default: []
    },

    completenessStatus: {
      type: String,
      enum: ["complete", "incomplete"],
      default: "complete"
    },

    missingFields: {
      type: [String],
      default: []
    },

    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      index: true
    },

    importFileName: {
      type: String
    },

    recoveredAt: {
      type: Date
    },

    verification: {
      status: {
        type: String,
        enum: [
          "unverified",
          "partially_verified",
          "verified",
          "high_confidence",
          "needs_review"
        ],
        default: "unverified",
        index: true
      },

      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        index: true
      },

      signals: {
        businessExists: { type: Boolean, default: null },
        websiteReachable: { type: Boolean, default: false },
        websiteHttps: { type: Boolean, default: false },
        domainMatch: { type: Boolean, default: false },
        phoneValid: { type: Boolean, default: false },
        phoneMatched: { type: Boolean, default: false },
        emailValid: { type: Boolean, default: false },
        businessEmail: { type: Boolean, default: false },
        emailDomainMatch: { type: Boolean, default: false },
        locationMatch: { type: Boolean, default: false },
        duplicateDetected: { type: Boolean, default: false }
      },

      sources: [{ type: String }],

      warnings: [{ type: String }],

      evidence: {
        type: Object,
        default: {}
      },

      lastVerifiedAt: {
        type: Date,
        index: true
      },

      verificationHistory: [
        {
          verifiedAt: { type: Date, default: Date.now },
          score: Number,
          status: String,
          signals: Object
        }
      ]
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

module.exports = mongoose.model("Lead", leadSchema);