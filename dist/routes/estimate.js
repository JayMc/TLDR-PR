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
import { estimateTokens } from "../helpers.js";
const router = express.Router();
router.get("/estimate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { text } = req.query;
    const estimatedTokens = estimateTokens(text !== null && text !== void 0 ? text : "hello world");
    res.send(`
      <p>text: ${text} </p>
      <p>number of tokens: ${estimatedTokens} </p>
      `);
}));
export { router as estimateRoute };
