import { Models } from "node-appwrite";

export type Workspace = Models.Document & {
  name: string;
  imageUrl: string;
  inviteCode: string;
  userId: string;
  githubInstallationId?: string;
  githubAccountLogin?: string;
  githubAccountType?: string;
};
