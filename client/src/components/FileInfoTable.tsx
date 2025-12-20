import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FileInfo {
  name: string;
  lines: number;
  purpose: string;
  type: "python" | "html" | "css" | "javascript" | "config";
}

interface FileInfoTableProps {
  files: FileInfo[];
}

const typeColors = {
  python: "bg-chart-4/20 text-chart-4",
  html: "bg-chart-5/20 text-chart-5",
  css: "bg-chart-1/20 text-chart-1",
  javascript: "bg-chart-2/20 text-chart-2",
  config: "bg-muted text-muted-foreground",
};

export default function FileInfoTable({ files }: FileInfoTableProps) {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Purpose</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.name} data-testid={`file-row-${file.name}`}>
              <TableCell className="font-mono text-sm">{file.name}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {file.lines.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${typeColors[file.type]}`}>
                  {file.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{file.purpose}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell>Total</TableCell>
            <TableCell className="text-right font-mono">{totalLines.toLocaleString()}</TableCell>
            <TableCell colSpan={2}>{files.length} files</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
