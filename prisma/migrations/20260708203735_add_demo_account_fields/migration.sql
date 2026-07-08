-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoLastResetAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;
