require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@leadagent.ai";
    const adminPass = process.env.ADMIN_PASSWORD || "Admin@123456";

    // 1. Check if an admin already exists
    let existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log(`✅ Admin already exists: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      process.exit(0);
    }

    // 2. Check if a user with adminEmail exists and promote them
    let userByEmail = await User.findOne({ email: adminEmail.toLowerCase() });
    if (userByEmail) {
      userByEmail.role = "admin";
      userByEmail.status = "active";
      await userByEmail.save();
      console.log(`✅ Promoted existing user ${adminEmail} to Administrator role.`);
      process.exit(0);
    }

    // 3. Alternatively, if there is at least one user, promote the first user to admin
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    if (firstUser) {
      firstUser.role = "admin";
      firstUser.status = "active";
      await firstUser.save();
      console.log(`✅ Promoted primary user ${firstUser.email} to Administrator role!`);
    }

    // 4. Also ensure dedicated admin account exists
    const hashedPassword = await bcrypt.hash(adminPass, 10);
    const newAdmin = await User.create({
      name: "Platform Administrator",
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      status: "active",
      loginCount: 1,
      lastLogin: new Date()
    });

    console.log(`🚀 Created new Administrator account:`);
    console.log(`   Email:    ${newAdmin.email}`);
    console.log(`   Password: ${adminPass}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed admin error:", error);
    process.exit(1);
  }
};

seedAdmin();
