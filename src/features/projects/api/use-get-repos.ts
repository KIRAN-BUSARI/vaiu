import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetReposProps {
  workspaceId: string;
  enabled?: boolean;
}

export const useGetRepos = ({ workspaceId, enabled = true }: UseGetReposProps) => {
  return useQuery({
    queryKey: ["repos", workspaceId],
    queryFn: async () => {
      const response = await client.api.v1.projects.repos.$get({
        query: { workspaceId },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          (body as { error?: string }).error || "Failed to fetch repositories",
        );
      }
      const { data } = await response.json();
      return data;
    },
    enabled: enabled && !!workspaceId,
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
};
