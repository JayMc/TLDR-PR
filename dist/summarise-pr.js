var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import OpenAI from "openai";
/**
 * Fetches and sums all additions/deletions for the files in a given PR.
 *
 * @param octokit     Authenticated Octokit instance (installation token).
 * @param owner       Repository owner (e.g., "octocat").
 * @param repo        Repository name (e.g., "Hello-World").
 * @param pull_number Pull request number.
 * @returns           An object with total additions, deletions, and their sum.
 */
export function fetchPRPatchChanges(octokit, owner, repo, pull_number) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: files } = yield octokit.pulls.listFiles({
            owner,
            repo,
            pull_number,
        });
        const fileChanges = files.map((file) => ({
            filename: file.filename,
            patch: file.patch,
        }));
        return fileChanges;
    });
}
export function summarisePatchToEnglish(patch) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const OPEN_AI_TLDR_PR_API_KEY = process.env.OPEN_AI_TLDR_PR_API_KEY || "";
            const client = new OpenAI({
                apiKey: OPEN_AI_TLDR_PR_API_KEY,
            });
            const patchSummarisation = yield client.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `
          Summarise the patch in short and concise bullet points. \n
          ${patch}`,
                    },
                ],
                model: "gpt-4o-mini",
            });
            console.log("patchSummarisation", JSON.stringify(patchSummarisation, null, 2));
            const summ = (_c = (_b = (_a = patchSummarisation === null || patchSummarisation === void 0 ? void 0 : patchSummarisation.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : "no summary";
            return summ;
        }
        catch (error) {
            console.error("Error calling open AI", error);
            return res.status(500).send("Internal Server Error");
        }
    });
}
export function isIgnoredFile(filePath) {
    const filesToIgnore = ["package-lock.json", "node_modules", "dist"];
    return filesToIgnore.some((ignoredPath) => filePath === ignoredPath || filePath.startsWith(ignoredPath + "/"));
}
