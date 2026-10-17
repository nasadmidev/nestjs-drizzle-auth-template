CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"role" "role",
	"password" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
