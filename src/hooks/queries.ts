import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Address } from "@/lib/types";

// Polling intervals sit comfortably under the Hub's rate limit while tracking the
// indexer's ~4 s cache TTL. Background tabs pause automatically (TanStack default).

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: () => api.listDeals(),
    refetchInterval: 6_000,
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: () => api.getDeal(id!),
    enabled: Boolean(id),
    refetchInterval: 4_000,
    // A brand-new deal can 404 for a few seconds until the indexer catches up — keep retrying.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.statusCode === 404 ? failureCount < 5 : failureCount < 2,
  });
}

export function useOffers() {
  return useQuery({
    queryKey: ["offers"],
    queryFn: () => api.listOffers(),
    refetchInterval: 6_000,
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ["disputes"],
    queryFn: () => api.listDisputes(),
    refetchInterval: 8_000,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.systemStatus(),
    refetchInterval: 12_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useCredits(address: Address | null) {
  return useQuery({
    queryKey: ["credits", address],
    queryFn: () => api.credits(address!),
    enabled: Boolean(address),
    refetchInterval: 10_000,
  });
}
