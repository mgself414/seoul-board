/**
 * 게시글 콘텐츠 컬렉션 정의.
 *
 * 카테고리 검증의 핵심 규칙:
 * - category 필드는 **enum 사용 금지**.
 * - src/data/categories.ts에서 enabled: true인 slug 목록을 동적으로 가져와 refine으로 검증.
 * - 폴더명과 frontmatter.category가 일치하는지는 별도 검증 스크립트(scripts/validate-content.ts)가 담당.
 */

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { getEnabledSlugs } from "./data/categories";

const enabledSlugs = getEnabledSlugs();

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    category: z
      .string()
      .refine((slug) => enabledSlugs.includes(slug), {
        message: `category must be one of: ${enabledSlugs.join(", ")}`,
      }),
    tags: z.array(z.string()),
    publishDate: z.coerce.date(),
    visitDate: z.coerce.date().optional(),
    rating: z.number().min(0).max(5).optional(),
    location: z.object({
      address: z.string().min(1),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      district: z.string().min(1),
      area: z.string().optional(),
    }),
    cover: z.string().min(1),
    images: z.array(z.string()).optional(),
    hours: z.string().optional(),
    priceRange: z.enum(["₩", "₩₩", "₩₩₩", "₩₩₩₩"]).optional(),
    contact: z.string().optional(),
    links: z
      .object({
        instagram: z.string().url().optional(),
        naverMap: z.string().url().optional(),
        kakaoMap: z.string().url().optional(),
        website: z.string().url().optional(),
      })
      .optional(),
    status: z.enum(["운영중", "임시휴업", "폐업"]).default("운영중"),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    summary: z.string().min(1),
  }),
});

export const collections = { posts };
