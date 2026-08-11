-- Partitions for chains added to ORDERED_CHAINS on 2026-08-04 (Data Network reuses the existing 1514 partition)
CREATE TABLE "indexer_partitions"."events_42018" PARTITION OF "indexer"."events" FOR VALUES IN (42018); -- Mythos
CREATE TABLE "indexer_partitions"."events_69000" PARTITION OF "indexer"."events" FOR VALUES IN (69000); -- Animechain
CREATE TABLE "indexer_partitions"."events_97477" PARTITION OF "indexer"."events" FOR VALUES IN (97477); -- Doma

-- Hard-remove indexer data for chains whose support has been removed from the app.
-- Mainnets: Shimmer (148), Moonbeam (1284), Moonriver (1285), Dogechain (2000), Bitgert (32520),
-- EDU Chain (41923), Superposition (55244), ZERϴ (543210)
-- Testnets: Abstract Testnet (11124), Avalanche Fuji (43113)

-- Dropping a partition also removes all events stored in it. IF EXISTS in case a partition
-- was already dropped manually.
DROP TABLE IF EXISTS "indexer_partitions"."events_148";
DROP TABLE IF EXISTS "indexer_partitions"."events_1284";
DROP TABLE IF EXISTS "indexer_partitions"."events_1285";
DROP TABLE IF EXISTS "indexer_partitions"."events_2000";
DROP TABLE IF EXISTS "indexer_partitions"."events_11124";
DROP TABLE IF EXISTS "indexer_partitions"."events_32520";
DROP TABLE IF EXISTS "indexer_partitions"."events_41923";
DROP TABLE IF EXISTS "indexer_partitions"."events_43113";
DROP TABLE IF EXISTS "indexer_partitions"."events_55244";
DROP TABLE IF EXISTS "indexer_partitions"."events_543210";

-- Remove all remaining indexer state for these chains.
DELETE FROM "indexer"."events_state" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."block_timestamps" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."allowances" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."allowance_state" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."token_metadata" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."spender_metadata" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
DELETE FROM "indexer"."transfer_details" WHERE "chain_id" IN (148, 1284, 1285, 2000, 11124, 32520, 41923, 43113, 55244, 543210);
