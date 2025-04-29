// src/schemas/index.ts

// Export everything from the new system file
export type { DiskUsageStats, DirectoryUsageStats } from './system';

export * from './system';

// Or, export only the specific type if you prefer more control initially:
// export type { DiskUsageStats } from './system';

// Leave out exports for other schema files (rule.ts, user.ts, etc.) for now
