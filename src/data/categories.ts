/**
 * 카테고리 단일 진실 공급원 (Single Source of Truth).
 *
 * 이 파일에서만 카테고리를 정의한다. 다른 파일에서 카테고리명을 하드코딩 금지.
 * - 추가: 객체 추가 + src/content/posts/{새slug}/ 폴더 생성
 * - 임시 숨김: enabled: false (글은 보존됨, 빌드/홈에서만 제외)
 * - 이름 변경: name 필드만 수정, slug 유지
 * - 분할/병합: 새 카테고리 추가 후 npm run migrate-category 사용
 */

export interface Category {
  /** URL 및 폴더명에 쓰이는 영문 식별자. 한 번 정하면 가급적 바꾸지 말 것. */
  slug: string;
  /** 사용자에게 보이는 한국어 이름. 자유롭게 변경 가능. */
  name: string;
  /** 이모지 또는 짧은 텍스트 아이콘. */
  icon: string;
  /** 카테고리 설명 (메타·SEO용). */
  description: string;
  /** 포인트 컬러 (hex). */
  color: string;
  /** 정렬 순서 (오름차순). */
  order: number;
  /** false면 빌드/홈에서 제외 (글은 보존). */
  enabled: boolean;
}

export const categories: Category[] = [
  { slug: "restaurant",   name: "맛집",   icon: "🍽️", description: "서울의 식당 기록",   color: "#E63946", order: 1,  enabled: true },
  { slug: "cafe",         name: "카페",   icon: "☕",  description: "카페·디저트",         color: "#A47148", order: 2,  enabled: true },
  { slug: "event",        name: "행사",   icon: "🎉",  description: "전시·공연·페스티벌",  color: "#9D4EDD", order: 3,  enabled: true },
  { slug: "attraction",   name: "관광지", icon: "📍",  description: "명소·랜드마크",       color: "#2A9D8F", order: 4,  enabled: true },
  { slug: "neighborhood", name: "동네",   icon: "🚶",  description: "동네 산책·골목 탐방", color: "#F4A261", order: 5,  enabled: true },
  { slug: "etc",          name: "기타",   icon: "📌",  description: "분류 미정 글",        color: "#6C757D", order: 99, enabled: true },
];

/** enabled=true 카테고리만, order 오름차순으로 정렬해 반환. */
export function getEnabledCategories(): Category[] {
  return categories
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order);
}

/** slug로 카테고리 객체 검색 (disabled 포함). 없으면 undefined. */
export function findCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/** 스키마 검증·홈 표시 등에 쓰일 enabled slug 집합. */
export function getEnabledSlugs(): string[] {
  return categories.filter((c) => c.enabled).map((c) => c.slug);
}
