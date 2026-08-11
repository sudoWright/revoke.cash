import { getChainConfig } from '@revoke.cash/core/chains';
import { SECOND } from '@revoke.cash/core/utils/time';
import { type Address, type Client, createPublicClient, type Hash, type Hex, http, type PublicClient } from 'viem';

export interface TraceCallFrame {
  type: string;
  from: Address;
  to?: Address;
  input?: Hex;
  error?: string;
  revertReason?: string;
  calls?: TraceCallFrame[];
  logs?: TraceFrameLog[];
}

export interface TraceFrameLog {
  address: Address;
  topics?: Hex[];
  data?: Hex;
}

export type TraceActions = ReturnType<typeof traceActions>;
export type TraceClient = PublicClient & TraceActions;

export const createTraceClient = (chainId: number): TraceClient => {
  const chain = getChainConfig(chainId);
  return createPublicClient({
    pollingInterval: 4 * SECOND,
    chain: chain.getViemChainConfig(),
    transport: http(chain.getTracesRpcUrl()),
  }).extend(traceActions);
};

const traceActions = (client: Client) => ({
  traceTransaction: (transactionHash: Hash): Promise<TraceCallFrame> => {
    return client.request<{
      method: 'debug_traceTransaction';
      params: [Hash, { tracer: 'callTracer'; tracerConfig: { onlyTopCall: boolean; withLog: boolean } }];
      ReturnType: TraceCallFrame;
    }>({
      method: 'debug_traceTransaction',
      params: [transactionHash, { tracer: 'callTracer', tracerConfig: { onlyTopCall: false, withLog: true } }],
    });
  },
});
