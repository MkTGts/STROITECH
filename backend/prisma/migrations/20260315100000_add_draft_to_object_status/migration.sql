-- AlterEnum
ALTER TYPE "ObjectStatus" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'active';
