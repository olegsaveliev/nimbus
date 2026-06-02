/* Board list + lifecycle (create / rename / delete / seed on first login). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryClient";
import type { Board } from "@/types";
import * as repo from "./boardRepo";

export function useBoards() {
  return useQuery({ queryKey: qk.boards, queryFn: repo.fetchBoardList });
}

/** Ensure the signed-in user has at least one board; seed a starter board if not. */
export async function ensureStarterBoard(): Promise<void> {
  const list = await repo.fetchBoardList();
  if (list.length === 0) {
    await repo.seedStarterBoard(true);
  }
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { data, error } = await supabase.rpc("new_board", { p_name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.boards }),
  });
}

export function useRenameBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => repo.renameBoardRow(id, name),
    onMutate: ({ id, name }) => {
      qc.setQueryData<Board[]>(qk.boards, (old) => (old ? old.map((b) => (b.id === id ? { ...b, name } : b)) : old));
    },
    onError: () => qc.invalidateQueries({ queryKey: qk.boards }),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteBoardRow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.boards }),
  });
}
