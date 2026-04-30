/**
 * Mock AI module — deterministic suggestions, no real API calls.
 * The shape is API-compatible so it can later be replaced with a real LLM.
 */

import type { MappedRow } from "./feedMapper";

export type AISuggestions = {
  title?: string;
  category?: string;
  labels?: string[];
};

const CATEGORY_KEYWORDS: { keyword: string; category: string }[] = [
  { keyword: "shirt", category: "Apparel > Tops" },
  { keyword: "shoe", category: "Apparel > Footwear" },
  { keyword: "phone", category: "Electronics > Mobile" },
  { keyword: "laptop", category: "Electronics > Computers" },
  { keyword: "lamp", category: "Home > Lighting" },
  { keyword: "tent", category: "Outdoor > Camping" },
];

export function suggest(product: MappedRow): AISuggestions {
  const title = String(product.title ?? "").trim();
  const brand = String(product.brand ?? "").trim();
  const description = String(product.description ?? "").trim();
  const haystack = `${title} ${description}`.toLowerCase();

  const titleSuggestion =
    brand && title && !title.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${title}`
      : undefined;

  const matched = CATEGORY_KEYWORDS.find((c) => haystack.includes(c.keyword));

  const labels: string[] = [];
  const priceNum = parseFloat(String(product.price ?? ""));
  if (Number.isFinite(priceNum)) {
    if (priceNum >= 500) labels.push("premium");
    else if (priceNum >= 100) labels.push("midrange");
    else labels.push("budget");
  }
  if (String(product.availability ?? "").toLowerCase().includes("out")) {
    labels.push("oos");
  }

  return {
    title: titleSuggestion,
    category: matched?.category,
    labels: labels.length ? labels : undefined,
  };
}
