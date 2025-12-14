import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Comment {
  id: number;
  text: string;
  category: string;
}

interface CommentPreviewProps {
  comments: Comment[];
  onRefresh: () => void;
  isLoading?: boolean;
}

const categoryColors: Record<string, string> = {
  positive: "bg-green-500/20 text-green-400",
  playful: "bg-yellow-500/20 text-yellow-400",
  sassy: "bg-pink-500/20 text-pink-400",
  dramatic: "bg-purple-500/20 text-purple-400",
  appreciative: "bg-blue-500/20 text-blue-400",
  critics: "bg-red-500/20 text-red-400",
};

export default function CommentPreview({
  comments,
  onRefresh,
  isLoading,
}: CommentPreviewProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Comment Preview</h3>
          <p className="text-sm text-muted-foreground">
            200+ intelligent templates
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="button-refresh-comments"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="group p-3 rounded-lg bg-muted/50 hover-elevate"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${categoryColors[comment.category] || ""}`}
                >
                  {comment.category}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(comment.id, comment.text)}
                >
                  {copiedId === comment.id ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{comment.text}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
