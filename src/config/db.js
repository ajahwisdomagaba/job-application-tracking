import mongoose from "mongoose";

export const getMongoUri = () => {
    const uri = process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim();

    if (!uri) {
        throw new Error("MongoDB URI is missing. Set MONGODB_URI in .env.");
    }

    return uri;
};

export const connectDB = async () => {
    await mongoose.connect(getMongoUri());
    console.log("Connected to MongoDB");
};