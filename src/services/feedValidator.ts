import type { MappedRow } from "./feedMapper";

export type ChannelFieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "url" | "price" | "number";
};

export type ValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  field?: string;
  productIndex?: number;
  productId?: string;
};

export type ValidationReport = {
  score: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  totalProducts: number;
};

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const PRICE_RE = /^\d+(\.\d{1,2})?(\s+[A-Z]{3})?$/;

function validateField(
  def: ChannelFieldDef,
  value: string,
  index: number,
  productId: string | undefined
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const empty = value == null || String(value).trim() === "";

  if (def.required && empty) {
    issues.push({
      level: "error",
      code: "missing_required",
      message: `Required field "${def.label}" is empty`,
      field: def.key,
      productIndex: index,
      productId,
    });
    return issues;
  }
  if (empty) return issues;

  switch (def.type) {
    case "url":
      if (!URL_RE.test(value)) {
        issues.push({
          level: "error",
          code: "invalid_url",
          message: `"${def.label}" is not a valid URL`,
          field: def.key,
          productIndex: index,
          productId,
        });
      }
      break;
    case "price": {
      // Accept "12.99" or "12.99 USD".
      if (!PRICE_RE.test(value.trim())) {
        issues.push({
          level: "warning",
          code: "price_format",
          message: `"${def.label}" should be a number, optionally with a currency code (e.g. "12.99 USD")`,
          field: def.key,
          productIndex: index,
          productId,
        });
      }
      break;
    }
    case "number":
      if (!Number.isFinite(parseFloat(value))) {
        issues.push({
          level: "warning",
          code: "not_number",
          message: `"${def.label}" is not numeric`,
          field: def.key,
          productIndex: index,
          productId,
        });
      }
      break;
  }

  // Generic length warning
  if (def.key === "title" && value.length > 150) {
    issues.push({
      level: "warning",
      code: "title_too_long",
      message: "Title is longer than 150 characters",
      field: def.key,
      productIndex: index,
      productId,
    });
  }
  if (def.key === "description" && value.length > 5000) {
    issues.push({
      level: "warning",
      code: "description_too_long",
      message: "Description exceeds 5000 characters",
      field: def.key,
      productIndex: index,
      productId,
    });
  }

  return issues;
}

export function validateFeed(
  rows: MappedRow[],
  fields: ChannelFieldDef[]
): ValidationReport {
  const issues: ValidationIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;

  rows.forEach((row, i) => {
    const productId = row.id;
    for (const def of fields) {
      const value = row[def.key] ?? "";
      const fieldIssues = validateField(def, value, i, productId);
      for (const issue of fieldIssues) {
        issues.push(issue);
        if (issue.level === "error") errorCount += 1;
        else warningCount += 1;
      }
    }
  });

  // Score: start at 100, lose 1 per error, 0.25 per warning, normalized by row count.
  const total = Math.max(rows.length, 1);
  const errorPenalty = Math.min(80, Math.round((errorCount / total) * 100));
  const warnPenalty = Math.min(20, Math.round((warningCount / total) * 25));
  const score = Math.max(0, 100 - errorPenalty - warnPenalty);

  return {
    score,
    errorCount,
    warningCount,
    issues,
    totalProducts: rows.length,
  };
}
