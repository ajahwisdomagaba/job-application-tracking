import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const requiredEnv = ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

function getAdminConfig() {
  const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  const name = process.env.ADMIN_NAME.trim();
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  return { name, email, password };
}

async function setupAdmin() {
  const { name, email, password } = getAdminConfig();
  await connectDB();

  const existingUser = await User.findOne({ email }).select('+password');

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      throw new Error(
        `The email ${email} already belongs to a non-admin account. Choose a different ADMIN_EMAIL; this script will not promote an existing user.`,
      );
    }

    console.log(`An admin account already exists for ${email}. No changes made.`);
    return;
  }

  const admin = new User({
    name,
    email,
    password,
    role: 'admin',
    isEmailConfirmed: true,
  });

  // User.js hashes passwords in its pre-save hook. Do not hash here as well.
  await admin.save();
  console.log(`Admin account created successfully for ${email}.`);
}

try {
  await setupAdmin();
} catch (error) {
  console.error(`Admin setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
