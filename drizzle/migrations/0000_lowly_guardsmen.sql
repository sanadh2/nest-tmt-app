CREATE TABLE "users" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now(),
	"password" varchar NOT NULL,
	"username" varchar(256),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
