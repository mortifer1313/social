import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FolderTree, 
  Globe, 
  Sparkles, 
  Terminal, 
  Rocket, 
  Hammer, 
  Layers, 
  FileCode, 
  Play
} from "lucide-react";

interface NavItem {
  id: string;
  number: number;
  title: string;
  icon: typeof FolderTree;
}

const navItems: NavItem[] = [
  { id: "structure", number: 1, title: "Project Structure", icon: FolderTree },
  { id: "architecture", number: 2, title: "Web Architecture", icon: Globe },
  { id: "features", number: 3, title: "Core Features", icon: Sparkles },
  { id: "commands", number: 4, title: "Command System", icon: Terminal },
  { id: "deployment", number: 5, title: "Deployment", icon: Rocket },
  { id: "build", number: 6, title: "Build Process", icon: Hammer },
  { id: "tech", number: 7, title: "Tech Stack", icon: Layers },
  { id: "files", number: 8, title: "File Breakdown", icon: FileCode },
  { id: "demo", number: 9, title: "Demo Commands", icon: Play },
];

interface NavigationMenuProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export default function NavigationMenu({ activeSection, onSectionChange }: NavigationMenuProps) {
  return (
    <ScrollArea className="h-full">
      <nav className="p-4 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Documentation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${isActive ? "bg-accent" : ""}`}
              onClick={() => onSectionChange(item.id)}
              data-testid={`nav-${item.id}`}
            >
              <span className="font-mono text-xs text-muted-foreground w-4">
                {item.number}
              </span>
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.title}</span>
            </Button>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
