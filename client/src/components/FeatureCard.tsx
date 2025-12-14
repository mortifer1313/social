import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  stats?: string;
  tags?: string[];
}

export default function FeatureCard({ icon, title, description, stats, tags }: FeatureCardProps) {
  return (
    <Card className="p-5 hover-elevate">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          {stats && (
            <div className="text-lg font-bold text-primary mb-2">{stats}</div>
          )}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
