"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileText, Plus, Search, X, Loader2, Eye, Trash2, Building2, Download, Copy, Edit, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, MoreVertical, Mail, AlertTriangle, Clock, TrendingUp, DollarSign, Grid3x3, List, RefreshCw, Star, Filter, Send, Activity, BarChart3, FileSpreadsheet, QrCode } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';

type Company = {
  id: number;
  name: string;
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
  companyName: string;
  companyContactPerson: string;
  itemCount: number;
};

const STATUS_LABELS = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
  sent: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700',
  accepted: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700',
  rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700',
};

type SortField = 'quoteNumber' | 'companyName' | 'issueDate' | 'validUntilDate' | 'total' | 'status';
type SortDirection = 'asc' | 'desc' | null;
type ViewMode = 'table' | 'grid';
type ViewTab = 'overview' | 'analytics';

const VIEW_MODES: ViewMode[] = ['table', 'grid'];

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk operations
  const [selectedQuotes, setSelectedQuotes] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Quote['status']>('sent');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Copy dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [quoteToCopy, setQuoteToCopy] = useState<Quote | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [quoteToEmail, setQuoteToEmail] = useState<Quote | null>(null);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [bulkEmailData, setBulkEmailData] = useState({ subject: '', message: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // QR Code dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [quoteForQR, setQuoteForQR] = useState<Quote | null>(null);

  // Page QR dialog
  const [pageQrDialogOpen, setPageQrDialogOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [viewTab, setViewTab] = useState<ViewTab>('overview');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Favorites
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [quotesRes, companiesRes] = await Promise.all([
        fetch('/api/quotes?limit=1000'),
        fetch('/api/companies?limit=1000'),
      ]);

      if (!quotesRes.ok || !companiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [quotesData, companiesData] = await Promise.all([
        quotesRes.json(),
        companiesRes.json(),
      ]);

      setQuotes(quotesData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('quoteFavorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('Veriler güncellendi');
  }, [fetchData]);

  const toggleFavorite = useCallback((quoteId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(quoteId)) {
        newFavorites.delete(quoteId);
        toast.success('Favorilerden çıkarıldı');
      } else {
        newFavorites.add(quoteId);
        toast.success('Favorilere eklendi');
      }
      localStorage.setItem('quoteFavorites', JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  }, []);

  // Apply date preset
  useEffect(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        setStartDate(now.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'thisWeek': {
        const currentDay = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - currentDay);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - currentDay + 6);
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(weekEnd.toISOString().split('T')[0]);
        break;
      }
      case 'thisMonth': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(monthEnd.toISOString().split('T')[0]);
        break;
      }
      case 'thisYear': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        setStartDate(yearStart.toISOString().split('T')[0]);
        setEndDate(yearEnd.toISOString().split('T')[0]);
        break;
      }
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  }, [datePreset]);

  const filteredQuotes = useMemo(() => {
    let filtered = quotes.filter((quote) => {
      const matchesSearch =
        quote.quoteNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        quote.companyName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (quote.companyContactPerson && quote.companyContactPerson.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      const matchesCompany =
        companyFilter === 'all' || quote.companyId.toString() === companyFilter;
      
      // Date range filter
      let matchesDateRange = true;
      if (startDate || endDate) {
        const quoteDate = new Date(quote.issueDate);
        if (startDate) {
          matchesDateRange = matchesDateRange && quoteDate >= new Date(startDate);
        }
        if (endDate) {
          matchesDateRange = matchesDateRange && quoteDate <= new Date(endDate);
        }
      }

      return matchesSearch && matchesStatus && matchesCompany && matchesDateRange;
    });
    
    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];
        
        if (sortField === 'issueDate' || sortField === 'validUntilDate') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortField === 'total') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [quotes, debouncedSearchQuery, statusFilter, companyFilter, startDate, endDate, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotes.length / pageSize);
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredQuotes.slice(start, end);
  }, [filteredQuotes, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, companyFilter, startDate, endDate, pageSize]);

  const stats = useMemo(() => {
    const monthlyData: { [key: string]: number } = {};
    const statusByMonth: { [key: string]: { [key: string]: number } } = {};
    const companyStats: { [key: string]: { count: number; total: number; name: string } } = {};
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    quotes.forEach((q) => {
      const date = new Date(q.issueDate);
      if (date.getFullYear() === currentYear) {
        const month = date.toLocaleString('tr-TR', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
        
        if (!statusByMonth[month]) {
          statusByMonth[month] = {};
        }
        statusByMonth[month][q.status] = (statusByMonth[month][q.status] || 0) + 1;
      }
      
      // Company stats
      if (!companyStats[q.companyId]) {
        companyStats[q.companyId] = { count: 0, total: 0, name: q.companyName };
      }
      companyStats[q.companyId].count++;
      if (q.status !== 'rejected') {
        companyStats[q.companyId].total += q.total;
      }
    });

    const acceptedCount = quotes.filter((q) => q.status === 'accepted').length;
    const rejectedCount = quotes.filter((q) => q.status === 'rejected').length;
    const sentCount = quotes.filter((q) => q.status === 'sent').length;
    
    const decidedQuotes = acceptedCount + rejectedCount;
    const acceptanceRate = decidedQuotes > 0
      ? ((acceptedCount / decidedQuotes) * 100).toFixed(1)
      : '0';

    const validQuotes = quotes.filter((q) => q.status !== 'rejected');
    const averageValue = validQuotes.length > 0
      ? validQuotes.reduce((sum, q) => sum + q.total, 0) / validQuotes.length
      : 0;

    const expiringSoon = quotes.filter((q) => {
      if (q.status === 'sent') {
        const daysUntilExpiry = Math.ceil(
          (new Date(q.validUntilDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
      }
      return false;
    }).length;
    
    // This month's stats
    const thisMonthQuotes = quotes.filter(q => {
      const date = new Date(q.issueDate);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
    
    const lastMonthQuotes = quotes.filter(q => {
      const date = new Date(q.issueDate);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth - 1;
    });
    
    const monthlyGrowth = lastMonthQuotes.length > 0
      ? (((thisMonthQuotes.length - lastMonthQuotes.length) / lastMonthQuotes.length) * 100).toFixed(1)
      : '0';
    
    // Top companies
    const topCompanies = Object.values(companyStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total: quotes.length,
      draft: quotes.filter((q) => q.status === 'draft').length,
      sent: sentCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      totalValue: quotes
        .filter((q) => q.status !== 'rejected')
        .reduce((sum, q) => sum + q.total, 0),
      averageValue,
      acceptanceRate,
      monthlyData,
      statusByMonth,
      expiringSoon,
      thisMonthCount: thisMonthQuotes.length,
      monthlyGrowth,
      topCompanies,
      favoriteCount: favorites.size,
    };
  }, [quotes, favorites]);

  const hasActiveFilters = statusFilter !== 'all' || companyFilter !== 'all' || searchQuery !== '' || startDate !== '' || endDate !== '';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setCompanyFilter('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-4 h-4 ml-1" />;
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Bulk selection - Sayfa değiştiğinde seçimleri temizle
  const toggleSelectAll = useCallback(() => {
    if (selectedQuotes.size === paginatedQuotes.length && 
        paginatedQuotes.every(q => selectedQuotes.has(q.id))) {
      setSelectedQuotes(new Set());
    } else {
      const newSelected = new Set(selectedQuotes);
      paginatedQuotes.forEach(q => newSelected.add(q.id));
      setSelectedQuotes(newSelected);
    }
  }, [selectedQuotes, paginatedQuotes]);

  const toggleSelectQuote = useCallback((id: number) => {
    const newSelected = new Set(selectedQuotes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuotes(newSelected);
  }, [selectedQuotes]);

  // Sayfa değiştiğinde seçimleri temizle
  useEffect(() => {
    setSelectedQuotes(new Set());
  }, [currentPage]);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsBulkProcessing(true);
      
      const deletePromises = Array.from(selectedQuotes).map(id =>
        fetch(`/api/quotes/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedQuotes.size} teklif başarıyla silindi`);
      setQuotes(prev => prev.filter(q => !selectedQuotes.has(q.id)));
      setSelectedQuotes(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Toplu silme işlemi başarısız oldu');
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedQuotes]);

  const handleBulkStatusChange = useCallback(async () => {
    try {
      setIsBulkProcessing(true);
      
      const updatePromises = Array.from(selectedQuotes).map(id =>
        fetch(`/api/quotes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus }),
        })
      );
      
      await Promise.all(updatePromises);
      
      toast.success(`${selectedQuotes.size} teklifin durumu güncellendi`);
      await fetchData();
      setSelectedQuotes(new Set());
      setBulkStatusDialogOpen(false);
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Toplu güncelleme başarısız oldu');
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedQuotes, bulkStatus, fetchData]);

  const handleBulkEmail = useCallback(async () => {
    if (!bulkEmailData.subject || !bulkEmailData.message) {
      toast.error('Lütfen konu ve mesaj alanlarını doldurun');
      return;
    }

    try {
      setIsBulkProcessing(true);
      
      const selectedQuotesList = quotes.filter(q => selectedQuotes.has(q.id));
      const emailPromises = selectedQuotesList.map(quote =>
        fetch(`/api/quotes/${quote.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: '', // Will be handled by backend
            subject: bulkEmailData.subject,
            message: bulkEmailData.message,
          }),
        })
      );
      
      await Promise.all(emailPromises);
      
      toast.success(`${selectedQuotes.size} teklife email gönderildi`);
      setSelectedQuotes(new Set());
      setBulkEmailDialogOpen(false);
      setBulkEmailData({ subject: '', message: '' });
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast.error('Toplu email gönderimi başarısız oldu');
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedQuotes, bulkEmailData, quotes]);

  const handleDeleteClick = useCallback((quote: Quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  }, []);

  const handleViewPDF = useCallback(async (quoteId: number) => {
    const pdfWindow = typeof window !== 'undefined' ? window.open('', '_blank', 'noopener,noreferrer') : null;
    try {
      const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('app-settings') : null;
      let companyInfoParam = '';

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const companyInfo = {
            name: settings.companyName || '',
            address: settings.companyAddress || '',
            phone: settings.companyPhone || '',
            email: settings.companyEmail || '',
            logo: settings.companyLogo || undefined,
            stamp: settings.companyStamp || undefined,
          };

          companyInfoParam = `?companyInfo=${encodeURIComponent(JSON.stringify(companyInfo))}`;
        } catch (e) {
          console.error('Error parsing app-settings for PDF:', e);
        }
      }

      const url = `/api/quotes/${quoteId}/pdf${companyInfoParam}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('PDF isteği başarısız oldu');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (pdfWindow) {
        pdfWindow.location.href = blobUrl;
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `teklif-${quoteId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
      toast.success('PDF yeni sekmede açıldı');
    } catch (error) {
      console.error('Error opening PDF:', error);
      if (pdfWindow) {
        pdfWindow.close();
      }
      toast.error('PDF açılırken bir hata oluştu');
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!quoteToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/quotes/${quoteToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote');
      }

      toast.success('Teklif başarıyla silindi');
      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete.id));
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Teklif silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  }, [quoteToDelete]);

  const handleStatusChange = useCallback(async (quoteId: number, newStatus: Quote['status']) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Durum başarıyla güncellendi');
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    }
  }, []);

  const handleCopyQuote = useCallback((quote: Quote) => {
    setQuoteToCopy(quote);
    setCopyDialogOpen(true);
  }, []);

  const handleCopyConfirm = useCallback(async () => {
    if (!quoteToCopy) return;

    try {
      setIsCopying(true);
      
      // Get quote items
      const itemsRes = await fetch(`/api/quotes/${quoteToCopy.id}/items`);
      if (!itemsRes.ok) throw new Error('Failed to fetch items');
      const items = await itemsRes.json();

      // Create new quote
      const newQuoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: quoteToCopy.companyId,
          issueDate: new Date().toISOString().split('T')[0],
          validUntilDate: quoteToCopy.validUntilDate,
          notes: quoteToCopy.notes,
          status: 'draft',
        }),
      });

      if (!newQuoteRes.ok) throw new Error('Failed to create quote');
      const newQuote = await newQuoteRes.json();

      // Copy items
      for (const item of items) {
        await fetch(`/api/quotes/${newQuote.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }),
        });
      }

      toast.success('Teklif başarıyla kopyalandı');
      router.push(`/quotes/${newQuote.id}`);
    } catch (error) {
      console.error('Error copying quote:', error);
      toast.error('Teklif kopyalanırken hata oluştu');
    } finally {
      setIsCopying(false);
      setCopyDialogOpen(false);
    }
  }, [quoteToCopy, router]);

  const handleEmailQuote = useCallback((quote: Quote) => {
    setQuoteToEmail(quote);
    setEmailData({
      to: '',
      subject: `${quote.quoteNumber} - Teklif`,
      message: `Merhaba,\n\n${quote.quoteNumber} numaralı teklifimizi ekte bulabilirsiniz.\n\nİyi günler dileriz.`,
    });
    setEmailDialogOpen(true);
  }, []);

  const handleShowQR = useCallback((quote: Quote) => {
    setQuoteForQR(quote);
    setQrDialogOpen(true);
  }, []);

  const handleDownloadQR = useCallback(() => {
    if (!quoteForQR) return;

    const canvas = document.createElement('canvas');
    const svg = document.getElementById('quote-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${quoteForQR.quoteNumber}-QR.png`;
            link.click();
            toast.success('QR kod indirildi');
          }
        });
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [quoteForQR]);

  const handleSendEmail = useCallback(async () => {
    if (!quoteToEmail) return;

    try {
      setIsSendingEmail(true);
      const response = await fetch(`/api/quotes/${quoteToEmail.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Email başarıyla gönderildi');
      setEmailDialogOpen(false);
      setQuoteToEmail(null);
      
      // Update status to 'sent' if it was 'draft'
      if (quoteToEmail.status === 'draft') {
        await handleStatusChange(quoteToEmail.id, 'sent');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Email gönderilirken hata oluştu');
    } finally {
      setIsSendingEmail(false);
    }
  }, [quoteToEmail, emailData, handleStatusChange]);

  const handleExportExcel = useCallback(() => {
    const exportData = filteredQuotes.map(quote => ({
      'Teklif No': quote.quoteNumber,
      'Firma': quote.companyName,
      'İlgili Kişi': quote.companyContactPerson || '-',
      'Oluşturma Tarihi': new Date(quote.issueDate),
      'Geçerlilik Tarihi': new Date(quote.validUntilDate),
      'Kalem Sayısı': quote.itemCount,
      'Ara Toplam': Number(quote.subtotal),
      'KDV': Number(quote.tax),
      'Toplam': Number(quote.total),
      'Durum': STATUS_LABELS[quote.status],
      'Notlar': quote.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Kolon genişliklerini ayarla
    const colWidths = [
      { wch: 15 }, // Teklif No
      { wch: 25 }, // Firma
      { wch: 20 }, // İlgili Kişi
      { wch: 15 }, // Oluşturma Tarihi
      { wch: 15 }, // Geçerlilik Tarihi
      { wch: 12 }, // Kalem Sayısı
      { wch: 15 }, // Ara Toplam
      { wch: 12 }, // KDV
      { wch: 15 }, // Toplam
      { wch: 15 }, // Durum
      { wch: 30 }, // Notlar
    ];
    ws['!cols'] = colWidths;
    
    // Sayısal sütunlara para birimi formatı ekle
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Ara Toplam, KDV, Toplam sütunları (G, H, I)
      ['G', 'H', 'I'].forEach(col => {
        const cellRef = col + (R + 1);
        if (ws[cellRef]) {
          ws[cellRef].z = '#,##0.00 ₺';
          ws[cellRef].t = 'n';
        }
      });
      
      // Tarih sütunları (D, E)
      ['D', 'E'].forEach(col => {
        const cellRef = col + (R + 1);
        if (ws[cellRef]) {
          ws[cellRef].z = 'dd/mm/yyyy';
          ws[cellRef].t = 'd';
        }
      });
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
    
    const fileName = `teklifler_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success(`Excel dosyası indirildi: ${fileName}`);
  }, [filteredQuotes]);

  const getValidityStatus = useCallback((validUntilDate: string, status: string) => {
    if (status !== 'sent') return null;
    
    const now = new Date();
    const expiryDate = new Date(validUntilDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { 
        type: 'expired', 
        label: 'Süresi Doldu', 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700' 
      };
    } else if (daysUntilExpiry <= 7) {
      return { 
        type: 'expiring', 
        label: `${daysUntilExpiry} Gün Kaldı`, 
        color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700' 
      };
    }
    return null;
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Teklifler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Teklifler</h1>
          <p className="text-sm text-muted-foreground">
            Firmalara gönderilen teklifleri yönetin
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageQrDialogOpen(true)}
                className="h-9 w-9"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sayfa QR Kodu</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <Download className="w-4 h-4" />
            Excel İndir
          </Button>
          <Link href="/quotes/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Teklif Oluştur
            </Button>
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <TooltipProvider>
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="gap-2">
            <List className="w-4 h-4" />
            Genel Görünüm
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analizler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    setStatusFilter('draft');
                    setViewTab('overview');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="rounded-lg p-2 bg-gray-100 dark:bg-gray-800">
                      <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Taslaklar</div>
                      <div className="text-sm text-muted-foreground">{stats.draft} teklif</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
                  onClick={() => {
                    setStatusFilter('sent');
                    setViewTab('overview');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="rounded-lg p-2 bg-blue-100 dark:bg-blue-900">
                      <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Gönderildi</div>
                      <div className="text-sm text-muted-foreground">{stats.sent} teklif</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 hover:border-orange-500 hover:bg-orange-500/5 transition-colors"
                  onClick={() => {
                    const now = new Date();
                    const weekAhead = new Date(now);
                    weekAhead.setDate(weekAhead.getDate() + 7);
                    setStartDate(now.toISOString().split('T')[0]);
                    setEndDate(weekAhead.toISOString().split('T')[0]);
                    setStatusFilter('sent');
                    setDatePreset('all');
                    setViewTab('overview');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="rounded-lg p-2 bg-orange-100 dark:bg-orange-900">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Yaklaşan Süreler</div>
                      <div className="text-sm text-muted-foreground">{stats.expiringSoon} teklif</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 hover:border-yellow-500 hover:bg-yellow-500/5 transition-colors"
                  onClick={() => {
                    const favQuotes = quotes.filter(q => favorites.has(q.id));
                    if (favQuotes.length > 0) {
                      setSearchQuery('');
                      toast.info(`${favQuotes.length} favori teklif bulundu`);
                    } else {
                      toast.info('Henüz favori teklif yok');
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="rounded-lg p-2 bg-yellow-100 dark:bg-yellow-900">
                      <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Favoriler</div>
                      <div className="text-sm text-muted-foreground">{stats.favoriteCount} teklif</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-all duration-300 border-l-3 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Toplam Teklif</CardTitle>
                <div className="rounded-full p-1.5 bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu ay: <span className="font-semibold text-foreground">{stats.thisMonthCount}</span>
                  {Number(stats.monthlyGrowth) !== 0 && (
                    <span className={`ml-1 ${Number(stats.monthlyGrowth) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(stats.monthlyGrowth) > 0 ? '↑' : '↓'} {Math.abs(Number(stats.monthlyGrowth))}%
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-3 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Toplam Değer</CardTitle>
                <div className="rounded-full p-1.5 bg-green-500/10">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ortalama: <span className="font-semibold text-foreground">{formatCurrency(stats.averageValue)}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-3 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Kabul Oranı</CardTitle>
                <div className="rounded-full p-1.5 bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold">{stats.acceptanceRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.accepted} kabul, {stats.rejected} red
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-3 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Yaklaşan Süreler</CardTitle>
                <div className="rounded-full p-1.5 bg-orange-500/10">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold">{stats.expiringSoon}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  7 gün içinde süresi doluyor
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          {selectedQuotes.size > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedQuotes.size} teklif seçildi</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setBulkEmailDialogOpen(true)}
                      className="gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Toplu Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setBulkStatusDialogOpen(true)}
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Durum Değiştir
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Toplu Sil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtreler
                </CardTitle>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">{filteredQuotes.length} sonuç</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="gap-1 h-7 text-xs"
                  >
                    <X className="w-3 h-3" />
                    Temizle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 md:grid-cols-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Teklif no veya firma ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>

                {/* Status */}
                <div className="md:col-span-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="sent">Gönderildi</SelectItem>
                      <SelectItem value="accepted">Kabul Edildi</SelectItem>
                      <SelectItem value="rejected">Reddedildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Company */}
                <div className="md:col-span-1">
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger id="company" className="h-9">
                      <SelectValue placeholder="Firma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Firmalar</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date preset */}
                <div className="md:col-span-1">
                  <Select value={datePreset} onValueChange={setDatePreset}>
                    <SelectTrigger id="datePreset" className="h-9">
                      <SelectValue placeholder="Tarih aralığı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Tarihler</SelectItem>
                      <SelectItem value="today">Bugün</SelectItem>
                      <SelectItem value="thisWeek">Bu Hafta</SelectItem>
                      <SelectItem value="thisMonth">Bu Ay</SelectItem>
                      <SelectItem value="thisYear">Bu Yıl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="md:col-span-2 flex flex-col gap-3 md:flex-row">
                  <Input
                    id="startDate"
                    type="date"
                    placeholder="Başlangıç tarihi"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('all');
                    }}
                    className="h-9"
                  />
                  <Input
                    id="endDate"
                    type="date"
                    placeholder="Bitiş tarihi"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('all');
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotes Table/Grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teklifler</CardTitle>
                  <CardDescription>
                    {filteredQuotes.length} teklif gösteriliyor
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="gap-1"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="gap-1"
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Label htmlFor="pageSize" className="text-sm">Sayfa başına:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger id="pageSize" className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuotes.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <FileText className="w-16 h-16 mx-auto mb-2 text-muted-foreground opacity-20" />
                  {hasActiveFilters ? (
                    <>
                      <h3 className="text-lg font-semibold">Filtrelere göre teklif bulunamadı</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Farklı arama terimleri deneyebilir, tarih aralığını genişletebilir veya tüm filtreleri temizleyebilirsiniz.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1"
                        onClick={clearFilters}
                      >
                        Filtreleri Temizle
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">Henüz teklif oluşturulmamış</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Müşterilerinize özel fiyat teklifleri oluşturmak için yeni bir teklif ile başlayın.
                      </p>
                      <Link href="/quotes/new">
                        <Button className="mt-1 gap-2">
                          <Plus className="w-4 h-4" />
                          İlk Teklifi Oluştur
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedQuotes.map((quote) => {
                      const validityStatus = getValidityStatus(quote.validUntilDate, quote.status);
                      const isSelected = selectedQuotes.has(quote.id);
                      const statusVariant = quote.status === 'rejected' ? 'warning' : 'accent';
                      const validityVariant =
                        validityStatus?.type === 'expired' ? 'warning' : 'accent';
                      return (
                        <Card key={quote.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1">
                                <CardTitle className="text-lg">{quote.quoteNumber}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {quote.companyName}
                                </CardDescription>
                              </div>
                              <Button
                                variant={isSelected ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => toggleSelectQuote(quote.id)}
                                className="h-9 w-9 rounded-full p-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <div className="meta-strip mt-3">
                              <span className="meta-pill" data-variant={statusVariant}>
                                <Activity className="w-3 h-3" />
                                {STATUS_LABELS[quote.status]}
                              </span>
                              {validityStatus && (
                                <span className="meta-pill" data-variant={validityVariant}>
                                  {validityStatus.type === 'expired' ? (
                                    <AlertTriangle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {validityStatus.label}
                                </span>
                              )}
                              <span className="meta-pill">
                                <Calendar className="w-3 h-3" />
                                {formatDate(quote.issueDate)}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Toplam</span>
                              <span className="font-bold text-lg">{formatCurrency(quote.total)}</span>
                            </div>

                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Kalem Sayısı</span>
                                <span className="font-medium">{quote.itemCount} kalem</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Geçerlilik</span>
                                <span className="font-medium">{formatDate(quote.validUntilDate)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Müşteri</span>
                                <span className="font-medium">{quote.companyContactPerson || '-'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Durum</span>
                                <span className="font-medium">{STATUS_LABELS[quote.status]}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewPDF(quote.id)}
                                    className="flex-1 min-w-[110px]"
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    PDF
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>PDF Görüntüle</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleShowQR(quote)}
                                    className="flex-1 min-w-[110px]"
                                  >
                                    <QrCode className="w-4 h-4 mr-1" />
                                    QR Kod
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>QR Kod Göster</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/quotes/${quote.id}`} className="flex-1 min-w-[110px]">
                                    <Button variant="outline" size="sm" className="w-full">
                                      <Eye className="w-4 h-4 mr-1" />
                                      Detay
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Detayları Görüntüle</p>
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex-1 min-w-[110px]">
                                    <MoreVertical className="w-4 h-4 mr-1" />
                                    Daha Fazla
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEmailQuote(quote)}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Gönder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyQuote(quote)}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Kopyala
                                  </DropdownMenuItem>
                                  {quote.status === 'draft' && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/quotes/${quote.id}`}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Düzenle
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(quote)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Sil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={toggleSelectAll}
                              className="h-8 w-8 p-0"
                            >
                              {selectedQuotes.size === paginatedQuotes.length ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('quoteNumber')}
                              className="h-8 px-2 gap-1"
                            >
                              Teklif No
                              {getSortIcon('quoteNumber')}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('companyName')}
                              className="h-8 px-2 gap-1"
                            >
                              Firma
                              {getSortIcon('companyName')}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('issueDate')}
                              className="h-8 px-2 gap-1"
                            >
                              Oluşturma Tarihi
                              {getSortIcon('issueDate')}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('validUntilDate')}
                              className="h-8 px-2 gap-1"
                            >
                              Geçerlilik Tarihi
                              {getSortIcon('validUntilDate')}
                            </Button>
                          </TableHead>
                          <TableHead>Kalem Sayısı</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('total')}
                              className="h-8 px-2 gap-1"
                            >
                              Toplam
                              {getSortIcon('total')}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('status')}
                              className="h-8 px-2 gap-1"
                            >
                              Durum
                              {getSortIcon('status')}
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedQuotes.map((quote) => {
                          const validityStatus = getValidityStatus(quote.validUntilDate, quote.status);
                          const isSelected = selectedQuotes.has(quote.id);
                          return (
                            <TableRow key={quote.id} data-state={isSelected ? "selected" : undefined}>
                              <TableCell className="w-12">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSelectQuote(quote.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">{quote.quoteNumber}</TableCell>
                              <TableCell className="min-w-[220px]">
                                <div className="flex items-center gap-3">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{quote.companyName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {quote.companyContactPerson || '-'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(quote.issueDate)}</TableCell>
                              <TableCell className="min-w-[180px]">
                                <div className="flex items-center gap-2">
                                  {formatDate(quote.validUntilDate)}
                                  {validityStatus && (
                                    <Badge variant="outline" className={validityStatus.color}>
                                      {validityStatus.type === 'expired' ? (
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                      ) : (
                                        <Clock className="w-3 h-3 mr-1" />
                                      )}
                                      {validityStatus.label}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{quote.itemCount} kalem</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(quote.total)}
                              </TableCell>
                              <TableCell className="min-w-[160px]">
                                <Select
                                  value={quote.status}
                                  onValueChange={(value) => handleStatusChange(quote.id, value as Quote['status'])}
                                >
                                  <SelectTrigger className="w-36">
                                    <Badge
                                      variant="outline"
                                      className={STATUS_COLORS[quote.status]}
                                    >
                                      {STATUS_LABELS[quote.status]}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Taslak</SelectItem>
                                    <SelectItem value="sent">Gönderildi</SelectItem>
                                    <SelectItem value="accepted">Kabul Edildi</SelectItem>
                                    <SelectItem value="rejected">Reddedildi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewPDF(quote.id)}
                                    className="gap-1 h-8"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleShowQR(quote)}
                                    className="gap-1 h-8"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </Button>
                                  <Link href={`/quotes/${quote.id}`}>
                                    <Button variant="ghost" size="sm" className="gap-1 h-8">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEmailQuote(quote)}>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Email Gönder
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleCopyQuote(quote)}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Kopyala
                                      </DropdownMenuItem>
                                      {quote.status === 'draft' && (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/quotes/${quote.id}`}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Düzenle
                                          </Link>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteClick(quote)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Sil
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Sayfa {currentPage} / {totalPages} ({filteredQuotes.length} teklif)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-medium px-2">
                      {currentPage}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Analytics view */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>En Yüksek Değerli Firmalar</CardTitle>
                <CardDescription>Toplam teklif değerine göre ilk 5 firma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topCompanies.map((company, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">{company.count} teklif</p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(company.total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aylık Trend</CardTitle>
                <CardDescription>Bu yıl oluşturulan teklifler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.monthlyData).map(([month, count]) => (
                    <div key={month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{month}</span>
                        <span className="text-muted-foreground">{count} teklif</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${(count / Math.max(...Object.values(stats.monthlyData))) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performans Metrikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Ortalama Teklif Değeri</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.averageValue)}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">En Yüksek Teklif</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(Math.max(...quotes.map(q => q.total), 0))}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Ortalama Kalem Sayısı</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {(quotes.reduce((sum, q) => sum + q.itemCount, 0) / quotes.length || 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </TooltipProvider>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Sil</DialogTitle>
            <DialogDescription>
              Bu teklifi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {quoteToDelete && (
            <div className="py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Teklif No:</span>
                  <span className="text-sm font-medium">{quoteToDelete.quoteNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Firma:</span>
                  <span className="text-sm font-medium">{quoteToDelete.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Toplam:</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteToDelete.total)}</span>
                </div>
              </div>
            </div>
          )}
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
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Silme</DialogTitle>
            <DialogDescription>
              Seçili {selectedQuotes.size} teklifi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isBulkProcessing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="gap-2"
            >
              {isBulkProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {selectedQuotes.size} Teklifi Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Durum Değiştirme</DialogTitle>
            <DialogDescription>
              Seçili {selectedQuotes.size} teklifin durumunu değiştirin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulkStatus">Yeni Durum</Label>
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as Quote['status'])}>
              <SelectTrigger id="bulkStatus" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="sent">Gönderildi</SelectItem>
                <SelectItem value="accepted">Kabul Edildi</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkStatusDialogOpen(false)}
              disabled={isBulkProcessing}
            >
              İptal
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={isBulkProcessing}
              className="gap-2"
            >
              {isBulkProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              Durumu Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Toplu Email Gönder</DialogTitle>
            <DialogDescription>
              Seçili {selectedQuotes.size} teklife email gönderilecek. Her teklifin PDF'i otomatik eklenecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkEmailSubject">Konu *</Label>
              <Input
                id="bulkEmailSubject"
                placeholder="Email konusu"
                value={bulkEmailData.subject}
                onChange={(e) => setBulkEmailData({ ...bulkEmailData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkEmailMessage">Mesaj *</Label>
              <Textarea
                id="bulkEmailMessage"
                placeholder="Email mesajınız..."
                rows={6}
                value={bulkEmailData.message}
                onChange={(e) => setBulkEmailData({ ...bulkEmailData, message: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkEmailDialogOpen(false)}
              disabled={isBulkProcessing}
            >
              İptal
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={isBulkProcessing || !bulkEmailData.subject || !bulkEmailData.message}
              className="gap-2"
            >
              {isBulkProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <Mail className="w-4 h-4" />
              {selectedQuotes.size} Teklife Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Quote Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Kopyala</DialogTitle>
            <DialogDescription>
              Bu teklif tüm kalemleriyle birlikte kopyalanacak ve yeni bir taslak teklif oluşturulacak.
            </DialogDescription>
          </DialogHeader>
          {quoteToCopy && (
            <div className="py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Teklif No:</span>
                  <span className="text-sm font-medium">{quoteToCopy.quoteNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Firma:</span>
                  <span className="text-sm font-medium">{quoteToCopy.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kalem Sayısı:</span>
                  <span className="text-sm font-medium">{quoteToCopy.itemCount} kalem</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
              disabled={isCopying}
            >
              İptal
            </Button>
            <Button
              onClick={handleCopyConfirm}
              disabled={isCopying}
              className="gap-2"
            >
              {isCopying && <Loader2 className="w-4 h-4 animate-spin" />}
              Kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Quote Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Teklif Email Gönder</DialogTitle>
            <DialogDescription>
              Teklifi email ile gönderin. PDF otomatik olarak eklenecektir.
            </DialogDescription>
          </DialogHeader>
          {quoteToEmail && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emailTo">Email Adresi *</Label>
                <Input
                  id="emailTo"
                  type="email"
                  placeholder="ornek@firma.com"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Konu *</Label>
                <Input
                  id="emailSubject"
                  placeholder="Teklif konusu"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailMessage">Mesaj *</Label>
                <Textarea
                  id="emailMessage"
                  placeholder="Email mesajınız..."
                  rows={6}
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                />
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Teklif Bilgileri:</p>
                <p className="text-muted-foreground">
                  {quoteToEmail.quoteNumber} - {quoteToEmail.companyName}
                </p>
              </div>
            </div>
          )}
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

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Teklif QR Kodu
            </DialogTitle>
            <DialogDescription>
              Mobil cihazlardan teklife hızlıca erişim için QR kodu tarayın
            </DialogDescription>
          </DialogHeader>
          {quoteForQR && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                  <QRCodeSVG
                    id="quote-qr-code"
                    value={`${window.location.origin}/quotes/${quoteForQR.id}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium text-lg">{quoteForQR.quoteNumber}</p>
                  <p className="text-sm text-muted-foreground">{quoteForQR.companyName}</p>
                  <Badge variant="outline" className={STATUS_COLORS[quoteForQR.status]}>
                    {STATUS_LABELS[quoteForQR.status]}
                  </Badge>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-muted-foreground">QR kodu mobil cihazınızla tarayın</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-muted-foreground">Doğrudan teklif detayına yönlendirileceksiniz</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-muted-foreground">QR kodu indirebilir veya paylaşabilirsiniz</p>
                </div>
              </div>

              <div className="text-xs text-center text-muted-foreground font-mono break-all bg-muted/30 p-2 rounded">
                {window.location.origin}/quotes/{quoteForQR.id}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Kapat
            </Button>
            <Button
              onClick={handleDownloadQR}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              QR Kodu İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page QR Dialog */}
      <Dialog open={pageQrDialogOpen} onOpenChange={setPageQrDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Teklif Yönetimi - Sayfa QR Kodu
            </DialogTitle>
            <DialogDescription>
              Teklif yönetimi sayfasına mobil cihazlardan hızlıca erişim için QR kodu tarayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                <QRCodeSVG
                  id="page-qr-code"
                  value={`${window.location.origin}/quotes`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-lg">Teklif Yönetimi</p>
                <p className="text-sm text-muted-foreground">ISGOne AI - Teklif Listesi</p>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-muted-foreground">QR kodu mobil cihazınızla tarayın</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-muted-foreground">Teklif yönetimi sayfasına doğrudan erişin</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-muted-foreground">QR kodu indirebilir veya paylaşabilirsiniz</p>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground font-mono break-all bg-muted/30 p-2 rounded">
              {window.location.origin}/quotes
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPageQrDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Kapat
            </Button>
            <Button
              onClick={() => {
                const canvas = document.createElement('canvas');
                const svg = document.getElementById('page-qr-code');
                if (!svg) return;

                const svgData = new XMLSerializer().serializeToString(svg);
                const img = new Image();
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                img.onload = () => {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                      if (blob) {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'teklif-yonetimi-QR.png';
                        link.click();
                        toast.success('QR kod indirildi');
                      }
                    });
                  }
                  URL.revokeObjectURL(url);
                };

                img.src = url;
              }}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              QR Kodu İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}