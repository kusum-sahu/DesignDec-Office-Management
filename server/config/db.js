import mongoose from "mongoose";

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Attempt ${attempt}/${retries} Failed:`, error.message);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("❌ All MongoDB connection attempts exhausted.");
      }
    }
  }
};

export default connectDB;
