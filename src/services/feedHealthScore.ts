import type { ValidationReport } from "./feedValidator";

export type HealthInputs = {
  validation?: ValidationReport | null;
  productCount: number;
  excludedCount: number;
  lastRunAt?: Date | null;
};

export type HealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  signals: { label: string; status: "ok" | "warn" | "bad"; detail?: string }[];
};

function gradeFor(score: number): HealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function computeHealth({
  validation,
  productCount,
  excludedCount,
  lastRunAt,
}: HealthInputs): HealthScore {
  const validationScore = validation?.score ?? 50;
  const remaining = productCount - excludedCount;

  // Penalty for excluding too many products.
  const includedRatio = productCount > 0 ? remaining / productCount : 1;
  const includedScore = Math.round(includedRatio * 100);

  // Penalty for being stale (>7 days).
  let freshnessScore = 100;
  if (lastRunAt) {
    const days = (Date.now() - new Date(lastRunAt).getTime()) / 86_400_000;
    if (days > 30) freshnessScore = 40;
    else if (days > 7) freshnessScore = 70;
    else if (days > 3) freshnessScore = 90;
  } else {
    freshnessScore = 50;
  }

  const score = Math.round(validationScore * 0.6 + includedScore * 0.25 + freshnessScore * 0.15);

  const signals: HealthScore["signals"] = [
    {
      label: "Validation",
      status: validationScore >= 90 ? "ok" : validationScore >= 70 ? "warn" : "bad",
      detail: validation
        ? `${validation.errorCount} errors, ${validation.warningCount} warnings`
        : "Not yet validated",
    },
    {
      label: "Coverage",
      status: includedRatio >= 0.9 ? "ok" : includedRatio >= 0.7 ? "warn" : "bad",
      detail: `${remaining}/${productCount} products included`,
    },
    {
      label: "Freshness",
      status: freshnessScore >= 90 ? "ok" : freshnessScore >= 70 ? "warn" : "bad",
      detail: lastRunAt
        ? `Last run ${new Date(lastRunAt).toLocaleString()}`
        : "Never run",
    },
  ];

  return { score, grade: gradeFor(score), signals };
}
