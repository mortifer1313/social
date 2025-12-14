import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Bell, Settings, Users, BarChart3, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activePlatforms: number;
}

export default function Header({
  darkMode,
  onToggleDarkMode,
  activePlatforms,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card/50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">Social Media Grower</h1>
            <p className="text-xs text-muted-foreground">
              Intelligent Automation
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant={activePlatforms > 0 ? "default" : "secondary"}
          className="hidden sm:flex"
        >
          {activePlatforms} Platform{activePlatforms !== 1 ? "s" : ""} Active
        </Badge>
        <Link href="/">
          <Button size="sm" variant="ghost" data-testid="button-home">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <Link href="/accounts">
          <Button size="sm" variant="ghost" data-testid="button-accounts">
            <Users className="h-4 w-4 mr-2" />
            Accounts
          </Button>
        </Link>
        <Link href="/analytics">
          <Button size="sm" variant="ghost" data-testid="button-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </Link>
        <Button size="icon" variant="ghost" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" data-testid="button-settings">
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleDarkMode}
          data-testid="button-theme"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
