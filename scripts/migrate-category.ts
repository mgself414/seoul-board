/**
 * migrate-category.ts — 글들의 카테고리를 일괄 변경.
 *
 * 동작:
 * 1. --from 폴더의 모든 .md 파일을 스캔 (--filter 태그 매칭 시 그것만)
 * 2. 각 글의 frontmatter.category 필드를 --to slug로 변경
 * 3. 파일을 src/content/posts/<--to>/ 폴더로 이동
 * 4. --dry-run이면 변경 없이 미리보기 출력
 *
 * 사용 예:
 *   npm run migrate-category -- --from=cafe --to=etc
 *   npm run migrate-category -- --from=restaurant --to=cafe --filter=베이커리
 *   npm run migrate-category -- --from=restaurant --to=cafe --dry-run
 *
 * 안전 장치:
 * - to 폴더에 같은 이름 파일이 이미 있으면 해당 파일은 skip하고 경고
 * - --to slug가 categories.ts에 정의되지 않으면 즉시 abort
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { categories } from "../src/data/categories.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, "..", "src", "content", "posts");

interface Args {
  from: string;
  to: string;
  filter?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { dryRun: false };
  for (const raw of argv.slice(2)) {
    if (raw === "--dry-run") {
      args.dryRun = true;
    } else if (raw.startsWith("--from=")) {
      args.from = raw.slice("--from=".length);
    } else if (raw.startsWith("--to=")) {
      args.to = raw.slice("--to=".length);
    } else if (raw.startsWith("--filter=")) {
      args.filter = raw.slice("--filter=".length);
    } else if (raw === "--help" || raw === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${raw}`);
      printHelp();
      process.exit(2);
    }
  }
  if (!args.from || !args.to) {
    console.error("--from and --to are required.");
    printHelp();
    process.exit(2);
  }
  return args as Args;
}

function printHelp(): void {
  console.log(`Usage: npm run migrate-category -- --from=<slug> --to=<slug> [--filter=<tag>] [--dry-run]

Options:
  --from=<slug>     Source category slug (folder name under src/content/posts/)
  --to=<slug>       Destination category slug (must exist in categories.ts)
  --filter=<tag>    Only migrate posts whose tags array contains this tag
  --dry-run         Print planned changes without modifying files
  -h, --help        Show this help
`);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function main(): number {
  const args = parseArgs(process.argv);

  // 카테고리 존재 검증 (disabled여도 이동은 허용 — 임시 숨김 카테고리로 옮기는 시나리오)
  const fromCat = categories.find((c) => c.slug === args.from);
  const toCat = categories.find((c) => c.slug === args.to);
  if (!toCat) {
    console.error(`Destination category "${args.to}" is not defined in src/data/categories.ts. Aborting.`);
    return 1;
  }
  if (!fromCat) {
    console.warn(`Source category "${args.from}" is not in categories.ts, but folder scan will proceed.`);
  }

  const fromDir = path.join(POSTS_DIR, args.from);
  const toDir = path.join(POSTS_DIR, args.to);

  if (!fs.existsSync(fromDir)) {
    console.error(`Source folder does not exist: ${fromDir}`);
    return 1;
  }

  const files = walk(fromDir);
  if (files.length === 0) {
    console.log(`No .md files found in ${fromDir}. Nothing to migrate.`);
    return 0;
  }

  console.log(`Mode: ${args.dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`From: ${args.from} (${files.length} files)`);
  console.log(`To:   ${args.to}`);
  if (args.filter) console.log(`Filter (tag must include): ${args.filter}`);
  console.log("");

  if (!args.dryRun && !fs.existsSync(toDir)) {
    fs.mkdirSync(toDir, { recursive: true });
  }

  let moved = 0;
  let skipped = 0;

  for (const file of files) {
    const rel = path.relative(POSTS_DIR, file).replaceAll("\\", "/");
    let raw: string;
    try {
      raw = fs.readFileSync(file, "utf-8");
    } catch (err) {
      console.log(`  ! ${rel} read error: ${(err as Error).message}`);
      skipped++;
      continue;
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (err) {
      console.log(`  ! ${rel} parse error: ${(err as Error).message}`);
      skipped++;
      continue;
    }

    const fm = parsed.data as Record<string, unknown>;
    const tags = Array.isArray(fm.tags) ? (fm.tags as unknown[]).map(String) : [];

    if (args.filter && !tags.includes(args.filter)) {
      console.log(`  - skip (no tag) ${rel}`);
      skipped++;
      continue;
    }

    const destPath = path.join(toDir, path.basename(file));
    const destRel = path.relative(POSTS_DIR, destPath).replaceAll("\\", "/");

    if (fs.existsSync(destPath) && destPath !== file) {
      console.log(`  ! conflict: ${destRel} already exists — skipped`);
      skipped++;
      continue;
    }

    fm.category = args.to;
    const newRaw = matter.stringify(parsed.content, fm);

    if (args.dryRun) {
      console.log(`  ~ would move ${rel} -> ${destRel} (category: ${args.from} -> ${args.to})`);
    } else {
      try {
        fs.writeFileSync(file, newRaw, "utf-8");
        if (destPath !== file) {
          fs.renameSync(file, destPath);
        }
        console.log(`  ✓ moved ${rel} -> ${destRel}`);
      } catch (err) {
        console.log(`  ! write/move error for ${rel}: ${(err as Error).message}`);
        skipped++;
        continue;
      }
    }
    moved++;
  }

  console.log("");
  console.log(`Result: ${moved} ${args.dryRun ? "planned" : "moved"}, ${skipped} skipped.`);
  if (args.dryRun) console.log(`Run without --dry-run to apply.`);
  return 0;
}

process.exit(main());
