"use client";

import { useState } from "react";
import {
    FlaskConical,
    Plus,
    Edit,
    Trash2,
    Layers,
    TrendingUp,
    Zap,
    Shield,
    Eye,
    Server,
    FileCode,
    ChevronDown,
    ChevronRight,
    Save,
    X,
    Code2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    useGetPRTests,
    useCreateTest,
    useUpdateTest,
    useDeleteTest,
} from "../api/use-test-management";
import { PersistedTestCase, TestType, TestStatus } from "../types-tests";
import { Skeleton } from "@/components/ui/skeleton";

interface TestManagementTabProps {
    projectId: string;
    prNumber: number;
}

const getTestTypeIcon = (type: TestType) => {
    switch (type) {
        case TestType.UNIT: return <Code2 className="h-4 w-4" />;
        case TestType.INTEGRATION: return <Layers className="h-4 w-4" />;
        case TestType.E2E: return <TrendingUp className="h-4 w-4" />;
        case TestType.PERFORMANCE: return <Zap className="h-4 w-4" />;
        case TestType.SECURITY: return <Shield className="h-4 w-4" />;
        case TestType.ACCESSIBILITY: return <Eye className="h-4 w-4" />;
        case TestType.API: return <Server className="h-4 w-4" />;
        case TestType.COMPONENT: return <Layers className="h-4 w-4" />;
        default: return <FileCode className="h-4 w-4" />;
    }
};

const getPriorityColor = (
    priority: string,
): "destructive" | "default" | "secondary" | "outline" => {
    switch (priority) {
        case "critical": return "destructive";
        case "high": return "default";
        case "medium": return "secondary";
        default: return "outline";
    }
};

