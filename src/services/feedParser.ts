import Papa from "papaparse";
import { parseStringPromise } from "xml2js";

export type ParsedFeed = {
  rows: Record<string, string>[];
  columns: string[];
};

export type FeedFormat = "csv" | "xml";

/**
 * Detect the format of an uploaded feed from its filename and/or first bytes.
 * Falls back to CSV.
 */
export function detectFormat(opts: { filename?: string | null; sample?: string | null }): FeedFormat {
  const name = (opts.filename ?? "").toLowerCase();
  if (name.endsWith(".xml") || name.endsWith(".rss")) return "xml";
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) return "csv";

  const sample = (opts.sample ?? "").trimStart().slice(0, 200).toLowerCase();
  if (sample.startsWith("<?xml") || sample.startsWith("<rss") || sample.startsWith("<feed")) {
    return "xml";
  }
  return "csv";
}

/**
 * Parse a CSV string into an array of rows + detected columns.
 * The CSV is parsed once and the result is intended to be persisted to the
 * database immediately — Railway containers have ephemeral filesystems, so
 * we never write the upload to disk.
 */
export function parseCSV(csv: string): ParsedFeed {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  }

  const rows = (result.data ?? []).map((r) => normalizeRow(r));

  const columnSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) columnSet.add(k);

  return { rows, columns: Array.from(columnSet) };
}

/**
 * Parse an XML feed (RSS-style or generic <products><product>…</product></products>)
 * into the same shape as a CSV: a flat array of string-keyed records.
 *
 * We don't require a specific schema — instead we find the largest array of
 * plain objects inside the parsed tree and treat each as a product. This works
 * for RSS 2.0 / Google Shopping XML, Atom, and custom shapes IT teams ship.
 */
export async function parseXML(xml: string): Promise<ParsedFeed> {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
    explicitRoot: true,
  });

  const items = findItemsArray(parsed);
  if (!items || items.length === 0) {
    throw new Error(
      "Could not find any product items in the XML. Expected an array of product/item/entry elements."
    );
  }

  const rows = items.map((item) => normalizeRow(flattenXMLNode(item)));

  const columnSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) columnSet.add(k);

  return { rows, columns: Array.from(columnSet) };
}

/** Unified entry point: pick parser by format. */
export async function parseFeed(content: string, format: FeedFormat): Promise<ParsedFeed> {
  if (format === "xml") return parseXML(content);
  return parseCSV(content);
}

// ───────────────── helpers ─────────────────

function normalizeRow(r: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(r)) {
    const v = r[k];
    out[k] = v == null ? "" : String(v).trim();
  }
  return out;
}

/**
 * Walk a parsed XML tree and return the largest array of plain objects.
 * That array is overwhelmingly the product list.
 */
function findItemsArray(node: unknown): Record<string, unknown>[] | null {
  let best: Record<string, unknown>[] | null = null;

  function visit(n: unknown) {
    if (Array.isArray(n)) {
      const objs = n.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<
        string,
        unknown
      >[];
      if (objs.length > 0 && (!best || objs.length > best.length)) best = objs;
      for (const child of n) visit(child);
      return;
    }
    if (n && typeof n === "object") {
      // xml2js gives a single object when there's one child; coerce to array.
      const knownItemKeys = ["item", "product", "entry", "row"];
      for (const key of knownItemKeys) {
        const val = (n as Record<string, unknown>)[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
          // Single item — wrap as array.
          visit([val]);
        } else if (Array.isArray(val)) {
          visit(val);
        }
      }
      for (const v of Object.values(n)) visit(v);
    }
  }

  visit(node);
  return best;
}

/**
 * Flatten one XML element into a flat string-keyed record. Nested element
 * objects with a "_" text node are reduced to their text; attributes are
 * preserved with `field@attr` keys when present. Arrays are joined.
 *
 * Also strips common namespace prefixes like "g:" so Google Shopping feeds
 * land on familiar field names (g:price → price).
 */
function flattenXMLNode(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const rawKey of Object.keys(node)) {
    const key = stripNamespace(rawKey);
    const val = node[rawKey];

    if (val == null) {
      out[key] = "";
      continue;
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      out[key] = String(val);
      continue;
    }
    if (Array.isArray(val)) {
      out[key] = val.map((v) => xmlValueToString(v)).join(", ");
      continue;
    }
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      // xml2js: text node lives under "_" when an element has both text and attributes.
      if ("_" in obj) {
        out[key] = String(obj["_"] ?? "");
        for (const ak of Object.keys(obj)) {
          if (ak === "_") continue;
          out[`${key}@${stripNamespace(ak)}`] = xmlValueToString(obj[ak]);
        }
      } else {
        out[key] = xmlValueToString(val);
      }
    }
  }

  return out;
}

function xmlValueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(xmlValueToString).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("_" in o) return String(o["_"] ?? "");
    // Last resort: stringify shallowly.
    return Object.values(o).map(xmlValueToString).filter(Boolean).join(" ");
  }
  return "";
}

function stripNamespace(k: string): string {
  const i = k.indexOf(":");
  return i >= 0 ? k.slice(i + 1) : k;
}

/** Best-effort extraction of common product fields from a raw row. */
export function extractProductFields(row: Record<string, string>) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] != null && row[k] !== "") return row[k];
    }
    return undefined;
  };

  const priceRaw = pick("price", "Price", "PRICE");
  const price = priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9.\-]/g, "")) : undefined;

  return {
    externalId: pick("id", "ID", "sku", "SKU", "product_id"),
    title: pick("title", "name", "product_name", "Title", "Name"),
    description: pick("description", "Description", "desc"),
    brand: pick("brand", "Brand", "manufacturer"),
    price: Number.isFinite(price) ? price : undefined,
    currency: pick("currency", "Currency"),
    availability: pick("availability", "Availability", "stock_status"),
    imageLink: pick("image_link", "image_url", "image", "Image"),
    productUrl: pick("product_url", "url", "link", "Link"),
  };
}
