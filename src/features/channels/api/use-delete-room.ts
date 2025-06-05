import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.v1.rooms)[":roomId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.v1.rooms)[":roomId"]["$delete"]
>;

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await client.api.v1.rooms[":roomId"].$delete({
        param,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          "error" in errorData ? errorData.error : "Failed to login",
        );
      }
      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Room deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", data.$id] });
    },
    onError: (e) => {
      toast.error(e.message || "Failed to delete room");
    },
  });

  return mutation;
};
