import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";
import { AITestGeneration } from "../types-tests";

type TestGenerationResponseType = InferResponseType<
  (typeof client.api.v1)["pull-requests"][":projectId"]["generate-tests"][":prNumber"]["$post"],
  200
>;
type TestGenerationRequestType = InferRequestType<
  (typeof client.api.v1)["pull-requests"][":projectId"]["generate-tests"][":prNumber"]["$post"]
>;

export const useGenerateTests = () => {
  const mutation = useMutation<
    TestGenerationResponseType,
    Error,
    TestGenerationRequestType
  >({
    mutationFn: async ({ param }) => {
      const response = await client.api.v1["pull-requests"][":projectId"][
        "generate-tests"
      ][":prNumber"].$post({
        param,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          "error" in errorData ? errorData.error : "Failed to generate tests",
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Test cases generated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate test cases");
    },
  });

  return mutation;
};

// Helper hook for easier usage with PR data
export const useGenerateTestCases = () => {
  const testGenerationMutation = useGenerateTests();

  const generateTests = async (params: {
    projectId: string;
    prNumber: number;
  }) => {
    return testGenerationMutation.mutateAsync({
      param: {
        projectId: params.projectId,
        prNumber: params.prNumber.toString(),
      },
    });
  };

  return {
    generateTests,
    isLoading: testGenerationMutation.isPending,
    error: testGenerationMutation.error,
    data: testGenerationMutation.data,
    reset: testGenerationMutation.reset,
  };
};

export const useSaveGeneratedTests = (projectId: string, prNumber: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tests: AITestGeneration) => {
      const response = await fetch(
        `/api/v1/pull-requests/${projectId}/tests/${prNumber}/save-generated`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tests }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error("error" in errorData ? errorData.error : "Failed to save tests");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Tests saved to Test Management");
      queryClient.invalidateQueries({ queryKey: ["pr-tests", projectId, prNumber] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save tests");
    },
  });
};
