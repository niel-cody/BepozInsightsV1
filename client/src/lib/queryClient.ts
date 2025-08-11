import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { orgStorage } from "@/lib/org-manager";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const selectedOrg = orgStorage.getSelectedOrg();
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (selectedOrg) headers["X-Org-Id"] = selectedOrg.id;
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const selectedOrg = orgStorage.getSelectedOrg();
    // Namespace cache by orgId by appending a benign query param
    const baseUrl = queryKey.join("/") as string;
    const url = selectedOrg ? (baseUrl.includes("?") ? `${baseUrl}&orgId=${selectedOrg.id}` : `${baseUrl}?orgId=${selectedOrg.id}`) : baseUrl;
    
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        ...(selectedOrg ? { "X-Org-Id": selectedOrg.id } : {}),
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    if (res.status === 403) {
      // org access issue; force org selection
      window.location.href = "/choose-org";
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
