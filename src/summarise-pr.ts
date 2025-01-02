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

  const fileChanges = files.map((file) => ({
    filename: file.filename,
    changes: {
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      status: file.status,
      patch: file.patch,
    },
  }));

  return fileChanges;
}

export async function summarisePatchToEnglish(
  fileChanges,
  body
): Promise<string> {
  try {
    const OPEN_AI_TLDR_PR_API_KEY = process.env.OPEN_AI_TLDR_PR_API_KEY || "";
    const client = new OpenAI({
      apiKey: OPEN_AI_TLDR_PR_API_KEY,
    });

    const patchSummarisation = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `summarize this github patch into a short and concise english sentence explaining in simple terms what happened. \n ${JSON.stringify(
            fileChanges
          )}`,
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
