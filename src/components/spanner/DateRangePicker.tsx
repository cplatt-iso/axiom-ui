import React from 'react';

interface DateRange {
    from: Date;
    to: Date;
}

interface DateRangePickerProps {
    value?: DateRange;
    onChange?: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Date Range</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
                Date range picker placeholder - coming soon...
            </p>
        </div>
    );
};

export default DateRangePicker;
