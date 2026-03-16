-- Add new value to UserRole enum for moderator
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'moderator';

