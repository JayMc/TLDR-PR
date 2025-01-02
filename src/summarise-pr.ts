import OpenAI from "openai";
import { Octokit } from "@octokit/rest";

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
    const limitedPatch = file.patch?.split("\n").slice(0, 5).join("\n");
    return {
      filename: file.filename,
      patch: limitedPatch,
    };
  });

  return fileChanges;
}

export async function summarisePatchToEnglish(
  fileName: string,
  patch: string
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

    console.log("prompt", prompt);

    const patchSummarisation = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-mini",
    });
    console.log(
      "patchSummarisation",
      JSON.stringify(patchSummarisation, null, 2)
    );

    const summ =
      patchSummarisation?.choices[0]?.message?.content ?? "no summary";
    return summ;
  } catch (error) {
    console.error("Error calling open AI", error);
    return res.status(500).send("Internal Server Error");
  }
}

export function isIgnoredFile(filePath: string): boolean {
  const filesToIgnore = ["package-lock.json", "node_modules", "dist"];
  return filesToIgnore.some(
    (ignoredPath) =>
      filePath === ignoredPath || filePath.startsWith(ignoredPath + "/")
  );
}
