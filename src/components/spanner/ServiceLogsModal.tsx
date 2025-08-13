// src/components/spanner/ServiceLogsModal.tsx
import React from 'react';
import { SpannerServiceStatus } from '../../services/api';

interface ServiceLogsModalProps {
    isOpen: boolean;
    service: SpannerServiceStatus;
    onClose: () => void;
}

const ServiceLogsModal: React.FC<ServiceLogsModalProps> = () => {
    // TODO: Implement service logs modal
    // For now, return a placeholder
    return null;
};

export default ServiceLogsModal;
