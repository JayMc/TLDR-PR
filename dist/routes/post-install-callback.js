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
import { Installation } from "../models/installation.js";
const router = express.Router();
router.get("/post-install-callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const record = yield Installation.findOneAndUpdate(filter, update, options);
        res.send(`
      <h1>GitHub App Installed!</h1>
      <p>Installation ID: ${installation_id}</p>
      <p>Setup Action: ${setup_action || "(none)"}</p>
    `);
    }
    catch (error) {
        console.error("Error in /post-install-callback:", error);
        res.status(500).send("Error handling installation callback");
    }
}));
export { router as homeRoute };
