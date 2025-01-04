import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    installation_id: {
      type: String,
      required: true,
      // unique: true,
    },
    usage: {
      apiCalls: Number,
      promptTokensActual: Number,
      completionTokensActual: Number,
      totalTokensActual: Number,
      promptTokensEstimated: Number,
      completionTokensEstimated: Number,
      totalTokensEstimated: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Usage = mongoose.model("Usage", usageSchema);

export { Usage };
