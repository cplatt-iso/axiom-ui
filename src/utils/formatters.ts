// src/utils/formatters.ts

/**
 * Formats bytes into a human-readable string (KB, MB, GB, TB).
 * @param bytes - The number of bytes.
 * @param decimals - The number of decimal places to include (default: 2).
 * @returns Human-readable string representation of the bytes.
 */
export function formatBytes(bytes: number | null | undefined, decimals = 2): string {
    if (bytes === null || typeof bytes === 'undefined' || bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || bytes < 0) return 'Invalid Size';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Ensure index is within bounds
    const unitIndex = Math.min(i, sizes.length - 1);

    return parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm)) + ' ' + sizes[unitIndex];
}

export const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) {
        return '0'; // Or '-' or whatever you want for null/undefined
    }
    // Simple number formatting with commas
    return num.toLocaleString();
};

// Add other formatting helpers here if needed
