import express from "express";
import { estimateTokens } from "../helpers.js";

const router = express.Router();
router.get("/estimate", async (req, res) => {
  const { text } = req.query;

  const estimatedTokens = estimateTokens(text ?? "hello world");
  res.send(`
      <p>text: ${text} </p>
      <p>number of tokens: ${estimatedTokens} </p>
      `);
});
export { router as estimateRoute };
