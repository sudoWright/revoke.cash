/**
 * Records a transfer-extraction fixture for a real transaction: fetches the callTracer trace and the
 * receipt's Transfer logs, and appends a fixture skeleton (with an empty `expected` array to be filled
 * in by hand) to the consolidated fixture file used by test/transfer-extraction.test.ts.
 *
 * Usage:
 *   apps/web $ yarn env tsx test/fixtures/record-transfer-trace.ts <chainId> <txHash> <name>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ERC20_TRANSFER_TOPIC } from '@revoke.cash/core/events';
import { createTraceClient } from '@revoke.cash/core/transfers/trace-client';
import type { Hash } from 'viem';

const main = async () => {
  const [chainIdArg, transactionHash, name] = process.argv.slice(2);
  if (!chainIdArg || !transactionHash || !name) {
    console.error('Usage: yarn env tsx test/fixtures/record-transfer-trace.ts <chainId> <txHash> <name>');
    process.exit(1);
  }

  const chainId = Number(chainIdArg);
  const client = createTraceClient(chainId);

  const trace = await client.traceTransaction(transactionHash as Hash);
  const receipt = await client.getTransactionReceipt({ hash: transactionHash as Hash });

  const transferLogs = receipt.logs
    .filter((log) => log.topics[0] === ERC20_TRANSFER_TOPIC)
    .map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      transactionIndex: log.transactionIndex,
      logIndex: log.logIndex,
    }));

  const fixture = {
    name,
    description: `RECORDED ${transactionHash} (fill in description)`,
    chainId,
    trace,
    transferLogs,
    expected: [],
  };

  const fixturesPath = join(import.meta.dirname, 'transfer-traces.json');
  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
  fixtures.push(fixture);
  writeFileSync(fixturesPath, `${JSON.stringify(fixtures, null, 2)}\n`);
  console.log(`Appended '${name}' to ${fixturesPath} (${transferLogs.length} transfer logs) — fill in \`expected\``);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
