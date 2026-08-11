'use client';

import { isNullish } from '@revoke.cash/core/utils';
import { useAccountCapabilities } from 'lib/hooks/ethereum/useAccountCapabilities';
import { useErc7715Support } from './useErc7715Support';

export type AutoRevokeSupportStatus = 'supported' | 'unsupported_wallet' | 'unsupported_account';

// To support auto-revoking, the WALLET itself needs to support ERC7715, and the connected ACCOUNT needs to be able to
// upgrade to a smart account (EIP7702)
export const useAutoRevokeSupport = () => {
  const { supportsErc7715, isLoading: isLoadingErc7715Support } = useErc7715Support();
  const { capabilities, isLoading: isLoadingCapabilities } = useAccountCapabilities();

  // We don't want to be *too* restrictive, so if for some reason capabilities is null, we assume it's supported
  const supportsSmartAccount = isNullish(capabilities) || Object.keys(capabilities).length > 0;

  return {
    supportsAutoRevoke: supportsErc7715 && supportsSmartAccount,
    supportStatus: getSupportStatus(supportsErc7715, supportsSmartAccount),
    isLoading: isLoadingErc7715Support || isLoadingCapabilities,
  };
};

const getSupportStatus = (supportsErc7715: boolean, supportsSmartAccount: boolean): AutoRevokeSupportStatus => {
  if (!supportsErc7715) return 'unsupported_wallet';
  if (!supportsSmartAccount) return 'unsupported_account';
  return 'supported';
};

export const getSupportErrorKey = (supportStatus: AutoRevokeSupportStatus) => {
  if (supportStatus === 'unsupported_account') return 'account.auto_revoke.smart_account_unsupported';
  return 'account.auto_revoke.metamask_not_connected';
};
