import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CommandCardProps {
  command: string;
  description: string;
  category: "system" | "bot" | "commenting" | "monitoring";
  example?: string;
}

const categoryColors = {
  system: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  bot: "bg-primary/20 text-primary border-primary/30",
  commenting: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  monitoring: "bg-chart-3/20 text-chart-3 border-chart-3/30",
};

const categoryLabels = {
  system: "System",
  bot: "Bot",
  commenting: "Comment",
  monitoring: "Monitor",
};

export default function CommandCard({ command, description, category, example }: CommandCardProps) {
  return (
    <Card className="p-4 hover-elevate">
      <div className="flex items-start justify-between gap-3 mb-2">
        <code className="font-mono text-sm font-medium text-foreground bg-muted px-2 py-1 rounded">
          {command}
        </code>
        <Badge variant="outline" className={`text-xs ${categoryColors[category]}`}>
          {categoryLabels[category]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {example && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Example: </span>
          <code className="font-mono text-xs text-primary">{example}</code>
        </div>
      )}
    </Card>
  );
}
