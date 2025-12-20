import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

import appHome from "@assets/recordings/demo_1_app_home.png";
import campaigns from "@assets/recordings/demo_2_campaigns.png";
import accounts from "@assets/recordings/demo_3_accounts.png";
import finalResult from "@assets/recordings/demo_7_comment_posted.png";

const slides = [
  {
    title: "Social Media Grower - Home",
    description: "The main dashboard showing platform automation capabilities",
    image: appHome,
  },
  {
    title: "Campaign Management",
    description: "Create and manage automated commenting campaigns",
    image: campaigns,
  },
  {
    title: "Account Management",
    description: "Connected accounts with session status",
    image: accounts,
  },
  {
    title: "Result: Comment Posted",
    description: "Automated comment successfully posted to Facebook",
    image: finalResult,
  },
];

export default function DemoSummary() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const startAutoPlay = () => {
    setIsPlaying(true);
    setCurrentSlide(0);
    let slide = 0;
    const interval = setInterval(() => {
      slide++;
      if (slide >= slides.length) {
        clearInterval(interval);
        setIsPlaying(false);
      } else {
        setCurrentSlide(slide);
      }
    }, 3000);
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Social Media Grower Demo</h1>
          <p className="text-muted-foreground">
            Automated social media engagement workflow
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl">{slide.title}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {currentSlide + 1} / {slides.length}
              </span>
            </div>
            <p className="text-muted-foreground">{slide.description}</p>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-contain"
                data-testid={`img-slide-${currentSlide}`}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            disabled={isPlaying}
            data-testid="button-prev-slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            onClick={startAutoPlay}
            disabled={isPlaying}
            data-testid="button-play-demo"
          >
            <Play className="h-4 w-4 mr-2" />
            {isPlaying ? "Playing..." : "Auto Play"}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            disabled={isPlaying}
            data-testid="button-next-slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => !isPlaying && setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentSlide
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
              data-testid={`button-slide-dot-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
