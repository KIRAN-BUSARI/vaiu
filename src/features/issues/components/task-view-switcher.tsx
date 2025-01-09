"use client";
import { useCallback } from "react";
import { useQueryState } from "nuqs";
import { Loader, PlusIcon } from "lucide-react";

import { DottedSeparator } from "@/components/dotted-separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { useProjectId } from "@/features/projects/hooks/use-projectId";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { useTaskFilter } from "../hooks/use-task-filter";
import { useGetTasks } from "../api/use-get-tasks";
import { DataFilters } from "./data-filters";
import { DataKanban } from "./data-kanban";
import { DataTable } from "./data-table";
import { columns } from "./columns";

import { TaskStatus } from "../types";
import { useBulkUpdateTasks } from "../api/use-bulk-update-tasks";
import { DataCalander } from "./data-calander";
import { Button } from "@/components/ui/button";

interface TaskViewSwitcherProps {
  hideProjectFilter?: boolean;
}

export const TaskViewSwitcher = ({
  hideProjectFilter,
}: TaskViewSwitcherProps) => {
  const [{ status, dueDate, assigneeId, projectId }] = useTaskFilter();

  const [view, setView] = useQueryState("task-view", {
    defaultValue: "table",
  });
  const { open } = useCreateTaskModal();
  const workspaceId = useWorkspaceId();
  const paramProjectId = useProjectId();
  const { mutate: bulkUpdate } = useBulkUpdateTasks();
  const { data: tasks, isLoading: tasksLoading } = useGetTasks({
    workspaceId,
    assigneeId,
    projectId: paramProjectId || projectId,
    dueDate,
    status,
  });

  const onKanbanChange = useCallback(
    (
      tasks: {
        $id: string;
        status: TaskStatus;
        position: number;
      }[]
    ) => {
      bulkUpdate({
        json: { tasks },
      });
    },
    []
  );
  return (
    <Tabs
      defaultValue={view}
      onValueChange={setView}
      className="flex-1 w-full border rounded-lg"
    >
      <div className="h-full flex flex-col overflow-auto p-4">
        <div className="flex flex-col gap-y-2 lg:flex-row justify-between ">
          <p className="text-center flex items-center">Issues</p>
          <Button
            size={"default"}
            onClick={open}
            className="w-full lg:w-auto bg-slate-200 text-black hover:bg-slate-400"
          >
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>
        <div className="flex lg:flex-row gap-y-2 mt-4 items-center justify-start w-full">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger
              className="h-8 w-full lg:w-auto bg-slate-200 dark:bg-gray-800 dark:text-gray-200"
              value="table"
            >
              Table
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger
              className="h-8 w-full lg:w-auto bg-slate-200 dark:bg-gray-800 dark:text-gray-200"
              value="kanban"
            >
              Kanban
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger
              className="h-8 w-full lg:w-auto bg-slate-200 dark:bg-gray-800 dark:text-gray-200"
              value="calendar"
            >
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>
        <DottedSeparator className="my-4" />
        <DataFilters hideProjectFilter={hideProjectFilter} />
        <DottedSeparator className="my-4" />
        {tasksLoading ? (
          <div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
            <Loader className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="table" className="mt-0">
              <DataTable columns={columns} data={tasks?.documents ?? []} />
            </TabsContent>
            <TabsContent value="kanban" className="mt-0">
              <DataKanban
                onChange={onKanbanChange}
                data={tasks?.documents ?? []}
              />
            </TabsContent>
            <TabsContent value="calendar" className="mt-0 h-full pb-4">
              <DataCalander data={tasks?.documents ?? []} />
            </TabsContent>
          </>
        )}
      </div>
    </Tabs>
  );
};
