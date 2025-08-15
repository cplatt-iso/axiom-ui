// src/utils/zodDefaults.ts
import { z } from 'zod';

/**
 * Simple utility to build default values from a Zod schema with overrides
 * This is a basic implementation that handles the most common cases
 */
export function buildZodDefaults<T extends z.ZodTypeAny>(
    schema: T, 
    overrides: Partial<z.infer<T>> = {}
): z.infer<T> {
    // Create a basic defaults object based on common field types
    const baseDefaults: Record<string, unknown> = {};
    
    // If it's a ZodObject, iterate through its shape
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        
        for (const [key, fieldSchema] of Object.entries(shape)) {
            baseDefaults[key] = getDefaultValueForField(fieldSchema as z.ZodTypeAny);
        }
    }
    
    // Merge with overrides
    return { ...baseDefaults, ...overrides };
}

function getDefaultValueForField(fieldSchema: z.ZodTypeAny): unknown {
    // Handle optional fields
    if (fieldSchema instanceof z.ZodOptional) {
        return getDefaultValueForField(fieldSchema._def.innerType);
    }
    
    // Handle nullable fields  
    if (fieldSchema instanceof z.ZodNullable) {
        return null;
    }
    
    // Handle default values
    if (fieldSchema instanceof z.ZodDefault) {
        return fieldSchema._def.defaultValue();
    }
    
    // Handle basic types
    if (fieldSchema instanceof z.ZodString) {
        return "";
    }
    
    if (fieldSchema instanceof z.ZodNumber) {
        return 0;
    }
    
    if (fieldSchema instanceof z.ZodBoolean) {
        return false;
    }
    
    if (fieldSchema instanceof z.ZodEnum) {
        // Return the first enum value as default
        return fieldSchema._def.values[0];
    }
    
    // Handle coerced numbers
    if (fieldSchema instanceof z.ZodEffects && fieldSchema._def.schema instanceof z.ZodNumber) {
        return 0;
    }
    
    // Default fallback
    return null;
}
