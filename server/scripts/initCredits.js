require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await User.updateMany(
    {
      $or: [
        { credits: { $exists: false } },
        { credits: null }
      ]
    },
    {
      $set: {
        credits: 1000,
        maxDailyCredits: 1000,
        lastCreditRefill: new Date()
      }
    }
  );
  console.log("Updated users with 1,000 free credits:", result.modifiedCount);
  await mongoose.disconnect();
}

run().catch(console.error);
