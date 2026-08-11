import { ERC20_ABI } from '@revoke.cash/core/abis';
import { createViemPublicClientForChain, getChainName, getChainNativeToken } from '@revoke.cash/core/chains';
import { MULTICALL_ADDRESS } from '@revoke.cash/core/constants';
import { getDb } from '@revoke.cash/core/db/client';
import { batchRevokes } from '@revoke.cash/core/db/schema/batch-revokes';
import { getPaymentTokens, PREMIUM_PAYMENT_CHAIN_IDS } from '@revoke.cash/core/premium/payment-config';
import { getNativeTokenPriceUsd } from '@revoke.cash/core/prices';
import { DAY } from '@revoke.cash/core/utils/time';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { type Address, formatUnits, getAddress } from 'viem';

// Answers "could the people who already use us on this chain actually pay us there, and in what?"
// For every address that batch-revoked recently, reads its balance of each accepted stablecoin and
// of the native gas token. A payment is a single transfer of a single asset, so capability is the
// best single holding, never the sum across assets.

interface Stablecoin {
  symbol: string;
  address: Address;
  decimals: number;
}

interface ChainUnderTest {
  chainId: number;
  stablecoins: Stablecoin[];
}

// The only credible stablecoin on Robinhood Chain (Paxos Global Dollar). That chain hosts ~40
// impostor stablecoins, so this address comes from Robinhood's own canonical contract table and is
// re-verified on-chain before any balance is read.
const ROBINHOOD_CHAIN_ID = 4663;
const ROBINHOOD_USDG: Stablecoin = {
  symbol: 'USDG',
  address: getAddress('0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'),
  decimals: 6,
};

const CHAINS_UNDER_TEST: ChainUnderTest[] = [
  ...PREMIUM_PAYMENT_CHAIN_IDS.map((chainId) => ({ chainId, stablecoins: [...getPaymentTokens(chainId)] })),
  { chainId: ROBINHOOD_CHAIN_ID, stablecoins: [ROBINHOOD_USDG] },
];

const PREMIUM_PRICE_USD = 99;

const BALANCE_CHUNK_SIZE = 200;

// Bounding the window keeps chains comparable: an established chain would otherwise be credited with
// years of accumulated users against a newly launched one
const LOOKBACK_DAYS = 60;

const NATIVE_TOKEN_DECIMALS = 18;

