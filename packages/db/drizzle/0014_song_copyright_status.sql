CREATE TYPE "public"."copyright_status" AS ENUM('dominio_publico', 'licenca_aberta', 'permissao', 'protegida', 'desconhecida');--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "copyright_status" "copyright_status" DEFAULT 'desconhecida' NOT NULL;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "copyright_evidence" text;