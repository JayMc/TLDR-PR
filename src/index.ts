import express, { query } from "express";
import type { Express } from "express";
import pLimit from "p-limit";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Installation } from "./models/installation.js";
import { Usage } from "./models/usage.js";
import { connectDB } from "./db.js";
import {
  fetchPRPatchChanges,
  summarisePatchToEnglish,
  isIgnoredFile,
} from "./summarise-pr.js";
import { estimator } from "./estimator.js";

// ===============
// CONFIGURATION
// ===============
const PORT = 8080;

// For verifying the GitHub webhook signature:
const GITHUB_TLDR_PR_WEBHOOK_SECRET =
  process.env.GITHUB_TLDR_PR_WEBHOOK_SECRET || "SET_A_SECRET";

// GitHub App credentials:
const GITHUB_TLDR_PR_APP_ID = process.env.GITHUB_TLDR_PR_APP_ID || "";
const GITHUB_TLDR_PR_PRIVATE_KEY = (
  process.env.GITHUB_TLDR_PR_PRIVATE_KEY || ""
).replace(/\\n/g, "\n");
// If your private key is stored with literal "\n" in an .env file,
// the above replace() will transform it into actual newlines.

// Optional client ID/secret if you need them:
const GITHUB_TLDR_PR_CLIENT_ID = process.env.GITHUB_TLDR_PR_CLIENT_ID || "";

const GITHUB_TLDR_PR_CLIENT_SECRET =
  process.env.GITHUB_TLDR_PR_CLIENT_SECRET || "";

const BOT_LOGIN = "tldr-pr[bot]";

// Connect to Mongo first
connectDB();

// ================
// HELPER FUNCTIONS
// ================

/**
 * Verify that the webhook request came from GitHub.
 */
function verifySignature(req: express.Request): boolean {
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!signature) {
    return false;
  }

  const computed =
    "sha256=" +
    crypto
      .createHmac("sha256", GITHUB_TLDR_PR_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body), "utf-8")
      .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

/**
 * Retrieve an authenticated Octokit client for the installation.
 * This method uses the GitHub App's private key + app ID to generate an installation token.
 */
async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const auth = createAppAuth({
    appId: Number(GITHUB_TLDR_PR_APP_ID),
    privateKey: GITHUB_TLDR_PR_PRIVATE_KEY,
    clientId: GITHUB_TLDR_PR_CLIENT_ID,
    clientSecret: GITHUB_TLDR_PR_CLIENT_SECRET,
    installationId,
  });

  const { token } = await auth({ type: "installation" });
  return new Octokit({ auth: token });
}

// ====================
// EXPRESS SERVER SETUP
// ====================
const app = express();

// Parse JSON body
app.use(bodyParser.json());

