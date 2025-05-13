// src/utils/ruleHelpers.ts
import { MatchOperation, MatchOperationSchema } from '@/schemas';

export const isValueRequired = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return !(op === MatchOperationSchema.enum.exists || op === MatchOperationSchema.enum.not_exists);
};

export const isValueList = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return op === MatchOperationSchema.enum.in || op === MatchOperationSchema.enum.not_in;
};

export const isIpOperator = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return (
        op === MatchOperationSchema.enum.ip_eq ||
        op === MatchOperationSchema.enum.ip_startswith ||
        op === MatchOperationSchema.enum.ip_in_subnet
    );
};