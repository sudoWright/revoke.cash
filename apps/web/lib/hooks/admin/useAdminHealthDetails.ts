'use client';

import type {
  EvaluationBacklogRow,
  IndexerProblemKind,
  IndexerProblemRow,
  StuckPendingPaymentRow,
} from '@revoke.cash/core/admin/health';
import { useAdminQuery } from 'lib/hooks/admin/useAdminQuery';

export const useAdminEvaluationBacklog = (enabled: boolean) => {
  return useAdminQuery<EvaluationBacklogRow[]>(
    ['admin', 'health', 'evaluation-backlog'],
    '/api/admin/health/evaluation-backlog',
    { enabled },
  );
};

export const useAdminIndexerProblems = (kind: IndexerProblemKind, enabled: boolean) => {
  return useAdminQuery<IndexerProblemRow[]>(
    ['admin', 'health', 'indexer-problems', kind],
    '/api/admin/health/indexer-problems',
    { searchParams: { kind }, enabled },
  );
};

export const useAdminStuckPayments = (enabled: boolean) => {
  return useAdminQuery<StuckPendingPaymentRow[]>(
    ['admin', 'health', 'stuck-payments'],
    '/api/admin/health/stuck-payments',
    { enabled },
  );
};
