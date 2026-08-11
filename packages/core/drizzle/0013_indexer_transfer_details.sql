-- Note: idx_events_unclassified_transfers builds on the partitioned parent, which cannot use CONCURRENTLY;
-- it briefly blocks writes per partition. Fine at current volume; per-partition CONCURRENTLY + ATTACH if that changes.
CREATE TYPE "indexer"."transfer_classification" AS ENUM('approved', 'direct', 'signature_authorized', 'other', 'unknown');--> statement-breakpoint
CREATE TABLE "indexer"."transfer_details" (
	"chain_id" integer NOT NULL,
	"transaction_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"spender_address" text,
	"permit2_address" text,
	"selector" text,
	"classification" "indexer"."transfer_classification",
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_details_pkey" PRIMARY KEY("chain_id","transaction_hash","log_index")
);
--> statement-breakpoint
ALTER TABLE "indexer"."events" ADD COLUMN "classified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_events_unclassified_transfers" ON "indexer"."events" USING btree ("chain_id","topic1") WHERE "indexer"."events"."classified_at" IS NULL AND "indexer"."events"."topic0" = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';