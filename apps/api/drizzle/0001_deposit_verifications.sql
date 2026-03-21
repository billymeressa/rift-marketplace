CREATE TABLE "deposit_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_holder" varchar(200) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"amount_1" numeric NOT NULL,
	"amount_2" numeric NOT NULL,
	"attempts_left" smallint DEFAULT 3 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deposit_verifications" ADD CONSTRAINT "deposit_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