const MULTICALL3_BALANCE_ABI = [
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface ChainResult {
  chainId: number;
  users: number;
  canPayWithStablecoin: number;
  canPayWithNative: number;
  canPayWithEither: number;
  nativeOnly: number;
  nativeSymbol: string;
}

const getBatchRevokeUsers = async (chainId: number): Promise<Address[]> => {
  const activeSince = new Date(Date.now() - LOOKBACK_DAYS * DAY);

  const rows = await getDb()
    .selectDistinct({ userAddress: batchRevokes.userAddress })
    .from(batchRevokes)
    .where(
      and(
        eq(batchRevokes.chainId, chainId),
        isNotNull(batchRevokes.userAddress),
        gte(batchRevokes.timestamp, activeSince),
      ),
    );

  return rows.flatMap((row) => (row.userAddress ? [row.userAddress] : []));
};

// Native balances come from multicall3's own getEthBalance, so both paths cost one request per chunk
const readChunk = async (chainId: number, stablecoin: Stablecoin | null, chunk: Address[]): Promise<bigint[]> => {
  const publicClient = createViemPublicClientForChain(chainId);

  const results = stablecoin
    ? await publicClient.multicall({
        contracts: chunk.map((address) => ({
          address: stablecoin.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf' as const,
          args: [address] as const,
        })),
        allowFailure: true,
      })
    : await publicClient.multicall({
        contracts: chunk.map((address) => ({
          address: MULTICALL_ADDRESS,
          abi: MULTICALL3_BALANCE_ABI,
          functionName: 'getEthBalance' as const,
          args: [address] as const,
        })),
        allowFailure: true,
      });

  return results.map((result) => (result.status === 'success' ? (result.result as bigint) : 0n));
};

const getBalances = async (chainId: number, stablecoin: Stablecoin | null, addresses: Address[]): Promise<bigint[]> => {
  const balances: bigint[] = [];

  for (let index = 0; index < addresses.length; index += BALANCE_CHUNK_SIZE) {
    balances.push(...(await readChunk(chainId, stablecoin, addresses.slice(index, index + BALANCE_CHUNK_SIZE))));
  }

  return balances;
};

const percentage = (part: number, total: number): string => {
  if (total === 0) return 'n/a';
  return `${((part / total) * 100).toFixed(1)}%`;
};

const analyseChain = async (chain: ChainUnderTest): Promise<ChainResult | null> => {
  const chainName = getChainName(chain.chainId);
  const nativeSymbol = getChainNativeToken(chain.chainId) ?? 'native';
  console.log(`\n=== ${chainName} (${chain.chainId}) ===`);

  const users = await getBatchRevokeUsers(chain.chainId);
  console.log(`  users (last ${LOOKBACK_DAYS}d): ${users.length}`);
  if (users.length === 0) return null;

  // A payment is one transfer of one asset, so take the best single stablecoin holding per user
  const bestStablecoinUsd = new Array<number>(users.length).fill(0);

  for (const stablecoin of chain.stablecoins) {
    const balances = await getBalances(chain.chainId, stablecoin, users);
    balances.forEach((balance, index) => {
      const value = Number(formatUnits(balance, stablecoin.decimals));
      bestStablecoinUsd[index] = Math.max(bestStablecoinUsd[index], value);
    });
    const covering = balances.filter(
      (balance) => Number(formatUnits(balance, stablecoin.decimals)) >= PREMIUM_PRICE_USD,
    ).length;
    console.log(
      `  ${stablecoin.symbol.padEnd(5)} >= $${PREMIUM_PRICE_USD}: ${covering} (${percentage(covering, users.length)})`,
    );
  }

  const nativePrice = await getNativeTokenPriceUsd(chain.chainId);
  const nativeBalances = await getBalances(chain.chainId, null, users);
  const nativeUsd = nativeBalances.map((balance) =>
    nativePrice ? Number(formatUnits(balance, NATIVE_TOKEN_DECIMALS)) * nativePrice : 0,
  );

  if (!nativePrice) console.log(`  WARNING: no ${nativeSymbol} price, treating native as $0`);

  const canPayWithStablecoin = bestStablecoinUsd.filter((value) => value >= PREMIUM_PRICE_USD).length;
  const canPayWithNative = nativeUsd.filter((value) => value >= PREMIUM_PRICE_USD).length;
  const canPayWithEither = users.filter(
    (_, index) => bestStablecoinUsd[index] >= PREMIUM_PRICE_USD || nativeUsd[index] >= PREMIUM_PRICE_USD,
  ).length;
  const nativeOnly = users.filter(
    (_, index) => nativeUsd[index] >= PREMIUM_PRICE_USD && bestStablecoinUsd[index] < PREMIUM_PRICE_USD,
  ).length;

  console.log(
    `  ${nativeSymbol.padEnd(5)} >= $${PREMIUM_PRICE_USD}: ${canPayWithNative} (${percentage(canPayWithNative, users.length)})${nativePrice ? ` @ $${nativePrice.toLocaleString()}` : ''}`,
  );
  console.log(`  native unlocks ${nativeOnly} users who cannot pay in any accepted stablecoin`);

  return {
    chainId: chain.chainId,
    users: users.length,
    canPayWithStablecoin,
    canPayWithNative,
    canPayWithEither,
    nativeOnly,
    nativeSymbol,
  };
};

const printSummary = (results: ChainResult[]) => {
  console.log(`\n\n=== SUMMARY: users able to cover $${PREMIUM_PRICE_USD} (last ${LOOKBACK_DAYS}d) ===`);
  console.log('chain                users   stables   native   either   native-only');

  for (const result of results) {
    const name = `${getChainName(result.chainId)} (${result.nativeSymbol})`.padEnd(20);
    console.log(
      `${name} ${String(result.users).padStart(5)}   ${String(result.canPayWithStablecoin).padStart(7)}   ${String(result.canPayWithNative).padStart(6)}   ${String(result.canPayWithEither).padStart(6)}   ${String(result.nativeOnly).padStart(11)}`,
    );
  }

  const total = (pick: (result: ChainResult) => number) => results.reduce((sum, result) => sum + pick(result), 0);
  console.log(
    `${'TOTAL'.padEnd(20)} ${String(total((r) => r.users)).padStart(5)}   ${String(total((r) => r.canPayWithStablecoin)).padStart(7)}   ${String(total((r) => r.canPayWithNative)).padStart(6)}   ${String(total((r) => r.canPayWithEither)).padStart(6)}   ${String(total((r) => r.nativeOnly)).padStart(11)}`,
  );
};

const checkPaymentTokenPenetration = async () => {
  const results: ChainResult[] = [];

  for (const chain of CHAINS_UNDER_TEST) {
    try {
      const result = await analyseChain(chain);
      if (result) results.push(result);
    } catch (error) {
      console.error(`  failed for chain ${chain.chainId}:`, error);
    }
  }

  printSummary(results);
};

checkPaymentTokenPenetration();
