import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@bepoz.com");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const result = await login(email);
      if (result.success) {
        toast({
          title: "Welcome to Bepoz AI!",
          description: "Successfully logged in to your dashboard.",
        });
        setLocation("/dashboard");
      } else {
        toast({
          title: "Error",
          description: result.message || "Login failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="bg-primary rounded-lg w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ChartLine className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome to Bepoz AI</h1>
              <p className="text-slate-600 mt-2">Insights</p>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Sign in to access your sales insights
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full"
                disabled={loading}
                data-testid="input-email"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email.trim()}
              data-testid="button-login"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Enter demo@bepoz.com to explore the dashboard
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
