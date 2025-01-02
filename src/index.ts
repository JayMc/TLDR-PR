import express from "express";
import type { Express } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import bodyParser from "body-parser";
import crypto from "crypto";

// ===============
// CONFIGURATION
// ===============
const PORT = 8080;

// For verifying the GitHub webhook signature:
const GITHUB_TLDR_PR_WEBHOOK_SECRET =
  process.env.GITHUB_TLDR_PR_WEBHOOK_SECRET || "REPLACE_ME_PLEASE";

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
    console.log("webhook for pull_request called");

    const action = payload.action;
    if (action === "opened" || action === "synchronize") {
      try {
        // 3) Extract relevant data
        const pr = payload.pull_request;
        const { additions, deletions, number: pull_number } = pr;
        const totalPatchChanges = additions + deletions;

        const installationId = payload.installation.id; // The GitHub App's installation ID
        const { owner, repo } = payload.repository; // "owner" and "name" are inside "repository"

        // 4) Get an Octokit client authenticated as this installation
        const octokit = await getInstallationOctokit(installationId);

        // 5) List existing comments
        const { data: comments } = await octokit.issues.listComments({
          owner: owner.login,
          repo: repo.name,
          issue_number: pull_number,
        });

        // Replace with your actual bot's GitHub login, e.g. "my-app[bot]"
        const botLogin = "my-app[bot]";

        const existingComment = comments.find(
          (c) =>
            c.user?.login === botLogin && c.body?.includes("Patch changes:")
        );

        // 6) Create or update comment
        const body = `**Patch changes:** ${totalPatchChanges}`;

        if (existingComment) {
          // Update existing comment
          await octokit.issues.updateComment({
            owner: owner.login,
            repo: repo.name,
            comment_id: existingComment.id,
            body,
          });
        } else {
          // Create a new comment
          await octokit.issues.createComment({
            owner: owner.login,
            repo: repo.name,
            issue_number: pull_number,
            body,
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
  res.send("Home page tldr-pr");
});

app.get("/post-install-callback", async (req, res) => {
  const { installation_id, setup_action } = req.query;
  if (!installation_id) {
    return res.status(400).send('Missing "installation_id" in query.');
  }

  res.send(`
    <h1>GitHub App Installed!</h1>
    <p>Installation ID: ${installation_id}</p>
    <p>Setup Action: ${setup_action || "(none)"}</p>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Listening for GitHub webhooks on port ${PORT}`);
});
