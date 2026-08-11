'use client';

import { getHistoryEventSpenderAddress } from '@revoke.cash/core/allowances/history';
import type { EnrichedTokenEvent } from '@revoke.cash/core/events';
import { isNullish } from '@revoke.cash/core/utils';
import { useMemo } from 'react';
import { getSpenderKey, type SpenderLookup, useSpenderData } from './useSpenderData';

export const useAnnotateHistorySpenderData = (approvalHistory: EnrichedTokenEvent[] | undefined) => {
  const spenderLookups = useMemo<SpenderLookup[]>(() => {
    if (!approvalHistory || approvalHistory.length === 0) return [];

    return approvalHistory.flatMap((event) => {
      const spender = getHistoryEventSpenderAddress(event);
      if (isNullish(spender)) return [];
      return [{ chainId: event.chainId, spender, initialData: event.payload.spenderData }];
    });
  }, [approvalHistory]);

  const spenderData = useSpenderData(spenderLookups);

  return useMemo(() => {
    if (!approvalHistory) return undefined;

    return approvalHistory.map((event) => {
      if (event.payload.spenderData !== undefined) return event;

      const spender = getHistoryEventSpenderAddress(event);
      if (isNullish(spender)) return event;

      const spenderKey = getSpenderKey(event.chainId, spender);
      return {
        ...event,
        payload: { ...event.payload, spenderData: spenderData[spenderKey] },
      } as EnrichedTokenEvent;
    });
  }, [approvalHistory, spenderData]);
};
