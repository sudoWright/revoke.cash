import {
  type EnrichedTokenEvent,
  isApprovalTokenEvent,
  isApprovedTransferTokenEvent,
  type TokenEvent,
  TokenEventType,
} from '@revoke.cash/core/events';
import { sortTokenEventsChronologically } from '@revoke.cash/core/events/utils';
import type { Address } from 'viem';

export const getHistoryEventsForChain = (events: EnrichedTokenEvent[] = []): EnrichedTokenEvent[] => {
  const historyEvents = events.filter((event) => isApprovalTokenEvent(event) || isApprovedTransferTokenEvent(event));
  return sortTokenEventsChronologically(historyEvents).reverse();
};

export const getHistoryEventSpenderAddress = (event: TokenEvent): Address | undefined => {
  if (event.type === TokenEventType.APPROVAL_ERC721 && event.payload.oldSpender) return event.payload.oldSpender;
  return event.payload.spender;
};
