import { IInvoice } from '../shared/types';

export interface InvoicePdfBusinessDetails {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export async function generateInvoicePDFBlob(
  invoice: IInvoice,
  details: InvoicePdfBusinessDetails
): Promise<Blob> {
  const [{ pdf }, { InvoicePDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/InvoicePDF'),
  ]);

  const doc = (
    <InvoicePDFDocument
      invoice={invoice}
      businessName={details.businessName}
      businessAddress={details.businessAddress}
      businessPhone={details.businessPhone}
      businessEmail={details.businessEmail}
    />
  );

  return pdf(doc).toBlob();
}
