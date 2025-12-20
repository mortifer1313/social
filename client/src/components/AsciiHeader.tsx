import { Badge } from "@/components/ui/badge";

export default function AsciiHeader() {
  return (
    <div className="text-center py-8 border-b border-border">
      <pre className="font-mono text-primary text-xs sm:text-sm md:text-base leading-tight inline-block text-left">
{`   _____ __  __  _____ 
  / ____|  \\/  |/ ____|
 | (___ | \\  / | |  __ 
  \\___ \\| |\\/| | | |_ |
  ____) | |  | | |__| |
 |_____/|_|  |_|\\_____|`}
      </pre>
      <h1 className="text-2xl md:text-3xl font-bold mt-4 text-foreground">
        Social Media Grower
      </h1>
      <p className="text-muted-foreground mt-2 text-sm md:text-base">
        Intelligent Multi-Platform Automation System
      </p>
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <Badge variant="outline">v1.0.0</Badge>
        <Badge variant="secondary">Flask + React</Badge>
        <Badge>Production Ready</Badge>
      </div>
    </div>
  );
}
