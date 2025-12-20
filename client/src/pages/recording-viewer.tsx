import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Play, Camera } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecordingViewer() {
  const screenshots = [
    { name: "step2_login_page.png", label: "Login Page" },
    { name: "step3_email_entered.png", label: "Email Entered" },
    { name: "step4_password_entered.png", label: "Password Entered" },
    { name: "step5_after_login.png", label: "After Login Click" },
    { name: "step5_verification_required.png", label: "Verification Required" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Facebook Automation - Proof of Concept Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This demo shows the complete automation flow from start to finish:
          </p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1">
            <li>Launch browser with screen recording</li>
            <li>Navigate to Facebook login page</li>
            <li>Enter email credentials automatically</li>
            <li>Enter password automatically</li>
            <li>Click login button</li>
            <li>Handle login result (save session or detect verification)</li>
            <li>Navigate to target post</li>
            <li>Post comment automatically</li>
          </ol>

          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="video" data-testid="tab-video">
                <Play className="w-4 h-4 mr-2" />
                Video Recording
              </TabsTrigger>
              <TabsTrigger value="screenshots" data-testid="tab-screenshots">
                <Camera className="w-4 h-4 mr-2" />
                Screenshots
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="video" className="space-y-4">
              <div className="rounded-lg overflow-hidden border bg-black">
                <video 
                  controls 
                  className="w-full"
                  data-testid="video-recording"
                >
                  <source src="/api/recordings/demo_proof_of_concept.webm" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex gap-2 flex-wrap">
                <a href="/api/recordings/demo_proof_of_concept.webm" download>
                  <Button variant="outline" data-testid="button-download-recording">
                    <Download className="w-4 h-4 mr-2" />
                    Download Video
                  </Button>
                </a>
              </div>
            </TabsContent>
            
            <TabsContent value="screenshots" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((screenshot, index) => (
                  <div key={screenshot.name} className="space-y-2">
                    <p className="text-sm font-medium">
                      Step {index + 2}: {screenshot.label}
                    </p>
                    <div className="rounded-lg overflow-hidden border">
                      <img 
                        src={`/api/recordings/${screenshot.name}`}
                        alt={screenshot.label}
                        className="w-full"
                        data-testid={`img-screenshot-${index}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">What happened:</p>
            <p className="text-sm text-muted-foreground">
              The automation successfully logged into Facebook with the provided credentials.
              Facebook detected a new login and triggered a security checkpoint for verification.
              This is expected behavior for first-time automated logins from new environments.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Solution:</strong> You need to manually log into this account once (from any browser), 
              complete the verification, and the automation will then be able to use the saved session 
              for future logins without requiring verification again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
