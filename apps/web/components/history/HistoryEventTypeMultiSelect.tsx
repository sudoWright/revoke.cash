'use client';

import Checkbox from 'components/common/Checkbox';
import StatusLabel, { type Status } from 'components/common/StatusLabel';
import SearchableSelect from 'components/common/select/SearchableSelect';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { HistoryEventCategory } from './columns';

interface EventTypeOption {
  value: HistoryEventCategory;
  labelKey: string;
  status: Status;
}

interface Props {
  eventTerms: string[];
  onEventTermsChange: (terms: string[]) => void;
}

// Statuses mirror EventTypeCell so the menu shows the same pills as the table.
const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: 'approval', labelKey: 'address.history.approved', status: 'success' },
  { value: 'revocation', labelKey: 'address.history.revoked', status: 'danger' },
  { value: 'cancellation', labelKey: 'address.history.cancelled_signatures', status: 'warning' },
  { value: 'transfer', labelKey: 'address.history.approved_transfer', status: 'info' },
];

const normalise = (value: string) => value.trim().toLowerCase();

const HistoryEventTypeMultiSelect = ({ eventTerms, onEventTermsChange }: Props) => {
  const t = useTranslations();

  const selectedOptions = useMemo(() => {
    return EVENT_TYPE_OPTIONS.filter((option) => eventTerms.some((term) => normalise(term) === option.value));
  }, [eventTerms]);

  const selectedValues = selectedOptions.map((selectedOption) => selectedOption.value);

  const displayOption = (option: EventTypeOption, context: 'menu' | 'value') => {
    if (context !== 'menu') return t(option.labelKey);

    return (
      <div className="flex items-center justify-between gap-2">
        <StatusLabel status={option.status} className="py-0.75 whitespace-nowrap">
          {t(option.labelKey)}
        </StatusLabel>
        <Checkbox
          checked={selectedValues.includes(option.value)}
          className="w-4 h-4 shrink-0 pointer-events-none"
          iconClassName="w-3.5 h-3.5"
        />
      </div>
    );
  };

  const displayOptions = selectedOptions.length > 0 ? selectedOptions : EVENT_TYPE_OPTIONS;
  const [firstDisplayOption] = displayOptions;
  const controlPlaceholder = (
    <div className="flex items-center gap-1 min-w-0">
      <StatusLabel status={firstDisplayOption.status} className="py-0.75 whitespace-nowrap truncate">
        {t(firstDisplayOption.labelKey)}
      </StatusLabel>
      {displayOptions.length > 1 && (
        <div className="flex items-center justify-center h-5 min-w-5 px-1 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[11px]">
          +{displayOptions.length - 1}
        </div>
      )}
    </div>
  );

  return (
    <SearchableSelect
      instanceId="history-event-type-multi-select"
      aria-label={t('address.headers.event_type')}
      className="w-full sm:w-44 shrink-0"
      targetClassName="w-full sm:w-44 shrink-0"
      value={selectedOptions}
      options={EVENT_TYPE_OPTIONS}
      onChange={(options) => {
        onEventTermsChange(options.map((option) => option.value));
      }}
      formatOptionLabel={displayOption}
      menuPlacement="bottom"
      minMenuWidth="14.5rem"
      placeholder={controlPlaceholder}
      keepMounted
      isMulti
    />
  );
};

export default HistoryEventTypeMultiSelect;
