import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/features/auth/constants";
import { Client, Account, Databases } from "node-appwrite";
import { DATABASE_ID, WORKSPACE_ID, MEMBERS_ID } from "@/config";
import { getInstallation } from "@/lib/github-app";
import { MemberRole } from "@/features/members/types";
import { Query } from "node-appwrite";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const stateParam = searchParams.get("state");

  // Only handle new installations
  if (setupAction !== "install" && setupAction !== "update") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!installationId) {
    return NextResponse.redirect(
      new URL("/?error=missing_installation_id", request.url),
    );
  }

  // Read the workspaceId from the state cookie for CSRF validation
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("github_install_state")?.value;
  const workspaceId = stateParam || stateCookie;

  if (!workspaceId) {
    return NextResponse.redirect(
      new URL("/?error=missing_workspace_state", request.url),
    );
  }

  // Authenticate the user via Appwrite session cookie
  const sessionCookie = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);
    client.setSession(sessionCookie);

    const account = new Account(client);
    const databases = new Databases(client);

    const user = await account.get();

    // Verify the user is an admin of the workspace
    const members = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
      Query.equal("workspaceId", workspaceId),
      Query.equal("userId", user.$id),
      Query.limit(1),
    ]);

    const member = members.documents[0];
    if (
      !member ||
      (member.role !== MemberRole.ADMIN && member.role !== MemberRole.SUPER_ADMIN)
    ) {
      return NextResponse.redirect(
        new URL("/?error=unauthorized", request.url),
      );
    }

    // Fetch installation details from GitHub
    const installation = await getInstallation(parseInt(installationId, 10));

    // Save installation details to the workspace document
    await databases.updateDocument(DATABASE_ID, WORKSPACE_ID, workspaceId, {
      githubInstallationId: String(installationId),
      githubAccountLogin: installation.account
        ? "login" in installation.account
          ? installation.account.login
          : null
        : null,
      githubAccountType: installation.account
        ? "type" in installation.account
          ? installation.account.type
          : null
        : null,
    });

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL(
        `/workspaces/${workspaceId}?github=connected`,
        request.url,
      ),
    );
    response.cookies.set("github_install_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("GitHub App callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=github_callback_failed", request.url),
    );
  }
}
