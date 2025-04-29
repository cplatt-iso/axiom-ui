export interface DirectoryUsageStats {
    path: string;
    content_bytes: number; // Size of files *within* this directory (-1 if error)
}

export interface DiskUsageStats {
    filesystem_total_bytes: number; // Overall FS total
    filesystem_free_bytes: number; // Overall FS free
    directories: DirectoryUsageStats[]; // List of specific directory stats
}
