import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ResponseType = InferResponseType<
  (typeof client.api.v1.auth.login)["$post"]
>;
type RequestType = InferRequestType<(typeof client.api.v1.auth.login)["$post"]>;

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.v1.auth.login.$post({ json });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          "error" in errorData ? errorData.error : "Failed to login",
        );
      }

      return await response.json();
    },
    onSuccess: async () => {
      let redirectPath = "/workspaces/create";

      try {
        const response = await client.api.v1.workspaces.$get();
        if (response.ok) {
          const { data } = (await response.json()) as {
            data?: { documents?: Array<{ $id: string }> };
          };

          const workspaceId = data?.documents?.[0]?.$id;
          if (workspaceId) {
            redirectPath = `/workspaces/${workspaceId}`;
          }
        }
      } catch {
        redirectPath = "/";
      }

      router.refresh();
      router.replace(redirectPath);
      toast.success("Logged in successfully");
      queryClient.invalidateQueries({ queryKey: ["current"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  return mutation;
};
