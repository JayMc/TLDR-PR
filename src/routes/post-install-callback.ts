import express from "express";
import { Installation } from "../models/installation.js";

const router = express.Router();

router.get("/post-install-callback", async (req, res) => {
  try {
    const { installation_id, setup_action } = req.query;
    if (!installation_id) {
      return res.status(400).send('Missing "installation_id" in query.');
    }

    const filter = { installation_id };
    const update = {
      app_id: process.env.GITHUB_TLDR_PR_APP_ID,
      installation_id,
      limits: {
        apiCalls: 30,
        promptTokens: 1000000,
        completionTokens: 1000000,
      },
    };
    const options = { upsert: true, new: true };

    const record = await Installation.findOneAndUpdate(filter, update, options);

    res.send(`
      <h1>GitHub App Installed!</h1>
      <p>Installation ID: ${installation_id}</p>
      <p>Setup Action: ${setup_action || "(none)"}</p>
    `);
  } catch (error) {
    console.error("Error in /post-install-callback:", error);
    res.status(500).send("Error handling installation callback");
  }
});
export { router as homeRoute };
