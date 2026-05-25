import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { Currency, ICustomer, IInvoice } from '../shared/types';
import { formatCurrency, formatDate } from '../shared/utils';

// Register font
Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2' }],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#1e40af',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 2,
  },
  // Status badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Bill section
  billSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  billBox: {
    flex: 1,
  },
  billLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  billName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  billDetail: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 1,
  },
  // Details grid
  detailsGrid: {
    flex: 1,
    marginLeft: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  detailValueRed: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  cellDescription: { flex: 4, fontSize: 9, color: '#334155' },
  cellQty: { flex: 1, textAlign: 'right', fontSize: 9, color: '#334155' },
  cellPrice: { flex: 2, textAlign: 'right', fontSize: 9, color: '#334155' },
  cellTotal: { flex: 2, textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  totalsBox: {
    width: 220,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: { fontSize: 9, color: '#64748b' },
  totalValue: { fontSize: 9, color: '#0f172a' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#1e40af',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#1e40af' },
  // Notes
  notesSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#94a3b8' },
  footerBrand: { fontSize: 8, color: '#1e40af', fontWeight: 'bold' },
});

interface InvoicePDFProps {
  invoice: IInvoice;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
}

function getStatusStyle(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#f1f5f9', color: '#64748b' },
    SENT: { bg: '#dbeafe', color: '#1d4ed8' },
    PARTIALLY_PAID: { bg: '#fef9c3', color: '#854d0e' },
    PAID: { bg: '#dcfce7', color: '#15803d' },
    OVERDUE: { bg: '#fee2e2', color: '#dc2626' },
    CANCELLED: { bg: '#f1f5f9', color: '#64748b' },
  };
  return map[status] || map.DRAFT;
}

export function InvoicePDFDocument({
  invoice,
  businessName,
  businessAddress,
  businessPhone,
  businessEmail,
}: InvoicePDFProps) {
  const customer = invoice.customer as ICustomer | undefined;
  const taxRate = invoice.taxRate ?? 0;
  const statusStyle = getStatusStyle(invoice.status);
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={businessName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.logo}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>ZW</Text>
              </View>
              <Text style={styles.businessName}>{businessName}</Text>
            </View>
            {businessAddress && (
              <Text style={[styles.billDetail, { marginTop: 4 }]}>{businessAddress}</Text>
            )}
            {businessPhone && <Text style={styles.billDetail}>{businessPhone}</Text>}
            {businessEmail && <Text style={styles.billDetail}>{businessEmail}</Text>}
          </View>

          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isOverdue ? '#fee2e2' : statusStyle.bg },
              ]}
            >
              <Text
                style={[styles.statusText, { color: isOverdue ? '#dc2626' : statusStyle.color }]}
              >
                {isOverdue ? 'OVERDUE' : invoice.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To / Invoice Details */}
        <View style={styles.billSection}>
          <View style={styles.billBox}>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billName}>{customer?.name || 'Customer'}</Text>
            {customer?.email && <Text style={styles.billDetail}>{customer.email}</Text>}
            {customer?.phone && <Text style={styles.billDetail}>{customer.phone}</Text>}
            {customer?.address && <Text style={styles.billDetail}>{customer.address}</Text>}
          </View>

          <View style={styles.detailsGrid}>
            <Text style={styles.billLabel}>Invoice Details</Text>
            {[
              { label: 'Invoice Number', value: invoice.invoiceNumber },
              { label: 'Issue Date', value: formatDate(invoice.createdAt) },
              {
                label: 'Due Date',
                value: formatDate(invoice.dueDate),
                red: isOverdue,
              },
              { label: 'Currency', value: invoice.currency },
              { label: 'Tax Rate', value: `${taxRate}%` },
            ].map(({ label, value, red }) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={red ? styles.detailValueRed : styles.detailValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 4 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.cellDescription}>{item.productName}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>
                {formatCurrency(item.unitPrice, invoice.currency as Currency)}
              </Text>
              <Text style={styles.cellTotal}>
                {formatCurrency(item.total, invoice.currency as Currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.subtotal, invoice.currency as Currency)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.tax, invoice.currency as Currency)}
              </Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                  -{formatCurrency(invoice.discount, invoice.currency as Currency)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Due</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(invoice.total, invoice.currency as Currency)}
              </Text>
            </View>
            {invoice.paidAt && (
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>✓ Paid on</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                  {formatDate(invoice.paidAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment instructions */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Payment Instructions</Text>
          <Text style={styles.notesText}>
            Please pay via Paynow (EcoCash, VISA) or bank transfer.{'\n'}
            Reference your invoice number {invoice.invoiceNumber} when making payment.{'\n'}
            For queries, please contact us via email or phone.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated on {new Date().toLocaleDateString('en-ZW', { dateStyle: 'long' })}
          </Text>
          <Text style={styles.footerBrand}>Powered by BizZW 🇿🇼</Text>
        </View>
      </Page>
    </Document>
  );
}
