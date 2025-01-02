var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import mongoose from "mongoose";
// Connect to your MongoDB. You can store the URI in an env variable.
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const username = process.env.MONGODB_TLDR_PR_USERNAME || "";
    const password = process.env.MONGODB_TLDR_PR_PASSWORD || "";
    if (!username || !password) {
        console.log("no username or password found");
    }
    const connectionUri = `mongodb+srv://${username}:${password}@cluster0.1ichd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
    try {
        yield mongoose.connect(connectionUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    }
    catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
});
export { connectDB };
