// src/utils/dicom.ts

/**
 * Formats DICOM date and time strings into a more readable format.
 * @param dateStr - The DICOM date string (YYYYMMDD).
 * @param timeStr - The DICOM time string (HHMMSS.FFFFFF).
 * @returns A formatted date-time string, or an empty string if date is not provided.
 */
export function formatDicomDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): string {
    if (!dateStr || dateStr.length !== 8) {
        return '';
    }

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    let formattedDate = `${year}-${month}-${day}`;

    if (timeStr) {
        const hour = timeStr.substring(0, 2) || '00';
        const minute = timeStr.substring(2, 4) || '00';
        const second = timeStr.substring(4, 6) || '00';
        formattedDate += ` ${hour}:${minute}:${second}`;
    }

    return formattedDate;
}
