import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play,
  LayoutDashboard,
  Target,
  MessageSquare,
  Users,
  Activity,
  Settings,
  Sparkles,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Social Media Grower",
    description: "Your intelligent multi-platform social media automation system",
    icon: <Sparkles className="w-8 h-8" />,
    details: [
      "Automate engagement across Instagram, Facebook, and TikTok",
      "Choose from 6 comment categories with unique tones",
      "Built-in stealth technology to mimic human behavior",
      "Real-time campaign monitoring and activity logs"
    ],
    tip: "This tutorial will walk you through all the key features. Let's get started!"
  },
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "Your command center for all automation activities",
    icon: <LayoutDashboard className="w-8 h-8" />,
    details: [
      "Stats cards show total comments, active campaigns, and success rate",
      "Three platform cards: Instagram, Facebook, TikTok",
      "Campaign Queue shows all running and completed campaigns",
      "Activity log displays recent actions with status indicators"
    ],
    tip: "The dashboard refreshes automatically every 5 seconds to show live updates."
  },
  {
    id: "platforms",
    title: "Starting a Campaign",
    description: "Click any platform card to begin",
    icon: (
      <div className="flex gap-2">
        <SiInstagram className="w-6 h-6" />
        <SiFacebook className="w-6 h-6" />
        <SiTiktok className="w-6 h-6" />
      </div>
    ),
    details: [
      "Click 'Post Comments' on any platform card to open the campaign dialog",
      "The dialog lets you configure your entire campaign",
      "Each campaign targets one platform at a time",
      "You can create multiple campaigns across different platforms"
    ],
    tip: "Make sure you have accounts connected in the Accounts page before creating campaigns."
  },
  {
    id: "campaigns",
    title: "Campaign Configuration",
    description: "Set up your automated commenting campaign",
    icon: <Target className="w-8 h-8" />,
    details: [
      "Choose target type: Profile (comment on their posts) or specific Post URL",
      "Add multiple targets to comment on several profiles/posts",
      "Select comment category: Mixed, Positive, Playful, Sassy, Dramatic, Appreciative, or Critics",
      "Set the number of comments (slider from 1-100)"
    ],
    tip: "Start with smaller campaigns (5-10 comments) to test before scaling up."
  },
  {
    id: "stealth",
    title: "Stealth Settings",
    description: "Configure human-like behavior to stay safe",
    icon: <Settings className="w-8 h-8" />,
    details: [
      "Min/Max Delay: Random wait time between comments (default 60-180 seconds)",
      "Active Hours: Only post during set hours (default 9 AM - 10 PM)",
      "Daily Limits: Max comments per hour (10) and per day (50)",
      "Human Typing Simulation: Mimics natural typing speed",
      "Weekend Pausing: Optionally skip weekends for natural patterns"
    ],
    tip: "The default settings are optimized for safety. Adjust carefully."
  },
  {
    id: "accounts",
    title: "Account Management",
    description: "Connect and manage your social media accounts",
    icon: <Users className="w-8 h-8" />,
    details: [
      "Go to the Accounts page from the header navigation",
      "Add accounts for each platform with login credentials",
      "Import browser sessions to transfer existing logins",
      "View account warmup status and session health",
      "Bulk import accounts via CSV file"
    ],
    tip: "Use the Session Import feature to maintain login status across restarts."
  },
  {
    id: "queue",
    title: "Campaign Queue",
    description: "Monitor and control your running campaigns",
    icon: <Activity className="w-8 h-8" />,
    details: [
      "View all campaigns with their progress and status",
      "Pause, Resume, or Cancel campaigns at any time",
      "See estimated completion time for each campaign",
      "Track successful and failed comment counts"
    ],
    tip: "Paused campaigns can be resumed later from where they left off."
  },
  {
    id: "activity",
    title: "Activity Log",
    description: "Track all actions in real-time",
    icon: <MessageSquare className="w-8 h-8" />,
    details: [
      "Green badges indicate successful actions",
      "Yellow badges show warnings to review",
      "Red badges highlight errors that need attention",
      "Click entries for more details about each action"
    ],
    tip: "Check the activity log regularly to catch any issues early."
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start growing your social media presence",
    icon: <CheckCircle2 className="w-8 h-8" />,
    details: [
      "Click 'Post Comments' on a platform card to create your first campaign",
      "Monitor progress in the Campaign Queue section below",
      "Add accounts in the Accounts page (header navigation)",
      "View analytics and templates from the header menu"
    ],
    tip: "Need help? Click the help icon in the header anytime to review this tutorial."
  }
];

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InteractiveTutorial({ isOpen, onClose }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const goToStep = (index: number) => {
    if (index >= 0 && index < tutorialSteps.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(index);
        setIsAnimating(false);
      }, 150);
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className={`w-full max-w-2xl mx-4 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <CardHeader className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4"
            onClick={onClose}
            data-testid="button-close-tutorial"
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              {step.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </Badge>
              </div>
              <CardTitle className="text-xl">{step.title}</CardTitle>
            </div>
          </div>
          <CardDescription className="text-base">{step.description}</CardDescription>
          
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {step.details.map((detail, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{detail}</span>
              </li>
            ))}
          </ul>
          
          {step.tip && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <HelpCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm">
                <span className="font-medium">Pro Tip:</span> {step.tip}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex items-center justify-between gap-4 border-t pt-4">
          <div className="flex gap-1">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                onClick={() => goToStep(index)}
                data-testid={`button-step-indicator-${index}`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} data-testid="button-prev-step">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            
            {currentStep < tutorialSteps.length - 1 ? (
              <Button onClick={nextStep} data-testid="button-next-step">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onClose} data-testid="button-finish-tutorial">
                <Play className="w-4 h-4 mr-1" />
                Start Using App
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Export a button component to trigger the tutorial
export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
      data-testid="button-open-tutorial"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Tutorial</span>
    </Button>
  );
}
