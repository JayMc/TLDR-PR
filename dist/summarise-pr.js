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
        const fileChanges = files.map((file) => {
            var _a;
            const limitedPatch = (_a = file.patch) === null || _a === void 0 ? void 0 : _a.split("\n").slice(0, 5).join("\n");
            return {
                filename: file.filename,
                patch: limitedPatch,
            };
        });
        return fileChanges;
    });
}
export function summarisePatchToEnglish(fileName, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const OPEN_AI_TLDR_PR_API_KEY = process.env.OPEN_AI_TLDR_PR_API_KEY || "";
            const client = new OpenAI({
                apiKey: OPEN_AI_TLDR_PR_API_KEY,
            });
            const prompt = `
          You are an expert at reviewing github pull requests. \n
          You are able to understand the code change and explain it in a short and clear manner so it can be read by other engineers quickly. \n
          You're output will be used to help engineers quickly understand the code changes in english. \n
          
          Summarise the patch in short and concise bullet points. \n
          
          Follow these examples for your output: \n
          -=Start of examples=- \n
          File: src/index.js \n
          - Added a new file called "index.js" \n

          File: package.json \n
          - Removed package 'left-pad' \n

          File: src/tests/index.test.js \n
          - Added a new test case for the function "add" \n
          - Fixed the test case for the function "delete" \n
          -=End of examples=- \n

          Try to understand the change of the patch and intention behind it. \n
          Do not start the bullet point with "The patch..." \n
          Be direct about describing the change in the file, see above examples. \n
          Use the filename for context in understanding the change. \n 
          Keep each bullet point under 20 words. \n

          The file name: \n
          ${fileName} \n

          The patch: \n
          ${patch} \n
          `;
            console.log("prompt", prompt);
            const patchSummarisation = yield client.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
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
    const filesToIgnore = ["package-lock.json", "node_modules", "dist", "test"];
    return filesToIgnore.some((ignoredPath) => filePath === ignoredPath || filePath.startsWith(ignoredPath + "/"));
}
