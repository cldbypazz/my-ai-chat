CREATE TABLE "chats" (
	"browser" text,
	"id" uuid,
	"title" text NOT NULL,
	"messages" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chats_pkey" PRIMARY KEY("browser","id")
);
--> statement-breakpoint
CREATE INDEX "chats_browser_updated_idx" ON "chats" ("browser","updated_at");