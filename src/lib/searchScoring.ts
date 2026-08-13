/**
 * Client-side relevance search for events.
 * Accent-insensitive, multi-token (AND), field-weighted scoring with
 * light typo tolerance as a fallback.
 */
import { CATEGORIES } from "@/lib/categories";
import { extractDescriptionTags } from "@/lib/descriptionTagExtractor";

export const normalizeText = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const tokenize = (query: string): string[] =>
  normalizeText(query).split(" ").filter(Boolean);

const CATEGORY_LABEL = new Map<string, string>(
  CATEGORIES.map((c) => [c.id, c.label]),
);

export interface SearchIndex {
  title: string;
  titleWords: string[];
  location: string;
  category: string;
  creator: string;
  creatorWords: string[];
  description: string;
  tags: string;
}

const indexCache = new Map<string, { index: SearchIndex; stamp: string }>();

interface IndexableEvent {
  id: string;
  title?: string | null;
  description?: string | null;
  location_name?: string | null;
  category?: string | null;
  creator?: { username?: string | null; full_name?: string | null } | null;
}

export const buildSearchIndex = (event: IndexableEvent): SearchIndex => {
  const stamp = `${event.title ?? ""}|${event.location_name ?? ""}|${event.category ?? ""}|${
    event.creator?.username ?? ""
  }|${(event.description ?? "").length}`;
  const cached = indexCache.get(event.id);
  if (cached && cached.stamp === stamp) return cached.index;

  const title = normalizeText(event.title);
  const creator = normalizeText(
    [event.creator?.full_name, event.creator?.username].filter(Boolean).join(" "),
  );
  const categoryLabel = event.category ? CATEGORY_LABEL.get(event.category) : undefined;
  const tags = extractDescriptionTags(event.description, event.title, event.category);

  const index: SearchIndex = {
    title,
    titleWords: title.split(" ").filter(Boolean),
    location: normalizeText(event.location_name),
    category: normalizeText([event.category, categoryLabel].filter(Boolean).join(" ")),
    creator,
    creatorWords: creator.split(" ").filter(Boolean),
    description: normalizeText(event.description),
    tags: normalizeText(tags.join(" ")),
  };

  indexCache.set(event.id, { index, stamp });
  return index;
};

/** True when `a` and `b` are within `max` single-character edits. */
export const levenshteinWithin = (a: string, b: string, max = 1): boolean => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return false;
    prev = curr;
  }
  return prev[b.length] <= max;
};

const scoreToken = (index: SearchIndex, token: string, fuzzy: boolean): number => {
  if (index.title === token) return 120;
  if (index.title.startsWith(token)) return 90;
  if (index.titleWords.some((w) => w === token)) return 80;
  if (index.title.includes(token)) return 60;
  if (index.creator.includes(token)) return 50;
  if (index.location.includes(token)) return 45;
  if (index.category.includes(token)) return 35;
  if (index.tags.includes(token)) return 25;
  if (index.description.includes(token)) return 15;
  if (fuzzy && token.length >= 4) {
    if (index.titleWords.some((w) => levenshteinWithin(w, token, 1))) return 30;
    if (index.creatorWords.some((w) => levenshteinWithin(w, token, 1))) return 20;
  }
  return 0;
};

/**
 * Score an event against query tokens. Returns 0 when any token fails to match
 * (AND semantics), otherwise the summed field-weighted score.
 */
export const scoreEvent = (
  event: IndexableEvent,
  tokens: string[],
  fuzzy = false,
): number => {
  if (tokens.length === 0) return 1;
  const index = buildSearchIndex(event);
  let total = 0;
  for (const token of tokens) {
    const score = scoreToken(index, token, fuzzy);
    if (score === 0) return 0;
    total += score;
  }
  return total;
};

/**
 * Filter + rank events by relevance. Falls back to a typo-tolerant pass when
 * the strict pass returns nothing.
 */
export const searchAndRank = <T extends IndexableEvent & { start_datetime?: string | null }>(
  events: T[],
  query: string,
): T[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return events;

  const run = (fuzzy: boolean) =>
    events
      .map((event) => ({ event, score: scoreEvent(event, tokens, fuzzy) }))
      .filter((entry) => entry.score > 0);

  let matches = run(false);
  if (matches.length === 0 && tokens.some((t) => t.length >= 4)) {
    matches = run(true);
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.event.start_datetime ? new Date(a.event.start_datetime).getTime() : Infinity;
    const bTime = b.event.start_datetime ? new Date(b.event.start_datetime).getTime() : Infinity;
    return aTime - bTime;
  });

  return matches.map((entry) => entry.event);
};
