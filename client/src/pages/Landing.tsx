import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { Shield, Zap, Users, BarChart3, Clock, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoggingIn } = useAuth();

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    
    login({ email, password }, {
      onSuccess: (result) => {
        if (!result.success && result.error) {
          setError(result.error);
        }
      },
      onError: () => {
        setError("Login failed. Please try again.");
      },
    });
  };
  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Role-based access control, audit logging, and encrypted sessions"
    },
    {
      icon: Zap,
      title: "Stealth Automation",
      description: "Human-like behavior patterns with randomized timing and pauses"
    },
    {
      icon: Users,
      title: "Multi-Account Support",
      description: "Manage multiple accounts with warmup progression and health monitoring"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track engagement, monitor competitors, and measure campaign success"
    },
    {
      icon: Clock,
      title: "Smart Scheduling",
      description: "Timezone-aware scheduling with active hours and daily limits"
    },
    {
      icon: Lock,
      title: "Session Management",
      description: "Persistent browser sessions with automatic refresh and health checks"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Social Media Grower</span>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <Badge variant="secondary" className="mb-4" data-testid="badge-enterprise">
                  Enterprise-Grade Solution
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-hero-title">
                  Automate Your Social Media Growth
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Intelligent multi-platform automation for Instagram, Facebook, and TikTok. 
                  Human-like engagement with enterprise security and compliance.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <SiInstagram className="w-5 h-5" />
                    <span>Instagram</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <SiFacebook className="w-5 h-5" />
                    <span>Facebook</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <SiTiktok className="w-5 h-5" />
                    <span>TikTok</span>
                  </div>
                </div>
              </div>

              <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Access your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="email" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email" data-testid="tab-email-login">Email</TabsTrigger>
                      <TabsTrigger value="replit" data-testid="tab-replit-login">Replit</TabsTrigger>
                    </TabsList>
                    <TabsContent value="email" className="mt-4">
                      <form onSubmit={handleLocalLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            data-testid="input-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            data-testid="input-password"
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive" data-testid="text-login-error">
                            {error}
                          </p>
                        )}
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoggingIn}
                          data-testid="button-login-submit"
                        >
                          {isLoggingIn ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                    <TabsContent value="replit" className="mt-4">
                      <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Sign in with your Replit account for seamless access
                        </p>
                        <Button asChild className="w-full" data-testid="button-replit-login">
                          <a href="/api/login">Sign in with Replit</a>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-features-title">
              Enterprise Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} data-testid={`card-feature-${index}`}>
                  <CardHeader>
                    <feature.icon className="w-10 h-10 text-primary mb-2" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Scale Your Engagement?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join teams using Social Media Grower to automate their social presence 
              while maintaining authenticity and compliance.
            </p>
            <Button size="lg" asChild data-testid="button-cta-login">
              <a href="/api/login">Start Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>Social Media Grower - Enterprise Social Automation</p>
        </div>
      </footer>
    </div>
  );
}
