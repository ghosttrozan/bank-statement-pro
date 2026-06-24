import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import User from '../models/User';

async function run() {
  dotenv.config();
  await connectDB();
  const users = await User.find({}).lean();
  console.log(JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
