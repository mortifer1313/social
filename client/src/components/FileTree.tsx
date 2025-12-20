import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileNode {
  name: string;
  type: "folder" | "file";
  description?: string;
  badge?: string;
  children?: FileNode[];
}

interface FileTreeProps {
  data: FileNode[];
}

function TreeNode({ node, depth = 0, isLast = false }: { node: FileNode; depth?: number; isLast?: boolean }) {
  const indent = depth > 0 ? "│   ".repeat(depth - 1) + (isLast ? "└── " : "├── ") : "";
  const icon = node.type === "folder" ? "📁" : "📄";
  
  return (
    <>
      <div className="flex items-start gap-2 py-0.5 font-mono text-sm hover-elevate rounded px-2 -mx-2">
        <span className="text-muted-foreground whitespace-pre">{indent}</span>
        <span>{icon}</span>
        <span className={node.type === "folder" ? "text-chart-4 font-medium" : "text-foreground"}>
          {node.name}
        </span>
        {node.badge && (
          <Badge variant="outline" className="text-xs py-0 h-5">
            {node.badge}
          </Badge>
        )}
        {node.description && (
          <span className="text-muted-foreground text-xs ml-2">— {node.description}</span>
        )}
      </div>
      {node.children?.map((child, index) => (
        <TreeNode
          key={child.name}
          node={child}
          depth={depth + 1}
          isLast={index === node.children!.length - 1}
        />
      ))}
    </>
  );
}

export default function FileTree({ data }: FileTreeProps) {
  return (
    <Card className="p-4 bg-card/50">
      <div className="space-y-0">
        {data.map((node, index) => (
          <TreeNode key={node.name} node={node} isLast={index === data.length - 1} />
        ))}
      </div>
    </Card>
  );
}
