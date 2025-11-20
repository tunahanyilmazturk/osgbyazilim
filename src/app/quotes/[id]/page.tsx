"use client";

import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Edit, Trash2, FileText, Building2, Calendar, Check, X, Download, Mail } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/QuotePDFDocument';

type QuoteItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string;
  createdAt: string;
  test: {
    id: number;
    name: string;
    code: string;
  } | null;
};

type Quote = {
  id: number;
  companyId: number;
  quoteNumber: string;
  issueDate: string;
  validUntilDate: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  company: {
    id: number;
    name: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  items: QuoteItem[];
};

const STATUS_LABELS = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEditingIssueDate, setIsEditingIssueDate] = useState(false);
  const [isEditingValidUntilDate, setIsEditingValidUntilDate] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'quantity' | 'unitPrice' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDeletingItemId, setIsDeletingItemId] = useState<number | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('0');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quotes/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const data = await response.json();
      setQuote(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Teklif yüklenirken hata oluştu');
      router.push('/quotes');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  useEffect(() => {
    if (!quote) return;
    setEmailData({
      to: quote.company.email || '',
      subject: `${quote.quoteNumber} - Teklif`,
      message: `Merhaba ${quote.company.contactPerson || ''},\n\n${quote.quoteNumber} numaralı teklifimizi ekte bilgilerinize sunarız. Sorularınız olursa bizimle iletişime geçebilirsiniz.\n\nSaygılarımızla,\nÇet-ka Körfez İş Sağlığı ve Güvenliği`,
    });
  }, [quote]);

  const handleStatusChange = useCallback(() => {
    if (!quote) return;
    setNewStatus(quote.status);
    setStatusNotes(quote.notes || '');
    setStatusDialogOpen(true);
  }, [quote]);

  const updateQuote = useCallback(
    async (updates: Partial<Pick<Quote, 'issueDate' | 'validUntilDate' | 'notes'>>) => {
      if (!quote) return;

      try {
        const response = await fetch(`/api/quotes/${quote.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update quote');
        }

        const updated = await response.json();
        setQuote(updated);
        toast.success('Teklif bilgileri güncellendi');
      } catch (error) {
        console.error('Error updating quote:', error);
        toast.error('Teklif güncellenirken hata oluştu');
      }
    },
    [quote]
  );

  const handleStatusUpdate = useCallback(async () => {
    if (!quote) return;

    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quote status');
      }

      const updatedQuote = await response.json();
      setQuote(updatedQuote);
      toast.success('Teklif durumu güncellendi');
      setStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast.error('Teklif durumu güncellenirken hata oluştu');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [quote, newStatus, statusNotes]);

  const handleDelete = useCallback(async () => {
    if (!quote) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote');
      }

      toast.success('Teklif silindi');
      router.push('/quotes');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Teklif silinirken hata oluştu');
      setIsDeleting(false);
    }
  }, [quote, router]);

  const getCompanyInfo = useCallback(() => {
    const settings = localStorage.getItem('app-settings');
    if (!settings) return undefined;
    
    try {
      const parsed = JSON.parse(settings);
      return {
        name: parsed.companyName || 'Çet-ka Körfez İş Sağlığı ve Güvenliği',
        address: parsed.companyAddress || 'Ömerağa Mah. Cemil Karakadılar Cad. No: 18/A İzmit Kocaeli',
        phone: parsed.companyPhone || '(262) 349 40 83 / 331 69 80',
        email: parsed.companyEmail || 'info@cetkaosgb.com',
        stamp: parsed.companyStamp || undefined,
        logo: parsed.companyLogo || undefined,
      };
    } catch (e) {
      console.error('Error parsing settings:', e);
      return undefined;
    }
  }, []);

  const handleViewPDF = useCallback(async () => {
    if (!quote) return;
    
    try {
      setIsGeneratingPDF(true);
      const companyInfo = getCompanyInfo();
      
      // Generate PDF client-side
      const blob = await pdf(
        <QuotePDF quote={quote} companyInfo={companyInfo} />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);

      // Özel bir önizleme sekmesi aç ve içine hem PDF önizlemesini hem de indirme linkini yerleştir
      const pdfWindow = window.open('', '_blank');
      if (!pdfWindow) {
        toast.error('PDF sekmesi açılırken bir hata oluştu');
        URL.revokeObjectURL(url);
        return;
      }

      const fileName = `teklif-${quote.quoteNumber}.pdf`;

      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html lang="tr">
          <head>
            <meta charSet="utf-8" />
            <title>Teklif PDF Önizleme</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
              .toolbar { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; background: #f9fafb; }
              .title { font-size: 14px; color: #374151; }
              .download-btn { padding: 6px 12px; background: #2563eb; color: white; border-radius: 4px; text-decoration: none; font-size: 14px; }
              .download-btn:hover { background: #1d4ed8; }
              iframe { flex: 1; width: 100%; border: none; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <div class="title">Teklif PDF Önizleme</div>
              <a href="${url}" download="${fileName}" class="download-btn">PDF İndir</a>
            </div>
            <iframe src="${url}"></iframe>
          </body>
        </html>
      `);

      // URL'i bir süre sonra temizle (iframe'in yüklenmesi için zaman tanıyarak)
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [quote, getCompanyInfo]);

  const handleDownloadPDF = useCallback(async () => {
    if (!quote) return;
    
    try {
      setIsGeneratingPDF(true);
      const companyInfo = getCompanyInfo();
      
      // Generate PDF client-side
      const blob = await pdf(
        <QuotePDF quote={quote} companyInfo={companyInfo} />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teklif-${quote.quoteNumber}.pdf`;
      link.click();
      
      // Clean up URL after download
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success('PDF indirildi');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [quote, getCompanyInfo]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const toInputDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const startEditItemField = (itemId: number, field: 'quantity' | 'unitPrice', currentValue: number) => {
    setEditingItemId(itemId);
    setEditingField(field);
    setEditValue(currentValue.toString());
  };

  const cancelEditItemField = () => {
    setEditingItemId(null);
    setEditingField(null);
    setEditValue('');
  };

  const saveItemField = async () => {
    if (!quote || editingItemId === null || !editingField) return;

    const numericValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error('Lütfen geçerli bir değer girin');
      return;
    }

    try {
      const response = await fetch(`/api/quote-items/${editingItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [editingField]: numericValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quote item');
      }

      const updatedQuote = await response.json();
      setQuote(updatedQuote);
      toast.success('Kalem güncellendi');
      cancelEditItemField();
    } catch (error) {
      console.error('Error updating quote item:', error);
      toast.error('Kalem güncellenirken hata oluştu');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!quote) return;

    if (!confirm('Bu kalemi silmek istediğinizden emin misiniz?')) return;

    try {
      setIsDeletingItemId(itemId);
      const response = await fetch(`/api/quote-items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote item');
      }

      const updatedQuote = await response.json();
      setQuote(updatedQuote);
      toast.success('Kalem silindi');
    } catch (error) {
      console.error('Error deleting quote item:', error);
      toast.error('Kalem silinirken hata oluştu');
    } finally {
      setIsDeletingItemId(null);
    }
  };

  const handleAddItem = async () => {
    if (!quote) return;

    const quantityNumber = parseInt(newItemQuantity, 10);
    const unitPriceNumber = parseFloat(newItemUnitPrice.replace(',', '.'));

    if (!newItemDescription.trim()) {
      toast.error('Lütfen açıklama girin');
      return;
    }
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Lütfen geçerli bir miktar girin');
      return;
    }
    if (isNaN(unitPriceNumber) || unitPriceNumber <= 0) {
      toast.error('Lütfen geçerli bir birim fiyat girin');
      return;
    }

    try {
      setIsAddingItem(true);
      const response = await fetch(`/api/quotes/${quote.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: quantityNumber,
          unitPrice: unitPriceNumber,
          description: newItemDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create quote item');
      }

      await fetchQuote();

      toast.success('Kalem eklendi');
      setIsAddItemDialogOpen(false);
      setNewItemDescription('');
      setNewItemQuantity('1');
      setNewItemUnitPrice('0');
    } catch (error) {
      console.error('Error creating quote item:', error);
      toast.error('Kalem eklenirken hata oluştu');
    } finally {
      setIsAddingItem(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Teklif yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const openEmailDialog = () => {
    if (!quote) return;
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!quote) return;
    if (!emailData.to || !emailData.subject || !emailData.message) {
      toast.error('Lütfen email adresi, konu ve mesaj alanlarını doldurun');
      return;
    }

    try {
      setIsSendingEmail(true);
      const response = await fetch(`/api/quotes/${quote.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Teklif email ile gönderildi');
      setEmailDialogOpen(false);
      setIsSendingEmail(false);

      if (quote.status === 'draft') {
        setQuote({ ...quote, status: 'sent' });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Email gönderilirken hata oluştu');
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{quote.quoteNumber}</h1>
            <p className="text-muted-foreground mt-1">Teklif Detayları</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleViewPDF} 
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF Görüntüle
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF İndir
          </Button>
          <Button
            onClick={openEmailDialog}
            disabled={isSendingEmail}
            className="gap-2"
          >
            {isSendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Email Gönder
          </Button>
          <Button variant="outline" onClick={handleStatusChange} className="gap-2">
            <Edit className="w-4 h-4" />
            Durumu Güncelle
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Sil
          </Button>
        </div>
      </div>

      {/* Quote Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Firma Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Firma Adı</div>
              <div className="text-lg font-semibold">{quote.company.name}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Yetkili Kişi</div>
              <div>{quote.company.contactPerson}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Telefon</div>
              <div>{quote.company.phone}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">E-posta</div>
              <div>{quote.company.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Adres</div>
              <div className="text-sm">{quote.company.address}</div>
            </div>
          </CardContent>
        </Card>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kalem Ekle</DialogTitle>
            <DialogDescription>
              Bu teklife yeni bir kalem ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newItemDescription">Açıklama</Label>
              <Textarea
                id="newItemDescription"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                rows={2}
                placeholder="Kalem açıklaması"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newItemQuantity">Miktar</Label>
                <Input
                  id="newItemQuantity"
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newItemUnitPrice">Birim Fiyat (TL)</Label>
                <Input
                  id="newItemUnitPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={newItemUnitPrice}
                  onChange={(e) => setNewItemUnitPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddItemDialogOpen(false)}
              disabled={isAddingItem}
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={isAddingItem}
              className="gap-2"
            >
              {isAddingItem && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Teklif Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Teklif No</div>
              <div className="text-lg font-semibold">{quote.quoteNumber}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Durum</div>
              <Badge variant="outline" className={STATUS_COLORS[quote.status]}>
                {STATUS_LABELS[quote.status]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Oluşturma Tarihi</div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {isEditingIssueDate ? (
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm"
                      value={toInputDate(quote.issueDate)}
                      onChange={async (e) => {
                        const value = e.target.value;
                        await updateQuote({ issueDate: value });
                        setIsEditingIssueDate(false);
                      }}
                      onBlur={() => setIsEditingIssueDate(false)}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left text-sm hover:underline"
                      onClick={() => setIsEditingIssueDate(true)}
                    >
                      {formatDate(quote.issueDate)}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Geçerlilik Tarihi</div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {isEditingValidUntilDate ? (
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm"
                      value={toInputDate(quote.validUntilDate)}
                      onChange={async (e) => {
                        const value = e.target.value;
                        await updateQuote({ validUntilDate: value });
                        setIsEditingValidUntilDate(false);
                      }}
                      onBlur={() => setIsEditingValidUntilDate(false)}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left text-sm hover:underline"
                      onClick={() => setIsEditingValidUntilDate(true)}
                    >
                      {formatDate(quote.validUntilDate)}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Notlar</div>
              {isEditingNotes ? (
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={async () => {
                    await updateQuote({ notes: notesDraft.trim() || null });
                    setIsEditingNotes(false);
                  }}
                  rows={4}
                  className="text-sm"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="w-full text-left text-sm bg-muted p-3 rounded-md min-h-[48px] hover:bg-muted/80"
                  onClick={() => {
                    setNotesDraft(quote.notes || '');
                    setIsEditingNotes(true);
                  }}
                >
                  {quote.notes && quote.notes.trim().length > 0
                    ? quote.notes
                    : 'Not eklemek için tıklayın'}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Teklif Kalemleri</CardTitle>
            <CardDescription>{quote.items.length} kalem</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsAddItemDialogOpen(true)}
          >
            <FileText className="w-4 h-4" />
            Kalem Ekle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-center">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead className="w-[80px] text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {editingItemId === item.id && editingField === 'quantity' ? (
                        <input
                          type="number"
                          min={1}
                          className="w-20 border rounded px-2 py-1 text-center text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveItemField}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveItemField();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditItemField();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="w-full text-center hover:underline"
                          onClick={() => startEditItemField(item.id, 'quantity', item.quantity)}
                        >
                          {item.quantity}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingItemId === item.id && editingField === 'unitPrice' ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-28 border rounded px-2 py-1 text-right text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveItemField}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveItemField();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditItemField();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="w-full text-right hover:underline"
                          onClick={() => startEditItemField(item.id, 'unitPrice', item.unitPrice)}
                        >
                          {formatCurrency(item.unitPrice)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeletingItemId === item.id}
                      >
                        {isDeletingItemId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Sil
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Ara Toplam
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(quote.subtotal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    {(() => {
                      const vatRate = quote.subtotal > 0
                        ? Math.round((quote.tax / quote.subtotal) * 100)
                        : 0;
                      return `KDV (%${vatRate})`;
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(quote.tax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right text-lg font-bold">
                    Genel Toplam
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">
                    {formatCurrency(quote.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Email Quote Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Teklifi Email ile Gönder</DialogTitle>
            <DialogDescription>
              PDF otomatik oluşturulup email’e eklenecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">Email Adresi *</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="ornek@firma.com"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Konu *</Label>
              <Input
                id="email-subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Mesaj *</Label>
              <Textarea
                id="email-message"
                rows={6}
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              />
            </div>
            <div className="bg-muted p-3 rounded text-sm">
              <p className="font-medium">Teklif Özeti</p>
              <p className="text-muted-foreground">
                {quote.quoteNumber} • {quote.company.name}
              </p>
              <p className="text-muted-foreground">Toplam: {formatCurrency(quote.total)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={isSendingEmail}
            >
              İptal
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailData.to || !emailData.subject || !emailData.message}
              className="gap-2"
            >
              {isSendingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
              <Mail className="w-4 h-4" />
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Teklif Durumunu Güncelle</DialogTitle>
            <DialogDescription>
              Teklif durumunu ve notları güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      Taslak
                    </div>
                  </SelectItem>
                  <SelectItem value="sent">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Gönderildi
                    </div>
                  </SelectItem>
                  <SelectItem value="accepted">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Kabul Edildi
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500" />
                      Reddedildi
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Durum değişikliği hakkında not ekleyin..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={isUpdatingStatus}
            >
              İptal
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus}
              className="gap-2"
            >
              {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Sil</DialogTitle>
            <DialogDescription>
              Bu teklifi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve
              tüm teklif kalemleri de silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}