// Main webhook endpoint
app.post("/webhook", async (req: Request, res: Response) => {
  // 1) Verify the webhook signature
  if (!verifySignature(req)) {
    console.error("Signature verification failed!");
    return res.status(401).send("Invalid signature");
  }

  // 2) Check the event type & action
  const event = req.headers["x-github-event"] as string;
  const payload = req.body;

  if (event === "pull_request") {
    const action = payload.action;
    if (
      action === "opened" ||
      action === "synchronize" ||
      action === "ready_for_review"
    ) {
      try {
        const pr = payload.pull_request;
        const { additions, deletions, number: pull_number, body } = pr;
        const totalPatchChanges = additions + deletions;

        const installationId = payload.installation.id; // The GitHub App's installation ID
        const { owner, name } = payload.repository; // "owner" and "name" are inside "repository"

        const octokit = await getInstallationOctokit(installationId);

        const fileChanges = await fetchPRPatchChanges(
          octokit,
          owner.login,
          name,
          pull_number
        );

        console.log("body", body);

        const fileChangesOmmitted = fileChanges.filter((fileChange) => {
          return !isIgnoredFile(fileChange.filename);
        });

        console.log(
          "fileChangesOmmitted B",
          fileChangesOmmitted.map((fileChange) => fileChange.filename)
        );

        const fileChangesLimited = fileChangesOmmitted.slice(0, 10);

        // Limit concurrent network requests to 5
        const networkRequestslimited = pLimit(2);

        const fileChangesWithSummary = await Promise.all(
          fileChangesLimited.map((fileChange) =>
            networkRequestslimited(async () => {
              const patch = fileChange.patch;
              const fileName = fileChange.filename;
              const summary = await summarisePatchToEnglish(
                fileName,
                patch,
                installationId
              );
              return { ...fileChange, summary };
            })
          )
        );

        console.log("fileChangesWithSummary", fileChangesWithSummary);

        const { data: comments } = await octokit.issues.listComments({
          owner: owner.login,
          repo: name,
          issue_number: pull_number,
        });

        const existingComment = comments.find((c) => {
          return (
            c.user?.login === BOT_LOGIN &&
            c.user.type === "Bot" &&
            c.body?.includes("**Summary of changes:**")
          );
        });

        const commentBody =
          "**Summary of changes:** \n" +
          fileChangesWithSummary.reduce((acc, fileChange) => {
            return `${acc}\n\r${fileChange.summary}`;
          }, "");

        if (existingComment) {
          // Update existing comment
          await octokit.issues.updateComment({
            owner: owner.login,
            repo: name,
            comment_id: existingComment.id,
            body: commentBody,
          });
        } else {
          // Create a new comment
          await octokit.issues.createComment({
            owner: owner.login,
            repo: name,
            issue_number: pull_number,
            body: commentBody,
          });
        }

        return res.status(200).send("PR comment posted/updated successfully");
      } catch (error) {
        console.error("Error handling PR event:", error);
        return res.status(500).send("Internal Server Error");
      }
    }
  }

  // If it's some other event/action, just respond OK
  res.status(200).send("Event ignored");
});

app.get("/", async (req, res) => {
  res.send("Home page tldr-pr is cool");
});

app.get("/stuff", async (req, res) => {
  res.send("stuff");
});

app.get("/estimate", async (req, res) => {
  const { text } = req.query;
  const tokens = estimator(text ?? "hello world");
  console.log("tokens", tokens);
  console.log("number of tokens", tokens.length);
  res.send(`
    <p>text: ${text} </p>
    <p>number of tokens: ${tokens.length} </p>
    `);
});

app.get("/usage", async (req, res) => {
  const { installation_id } = req.query;
  try {
    const query = [
      {
        $match: {
          installation_id,
        },
      },
      {
        $group: {
          _id: "$installation_id",
          apiCalls: { $sum: "$usage.apiCalls" },
          promptTokens: { $sum: "$usage.promptTokensActual" },
          completionTokens: { $sum: "$usage.completionTokensActual" },
        },
      },
    ];
    const usageTotals = await Usage.aggregate(query);

    res.send(`
      <p>installation_id: ${installation_id} </p>
      <p>API calls: ${usageTotals[0].apiCalls} </p>
      <p>PromptTokens tokens: ${usageTotals[0].promptTokens} </p>
      <p>CompletionTokens tokens: ${usageTotals[0].completionTokens} </p>
      <p>Total tokens: ${
        usageTotals[0].promptTokens + usageTotals[0].completionTokens
      } </p>
        `);
  } catch (error) {
    console.error("Error in /usage:", error);
    res.status(500).send("Error handling usage");
  }
});

app.get("/post-install-callback", async (req, res) => {
  try {
    const { installation_id, setup_action } = req.query;
    if (!installation_id) {
      return res.status(400).send('Missing "installation_id" in query.');
    }

    const filter = { installation_id };
    const update = {
      app_id: process.env.GITHUB_TLDR_PR_APP_ID,
      installation_id,
    };
    const options = { upsert: true, new: true };

    const record = await Installation.findOneAndUpdate(filter, update, options);

    res.send(`
    <h1>GitHub App Installed!</h1>
    <p>Installation ID: ${installation_id}</p>
    <p>Setup Action: ${setup_action || "(none)"}</p>
  `);
  } catch (error) {
    console.error("Error in /post-install-callback:", error);
    res.status(500).send("Error handling installation callback");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Listening for GitHub webhooks on port ${PORT}`);
});
