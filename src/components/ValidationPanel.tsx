import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Issue = {
  level: "error" | "warning";
  message: string;
  field?: string;
  productIndex?: number;
};

export function ValidationPanel({
  score,
  errorCount,
  warningCount,
  issues,
}: {
  score: number;
  errorCount: number;
  warningCount: number;
  issues: Issue[];
}) {
  const top = issues.slice(0, 25);
  const scoreColor =
    score >= 90 ? "success" : score >= 70 ? "warning" : "destructive";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Validation
          <Badge variant={scoreColor as "success" | "warning" | "destructive"}>
            Score {score}/100
          </Badge>
          <Badge variant="destructive">{errorCount} errors</Badge>
          <Badge variant="warning">{warningCount} warnings</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues detected. </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {top.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Badge variant={i.level === "error" ? "destructive" : "warning"}>
                  {i.level}
                </Badge>
                <div>
                  <p>{i.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.field ? `field: ${i.field}` : ""}
                    {i.productIndex != null ? ` · row #${i.productIndex}` : ""}
                  </p>
                </div>
              </li>
            ))}
            {issues.length > top.length && (
              <li className="text-xs text-muted-foreground">
                …and {issues.length - top.length} more.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
