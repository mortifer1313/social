import FileTree from '../FileTree';

const mockData = [
  {
    name: "social-media-grower/",
    type: "folder" as const,
    children: [
      {
        name: "bots/",
        type: "folder" as const,
        description: "Platform automation",
        children: [
          { name: "instagram.py", type: "file" as const, badge: "Bot" },
          { name: "facebook.py", type: "file" as const, badge: "Bot" },
          { name: "tiktok.py", type: "file" as const, badge: "Bot" },
        ],
      },
      {
        name: "templates/",
        type: "folder" as const,
        description: "Web interface",
        children: [
          { name: "index.html", type: "file" as const, badge: "137 lines" },
        ],
      },
      { name: "app.py", type: "file" as const, badge: "478 lines", description: "Main Flask app" },
    ],
  },
];

export default function FileTreeExample() {
  return <FileTree data={mockData} />;
}
