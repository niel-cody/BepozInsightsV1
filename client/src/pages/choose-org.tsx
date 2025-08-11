import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ChooseOrgPage() {
  const [selecting, setSelecting] = useState<string | null>(null);
  const { orgs, selectOrg, loading } = useOrg();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSelectOrganization = async (orgId: string, orgName: string) => {
    setSelecting(orgId);
    
    try {
      const org = orgs.find(o => o.id === orgId);
      if (!org) {
        toast({
          title: "Error",
          description: "Organization not found",
          variant: "destructive",
        });
        return;
      }

      const result = await selectOrg(org);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Selected ${orgName}`,
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to select organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error selecting organization:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading organizations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Organization</CardTitle>
          <p className="text-muted-foreground">
            Select the organization you'd like to access for this demo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No organizations available. Please check your database connection.
            </p>
          ) : (
            <div className="grid gap-3">
              {orgs.map((org) => (
                <Card 
                  key={org.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                  onClick={() => handleSelectOrganization(org.id, org.name)}
                  data-testid={`card-org-${org.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`text-org-name-${org.id}`}>{org.name}</h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-org-slug-${org.id}`}>@{org.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Demo</Badge>
                        {selecting === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Button size="sm" data-testid={`button-select-${org.id}`}>
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}