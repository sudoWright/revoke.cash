import {
  type EnrichedTokenEvent,
  isCancelPermitEvent,
  isRevokeEvent,
  isTransferTokenEvent,
} from '@revoke.cash/core/events';
import StatusLabel from 'components/common/StatusLabel';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';

interface Props {
  event: EnrichedTokenEvent;
}

const EventTypeCell = ({ event }: Props) => {
  const t = useTranslations();

  if (isTransferTokenEvent(event)) {
    return (
      <StatusLabel status="info" className="w-32 py-0.75">
        {t('address.history.approved_transfer')}
      </StatusLabel>
    );
  }

  const isRevoked = isRevokeEvent(event);
  const isCancelPermit = isCancelPermitEvent(event);

  const eventType = isCancelPermit
    ? t('address.history.cancelled_signatures')
    : isRevoked
      ? t('address.history.revoked')
      : t('address.history.approved');

  const status = isCancelPermit ? 'warning' : isRevoked ? 'danger' : 'success';
  const className = twMerge('w-18 py-0.75', isCancelPermit && 'w-35');

  return (
    <StatusLabel status={status} className={className}>
      {eventType}
    </StatusLabel>
  );
};

export default EventTypeCell;
