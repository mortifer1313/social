import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface Phase {
  number: number;
  title: string;
  description: string;
  items: string[];
}

interface BuildPhaseTimelineProps {
  phases: Phase[];
}

export default function BuildPhaseTimeline({ phases }: BuildPhaseTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-6">
        {phases.map((phase) => (
          <div key={phase.number} className="relative flex gap-4">
            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
              {phase.number}
            </div>
            <Card className="flex-1 p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{phase.title}</h3>
                <Badge variant="outline" className="text-xs">
                  Phase {phase.number}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{phase.description}</p>
              <ul className="space-y-1">
                {phase.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
