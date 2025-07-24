import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Flag, AlertTriangle } from "lucide-react";
import { generateRandomUsername } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLoginSuccess: (inviteCode: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [customUsername, setCustomUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.username}!`
        });
        onLoginSuccess(inviteCode.trim());
      } else {
        const error = await response.json();
        if (response.status === 401) {
          // User not found, offer to register
          setIsRegistering(true);
        } else {
          toast({
            title: "Login failed",
            description: error.message || "Please check your invite code.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inviteCode: inviteCode.trim(),
          username: customUsername.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Registration successful",
          description: `Welcome to GhostRacer, ${data.user.username}!`
        });
        onLoginSuccess(inviteCode.trim());
      } else {
        const error = await response.json();
        toast({
          title: "Registration failed",
          description: error.message || "Please check your invite code.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleUsername = () => {
    setCustomUsername(generateRandomUsername());
  };

  return (
    <div className="min-h-screen bg-racing-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-racing-charcoal border-racing-steel/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-racing-blue to-racing-red rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Flag className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-wide">
            GhostRacer
          </CardTitle>
          <CardDescription className="text-racing-gray">
            {isRegistering ? 'Create your anonymous profile' : 'Enter your invite code to join'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {!isRegistering ? (
              <>
                <div>
                  <Label htmlFor="inviteCode" className="text-racing-gray">
                    Invite Code
                  </Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter your invite code"
                    className="bg-racing-steel/30 border-racing-gray/30 text-white placeholder-racing-gray/50 focus:border-racing-blue mt-1"
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading || !inviteCode.trim()}
                  className="w-full bg-gradient-to-r from-racing-blue to-racing-red hover:from-racing-blue/80 hover:to-racing-red/80 text-white font-semibold py-2"
                >
                  {isLoading ? 'Connecting...' : 'Join Session'}
                </Button>
              </>
            ) : (
              <>
                <div className="bg-racing-amber/10 border border-racing-amber/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-racing-amber mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-racing-amber">
                      Invite code not recognized. You can register as a new user with this code.
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="inviteCode" className="text-racing-gray">
                    Invite Code
                  </Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="bg-racing-steel/30 border-racing-gray/30 text-white mt-1"
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="username" className="text-racing-gray">
                    Username (optional)
                  </Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      id="username"
                      type="text"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      placeholder="Leave empty for random name"
                      className="bg-racing-steel/30 border-racing-gray/30 text-white placeholder-racing-gray/50 focus:border-racing-blue"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      onClick={generateSampleUsername}
                      variant="outline"
                      size="sm"
                      className="bg-racing-steel/30 border-racing-gray/30 text-racing-gray hover:bg-racing-steel/50 whitespace-nowrap"
                    >
                      Random
                    </Button>
                  </div>
                  <p className="text-xs text-racing-gray mt-1">
                    Anonymous usernames keep your identity private
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    variant="outline"
                    className="flex-1 bg-racing-steel/30 border-racing-gray/30 text-white hover:bg-racing-steel/50"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !inviteCode.trim()}
                    className="flex-1 bg-gradient-to-r from-racing-green to-racing-blue hover:from-racing-green/80 hover:to-racing-blue/80 text-white font-semibold"
                  >
                    {isLoading ? 'Creating...' : 'Create Profile'}
                  </Button>
                </div>
              </>
            )}
          </form>
          
          <div className="mt-6 pt-4 border-t border-racing-steel/30 text-center">
            <p className="text-xs text-racing-gray">
              For track use only. Privacy-focused design.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
