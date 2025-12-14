import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
}: StatsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          {trend === "up" ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : trend === "down" ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : null}
          <span
            className={
              trend === "up"
                ? "text-green-500"
                : trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
            }
          >
            {trendValue}
          </span>
          <span className="text-muted-foreground">vs yesterday</span>
        </div>
      )}
    </Card>
  );
}
