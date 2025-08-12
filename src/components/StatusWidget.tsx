// src/components/StatusWidget.tsx
import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'; // Using Solid for emphasis
import { ComponentStatus } from '../services/api'; // Import the type
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusWidgetProps {
    title: string;
    statusData: ComponentStatus | undefined; // Allow undefined during loading
    isLoading?: boolean;
}

const StatusWidget: React.FC<StatusWidgetProps> = ({ title, statusData, isLoading = false }) => {
    const getStatusInfo = (): { Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; text: string } => {
        if (isLoading || !statusData) {
            return { Icon: QuestionMarkCircleIcon, variant: 'secondary', text: 'Loading...' };
        }
        switch (statusData.status.toLowerCase()) {
            case 'ok':
            case 'listening': // Treat listening as ok
                return { Icon: CheckCircleIcon, variant: 'default', text: 'OK' };
            case 'degraded':
                return { Icon: ExclamationTriangleIcon, variant: 'outline', text: 'Degraded' };
            case 'down':
            case 'error':
                return { Icon: XCircleIcon, variant: 'destructive', text: 'Error' };
            case 'unknown':
            default:
                return { Icon: QuestionMarkCircleIcon, variant: 'secondary', text: 'Unknown' };
        }
    };

    const { Icon, variant, text } = getStatusInfo();

    return (
        <Card className="dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-gray-700">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                <Badge variant={variant} className="flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5" />
                    {text}
                </Badge>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground" title={statusData?.details ?? 'No details available'}>
                    {statusData?.details ?? (isLoading ? 'Loading...' : 'No details available')}
                </p>
            </CardContent>
        </Card>
    );
};

export default StatusWidget;
