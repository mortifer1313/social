import FileInfoTable from '../FileInfoTable';

const mockFiles = [
  { name: "app.py", lines: 478, purpose: "Main Flask application", type: "python" as const },
  { name: "index.html", lines: 137, purpose: "Terminal interface", type: "html" as const },
  { name: "style.css", lines: 455, purpose: "Professional styling", type: "css" as const },
  { name: "terminal.js", lines: 349, purpose: "Interactive logic", type: "javascript" as const },
];

export default function FileInfoTableExample() {
  return <FileInfoTable files={mockFiles} />;
}
