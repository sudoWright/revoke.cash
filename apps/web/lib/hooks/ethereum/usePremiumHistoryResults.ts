import { getHistoryEventsForChain } from '@revoke.cash/core/allowances/history';
import type { EnrichedTokenEvent } from '@revoke.cash/core/events';
import { HOUR } from '@revoke.cash/core/utils/time';
import { useQueries } from '@tanstack/react-query';
import type { ChainAllowanceData } from 'lib/hooks/page-context/PremiumAddressPageContext';
import { type CombinedQueryResult, combineQueryResults } from './combined-query-result';

export interface CombinedHistoryResult extends CombinedQueryResult<EnrichedTokenEvent[]> {
  refetch: () => Promise<unknown>;
}

const eventsFingerprint = (events: ChainAllowanceData['events']): string => {
  const newestEvent = events[0];
  if (!newestEvent) return '0';
  return `${events.length}-${newestEvent.time.transactionHash}-${newestEvent.time.logIndex}`;
};

export const usePremiumHistoryResults = (chainData: ChainAllowanceData[]): CombinedHistoryResult[] => {
  return useQueries({
    queries: chainData.map((chain) => ({
      queryKey: ['approvalHistory', chain.chainId, eventsFingerprint(chain.events)],
      queryFn: () => getHistoryEventsForChain(chain.events),
      enabled: chain.status !== 'loading' && chain.events.length > 0,
      staleTime: 1 * HOUR,
    })),
    combine: (results): CombinedHistoryResult[] =>
      results.map((r) => ({
        ...combineQueryResults([r])[0],
        refetch: r.refetch,
      })),
  });
};
