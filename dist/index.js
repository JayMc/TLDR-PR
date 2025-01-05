import express from "express";
import bodyParser from "body-parser";
import { homeRoute } from "./routes/home.js";
import { usageRoute } from "./routes/usage.js";
import { estimateRoute } from "./routes/estimate.js";
import { webhookRoute } from "./routes/webhook.js";
import { connectDB } from "./db.js";
const PORT = 8080;
// Connect to Mongo first
connectDB();
const app = express();
// Parse JSON body
app.use(bodyParser.json());
app.use(homeRoute);
app.use(usageRoute);
app.use(estimateRoute);
app.use(webhookRoute);
// Start the server
app.listen(PORT, () => {
    console.log(`Listening for GitHub webhooks on port ${PORT}`);
});
