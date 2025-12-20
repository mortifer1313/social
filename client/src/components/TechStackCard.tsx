import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TechItem {
  name: string;
  description: string;
}

interface TechStackCardProps {
  category: string;
  icon: string;
  items: TechItem[];
}

export default function TechStackCard({ category, icon, items }: TechStackCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-foreground">{category}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit">
              {item.name}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
