import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions';
import { isAutoRevokeSupportedChain } from '@revoke.cash/core/auto-revoke/config';
import { buildPermissionRequest, isValidAutoRevokePermission } from '@revoke.cash/core/auto-revoke/permissions';
import { isUserRejectionError, parseErrorMessage } from '@revoke.cash/core/utils/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ky from 'lib/ky';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useConnectorClient } from 'wagmi';
import { getSupportErrorKey, useAutoRevokeSupport } from './useAutoRevokeSupport';

export const useGrantAutoRevokePermission = () => {
  const t = useTranslations();
  const { data: connectorClient } = useConnectorClient();
  const { supportsAutoRevoke, supportStatus } = useAutoRevokeSupport();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (chainId: number) => {
      if (!connectorClient || !supportsAutoRevoke) throw new Error(t(getSupportErrorKey(supportStatus)));
      if (!isAutoRevokeSupportedChain(chainId)) throw new Error('Unsupported chain');

      const walletClient = connectorClient.extend(erc7715ProviderActions());

      const grantedPermissions = await walletClient.requestExecutionPermissions([buildPermissionRequest(chainId)]);

      const grantedPermission = grantedPermissions.find((permission) =>
        isValidAutoRevokePermission(permission, connectorClient.account.address),
      );
      if (!grantedPermission) throw new Error(t('account.auto_revoke.permissions.no_active_permission_returned'));

      await ky.post('/api/auto-revoke/permissions', {
        json: { chainId, permissionContext: grantedPermission.context },
      });
    },
    onError: (error) => {
      if (isUserRejectionError(error)) return;
      console.error('Failed to grant permission:', error);
      toast.error(parseErrorMessage(error) || t('account.auto_revoke.permissions.grant_failed'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['auto-revoke'] }),
  });

  return {
    grantPermission: async (chainId: number) => {
      return mutation.mutateAsync(chainId).catch(() => null);
    },
    isGranting: mutation.isPending,
    pendingChainId: mutation.isPending ? mutation.variables : null,
    supportsAutoRevoke,
  };
};
