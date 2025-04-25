// src/utils/ruleHelpers.ts
import { MatchOperation, MatchOperationSchema } from '@/schemas'; // Assuming schemas are correctly imported

export const isValueRequired = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    // Check against the Zod enum values directly for safety
    return ![MatchOperationSchema.enum.exists, MatchOperationSchema.enum.not_exists].includes(op);
};

export const isValueList = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return [MatchOperationSchema.enum.in, MatchOperationSchema.enum.not_in].includes(op);
};

export const isIpOperator = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return [
        MatchOperationSchema.enum.ip_eq,
        MatchOperationSchema.enum.ip_startswith,
        MatchOperationSchema.enum.ip_in_subnet
    ].includes(op);
};
