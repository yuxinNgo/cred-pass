CREATE TYPE "public"."credpass_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."credpass_type" AS ENUM('student', 'employment', 'professional');--> statement-breakpoint
CREATE TABLE "credpass_credentials" (
	"owner_hash" varchar(64) NOT NULL,
	"id" varchar(96) NOT NULL,
	"type" "credpass_type" NOT NULL,
	"issuer" varchar(160) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "credpass_status" NOT NULL,
	"encrypted_metadata" text NOT NULL,
	CONSTRAINT "credpass_credentials_owner_hash_id_pk" PRIMARY KEY("owner_hash","id"),
	CONSTRAINT "expiry_after_issuance" CHECK ("credpass_credentials"."expires_at" > "credpass_credentials"."issued_at")
);
--> statement-breakpoint
CREATE TABLE "credpass_workspaces" (
	"owner_hash" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_hash_format" CHECK ("credpass_workspaces"."owner_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "credpass_credentials" ADD CONSTRAINT "credpass_credentials_owner_hash_credpass_workspaces_owner_hash_fk" FOREIGN KEY ("owner_hash") REFERENCES "public"."credpass_workspaces"("owner_hash") ON DELETE cascade ON UPDATE no action;