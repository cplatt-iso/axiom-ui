// frontend/src/schemas/aiAssistSchema.ts
import { z } from 'zod'; // Or just use interfaces if no Zod validation needed on frontend for these

// Based on backend: app/schemas/ai_assist.py
// class RuleGenRequest(BaseModel):
//    current_config: Optional[str] = None
//    user_prompt: str
//    ruleset_id: Optional[int] = None
//    context: Optional[str] = None

export const RuleGenRequestSchema = z.object({
    current_config: z.string().optional().nullable(),
    user_prompt: z.string(),
    ruleset_id: z.number().int().optional().nullable(),
    context: z.string().optional().nullable(),
});
export type RuleGenRequest = z.infer<typeof RuleGenRequestSchema>;

// class RuleGenResponse(BaseModel):
//    suggested_json_config: Dict[str, Any] # This would be the RuleFormData
//    explanation: str
//    original_prompt: str
// Assuming suggested_json_config should map to RuleFormData
// We'd need to import RuleFormData from ruleSchema
// import { RuleFormDataSchema } from './ruleSchema';

export const RuleGenResponseSchema = z.object({
    // suggested_json_config: RuleFormDataSchema, // If it's strictly RuleFormData
    suggested_json_config: z.record(z.any()), // Or z.any() if it's truly freeform JSON
    explanation: z.string(),
    original_prompt: z.string(),
});
export type RuleGenResponse = z.infer<typeof RuleGenResponseSchema>;