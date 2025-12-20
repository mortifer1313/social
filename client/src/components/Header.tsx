import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Bell, Settings, Users, BarChart3, Home, MessageSquare, Eye, LogOut, Shield, UserPlus, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activePlatforms: number;
  onOpenTutorial?: () => void;
}

export default function Header({
  darkMode,
  onToggleDarkMode,
  activePlatforms,
  onOpenTutorial,
}: HeaderProps) {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

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
        <Link href="/templates">
          <Button size="sm" variant="ghost" data-testid="button-templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </Link>
        <Link href="/competitors">
          <Button size="sm" variant="ghost" data-testid="button-competitors">
            <Eye className="h-4 w-4 mr-2" />
            Competitors
          </Button>
        </Link>
        {user?.role === "admin" && (
          <Link href="/users">
            <Button size="sm" variant="ghost" data-testid="button-users">
              <UserPlus className="h-4 w-4 mr-2" />
              Clients
            </Button>
          </Link>
        )}
        <Button size="icon" variant="ghost" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
        </Button>
        {onOpenTutorial && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenTutorial}
            data-testid="button-tutorial"
            title="Open Tutorial"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleDarkMode}
          data-testid="button-theme"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-item-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <Link href="/users">
              <DropdownMenuItem data-testid="menu-item-admin">
                <Shield className="mr-2 h-4 w-4" />
                Manage Clients
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} data-testid="menu-item-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