const getStatusColor = (status: TestStatus): string => {
    switch (status) {
        case TestStatus.PASSED: return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        case TestStatus.FAILED: return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
        case TestStatus.IN_PROGRESS: return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
        case TestStatus.BLOCKED: return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
        case TestStatus.SKIPPED: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
};

const STATUS_LABELS: Record<TestStatus, string> = {
    [TestStatus.UNTESTED]: "Untested",
    [TestStatus.IN_PROGRESS]: "In Progress",
    [TestStatus.PASSED]: "Passed",
    [TestStatus.FAILED]: "Failed",
    [TestStatus.BLOCKED]: "Blocked",
    [TestStatus.SKIPPED]: "Skipped",
};

export function TestManagementTab({ projectId, prNumber }: TestManagementTabProps) {
    const [activeTab, setActiveTab] = useState<string>("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingTest, setEditingTest] = useState<PersistedTestCase | null>(null);
    const [deleteConfirmTest, setDeleteConfirmTest] = useState<string | null>(null);

    const { data: testsData, isLoading } = useGetPRTests(projectId, prNumber);
    const createTestMutation = useCreateTest();
    const updateTestMutation = useUpdateTest();
    const deleteTestMutation = useDeleteTest();

    const tests = testsData?.data || [];

    const testsByType = tests.reduce<Record<TestType, PersistedTestCase[]>>((acc, test: PersistedTestCase) => {
        const testType = test.type as TestType;
        if (!acc[testType]) acc[testType] = [];
        acc[testType].push(test);
        return acc;
    }, {} as Record<TestType, PersistedTestCase[]>);

    const filteredTests =
        activeTab === "all" ? tests
            : Object.values(TestStatus).includes(activeTab as TestStatus)
                ? tests.filter((t) => t.status === activeTab)
                : testsByType[activeTab as TestType] || [];

    const handleStatusChange = async (testId: string, status: TestStatus) => {
        await updateTestMutation.mutateAsync({
            param: { projectId, testId },
            json: { status },
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmTest) {
            await deleteTestMutation.mutateAsync({
                param: { projectId, testId: deleteConfirmTest },
            });
            setDeleteConfirmTest(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const passed = tests.filter((t) => t.status === TestStatus.PASSED).length;
    const failed = tests.filter((t) => t.status === TestStatus.FAILED).length;
    const untested = tests.filter((t) => t.status === TestStatus.UNTESTED).length;

    return (
        <div className="w-full space-y-6 overflow-hidden p-6">
            <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Test Cases</h2>
                    <Badge variant="outline" className="ml-2">{tests.length} Total</Badge>
                </div>
                <Button onClick={() => { setEditingTest(null); setShowCreateDialog(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Test
                </Button>
            </div>

            {/* Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{tests.length}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{passed}</div>
                            <div className="text-xs text-muted-foreground">Passed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{failed}</div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-500">{untested}</div>
                            <div className="text-xs text-muted-foreground">Untested</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <ScrollArea className="w-full">
                    <TabsList className="inline-flex h-10 w-max items-center justify-start rounded-md bg-muted p-1">
                        <TabsTrigger value="all">All</TabsTrigger>
                        {Object.values(TestStatus).map((status) => {
                            const count = tests.filter((t) => t.status === status).length;
                            if (count === 0) return null;
                            return (
                                <TabsTrigger key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                    <Badge variant="secondary" className="ml-2 h-5 px-1">{count}</Badge>
                                </TabsTrigger>
                            );
                        })}
                        {Object.values(TestType).map((type) => {
                            const count = testsByType[type]?.length || 0;
                            if (count === 0) return null;
                            return (
                                <TabsTrigger key={type} value={type} className="capitalize">
                                    {getTestTypeIcon(type)}
                                    <span className="ml-1">{type}</span>
                                    <Badge variant="secondary" className="ml-2 h-5 px-1">{count}</Badge>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </ScrollArea>

                <TabsContent value={activeTab} className="mt-6 space-y-4">
                    {filteredTests.length === 0 ? (
                        <Card>
                            <CardContent className="flex min-h-[200px] items-center justify-center">
                                <div className="text-center">
                                    <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                    <p className="text-muted-foreground">No tests found.</p>
                                    <Button
                                        onClick={() => { setEditingTest(null); setShowCreateDialog(true); }}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Test
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredTests.map((test) => (
                                <TestCard
                                    key={test.$id}
                                    test={test}
                                    onEdit={(t) => { setEditingTest(t); setShowCreateDialog(true); }}
                                    onDelete={(id) => setDeleteConfirmTest(id)}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <TestFormDialog
                key={editingTest?.$id ?? "new"}
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                test={editingTest}
                onSubmit={async (data) => {
                    if (editingTest) {
                        await updateTestMutation.mutateAsync({
                            param: { projectId, testId: editingTest.$id },
                            json: data,
                        });
                    } else {
                        await createTestMutation.mutateAsync({
                            param: { projectId, prNumber: prNumber.toString() },
                            json: data,
                        });
                    }
                    setShowCreateDialog(false);
                }}
            />

            <Dialog open={!!deleteConfirmTest} onOpenChange={(open) => !open && setDeleteConfirmTest(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Test</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this test? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmTest(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteTestMutation.isPending}
                        >
                            {deleteTestMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface TestCardProps {
    test: PersistedTestCase;
    onEdit: (test: PersistedTestCase) => void;
    onDelete: (testId: string) => void;
    onStatusChange: (testId: string, status: TestStatus) => void;
}

function TestCard({ test, onEdit, onDelete, onStatusChange }: TestCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="flex items-center gap-2">
                                {getTestTypeIcon(test.type)}
                                <span className="font-medium">{test.title}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Inline status selector */}
                            <Select
                                value={test.status ?? TestStatus.UNTESTED}
                                onValueChange={(val) => onStatusChange(test.$id, val as TestStatus)}
                            >
                                <SelectTrigger className={`h-7 w-32 text-xs font-medium border-0 ${getStatusColor(test.status ?? TestStatus.UNTESTED)}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(TestStatus).map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">
                                            {STATUS_LABELS[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Badge variant={getPriorityColor(test.priority)}>{test.priority}</Badge>
                            <Badge variant="outline" className="capitalize">{test.type}</Badge>
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="space-y-4 border-t border-border p-4">
                        <div>
                            <h4 className="mb-1 text-sm font-semibold">Description</h4>
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                        </div>

                        {test.reasoning && (
                            <div>
                                <h4 className="mb-1 text-sm font-semibold">Reasoning</h4>
                                <p className="text-sm text-muted-foreground">{test.reasoning}</p>
                            </div>
                        )}

                        {test.prerequisites?.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-sm font-semibold">Prerequisites</h4>
                                <div className="flex flex-wrap gap-2">
                                    {test.prerequisites.map((prereq, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{prereq}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {test.edgeCases?.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-sm font-semibold">Edge Cases</h4>
                                <ul className="space-y-1">
                                    {test.edgeCases.map((edgeCase, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                            {edgeCase}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
                            <Button variant="outline" size="sm" onClick={() => onEdit(test)} className="gap-2">
                                <Edit className="h-4 w-4" />
                                Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(test.$id)} className="gap-2">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

interface TestFormData {
    title: string;
    description: string;
    type: TestType;
    status: TestStatus;
    prerequisites: string[];
    priority: "low" | "medium" | "high" | "critical";
    reasoning: string;
    edgeCases: string[];
    scenarioId: string;
}

interface TestFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    test: PersistedTestCase | null;
    onSubmit: (data: TestFormData) => Promise<void>;
}

function TestFormDialog({ open, onOpenChange, test, onSubmit }: TestFormDialogProps) {
    const [formData, setFormData] = useState({
        title: test?.title || "",
        description: test?.description || "",
        type: test?.type || TestType.UNIT,
        status: test?.status || TestStatus.UNTESTED,
        prerequisites: test?.prerequisites?.join(", ") || "",
        priority: test?.priority || "medium",
        reasoning: test?.reasoning || "",
        edgeCases: test?.edgeCases?.join(", ") || "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({
                title: formData.title,
                description: formData.description,
                type: formData.type,
                status: formData.status,
                prerequisites: formData.prerequisites.split(",").map((p) => p.trim()).filter(Boolean),
                priority: formData.priority as "low" | "medium" | "high" | "critical",
                reasoning: formData.reasoning,
                edgeCases: formData.edgeCases.split(",").map((e) => e.trim()).filter(Boolean),
                scenarioId: test?.scenarioId || "custom",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{test ? "Edit Test" : "Add Test"}</DialogTitle>
                    <DialogDescription>
                        {test ? "Update the test case details." : "Add a new test case to track."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. User can log in with GitHub"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What does this test verify?"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v as TestType })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.values(TestType).map((t) => (
                                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority *</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(v) => setFormData({ ...formData, priority: v as "low" | "medium" | "high" | "critical" })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reasoning">Reasoning</Label>
                        <Textarea
                            id="reasoning"
                            value={formData.reasoning}
                            onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
                            placeholder="Why is this test important?"
                            rows={2}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="prerequisites">Prerequisites (comma-separated)</Label>
                            <Input
                                id="prerequisites"
                                value={formData.prerequisites}
                                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                                placeholder="setup, mocks, config"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edgeCases">Edge Cases (comma-separated)</Label>
                            <Input
                                id="edgeCases"
                                value={formData.edgeCases}
                                onChange={(e) => setFormData({ ...formData, edgeCases: e.target.value })}
                                placeholder="null input, empty array"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting ? "Saving..." : test ? "Update" : "Add Test"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
