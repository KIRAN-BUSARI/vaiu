import "server-only";
import { App, Octokit } from "octokit";
import { createAdminClient } from "@/lib/appwrite";
import { DATABASE_ID, WORKSPACE_ID } from "@/config";

// Singleton App instance (module-level, warm across requests in the same process)
let _app: App | null = null;

export function isGithubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

function getApp(): App {
  if (!_app) {
    if (!isGithubAppConfigured()) {
      throw new Error(
        "GitHub App not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY env vars.",
      );
    }
    _app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    });
  }
  return _app;
}

// In-memory token cache: installationId -> { token, expiresAt }
const tokenCache = new Map<string, { token: string; expiresAt: Date }>();

/**
 * Get an installation access token for the given installation ID.
 * Tokens are cached in memory and refreshed 5 minutes before expiry.
 */
export async function getInstallationToken(
  installationId: string,
): Promise<string> {
  const cached = tokenCache.get(installationId);
  // Return cached token if it expires more than 5 minutes from now
  if (
    cached &&
    cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    return cached.token;
  }

  const app = getApp();
  const { data } = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    { installation_id: parseInt(installationId, 10) },
  );

  tokenCache.set(installationId, {
    token: data.token,
    expiresAt: new Date(data.expires_at),
  });

  return data.token;
}

/**
 * Get an installation access token for a workspace.
 * Returns null if the workspace has no GitHub App installation configured.
 */
export async function getInstallationTokenForWorkspace(
  workspaceId: string,
): Promise<string | null> {
  try {
    const { databases } = await createAdminClient();
    const workspace = await databases.getDocument(
      DATABASE_ID,
      WORKSPACE_ID,
      workspaceId,
    );

    if (!workspace.githubInstallationId) {
      return null;
    }

    return getInstallationToken(workspace.githubInstallationId);
  } catch {
    return null;
  }
}

/**
 * List repositories accessible to the GitHub App installation.
 */
export async function listInstallationRepos(installationId: string) {
  const token = await getInstallationToken(installationId);
  const octokit = new Octokit({ auth: token });

  const repos = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  );

  return repos;
}

/**
 * Get details about a GitHub App installation.
 */
export async function getInstallation(installationId: number) {
  const app = getApp();
  const { data } = await app.octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: installationId },
  );
  return data;
}
