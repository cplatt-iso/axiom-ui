// frontend/src/hooks/useOrderEvidence.ts

import { useQuery } from '@tanstack/react-query';
import { getOrderEvidence } from '@/services/api';

export function useOrderEvidenceCheck(accessionNumber: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['order-evidence-check', accessionNumber],
    queryFn: () => getOrderEvidence(accessionNumber!),
    enabled: enabled && !!accessionNumber,
    select: (data) => data && data.length > 0, // Return boolean - true if has evidence
    staleTime: 0, // Always consider data stale
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
