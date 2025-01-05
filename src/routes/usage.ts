import express from "express";
import { getUsage } from "../helpers.js";

const router = express.Router();

router.get("/usage", async (req, res) => {
  const { installation_id } = req.query;
  if (!installation_id || typeof installation_id !== "string") {
    res.status(400).send('Missing or invalid "installation_id" in query.');
    return;
  }
  const usageTotals = await getUsage(installation_id);

  try {
    res.send(`
      <p>installation_id: ${installation_id} </p>
      <p>API calls: ${usageTotals.apiCalls} </p>
      <p>PromptTokens tokens: ${usageTotals.promptTokens} </p>
      <p>CompletionTokens tokens: ${usageTotals.completionTokens} </p>
      <p>Total tokens: ${
        usageTotals.promptTokens + usageTotals.completionTokens
      } </p>
        `);
  } catch (error) {
    console.error("Error in /usage:", error);
    res.status(500).send("Error handling usage");
  }
});
export { router as usageRoute };
