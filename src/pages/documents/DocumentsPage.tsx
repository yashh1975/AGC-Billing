import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Search,
  ExternalLink,
  FileText,
  AlertTriangle,
  FolderCheck,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useToast } from '@/hooks/useToast';
import { formatRupees } from '@/services/gst/gst-engine';

export function DocumentsPage() {
  const { toast } = useToast();
  const { activeYear, years } = useFinancialYear();

  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFy, setSelectedFy] = useState<string>(activeYear?.name || '2026-27');
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.documents.getAll({
        fyName: selectedFy !== 'all' ? selectedFy : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });

      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeYear?.name) setSelectedFy(activeYear.name);
  }, [activeYear?.name]);

  useEffect(() => {
    loadDocuments();
  }, [selectedFy, selectedCategory]);

  const handleOpenPdf = async (filePath: string) => {
    try {
      const res = await window.api.files.openFile(filePath);
      if (res && !res.success) {
        toast({
          title: 'Unable to Open',
          description: res.error || 'Failed to open file.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Unable to Open',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    try {
      const res = await window.api.files.openFolder(filePath);
      if (res && !res.success) {
        toast({
          title: 'Unable to Open Folder',
          description: res.error || 'Failed to locate folder.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.document_number.toLowerCase().includes(q) ||
      (d.party_name && d.party_name.toLowerCase().includes(q)) ||
      (d.pdf_path && d.pdf_path.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 font-serif">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#C49A35]" />
            PDF Documents & Archive Vault
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadDocuments}
          disabled={isLoading}
          className="text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Vault
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by invoice #, party, or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-[#E7E2D7] rounded-md font-medium text-[#171717]"
            >
              <option value="all">All Documents</option>
              <option value="sales">Sales Invoices</option>
              <option value="purchase">Dealer Purchase Records</option>
              <option value="service">Service Invoices</option>
            </select>
          </div>

          {/* Financial Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Financial Year:</span>
            <select
              value={selectedFy}
              onChange={(e) => setSelectedFy(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-[#E7E2D7] rounded-md font-medium text-[#171717]"
            >
              <option value="all">All FYs</option>
              {years.map((y) => (
                <option key={y.id} value={y.name}>
                  FY {y.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
              <tr>
                <th className="p-3.5 font-bold text-xs md:text-sm">Document #</th>
                <th className="p-3.5 font-bold text-xs md:text-sm">Category</th>
                <th className="p-3.5 font-bold text-xs md:text-sm">Date</th>
                <th className="p-3.5 font-bold text-xs md:text-sm">Party Name</th>
                <th className="p-3.5 text-right font-bold text-xs md:text-sm">Value</th>
                <th className="p-3.5 font-bold text-xs md:text-sm">Vault Location</th>
                <th className="p-3.5 text-center font-bold text-xs md:text-sm">Disk Status</th>
                <th className="p-3.5 text-center font-bold text-xs md:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D7]">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 font-semibold text-[#171717] text-xs md:text-sm">
                      {doc.document_number}
                    </td>
                    <td className="p-3 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          doc.category === 'sales'
                            ? 'bg-amber-100 text-amber-800'
                            : doc.category === 'purchase'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {doc.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 text-xs md:text-sm">{doc.document_date}</td>
                    <td className="p-3 font-medium text-[#171717] text-xs md:text-sm">
                      {doc.party_name || 'N/A'}
                    </td>
                    <td className="p-3 text-right font-semibold text-[#171717] text-xs md:text-sm">
                      {formatRupees(doc.grand_total)}
                    </td>
                    <td className="p-3 text-gray-500 font-mono text-xs truncate max-w-xs" title={doc.pdf_path}>
                      {doc.pdf_path.split('\\').slice(-3).join('\\')}
                    </td>
                    <td className="p-3 text-center">
                      {doc.fileExists ? (
                        <Badge variant="success" className="text-xs flex items-center gap-1 mx-auto w-fit">
                          <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                          On Disk
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1 mx-auto w-fit">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Missing File
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!doc.fileExists}
                          onClick={() => handleOpenPdf(doc.pdf_path)}
                          className="h-8 text-xs text-[#A98226] hover:bg-[#F8F2E4]"
                          title="Open PDF Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Open
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!doc.fileExists}
                          onClick={() => handleOpenFolder(doc.pdf_path)}
                          className="h-7 text-xs text-gray-600 hover:bg-gray-100"
                          title="Reveal folder in Windows Explorer"
                        >
                          <HardDrive className="w-3.5 h-3.5 mr-1" />
                          Explorer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="w-8 h-8 text-gray-300" />
                      <p>{isLoading ? 'Scanning PDF documents vault...' : 'No PDF documents generated yet.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
