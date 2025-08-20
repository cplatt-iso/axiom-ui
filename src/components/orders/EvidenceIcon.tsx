// frontend/src/components/orders/EvidenceIcon.tsx

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderEvidenceCheck } from '@/hooks/useOrderEvidence';
import { OrderEvidenceModal } from './OrderEvidenceModal';

interface EvidenceIconProps {
  accessionNumber: string | null;
  patientName?: string;
}

export function EvidenceIcon({ accessionNumber, patientName }: EvidenceIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: hasEvidence } = useOrderEvidenceCheck(accessionNumber);

  // Don't render anything if no accession number or no evidence
  if (!accessionNumber || !hasEvidence) {
    return <div className="w-8" />; // Empty space to maintain column alignment
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation(); // Prevent row click
          e.preventDefault(); // Prevent default behavior
          setIsModalOpen(true);
        }}
        className="p-1 h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        title="View DICOM processing evidence"
      >
        <FileText className="h-4 w-4" />
      </Button>
      
      {isModalOpen && (
        <OrderEvidenceModal
          accessionNumber={accessionNumber}
          patientName={patientName}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
