
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const usePresence = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all user presence
  const { data: userPresences } = useQuery({
    queryKey: ["user-presence"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_presence")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });

  // Real-time subscription for presence updates
  useEffect(() => {
    const channel = supabase
      .channel("presence-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-presence"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update user presence
  const updatePresence = useMutation({
    mutationFn: async (status: "online" | "away" | "busy" | "offline") => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-presence"] });
    },
  });

  // Set user online on mount and offline on unmount
  useEffect(() => {
    if (!user) return;

    updatePresence.mutate("online");

    const handleBeforeUnload = () => {
      updatePresence.mutate("offline");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      updatePresence.mutate("offline");
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  return {
    userPresences,
    updatePresence,
  };
};
