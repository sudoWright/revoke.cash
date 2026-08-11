/**
 * Throwaway scanner used while building the transfer-extraction fixtures: scans recent Ethereum blocks
 * for small transactions matching the real-fixture cases (direct EOA transferFrom, Uniswap V2/V3 router
 * pull, UniversalRouter+Permit2 swap, plain USDC transfer).
 *
 * Usage: apps/web $ yarn env tsx test/fixtures/scan-mainnet-candidates.ts [blockCount]
 */
import { getChainConfig } from '@revoke.cash/core/chains';
import { ERC20_TRANSFER_TOPIC } from '@revoke.cash/core/events';
import { createPublicClient, getAddress, http } from 'viem';

const USDC = getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
const ROUTERS = new Set(
  [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router02
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 SwapRouter
    '0x68b3465833fb72A70ecDF485E0e4C7bd8665Fc45', // Uniswap V3 SwapRouter02
  ].map((address) => address.toLowerCase()),
);

const main = async () => {
  const blockCount = Number(process.argv[2] ?? 5);
  const chain = getChainConfig(1);
  const client = createPublicClient({ transport: http(chain.getRpcUrl()) });

  const latest = await client.getBlockNumber();

  for (let offset = 0; offset < blockCount; offset++) {
    const block = await client.getBlock({ blockNumber: latest - BigInt(offset), includeTransactions: true });

    for (const tx of block.transactions) {
      if (!tx.to || !tx.input || tx.input.length < 10) continue;
      const selector = tx.input.slice(0, 10).toLowerCase();
      const to = tx.to.toLowerCase();

      if (selector === '0x23b872dd') {
        const fromArg = `0x${tx.input.slice(34, 74)}`.toLowerCase();
        const kind = fromArg === tx.from.toLowerCase() ? 'transferFrom-SELF' : 'transferFrom-APPROVED';
        console.log(`${kind} ${tx.hash} to=${tx.to} txFrom=${tx.from} fromArg=${fromArg}`);
      } else if (ROUTERS.has(to)) {
        console.log(`ROUTER(${selector}) ${tx.hash} to=${tx.to}`);
      } else if (selector === '0x3593564c') {
        console.log(`UNIVERSAL-ROUTER ${tx.hash} to=${tx.to}`);
      } else if (to === USDC.toLowerCase() && selector === '0xa9059cbb') {
        console.log(`USDC-TRANSFER ${tx.hash} from=${tx.from}`);
      }
    }
  }
};

// Helper mode: pass a tx hash as arg 2 to print its receipt Transfer-log summary.
const inspect = async (txHash: string) => {
  const chain = getChainConfig(1);
  const client = createPublicClient({ transport: http(chain.getRpcUrl()) });
  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  const transferLogs = receipt.logs.filter((log) => log.topics[0] === ERC20_TRANSFER_TOPIC);
  console.log(`status=${receipt.status} logs=${receipt.logs.length} transferLogs=${transferLogs.length}`);
  for (const log of transferLogs) {
    console.log(
      `  logIndex=${log.logIndex} token=${log.address} topics=${log.topics.length} from=${log.topics[1]} to=${log.topics[2]}`,
    );
  }
};

const argument = process.argv[2];
const runner = argument?.startsWith('0x') ? inspect(argument) : main();
runner.catch((error) => {
  console.error(error);
  process.exit(1);
});
