'use client';

import ChainDisplay from 'components/common/ChainDisplay';
import Toggle from 'components/common/Toggle';
import WithHoverTooltip from 'components/common/WithHoverTooltip';
import { useTranslations } from 'next-intl';

interface Props {
  chainId: number;
  isGranted: boolean;
  isConnected: boolean;
  isSupported: boolean;
  isPending: boolean;
  isPendingForThisChain: boolean;
  onToggle: (enabled: boolean) => void;
}

const AutoRevokeChainToggle = ({
  chainId,
  isGranted,
  isConnected,
  isSupported,
  isPending,
  isPendingForThisChain,
  onToggle,
}: Props) => {
  const t = useTranslations();

  const disabledTooltipKey = getDisabledTooltipKey(isConnected, isSupported);

  const toggle = (
    <Toggle
      pending={isPendingForThisChain}
      checked={isGranted}
      onChange={onToggle}
      disabled={isPending || !isConnected || !isSupported}
      size="sm"
    />
  );

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <ChainDisplay chainId={chainId} logoSize={20} className="text-zinc-700 dark:text-zinc-300" />
      {disabledTooltipKey ? <WithHoverTooltip tooltip={t(disabledTooltipKey)}>{toggle}</WithHoverTooltip> : toggle}
    </div>
  );
};

const getDisabledTooltipKey = (isConnected: boolean, isSupported: boolean) => {
  if (!isConnected) return 'account.auto_revoke.permissions.connect_to_manage';
  if (!isSupported) return 'account.auto_revoke.smart_account_unsupported';
  return null;
};

export default AutoRevokeChainToggle;
