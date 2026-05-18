/**
 * validate-content.ts — 게시글 frontmatter 검증.
 *
 * 검증 항목 (Astro 빌드 전 사전 점검):
 * 1. category가 categories.ts의 enabled slug 중 하나인가?
 * 2. 파일이 위치한 폴더명 == frontmatter.category 인가?
 * 3. 필수 필드(title, category, tags, publishDate, location, cover, summary)가 모두 있는가?
 * 4. location.lat/lng가 서울 좌표 범위 내인가? (위도 37~38, 경도 126~128)
 * 5. publishDate가 유효한 날짜 문자열인가?
 *
 * 실행: npm run validate
 * 종료 코드: FAIL이 1개라도 있으면 1, 그렇지 않으면 0.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { categories, getEnabledSlugs } from "../src/data/categories.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, "..", "src", "content", "posts");

const REQUIRED_FIELDS = [
  "title",
  "category",
  "tags",
  "publishDate",
  "location",
  "cover",
  "summary",
] as const;

interface Issue {
  file: string;
  level: "FAIL" | "WARN";
  message: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function validateFile(filePath: string, enabledSlugs: string[]): Issue[] {
  const issues: Issue[] = [];
  const rel = path.relative(POSTS_DIR, filePath).replaceAll("\\", "/");
  const folder = rel.split("/")[0];

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    issues.push({ file: rel, level: "FAIL", message: `read error: ${(err as Error).message}` });
    return issues;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    issues.push({ file: rel, level: "FAIL", message: `frontmatter parse error: ${(err as Error).message}` });
    return issues;
  }

  const fm = parsed.data as Record<string, unknown>;

  // 1. 필수 필드 존재
  for (const field of REQUIRED_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
      issues.push({ file: rel, level: "FAIL", message: `missing required field: ${field}` });
    }
  }

  // 2. category가 enabled slug 인가
  const category = fm.category;
  if (typeof category === "string" && !enabledSlugs.includes(category)) {
    const knownButDisabled = categories.find((c) => c.slug === category && !c.enabled);
    if (knownButDisabled) {
      issues.push({ file: rel, level: "FAIL", message: `category "${category}" is disabled (enabled: false in categories.ts)` });
    } else {
      issues.push({ file: rel, level: "FAIL", message: `unknown category: "${category}". allowed: ${enabledSlugs.join(", ")}` });
    }
  }

  // 3. 폴더명 == category
  if (typeof category === "string" && folder !== category) {
    issues.push({ file: rel, level: "FAIL", message: `folder "${folder}" does not match frontmatter.category "${category}"` });
  }

  // 4. location.lat/lng 범위
  if (fm.location && typeof fm.location === "object") {
    const loc = fm.location as Record<string, unknown>;
    const lat = typeof loc.lat === "number" ? loc.lat : NaN;
    const lng = typeof loc.lng === "number" ? loc.lng : NaN;
    if (Number.isNaN(lat) || lat < 37 || lat > 38) {
      issues.push({ file: rel, level: "WARN", message: `location.lat ${lat} is outside Seoul range (37~38)` });
    }
    if (Number.isNaN(lng) || lng < 126 || lng > 128) {
      issues.push({ file: rel, level: "WARN", message: `location.lng ${lng} is outside Seoul range (126~128)` });
    }
    if (!loc.address) issues.push({ file: rel, level: "FAIL", message: "location.address is missing" });
    if (!loc.district) issues.push({ file: rel, level: "FAIL", message: "location.district is missing" });
  }

  // 5. publishDate 검증
  if (fm.publishDate) {
    const d = new Date(fm.publishDate as string);
    if (Number.isNaN(d.getTime())) {
      issues.push({ file: rel, level: "FAIL", message: `publishDate is not a valid date: ${String(fm.publishDate)}` });
    }
  }

  // 6. tags 배열 검사
  if (fm.tags !== undefined && !Array.isArray(fm.tags)) {
    issues.push({ file: rel, level: "FAIL", message: "tags must be an array" });
  }

  return issues;
}

function main(): number {
  const enabledSlugs = getEnabledSlugs();
  const files = walk(POSTS_DIR);

  if (files.length === 0) {
    console.log("⚠️  No .md files found under src/content/posts/. Add at least one post.");
    return 0;
  }

  let pass = 0;
  let fail = 0;
  let warn = 0;
  const allIssues: Issue[] = [];

  for (const file of files) {
    const issues = validateFile(file, enabledSlugs);
    if (issues.length === 0) {
      pass++;
      console.log(`✓ ${path.relative(POSTS_DIR, file).replaceAll("\\", "/")}`);
    } else {
      const hasFail = issues.some((i) => i.level === "FAIL");
      if (hasFail) {
        fail++;
        console.log(`✗ ${path.relative(POSTS_DIR, file).replaceAll("\\", "/")}`);
      } else {
        warn++;
        console.log(`⚠ ${path.relative(POSTS_DIR, file).replaceAll("\\", "/")}`);
      }
      for (const issue of issues) {
        const icon = issue.level === "FAIL" ? "  ✗" : "  ⚠";
        console.log(`${icon} [${issue.level}] ${issue.message}`);
      }
      allIssues.push(...issues);
    }
  }

  console.log("");
  console.log(`Total: ${files.length} files | PASS ${pass} | WARN ${warn} | FAIL ${fail}`);
  console.log(`Enabled categories: ${enabledSlugs.join(", ")}`);

  return fail > 0 ? 1 : 0;
}

process.exit(main());
