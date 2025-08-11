import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authStorage } from "@/lib/supabase";

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
  const token = authStorage.getToken();
  const user = authStorage.getUser();
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (user?.orgId) headers["X-Org-Id"] = user.orgId;
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
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    // Namespace cache by orgId by appending a benign query param
    const baseUrl = queryKey.join("/") as string;
    const url = user?.orgId ? (baseUrl.includes("?") ? `${baseUrl}&orgId=${user.orgId}` : `${baseUrl}?orgId=${user.orgId}`) : baseUrl;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(user?.orgId ? { "X-Org-Id": user.orgId } : {}),
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    if (res.status === 403) {
      // lost access; force org selection
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
