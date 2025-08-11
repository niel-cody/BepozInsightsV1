import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";
import { authStorage } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

type Org = { id: string; name: string; slug?: string; role: string; is_default: boolean };

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [current, setCurrent] = useState<Org | null>(null);
  const [open, setOpen] = useState(false);
  const token = authStorage.getToken();
  const { refresh } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/orgs', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data: Org[] = await res.json();
        setOrgs(data);
        const def = data.find(o => o.is_default) || data[0] || null;
        setCurrent(def);
      } catch {}
    };
    if (token) load();
  }, [token]);

  const onSelect = async (org: Org) => {
    if (!token || !org) return;
    try {
      const res = await fetch('/api/orgs/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId: org.id })
      });
      if (!res.ok) return;
      const { accessToken } = await res.json();
      authStorage.setToken(accessToken);
      setCurrent(org);
      // Invalidate all cached queries to prevent cross-org bleed
      queryClient.clear();
      // Refresh the user context so orgId is reflected
      await refresh();
      // Optionally, you can navigate or emit an event; most pages will refetch
    } catch {}
  };

  if (!current) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          aria-label="Current organization"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 text-xs font-semibold">
            {current.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm text-slate-900">{current.name}</span>
          <ChevronsUpDown className="h-3 w-3 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map(org => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => onSelect(org)}
            className="flex justify-between"
            aria-current={org.id === current.id ? 'true' : undefined}
          >
            <span>{org.name}</span>
            {org.id === current.id && <span className="text-xs text-slate-500">Current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


