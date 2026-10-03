"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase/client"
import { useUid } from "@/domains/workspace/provider"

export type Notification = {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  task_id: string | null
  event_id: string | null
  meta: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export function useNotifications() {
  const uid = useUid()
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("ppm_notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(150)
      if (error) throw error
      return data as Notification[]
    },
  })
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return data?.filter((n) => !n.read_at).length ?? 0
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return
      const { error } = await getSupabase()
        .from("ppm_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
      if (error) throw error
    },
    onMutate: (ids) => {
      const set = new Set(ids)
      const stamp = new Date().toISOString()
      qc.setQueryData<Notification[]>(["notifications"], (old) =>
        old?.map((n) => (set.has(n.id) && !n.read_at ? { ...n, read_at: stamp } : n)),
      )
    },
  })
}
