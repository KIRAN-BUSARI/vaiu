import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/appwrite";
import { DATABASE_ID, WORKSPACE_ID, PROJECTS_ID, ISSUES_ID, PR_ID } from "@/config";
import { Query, ID } from "node-appwrite";
import { IssueStatus } from "@/features/issues/types";
import { PrStatus } from "@/features/pull-requests/types";

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function findWorkspaceByInstallation(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  installationId: number,
) {
  const workspaces = await databases.listDocuments(DATABASE_ID, WORKSPACE_ID, [
    Query.equal("githubInstallationId", String(installationId)),
    Query.limit(1),
  ]);
  return workspaces.documents[0] ?? null;
}

async function findProjectByRepo(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  workspaceId: string,
  owner: string,
  repoName: string,
) {
  const projects = await databases.listDocuments(DATABASE_ID, PROJECTS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.equal("name", repoName),
    Query.equal("owner", owner),
    Query.limit(1),
  ]);
  return projects.documents[0] ?? null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const installationId = (payload.installation as { id?: number })?.id;
  if (!installationId) {
    return NextResponse.json({ ok: true }); // No installation context, ignore
  }

  try {
    const { databases } = await createAdminClient();

    const workspace = await findWorkspaceByInstallation(databases, installationId);
    if (!workspace) {
      return NextResponse.json({ ok: true }); // No matching workspace
    }

    const repo = payload.repository as {
      name?: string;
      owner?: { login?: string };
    } | undefined;

    if (!repo?.name || !repo?.owner?.login) {
      return NextResponse.json({ ok: true });
    }

    const project = await findProjectByRepo(
      databases,
      workspace.$id,
      repo.owner.login,
      repo.name,
    );

    if (!project) {
      return NextResponse.json({ ok: true }); // No matching project
    }

    if (event === "issues") {
      await handleIssueEvent(
        databases,
        payload as unknown as IssueEventPayload,
        workspace.$id,
        project.$id,
      );
    } else if (event === "pull_request") {
      await handlePullRequestEvent(
        databases,
        payload as unknown as PullRequestEventPayload,
        workspace.$id,
        project.$id,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// ── Issue event handler ────────────────────────────────────────────────────

interface IssueEventPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body?: string;
    state: "open" | "closed";
    html_url: string;
    assignee?: { login?: string };
    created_at: string;
    updated_at: string;
  };
}

async function handleIssueEvent(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  payload: IssueEventPayload,
  workspaceId: string,
  projectId: string,
) {
  const { action, issue } = payload;
  if (!["opened", "closed", "reopened", "edited"].includes(action)) return;

  // Try to find existing issue by number
  const existing = await databases.listDocuments(DATABASE_ID, ISSUES_ID, [
    Query.equal("projectId", projectId),
    Query.equal("number", issue.number),
    Query.limit(1),
  ]);

  const status: IssueStatus =
    issue.state === "closed" ? IssueStatus.DONE : IssueStatus.TODO;

  if (existing.documents.length > 0) {
    await databases.updateDocument(
      DATABASE_ID,
      ISSUES_ID,
      existing.documents[0].$id,
      {
        name: issue.title,
        description: issue.body ?? "",
        status,
      },
    );
  } else if (action === "opened") {
    // Find position for new issue
    const highestPosition = await databases.listDocuments(
      DATABASE_ID,
      ISSUES_ID,
      [
        Query.equal("status", IssueStatus.TODO),
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("position"),
        Query.limit(1),
      ],
    );
    const position =
      highestPosition.documents.length > 0
        ? highestPosition.documents[0].position + 1000
        : 1000;

    await databases.createDocument(DATABASE_ID, ISSUES_ID, ID.unique(), {
      name: issue.title,
      description: issue.body ?? "",
      status,
      workspaceId,
      projectId,
      number: issue.number,
      position,
      dueDate: new Date().toISOString(),
    });
  }
}

// ── Pull request event handler ─────────────────────────────────────────────

interface PullRequestEventPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    state: "open" | "closed";
    merged_at?: string | null;
    html_url: string;
    user?: { login?: string };
    assignee?: { login?: string };
    created_at: string;
    updated_at: string;
  };
}

async function handlePullRequestEvent(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  payload: PullRequestEventPayload,
  workspaceId: string,
  projectId: string,
) {
  const { action, pull_request: pr } = payload;
  if (!["opened", "closed", "reopened"].includes(action)) return;

  let status: PrStatus;
  if (pr.state === "closed") {
    status = pr.merged_at ? PrStatus.MERGED : PrStatus.CLOSED;
  } else {
    status = PrStatus.OPEN;
  }

  // Try to find existing PR by number
  const existing = await databases.listDocuments(DATABASE_ID, PR_ID, [
    Query.equal("projectId", projectId),
    Query.equal("number", pr.number),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, PR_ID, existing.documents[0].$id, {
      title: pr.title,
      status,
    });
  } else if (action === "opened") {
    await databases.createDocument(DATABASE_ID, PR_ID, ID.unique(), {
      title: pr.title,
      status,
      workspaceId,
      projectId,
      number: pr.number,
      author: pr.user?.login ?? "unknown",
      url: pr.html_url,
    });
  }
}
