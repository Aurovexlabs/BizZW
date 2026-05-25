import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateInvoicePDFBlob } from '../lib/invoicePdf';
import { IInvoice } from '../shared/types';
import { Button } from './ui';

interface InvoiceDownloadButtonProps {
  invoice: IInvoice;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  className?: string;
}

export function InvoiceDownloadButton({
  invoice,
  businessName,
  businessAddress,
  businessPhone,
  businessEmail,
  className,
}: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateInvoicePDFBlob(invoice, {
        businessName,
        businessAddress,
        businessPhone,
        businessEmail,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate PDF right now. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      icon={<Download className="w-4 h-4" />}
      loading={isGenerating}
      onClick={handleDownload}
      className={className}
    >
      {isGenerating ? 'Preparing PDF...' : 'Download PDF'}
    </Button>
  );
}
