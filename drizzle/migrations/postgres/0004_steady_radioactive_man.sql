CREATE TABLE "marketplace_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"organization_id" text NOT NULL,
	"public_id" text,
	"active" boolean DEFAULT true,
	"metadata" jsonb NOT NULL,
	"zip_s3_key" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
