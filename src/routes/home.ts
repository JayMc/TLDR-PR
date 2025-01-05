import express from "express";
const router = express.Router();
router.get("/", (req, res) => {
  res.send("Home page tldr-pr");
});
export { router as homeRoute };
