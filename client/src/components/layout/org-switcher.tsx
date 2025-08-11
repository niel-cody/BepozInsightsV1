import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useLocation } from "wouter";

export function OrgSwitcher() {
  const { selectedOrg, clearOrg } = useOrg();
  const [, setLocation] = useLocation();

  const handleSwitchOrg = () => {
    clearOrg();
    setLocation('/choose-org');
  };

  if (!selectedOrg) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" data-testid="button-org-switcher">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{selectedOrg.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel data-testid="text-current-org">Current Organization</DropdownMenuLabel>
        <DropdownMenuItem className="p-3" data-testid="item-current-org">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <div>
              <div className="font-medium">{selectedOrg.name}</div>
              <div className="text-xs text-muted-foreground">@{selectedOrg.slug}</div>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSwitchOrg} data-testid="button-switch-org">
          Switch Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}