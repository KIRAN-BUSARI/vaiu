import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/rpc";

export const useDisconnectGithub = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api.v1.workspaces[":workspaceId"].github
        .disconnect.$delete({
          param: { workspaceId },
        });
      if (!response.ok) {
        throw new Error("Failed to disconnect GitHub");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("GitHub disconnected from workspace");
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
    onError: () => {
      toast.error("Failed to disconnect GitHub");
    },
  });
};
