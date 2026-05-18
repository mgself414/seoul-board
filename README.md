# 서울 콘텐츠 게시판 (seoul-board)

서울의 맛집·카페·행사·관광지·동네를 직접 다녀와 마크다운으로 기록하는 정적 블로그형 사이트.

- **프레임워크**: Astro 6 + TypeScript (strict)
- **스타일**: Tailwind CSS v4 (CSS-first config), Pretendard
- **콘텐츠**: 마크다운 + Zod 스키마 검증
- **배포**: Cloudflare Pages (Git push 시 자동)

> ⚠️ 이 저장소는 **Phase 1 (기반 구조)** 상태입니다. 필터링 UI·지도·검색·댓글·RSS는 Phase 2에서 추가됩니다.

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 (http://localhost:4321)
npm run dev

# 정적 빌드 (dist/ 생성)
npm run build

# 글의 frontmatter 검증
npm run validate
```

Node.js 22.12 이상 필요.

---

## 새 글 추가하기

1. `src/content/posts/{카테고리slug}/` 폴더로 이동.  
   예: 카페 글이라면 `src/content/posts/cafe/`.
2. `{YYYY-MM-DD-slug}.md` 파일 생성. 예: `2026-05-20-hapjeong-bakery.md`.
3. frontmatter 작성 (아래 [템플릿](#새-글-frontmatter-템플릿) 참고).
4. 본문(마크다운) 작성.
5. `npm run validate` — 모든 글이 PASS로 끝나야 함.
6. `npm run build` — 에러 없이 빌드되어야 함.
7. `git add . && git commit -m "post: 합정 베이커리" && git push`.

푸시 후 Cloudflare Pages가 자동 빌드·배포한다.

### 새 글 frontmatter 템플릿

복붙해서 채워 쓰세요. `(필수)` 표시는 반드시 채워야 합니다.

```yaml
---
title: "글 제목"                          # (필수)
category: cafe                            # (필수) categories.ts의 enabled slug
tags: ["태그1", "태그2"]                  # (필수, 빈 배열 OK: tags: [])
publishDate: 2026-05-18                   # (필수) YYYY-MM-DD
visitDate: 2026-05-15                     # (optional) 실제 방문일
rating: 4.3                               # (optional) 0~5
location:                                 # (필수)
  address: "서울 종로구 ..."
  lat: 37.5765                            # 위도 (서울 권장 범위 37~38)
  lng: 126.9853                           # 경도 (서울 권장 범위 126~128)
  district: "종로구"                      # 자치구
  area: "북촌"                            # (optional) 동·길 이름
cover: "/images/placeholder.jpg"          # (필수) /public 기준 경로
images: ["/images/...jpg"]                # (optional)
hours: "11:00 - 22:00"                    # (optional)
priceRange: "₩₩"                          # (optional) ₩ | ₩₩ | ₩₩₩ | ₩₩₩₩
contact: "02-1234-5678"                   # (optional)
links:                                    # (optional, 안의 4개도 모두 optional)
  instagram: "https://www.instagram.com/..."
  naverMap: "https://map.naver.com/..."
  kakaoMap: "https://map.kakao.com/..."
  website: "https://..."
status: "운영중"                          # (default: 운영중) 운영중 | 임시휴업 | 폐업
featured: false                           # (default: false) 메인 노출 여부
draft: false                              # (default: false) true면 빌드에서 제외
summary: "1~2문장 요약."                  # (필수)
---

여기에 본문(마크다운)을 적습니다.
```

---

## 새 카테고리 추가하기

1. [`src/data/categories.ts`](./src/data/categories.ts) 의 `categories` 배열 끝에 새 객체 추가.
   ```ts
   { slug: "bar", name: "바", icon: "🍷", description: "와인·칵테일", color: "#7B2CBF", order: 6, enabled: true },
   ```
   - `slug`: 영문 소문자·하이픈만. URL과 폴더명에 그대로 쓰임. 한 번 정하면 가급적 바꾸지 않는다.
   - `order`: 정렬 순서 (작을수록 위).
2. `src/content/posts/{새slug}/` 폴더 생성. (예: `src/content/posts/bar/`)
3. 첫 샘플 글 작성 → `npm run validate` 로 검증.

---

## 카테고리 변경/재편하기

글이 쌓인 뒤 카테고리를 손질해야 할 때를 위한 시나리오 4가지.

### 1. 임시 숨김

특정 카테고리를 빌드/홈에서만 빼고 글은 보존하고 싶을 때:

```ts
// src/data/categories.ts
{ slug: "event", ..., enabled: false }
```

빌드 시 해당 카테고리는 홈에 표시되지 않고, 그 카테고리 글이 있으면 `npm run validate`가 FAIL을 낸다. → 다시 켜거나 글을 다른 카테고리로 옮기면 된다.

### 2. 이름만 변경

slug는 그대로 두고 표시 이름만 바꿀 때 (URL 호환 유지):

```ts
{ slug: "cafe", name: "카페·디저트", ... }  // name만 변경
```

기존 글·URL·검색엔진 인덱스 모두 그대로 유지된다.

### 3. 일괄 이동

특정 카테고리의 모든 글을 다른 카테고리로 옮길 때:

```bash
# 미리보기 (변경 없이 시뮬레이션)
npm run migrate-category -- --from=event --to=etc --dry-run

# 실제 적용
npm run migrate-category -- --from=event --to=etc
```

스크립트가 자동으로:
1. `src/content/posts/event/*.md` 의 frontmatter `category`를 `etc`로 수정
2. 파일을 `src/content/posts/etc/`로 이동

### 4. 분할

기존 카테고리를 둘로 나눌 때 (예: `cafe` → `cafe` + `bakery`):

1. 위 [새 카테고리 추가](#새-카테고리-추가하기) 단계로 `bakery` 추가.
2. 분할 기준이 될 태그(예: `베이커리`)로 필터하며 이동:
   ```bash
   npm run migrate-category -- --from=cafe --to=bakery --filter=베이커리 --dry-run
   npm run migrate-category -- --from=cafe --to=bakery --filter=베이커리
   ```

---

## 폴더 구조

```
seoul-board/
├── astro.config.mjs                       Astro + Tailwind v4 (Vite plugin)
├── tsconfig.json
├── package.json
├── README.md
├── public/
│   └── images/                            게시글 이미지 저장 (placeholder.jpg 포함)
├── scripts/
│   ├── validate-content.ts                글 frontmatter 검증
│   └── migrate-category.ts                카테고리 일괄 이동
└── src/
    ├── data/categories.ts                 ★ 카테고리 단일 진실 공급원
    ├── content.config.ts                  ★ Zod 스키마 (동적 검증)
    ├── content/posts/
    │   ├── restaurant/
    │   ├── cafe/
    │   ├── event/
    │   ├── attraction/
    │   ├── neighborhood/
    │   └── etc/
    ├── layouts/BaseLayout.astro
    ├── pages/index.astro                  임시 홈 (Phase 1)
    └── styles/global.css                  Tailwind v4 진입점
```

---

## 설계 원칙

- **카테고리는 데이터다**: `src/data/categories.ts`만 수정하면 카테고리 추가·변경·숨김이 끝난다. enum 사용 금지.
- **검증은 두 곳에서**: Astro 빌드는 Zod 스키마(`src/content.config.ts`)로 검증하고, 사람이 읽기 쉬운 출력은 `npm run validate`가 담당한다.
- **마이그레이션 가능성 우선**: 글이 100개, 1000개 쌓여도 카테고리 재편이 가능해야 한다. 그래서 처음부터 `migrate-category` 스크립트를 포함했다.

---

## 라이선스

내부용. 1인 운영 블로그.
