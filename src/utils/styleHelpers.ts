// src/utils/styleHelpers.ts (Create or add to this file)
import React from 'react';
import {
    Globe, Network, FolderSearch, CloudCog, SearchCode, // Base Icons
    HardDrive, Server, Cloud, Database // Existing backend icons for reference
} from 'lucide-react';

// Add your existing getBackendTypeStyle here if it's not already in a shared place
export const getBackendTypeStyle = (backendType: string): { Icon: React.ElementType, textClass: string, bgClass: string } => {
    switch (backendType?.toLowerCase()) {
        case 'filesystem': return { Icon: HardDrive, textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'cstore': return { Icon: Server, textClass: 'text-purple-700 dark:text-purple-300', bgClass: 'bg-purple-100 dark:bg-purple-900/30' };
        case 'gcs': return { Icon: Cloud, textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
        case 'google_healthcare': return { Icon: Cloud, textClass: 'text-red-700 dark:text-red-300', bgClass: 'bg-red-100 dark:bg-red-900/30' };
        case 'stow_rs': return { Icon: Server, textClass: 'text-teal-700 dark:text-teal-300', bgClass: 'bg-teal-100 dark:bg-teal-900/30' };
        default: return { Icon: Database, textClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700' };
    }
};


// New style helper for Scrapers
export type ScraperType = 'dicomweb' | 'dimse-qr' | 'filesystem' | 'gcs' | string; // Allow future strings

export const getScraperTypeStyle = (scraperType: ScraperType): { Icon: React.ElementType, textClass: string, bgClass: string } => {
     switch (scraperType?.toLowerCase()) {
        case 'dicomweb':
             return { Icon: Globe, textClass: 'text-green-700 dark:text-green-300', bgClass: 'bg-green-100 dark:bg-green-900/30' };
        case 'dimse-qr':
             return { Icon: Network, textClass: 'text-amber-700 dark:text-amber-300', bgClass: 'bg-amber-100 dark:bg-amber-900/30' };
        case 'filesystem': // Future
             return { Icon: FolderSearch, textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'gcs': // Future
             return { Icon: CloudCog, textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
        default:
             return { Icon: SearchCode, textClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700' };
    }
};

