"use client";

import { useState } from "react";
import { Github, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { client } from "@/lib/rpc";
import { Workspace } from "../types";

interface GithubWorkspaceSettingsProps {
  workspace: Workspace;
}

export const GithubWorkspaceSettings = ({
  workspace,
}: GithubWorkspaceSettingsProps) => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = !!workspace.githubInstallationId;

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: async () => {
      const response = await client.api.v1.workspaces[":workspaceId"][
        "github"
      ]["disconnect"].$delete({
        param: { workspaceId: workspace.$id },
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect GitHub");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("GitHub disconnected from workspace");
      queryClient.invalidateQueries({ queryKey: ["workspace", workspace.$id] });
    },
    onError: () => {
      toast.error("Failed to disconnect GitHub");
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = `/api/v1/workspaces/${workspace.$id}/github/install`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <CardTitle>GitHub Integration</CardTitle>
        </div>
        <CardDescription>
          Connect a GitHub App installation to enable repository syncing,
          real-time webhooks, and the repository picker for all projects in this
          workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                Connected
                {workspace.githubAccountLogin && (
                  <span className="ml-1 font-normal text-green-600 dark:text-green-400">
                    ({workspace.githubAccountLogin})
                  </span>
                )}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="mr-1 h-4 w-4" />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              No GitHub installation connected. Click below to install the
              GitHub App on your account or organization and grant access to
              repositories.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-fit"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              Connect GitHub
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
