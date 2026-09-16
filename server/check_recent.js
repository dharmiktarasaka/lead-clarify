require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const leads = await mongoose.connection.collection("leads").find({}).sort({ updatedAt: -1 }).limit(6).toArray();
  console.log("Recent leads:");
  for (const l of leads) {
    console.log({
      id: l._id.toString(),
      name: l.companyName,
      contact: l.contactName,
      phone: l.phone,
      email: l.email,
      web: l.website,
      location: (l.location || "").slice(0, 50)
    });
  }
  process.exit(0);
}

main().catch(console.error);
