import mongoose from "mongoose";

const installationSchema = new mongoose.Schema(
  {
    installation_id: {
      type: String,
      required: true,
      // unique: true,
    },
    app_id: {
      type: String,
      required: true,
    },
    // You could store a short-lived token or other fields if needed
    jwt: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Installation = mongoose.model("Installation", installationSchema);

export { Installation };
