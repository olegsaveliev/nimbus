import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const qk = {
  boards: ["boards"] as const,
  board: (id: string) => ["board", id] as const,
  preferences: ["preferences"] as const,
  aiUsage: ["aiUsage"] as const,
  wishes: ["wishes"] as const,
};
