import { createViemPublicClientForChain, getChainLogsRpcUrl } from '@revoke.cash/core/chains';
import type { Filter, Log } from '@revoke.cash/core/events';
import { isNullish } from '@revoke.cash/core/utils';
import { isChainHeightError } from '@revoke.cash/core/utils/errors';
import { withRetry, withTimeout } from '@revoke.cash/core/utils/promises';
import { SECOND } from '@revoke.cash/core/utils/time';
import { getAddress, type PublicClient } from 'viem';
import type { LogsProvider } from './LogsProvider';

export class ViemLogsProvider implements LogsProvider {
  private client: PublicClient;
  private url: string;

  constructor(
    public chainId: number,
    url?: string,
    httpOptions?: { timeout?: number; retryCount?: number },
  ) {
    this.url = url ?? getChainLogsRpcUrl(chainId);
    this.client = createViemPublicClientForChain(chainId, this.url, undefined, httpOptions);
  }

  async getLatestBlock(): Promise<number> {
    return withTimeout(this.client.getBlockNumber().then(Number), 10 * SECOND, 'RPC is unresponsive');
  }

  async getLogs(filter: Filter): Promise<Log[]> {
    // Hypersync does not allow using `null` as a topic, so we replace it with an empty array
    if (this.url.includes('hypersync')) {
      filter.topics = filter.topics?.map((topic) => (isNullish(topic) ? [] : topic)) as Log['topics'];
    }

    // Chain height errors resolve themselves within a block time, so we briefly wait and retry
    return withRetry(() => this.requestLogs(filter), {
      retries: 2,
      delayMs: 1 * SECOND,
      shouldRetry: isChainHeightError,
    });
  }

  private async requestLogs(filter: Filter): Promise<Log[]> {
    const logs = await this.client.request({
      method: 'eth_getLogs',
      params: [
        { ...filter, fromBlock: `0x${filter.fromBlock.toString(16)}`, toBlock: `0x${filter.toBlock.toString(16)}` },
      ],
    });

    return (logs as any[]).map((log) => this.formatEvent(log)) as Log[];
  }

  private formatEvent(log: any): Log {
    return {
      ...log,
      address: getAddress(log.address),
      blockNumber: Number(log.blockNumber),
      logIndex: Number(log.logIndex),
      transactionIndex: Number(log.transactionIndex),
      timestamp: isNullish(log.blockTimestamp) ? undefined : Number(log.blockTimestamp),
    };
  }
}
