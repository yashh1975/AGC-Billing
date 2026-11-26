import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Printer,
  Share2,
  Download,
  FolderOpen,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { generateInvoicePdf, formatRecordToPdfData, InvoicePdfData } from '@/services/pdf/pdf-generator';
import { LiveInvoicePreview } from '@/components/shared/LiveInvoicePreview';
import { AGC_DEFAULT_LOGO_BASE64 } from '@/assets/logo/logo-base64';

export interface InvoicePrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: InvoicePdfData & { documentId: number };
  record?: any;
  type?: 'sales' | 'purchase' | 'service';
}

export function InvoicePrintView({ open, onOpenChange, data: initialData, record, type }: InvoicePrintViewProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    if (open) {
      window.api?.db?.companyProfile?.get().then((res: any) => {
        if (isMounted && res?.success && res.data) {
          setCompanyProfile(res.data);
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  const data: (InvoicePdfData & { documentId: number }) | null = React.useMemo(() => {
    if (initialData) {
      return {
        ...initialData,
        companyProfile: companyProfile || initialData.companyProfile || {},
      };
    }
    if (record && type) {
      return formatRecordToPdfData(type, record, companyProfile || {});
    }
    return null;
  }, [initialData, record, type, companyProfile]);

  if (!open || !data) return null;

  const handleGenerateAndSavePdf = async (): Promise<string | null> => {
    setIsGenerating(true);
    try {
      // Generate precision vector PDF directly with jsPDF (with guaranteed embedded logo)
      const doc = generateInvoicePdf({
        ...data,
        companyProfile: companyProfile || data.companyProfile || {},
        logoBase64: AGC_DEFAULT_LOGO_BASE64,
      });
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Save via Electron backend to exact AGC_Billing path
      let typeFolder: 'Sales' | 'Dealer_Purchase' | 'Service' = 'Sales';
      if (data.type === 'purchase') typeFolder = 'Dealer_Purchase';
      if (data.type === 'service') typeFolder = 'Service';

      const saveRes = await window.api.pdf.saveDocument({
        type: typeFolder,
        documentId: data.documentId,
        documentNumber: data.documentNumber,
        documentDate: data.invoiceDate,
        pdfBase64,
      });

      const resolvedPath = saveRes.data?.filePath || (saveRes as any).filePath;

      if (saveRes.success && resolvedPath) {
        setSavedPdfPath(resolvedPath);
        toast({
          title: 'PDF Generated & Saved',
          description: `Saved to ${resolvedPath.split('\\').pop()}`,
          variant: 'success',
        });
        return resolvedPath;
      } else {
        toast({
          title: 'Save Failed',
          description: saveRes.error || 'Failed to save PDF.',
          variant: 'destructive',
        });
        return null;
      }
    } catch (err: any) {
      toast({
        title: 'Error Generating PDF',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPdf = async () => {
    let filePath = savedPdfPath;
    if (!filePath) {
      filePath = await handleGenerateAndSavePdf();
    }
    if (filePath) {
      const openRes = await window.api.files.openFile(filePath);
      if (openRes && !openRes.success) {
        toast({
          title: 'Unable to Open PDF',
          description: openRes.error || 'Could not launch system PDF viewer.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleShareWhatsApp = async () => {
    let filePath = savedPdfPath;
    if (!filePath) {
      filePath = await handleGenerateAndSavePdf();
    }

    const mobile = data.partyMobile || '';
    if (!mobile.trim()) {
      toast({
        title: 'Mobile Required',
        description: 'Customer mobile number is missing.',
        variant: 'destructive',
      });
      return;
    }

    const formattedAmount = (data.grandTotalPaise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const message = `Dear ${data.partyName || 'Customer'},\n\nThank you for choosing Anjaneya Gold Company.\nPlease find your tax invoice ${data.documentNumber} for ₹${formattedAmount}.\n\nWarm regards,\nAnjaneya Gold Company`;

    const shareRes = await window.api.whatsapp.share(mobile, message, filePath || undefined);
    if (shareRes && !shareRes.success) {
      toast({
        title: 'WhatsApp Error',
        description: shareRes.error || 'Failed to launch WhatsApp URL.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'WhatsApp Opened & PDF Copied',
      description: 'PDF copied to clipboard and folder opened! Simply press Ctrl+V in WhatsApp to attach and send.',
      variant: 'success',
    });
  };

  const handleCopyPath = () => {
    if (savedPdfPath) {
      navigator.clipboard.writeText(savedPdfPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Path Copied',
        description: 'Saved PDF path copied to clipboard.',
        variant: 'success',
      });
    }
  };

  // Convert items for LiveInvoicePreview
  const previewItems = data.items.map((it) => ({
    description: it.description,
    hsnCode: it.hsnCode,
    sacCode: it.sacCode,
    quantity: it.quantity,
    grossWeight: it.grossWeight,
    netWeight: it.netWeight,
    rate: it.ratePaise / 100,
    principalAmount: (it.principalAmountPaise || 0) / 100,
    serviceAmount: (it.serviceAmountPaise || 0) / 100,
    makingCharges: (it.makingChargesPaise || 0) / 100,
    vaPercent: it.vaPercent || 0,
    discount: (it.discountPaise || 0) / 100,
    gstRate: data.isDraft ? 0 : it.gstRate,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto font-sans p-6">
        <DialogHeader className="border-b border-[#E7E2D7] pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-bold text-[#171717] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C49A35]" />
                Tax Invoice Preview & Print Engine
              </DialogTitle>
              <span className="text-xs text-gray-500">
                Document #: <strong>{data.documentNumber}</strong> | Date: {data.invoiceDate}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAndSavePdf}
                disabled={isGenerating}
                className="text-xs h-8"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-[#C49A35]" />
                {isGenerating ? 'Generating...' : 'Save PDF'}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleOpenPdf}
                className="text-xs h-8"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Open PDF
              </Button>

              <Button
                size="sm"
                onClick={handleShareWhatsApp}
                className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Saved Path Banner */}
        {savedPdfPath && (
          <div className="p-3 rounded-md bg-[#F8F2E4] border border-[#E7E2D7] flex items-center justify-between text-xs text-gray-700 my-2">
            <div className="flex items-center gap-2 truncate">
              <FolderOpen className="w-4 h-4 text-[#A98226] shrink-0" />
              <span className="truncate">Saved File: <code className="font-mono text-[#171717] font-semibold">{savedPdfPath}</code></span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyPath}
              className="text-xs h-7 shrink-0 ml-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy Path'}
            </Button>
          </div>
        )}

        {/* Live Exact A4 Invoice Preview */}
        <div className="mt-2">
          <LiveInvoicePreview
            sheetRef={printSheetRef}
            type={data.type}
            documentNumber={data.documentNumber}
            invoiceDate={data.invoiceDate}
            partyName={data.partyName}
            partyMobile={data.partyMobile}
            partyGstin={data.partyGstin}
            partyAddress={data.partyAddress}
            placeOfSupply={data.placeOfSupply}
            originalInvoiceNumber={data.originalInvoiceNumber}
            originalInvoiceDate={data.originalInvoiceDate}
            items={previewItems}
            notes={data.notes}
            isDraft={data.isDraft}
            onPrint={handleOpenPdf}
            onSavePdf={handleGenerateAndSavePdf}
            isSaving={isGenerating}
          />
        </div>

        <DialogFooter className="border-t border-[#E7E2D7] pt-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handleOpenPdf} className="bg-[#171717] text-[#C49A35] hover:bg-[#2c2c2c] font-semibold">
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print A4 Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
