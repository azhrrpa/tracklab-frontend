"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { fetchCurrentUser, logout } from "@/lib/resources";

const noopSubscribe = () => () => {};

/** False on the server and while React hydrates, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * The logged-in user. The server never knows the user (pages are prerendered), so the user is only
 * exposed after hydration; otherwise text like "Hello, assessment.it" could differ from the server HTML
 * when the request finishes before a part of the page has hydrated.
 */
export function useCurrentUser() {
  const hydrated = useHydrated();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: 5 * 60_000,
  });
  return { ...query, data: hydrated ? query.data : undefined };
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
      toast.success("You have been logged out");
    },
  });
}
