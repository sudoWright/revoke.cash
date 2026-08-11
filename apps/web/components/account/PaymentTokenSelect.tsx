'use client';

import type { PaymentToken, PaymentTokenSymbol } from '@revoke.cash/core/premium/types';
import Select from 'components/common/select/Select';
import TokenLogo from 'components/common/TokenLogo';

interface TokenOption {
  value: PaymentTokenSymbol;
}

interface Props {
  tokens: readonly PaymentToken[];
  selected: PaymentTokenSymbol;
  onSelect: (tokenSymbol: PaymentTokenSymbol) => void;
  instanceId?: string;
  isDisabled?: boolean;
}

const PaymentTokenSelect = ({ tokens, selected, onSelect, instanceId, isDisabled }: Props) => {
  const options = tokens.map((token) => ({ value: token.symbol }));

  const displayOption = ({ value }: TokenOption) => (
    <div className="flex items-center gap-2">
      <TokenLogo symbol={value} />
      <div>{value}</div>
    </div>
  );

  return (
    <Select
      instanceId={instanceId ?? 'payment-token-select'}
      aria-label="Select Payment Token"
      options={options}
      value={options.find((option) => option.value === selected)}
      onChange={(option: TokenOption) => onSelect(option.value)}
      formatOptionLabel={displayOption}
      isDisabled={isDisabled}
      menuPlacement="bottom"
      minMenuWidth="8rem"
    />
  );
};

export default PaymentTokenSelect;
