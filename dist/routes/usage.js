var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { getUsage } from "../helpers.js";
const router = express.Router();
router.get("/usage", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { installation_id } = req.query;
    if (!installation_id || typeof installation_id !== "string") {
        res.status(400).send('Missing or invalid "installation_id" in query.');
        return;
    }
    const usageTotals = yield getUsage(installation_id);
    try {
        res.send(`
      <p>installation_id: ${installation_id} </p>
      <p>API calls: ${usageTotals.apiCalls} </p>
      <p>PromptTokens tokens: ${usageTotals.promptTokens} </p>
      <p>CompletionTokens tokens: ${usageTotals.completionTokens} </p>
      <p>Total tokens: ${usageTotals.promptTokens + usageTotals.completionTokens} </p>
        `);
    }
    catch (error) {
        console.error("Error in /usage:", error);
        res.status(500).send("Error handling usage");
    }
}));
export { router as usageRoute };
