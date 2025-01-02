import { isIgnoredFile } from "./summarise-pr.js";
// const { isIgnoredFile } = require("./summarise-pr");

describe("isIgnoredFile", () => {
  test("should return true for exact matches", () => {
    expect(isIgnoredFile("package.json")).toBe(true);
    expect(isIgnoredFile("package-lock.json")).toBe(true);
    expect(isIgnoredFile("README.md")).toBe(true);
    expect(isIgnoredFile("tsconfig.json")).toBe(true);
  });

  test("should return true for paths starting with ignored directories", () => {
    expect(isIgnoredFile("node_modules/express/index.js")).toBe(true);
    expect(isIgnoredFile("dist/main.js")).toBe(true);
    expect(isIgnoredFile("src/components/App.tsx")).toBe(true);
    expect(isIgnoredFile(".git/HEAD")).toBe(true);
  });

  test("should return false for non-ignored files", () => {
    expect(isIgnoredFile("app.ts")).toBe(false);
    expect(isIgnoredFile("components/Button.tsx")).toBe(false);
    expect(isIgnoredFile("styles.css")).toBe(false);
    expect(isIgnoredFile("images/logo.png")).toBe(false);
  });

  test("should handle edge cases", () => {
    expect(isIgnoredFile("")).toBe(false);
    expect(isIgnoredFile("package.json.backup")).toBe(false);
    expect(isIgnoredFile("fake-node_modules/file.js")).toBe(false);
    expect(isIgnoredFile("my-src/file.ts")).toBe(false);
  });
});
