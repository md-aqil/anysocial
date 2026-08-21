
-- CreateEnum
CREATE TYPE "HermesTaskType" AS ENUM ('SCHEDULE_POST', 'GENERATE_CONTENT', 'CREATE_CAMPAIGN', 'ANALYZE_ACCOUNTS', 'MONITOR_HEALTH', 'BULK_SCHEDULE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HermesPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HermesStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HermesExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "hermes_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "HermesTaskType" NOT NULL,
    "status" "HermesStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "HermesPriority" NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hermes_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hermes_executions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "status" "HermesExecutionStatus" NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hermes_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hermes_tasks_userId_status_idx" ON "hermes_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "hermes_tasks_scheduledAt_idx" ON "hermes_tasks"("scheduledAt");

-- CreateIndex
CREATE INDEX "hermes_executions_taskId_idx" ON "hermes_executions"("taskId");

-- CreateIndex
CREATE INDEX "hermes_executions_agentId_idx" ON "hermes_executions"("agentId");

-- AddForeignKey
ALTER TABLE "hermes_tasks" ADD CONSTRAINT "hermes_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hermes_executions" ADD CONSTRAINT "hermes_executions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "hermes_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
