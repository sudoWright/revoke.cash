import { formatErc20Allowance, getAllowanceI18nValues } from '@revoke.cash/core/allowances';
import {
  type EnrichedTokenEvent,
  eventToAllowance,
  isRevokeEvent,
  isTransferTokenEvent,
  TokenEventType,
} from '@revoke.cash/core/events';
import { useTranslations } from 'next-intl';

interface Props {
  event: EnrichedTokenEvent;
}

const HistoryAmountCell = ({ event }: Props) => {
  const t = useTranslations();

  const { i18nKey, amount, tokenId, symbol } = getEventI18nValues(event);
  if (!isTransferTokenEvent(event) && isRevokeEvent(event) && !tokenId) return null;

  return (
    <div className="flex flex-col justify-start items-start truncate">
      <div className="w-full truncate">{t(i18nKey, { amount, tokenId, symbol } as any)}</div>
    </div>
  );
};

export default HistoryAmountCell;

const getEventI18nValues = (event: EnrichedTokenEvent) => {
  if (isTransferTokenEvent(event)) {
    if (event.type === TokenEventType.TRANSFER_ERC20) {
      const amount = formatErc20Allowance(event.payload.amount, event.metadata.decimals);
      return { i18nKey: 'address.allowances.amount', amount, symbol: event.metadata.symbol };
    }

    return { i18nKey: 'address.allowances.token_id', tokenId: event.payload.tokenId?.toString() };
  }

  const allowance = eventToAllowance(event);
  return getAllowanceI18nValues({ payload: allowance, metadata: event.metadata });
};
