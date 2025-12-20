import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Clock, Shield, Moon, Shuffle } from "lucide-react";
import type { StealthSettings as StealthSettingsType } from "@shared/schema";

interface StealthSettingsProps {
  settings: StealthSettingsType;
  onChange: (settings: StealthSettingsType) => void;
}

export default function StealthSettings({ settings, onChange }: StealthSettingsProps) {
  const updateSetting = <K extends keyof StealthSettingsType>(
    key: K,
    value: StealthSettingsType[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="stealth" className="border-none">
        <AccordionTrigger className="py-2 hover:no-underline" data-testid="accordion-stealth-settings">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Stealth Settings</span>
            <Badge variant="secondary" className="text-xs">Advanced</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Delay Between Comments</Label>
            </div>
            <div className="pl-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {settings.minDelay}s</span>
                  <span>Max: {settings.maxDelay}s</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Minimum</Label>
                    <Slider
                      value={[settings.minDelay]}
                      onValueChange={([v]) => updateSetting("minDelay", v)}
                      min={30}
                      max={300}
                      step={10}
                      data-testid="slider-min-delay"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Maximum</Label>
                    <Slider
                      value={[settings.maxDelay]}
                      onValueChange={([v]) => updateSetting("maxDelay", v)}
                      min={60}
                      max={600}
                      step={10}
                      data-testid="slider-max-delay"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Active Hours</Label>
            </div>
            <div className="pl-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Start Hour: {settings.activeHoursStart}:00</Label>
                  <Slider
                    value={[settings.activeHoursStart]}
                    onValueChange={([v]) => updateSetting("activeHoursStart", v)}
                    min={0}
                    max={23}
                    step={1}
                    data-testid="slider-active-start"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">End Hour: {settings.activeHoursEnd}:00</Label>
                  <Slider
                    value={[settings.activeHoursEnd]}
                    onValueChange={([v]) => updateSetting("activeHoursEnd", v)}
                    min={0}
                    max={23}
                    step={1}
                    data-testid="slider-active-end"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Comments will only be posted during these hours to appear more natural
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm">Daily Limits</Label>
            <div className="pl-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Max Comments Per Hour: {settings.maxCommentsPerHour}</Label>
                <Slider
                  value={[settings.maxCommentsPerHour]}
                  onValueChange={([v]) => updateSetting("maxCommentsPerHour", v)}
                  min={1}
                  max={30}
                  step={1}
                  data-testid="slider-max-per-hour"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Comments Per Day: {settings.maxCommentsPerDay}</Label>
                <Slider
                  value={[settings.maxCommentsPerDay]}
                  onValueChange={([v]) => updateSetting("maxCommentsPerDay", v)}
                  min={1}
                  max={100}
                  step={1}
                  data-testid="slider-max-per-day"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Behavior Options</Label>
            </div>
            <div className="pl-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Randomize Order</Label>
                  <p className="text-xs text-muted-foreground">Shuffle timing for unpredictability</p>
                </div>
                <Switch
                  checked={settings.randomizeOrder}
                  onCheckedChange={(v) => updateSetting("randomizeOrder", v)}
                  data-testid="switch-randomize"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Pause on Weekends</Label>
                  <p className="text-xs text-muted-foreground">Skip Saturday and Sunday</p>
                </div>
                <Switch
                  checked={settings.pauseOnWeekends}
                  onCheckedChange={(v) => updateSetting("pauseOnWeekends", v)}
                  data-testid="switch-weekends"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Human Typing Simulation</Label>
                  <p className="text-xs text-muted-foreground">Add realistic typing delays</p>
                </div>
                <Switch
                  checked={settings.humanTypingSimulation}
                  onCheckedChange={(v) => updateSetting("humanTypingSimulation", v)}
                  data-testid="switch-typing"
                />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
