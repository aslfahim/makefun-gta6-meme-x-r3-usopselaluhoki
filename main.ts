import { readFileSync, statSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

const EXPECTED_STATUS_ID: string = "2123973960761270773";
const MAX_POST_BYTES: number = 16384;
const X_STATUS_PATTERN: RegExp = /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/(\d+)$/;

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function main(): void {
  const botDir: string = resolve(process.env.MAKEFUN_BOT_DIR ?? "/bot");
  const outputDir: string = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
  const postPath: string = join(botDir, "POST.json");

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(postPath);
  } catch {
    fail(`POST.json not found in bot directory: ${botDir}`);
  }

  if (!stats.isFile()) {
    fail(`POST.json is not a regular file: ${postPath}`);
  }

  if (stats.size > MAX_POST_BYTES) {
    fail(`POST.json exceeds the ${MAX_POST_BYTES}-byte limit (got ${stats.size} bytes); refusing to parse`);
  }

  if (stats.size === 0) {
    fail("POST.json is empty; expected a JSON object with a url field");
  }

  let raw: string;
  try {
    raw = readFileSync(postPath, "utf8");
  } catch (err) {
    fail(`could not read POST.json: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("POST.json is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail("POST.json must contain a JSON object");
  }

  const urlValue: unknown = (parsed as Record<string, unknown>).url;
  if (typeof urlValue !== "string") {
    fail('POST.json field "url" must be a string');
  }

  const match: RegExpExecArray | null = X_STATUS_PATTERN.exec(urlValue);
  if (!match) {
    fail('POST.json field "url" is not a valid X status URL');
  }

  const statusId: string = match[1];
  if (statusId !== EXPECTED_STATUS_ID) {
    fail(`unexpected X status id: ${statusId} (expected ${EXPECTED_STATUS_ID})`);
  }

  mkdirSync(outputDir, { recursive: true });
  const destPath: string = join(outputDir, "POST.json");
  copyFileSync(postPath, destPath);

  console.log("Leonida cab meter receipt — copied POST.json to " + destPath);
}

main();
