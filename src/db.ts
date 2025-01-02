import mongoose from "mongoose";

// Connect to your MongoDB. You can store the URI in an env variable.
const connectDB = async () => {
  const username = process.env.MONGODB_TLDR_PR_USERNAME || "";
  const password = process.env.MONGODB_TLDR_PR_PASSWORD || "";

  if (!username || !password) {
    console.log("no username or password found");
  }

  const connectionUri = `mongodb+srv://${username}:${password}@cluster0.1ichd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

  try {
    await mongoose.connect(connectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export { connectDB };
