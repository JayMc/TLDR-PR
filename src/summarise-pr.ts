import OpenAI from "openai";
import { Octokit } from "@octokit/rest";
import { estimateTokens, getUsage, getLimits } from "./helpers.js";
import { Usage } from "./models/usage.js";

/**
 * Fetches and sums all additions/deletions for the files in a given PR.
 *
 * @param octokit     Authenticated Octokit instance (installation token).
 * @param owner       Repository owner (e.g., "octocat").
 * @param repo        Repository name (e.g., "Hello-World").
 * @param pull_number Pull request number.
 * @returns           An object with total additions, deletions, and their sum.
 */
export async function fetchPRPatchChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  pull_number: number
): Promise<any> {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  const fileChanges = files.map((file) => {
    const limitedPatch = file.patch?.split("\n").slice(0, 200).join("\n");
    return {
      filename: file.filename,
      patch: limitedPatch,
    };
  });

  return fileChanges;
}

export async function summarisePatchToEnglish(
  fileName: string,
  patch: string,
  installationId: string
): Promise<string> {
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

    // console.log("prompt", prompt);
    // console.log("installationId", installationId);

    // check prompt will not exceed usage limit
    // installation limit - usage consumed
    const promptTokensEstimated = estimateTokens(prompt);
    // console.log("promptTokensEstimated", promptTokensEstimated);

    const pastUsage = await getUsage(installationId);
    // console.log("pastUsage", pastUsage);

    const limits = await getLimits(installationId);
    // console.log("limits", limits);

    if (pastUsage.apiCalls > limits.apiCalls) {
      console.log(`apiCalls limit reached at ${pastUsage.apiCalls}`);
      return Promise.reject(`apiCalls limit reached at ${pastUsage.apiCalls}`);
    }

    if (pastUsage.promptTokens > limits.promptTokens) {
      console.log(`promptTokens limit reached at ${pastUsage.promptTokens}`);
      return Promise.reject(
        `promptTokens limit reached at ${pastUsage.promptTokens}`
      );
    }

    if (promptTokensEstimated > 1000) {
      console.log(
        `estimated prompt token size over limit at ${promptTokensEstimated}`
      );
      return Promise.reject(
        `estimated prompt token size over limit at ${promptTokensEstimated}`
      );
    }

    // const remainingPromptUsage =
    //   limits.promptTokens ?? 0 - pastUsage.promptTokens;
    // console.log("remainingPromptUsage", remainingPromptUsage);

    const patchSummarisation = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-mini",
    });

    // console.log(
    //   "patchSummarisation",
    //   JSON.stringify(patchSummarisation, null, 2)
    // );

    const summ =
      patchSummarisation?.choices[0]?.message?.content ?? "no summary";

    const usage = patchSummarisation.usage ?? {};

    const completionTokensEstimated = estimateTokens(summ);

    const report = {
      promptTokensEstimated: promptTokensEstimated,
      completionTokensEstimated: completionTokensEstimated,
      totalTokensEstimated: promptTokensEstimated + completionTokensEstimated,
      promptTokensActual: usage.prompt_tokens ?? 0,
      completionTokensActual: usage.completion_tokens ?? 0,
      totalTokensActual: usage.total_tokens ?? 0,
    };

    const newDoc = new Usage({
      installation_id: installationId,
      "usage.apiCalls": 1,
      "usage.promptTokensActual": report.promptTokensActual,
      "usage.completionTokensActual": report.completionTokensActual,
      "usage.totalTokensActual": report.totalTokensActual,
      "usage.promptTokensEstimated": report.promptTokensEstimated,
      "usage.completionTokensEstimated": report.completionTokensEstimated,
      "usage.totalTokensEstimated": report.totalTokensEstimated,
    });
    await newDoc.save();

    return summ;
  } catch (error) {
    console.error("Error calling open AI", error);
    return Promise.reject(error);
  }
}

export function isIgnoredFile(filePath: string): boolean {
  const filesToIgnore = ["package-lock.json", "node_modules", "dist"];
  return filesToIgnore.some(
    (ignoredPath) =>
      filePath === ignoredPath || filePath.startsWith(ignoredPath + "/")
  );
}
