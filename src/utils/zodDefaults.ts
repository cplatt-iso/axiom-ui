// utils/zodDefaults.ts  – replace the helper with this version
import { z, type ZodTypeAny, type ZodObject } from 'zod';

export const buildZodDefaults = <S extends ZodTypeAny>(
  schema: S,
  overrides: Partial<z.infer<S>> = {},
): z.infer<S> => {
  // unwrap *all* ZodEffects layers until we reach a ZodObject
  let base: ZodTypeAny = schema;
  while (base instanceof z.ZodEffects) {
    base = (base._def as any).schema;
  }

  // .partial() (no deep) → makes **root** keys optional; that’s all we need
  const withDefaults = (base as ZodObject<any>).partial().parse({});
  return { ...withDefaults, ...overrides } as z.infer<S>;
};