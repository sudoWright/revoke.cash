import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AUTH_SESSION_QUERY_KEY, restoreSiweSession } from 'lib/auth/session';
import ky from 'lib/ky';
import { useConfig, useConnection } from 'wagmi';
import { getConnection } from 'wagmi/actions';
import { useSiweSignature } from './useSiweSignature';

interface Options {
  requireFreshSignature?: boolean;
}

export const useSiweSignIn = ({ requireFreshSignature }: Options = {}) => {
  const queryClient = useQueryClient();
  const config = useConfig();
  const { address } = useConnection();
  const { error: signatureError, isLoading: isSigning, signIn: signSiweMessage } = useSiweSignature(address);

  const {
    mutateAsync: verifySiweMessage,
    error: verifyError,
    isPending: isVerifying,
  } = useMutation({
    mutationFn: async () => {
      const signingAddress = address ?? getConnection(config).address;

      // A wallet that previously signed in from this browser can restore its session without a new signature
      if (!requireFreshSignature && signingAddress && (await restoreSiweSession(signingAddress))) {
        return signingAddress;
      }

      const signatureResult = await signSiweMessage();
      if (signatureResult.error) {
        throw signatureResult.error;
      }

      const siwe = signatureResult.data;
      if (!siwe?.address || !siwe?.message || !siwe?.signature) return null;

      const verifyRes = await ky
        .post('/api/auth/siwe/verify', {
          method: 'POST',
          json: siwe,
        })
        .json<{ ok: boolean }>();

      if (!verifyRes.ok) throw new Error('Error verifying SIWE message');

      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      return siwe.address;
    },
  });

  const signIn = async () => {
    return verifySiweMessage();
  };

  return {
    signIn,
    error: signatureError || verifyError,
    isLoading: isSigning || isVerifying,
  };
};
