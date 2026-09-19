import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "../models/User.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await User.updateOne(
    { email: "simransahu1218@gmail.com" },
    { $set: { role: "Branch Manager", designation: "Branch Manager" } }
  );
  console.log("Update result:", res);
  const updated = await User.findOne({ email: "simransahu1218@gmail.com" }, "name email role designation branch");
  console.log("Updated user:", updated);
  await mongoose.disconnect();
}

run();
