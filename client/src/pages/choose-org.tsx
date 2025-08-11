import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authStorage } from "@/lib/supabase";

type Org = { id: string; name: string; slug?: string; role: string; is_default: boolean };

export default function ChooseOrgPage() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const token = authStorage.getToken();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { refresh } = useAuth();

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        setError(null);
        const res = await fetch('/api/orgs', { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) {
          // Stale token (e.g., server restart lost in-memory user). Force re-auth.
          authStorage.removeToken();
          navigate('/');
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data: Org[] = await res.json();
        setOrgs(data);
        // Auto-select when only one org
        if (data.length === 1) {
          onSelect(data[0]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load organizations');
        setOrgs([]);
      }
    };
    if (token) loadOrgs();
  }, [token]);

  useEffect(() => {
    // Focus heading for screen readers once mounted
    headingRef.current?.focus();
  }, []);

  const onSelect = async (org: Org) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/orgs/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId: org.id })
      });
      if (!res.ok) throw new Error('Failed to select organization');
      const { accessToken } = await res.json();
      authStorage.setToken(accessToken);
      // Refresh user context so orgId is present and routes resolve
      await refresh();
      navigate('/');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" aria-busy={!orgs && !error}>
      <Card className="w-full max-w-lg border-slate-200 shadow-none">
        <CardContent className="p-6">
          <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-slate-900 mb-2">Choose an organization</h1>
          <p className="text-sm text-slate-500 mb-6">Select which organization you want to access.</p>

          {!orgs && !error && (
            <div className="text-sm text-slate-500" role="status" aria-live="polite">Loading organizations…</div>
          )}

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-800 p-3 text-sm" role="alert">
              {error}
            </div>
          )}

          {orgs && orgs.length === 0 && (
            <div className="text-sm text-slate-600">No organizations found for your account. Please contact your administrator for access.</div>
          )}

          {orgs && orgs.length > 0 && (
            <div className="space-y-2">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 bg-white transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 text-sm font-semibold">
                      {org.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-slate-900 text-sm font-medium leading-tight">{org.name}</div>
                      <div className="text-slate-500 text-xs">{org.role}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onSelect(org)} disabled={submitting} aria-disabled={submitting} aria-busy={submitting} className="min-w-[84px]">
                    {submitting ? 'Selecting…' : 'Select'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


