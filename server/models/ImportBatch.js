const mongoose = require("mongoose");

const importBatchSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    totalRows: {
      type: Number,
      default: 0
    },
    cleanCount: {
      type: Number,
      default: 0
    },
    incompleteCount: {
      type: Number,
      default: 0
    },
    scrapCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["completed", "partial", "recovered"],
      default: "completed"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ImportBatch", importBatchSchema);
