export enum TestType {
  UNIT = "unit",
  INTEGRATION = "integration",
  E2E = "e2e",
  PERFORMANCE = "performance",
  SECURITY = "security",
  ACCESSIBILITY = "accessibility",
  API = "api",
  COMPONENT = "component",
}

export enum TestStatus {
  UNTESTED = "untested",
  IN_PROGRESS = "in_progress",
  PASSED = "passed",
  FAILED = "failed",
  BLOCKED = "blocked",
  SKIPPED = "skipped",
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  type: TestType;
  prerequisites: string[];
  priority: "low" | "medium" | "high" | "critical";
  reasoning: string;
  edgeCases: string[];
}

export interface TestScenario {
  id: string;
  feature: string;
  description: string;
  testCases: TestCase[];
  affectedFiles: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface TestGenerationSummary {
  totalTestsGenerated: number;
  testsByType: Record<TestType, number>;
  criticalTests: number;
  filesWithTests: number;
  estimatedTestingTime: string;
  coverageAreas: string[];
  recommendations: string[];
}

export interface AITestGeneration {
  id: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  projectId: string;
  summary: TestGenerationSummary;
  scenarios: TestScenario[];
  context: {
    filesChanged: Array<{
      filename: string;
      status: "added" | "modified" | "removed";
      additions: number;
      deletions: number;
    }>;
    commitMessages: string[];
    prDescription: string;
    author: string;
  };
  createdAt: string;
  generationVersion: string;
}

export interface TestGenerationStatus {
  status: "pending" | "generating" | "completed" | "error";
  progress?: number;
  currentStep?: string;
  message?: string;
  error?: string;
}

export interface PersistedTestCase extends TestCase {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  projectId: string;
  prNumber: number;
  scenarioId: string;
  isCustom: boolean;
  isDeleted: boolean;
  status: TestStatus;
}

export interface TestManagementData {
  tests: PersistedTestCase[];
  scenarios: TestScenario[];
  summary: TestGenerationSummary;
}
