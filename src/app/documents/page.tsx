"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Filter,
  X,
  Search,
  Loader2,
  AlertTriangle,
  FileCheck,
  Building2,
  Calendar,
  User,
  Archive,
  RefreshCw,
  Plus,
  FileWarning,
  Clock,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { exportToCSV, exportToExcel, formatForExport } from '@/lib/export-utils';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

type Document = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileType: string;
  category: string;
  companyId: number | null;
  screeningId: number | null;
  employeeId: number | null;
  expiryDate: string | null;
  uploadDate: string;
  uploadedBy: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  companyName: string | null;
  screeningDate: string | null;
  screeningType: string | null;
  employeeName: string | null;
};

type DocumentStats = {
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  expiredDocuments: number;
  expiringWithin30Days: number;
  expiredCount: number;
  recentUploads: number;
  documentsByCategory: {
    health_report: number;
    certificate: number;
    contract: number;
    identification: number;
    other: number;
  };
};

type SortField = 'title' | 'category' | 'uploadDate' | 'expiryDate' | 'fileSize';
type SortDirection = 'asc' | 'desc';

const CATEGORIES = [
  { value: 'health_report', label: 'Sağlık Raporu', color: 'bg-blue-500' },
  { value: 'certificate', label: 'Sertifika', color: 'bg-green-500' },
  { value: 'contract', label: 'Sözleşme', color: 'bg-gray-600' },
  { value: 'identification', label: 'Kimlik', color: 'bg-orange-500' },
  { value: 'other', label: 'Diğer', color: 'bg-gray-500' },
];

const STATUSES = [
  { value: 'active', label: 'Aktif', color: 'bg-green-500' },
  { value: 'archived', label: 'Arşivlenmiş', color: 'bg-gray-500' },
  { value: 'expired', label: 'Süresi Dolmuş', color: 'bg-red-500' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // NEW: Bulk category change
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('uploadDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    fileType: '',
    category: '',
    companyId: '',
    screeningId: '',
    employeeId: '',
    expiryDate: '',
    uploadedBy: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        document.getElementById('search')?.focus();
      },
    },
    {
      key: 'n',
      ctrl: true,
      callback: () => {
        setShowUploadDialog(true);
      },
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        handleRefresh();
      },
    },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const [docsRes, statsRes, companiesRes, employeesRes, screeningsRes] = await Promise.all([
        fetch(`/api/documents?${params}`),
        fetch('/api/documents/stats'),
        fetch('/api/companies?limit=1000'),
        fetch('/api/employees?limit=1000'),
        fetch('/api/screenings?limit=1000'),
      ]);

      if (!docsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [docsData, statsData, companiesData, employeesData, screeningsData] = await Promise.all([
        docsRes.json(),
        statsRes.json(),
        companiesRes.ok ? companiesRes.json() : [],
        employeesRes.ok ? employeesRes.json() : [],
        screeningsRes.ok ? screeningsRes.json() : [],
      ]);

      setDocuments(docsData);
      setStats(statsData);
      setCompanies(companiesData);
      setEmployees(employeesData);
      setScreenings(screeningsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast.success('Veriler güncellendi');
  };

  // NEW: Bulk category change handler
  const handleBulkCategoryChange = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/documents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: bulkCategory }),
          })
        )
      );

      toast.success(`${selectedIds.size} dökümanın kategorisi güncellendi`);
      setSelectedIds(new Set());
      setSelectAll(false);
      setBulkCategoryDialogOpen(false);
      setBulkCategory('');
      fetchData();
    } catch (error) {
      console.error('Error bulk updating category:', error);
      toast.error('Toplu kategori güncelleme sırasında hata oluştu');
    }
  };

  // NEW: Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`${selectedIds.size} dökümanı arşivlemek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/documents/${id}`, { method: 'DELETE' })
        )
      );

      toast.success(`${selectedIds.size} döküman arşivlendi`);
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Dökümanlar arşivlenirken hata oluştu');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu dökümanı arşivlemek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Döküman arşivlendi');
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Döküman arşivlenirken hata oluştu');
    }
  };

  // NEW: Export handlers
  const handleExportCSV = () => {
    const exportData = formatForExport(
      filteredAndSortedDocuments.map(doc => ({
        'Başlık': doc.title,
        'Dosya Adı': doc.fileName,
        'Kategori': getCategoryLabel(doc.category),
        'Firma': doc.companyName || '-',
        'Personel': doc.employeeName || '-',
        'Son Kullanma': doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('tr-TR') : '-',
        'Durum': getStatusLabel(doc.status),
        'Boyut': formatFileSize(doc.fileSize),
        'Yüklenme Tarihi': new Date(doc.uploadDate).toLocaleDateString('tr-TR'),
      }))
    );
    exportToCSV(exportData, `dokumanlar-${new Date().toISOString().split('T')[0]}`);
    toast.success('Dökümanlar CSV olarak dışa aktarıldı');
  };

  const handleExportExcel = () => {
    const exportData = formatForExport(
      filteredAndSortedDocuments.map(doc => ({
        'Başlık': doc.title,
        'Dosya Adı': doc.fileName,
        'Kategori': getCategoryLabel(doc.category),
        'Firma': doc.companyName || '-',
        'Personel': doc.employeeName || '-',
        'Son Kullanma': doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('tr-TR') : '-',
        'Durum': getStatusLabel(doc.status),
        'Boyut': formatFileSize(doc.fileSize),
        'Yüklenme Tarihi': new Date(doc.uploadDate).toLocaleDateString('tr-TR'),
      }))
    );
    exportToExcel(exportData, `dokumanlar-${new Date().toISOString().split('T')[0]}`);
    toast.success('Dökümanlar Excel olarak dışa aktarıldı');
  };

  // NEW: Toggle selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === filteredAndSortedDocuments.length);
  };

  // NEW: Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(filteredAndSortedDocuments.map(doc => doc.id)));
      setSelectAll(true);
    }
  };

  // NEW: Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.fileUrl || !formData.fileName || !formData.fileType || !formData.category) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        fileUrl: formData.fileUrl,
        fileName: formData.fileName,
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : null,
        fileType: formData.fileType,
        category: formData.category,
        companyId: formData.companyId ? parseInt(formData.companyId) : null,
        screeningId: formData.screeningId ? parseInt(formData.screeningId) : null,
        employeeId: formData.employeeId ? parseInt(formData.employeeId) : null,
        expiryDate: formData.expiryDate || null,
        uploadedBy: formData.uploadedBy || null,
      };

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      toast.success('Döküman başarıyla yüklendi');
      setShowUploadDialog(false);
      setFormData({
        title: '',
        description: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        fileType: '',
        category: '',
        companyId: '',
        screeningId: '',
        employeeId: '',
        expiryDate: '',
        uploadedBy: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error((error as Error).message || 'Döküman yüklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.employeeName?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'uploadDate' || sortField === 'expiryDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortField === 'fileSize') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortField === 'title' || sortField === 'category') {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, searchTerm, sortField, sortDirection]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.label || status;
  };

  const getStatusColor = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.color || 'bg-gray-500';
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  };

  // NEW: Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-3">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Döküman Yönetimi</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Sağlık raporları, sertifikalar ve dökümanlar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Döküman
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>N
            </kbd>
          </Button>

          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </Button>

          {/* Export buttons */}
          <Button variant="outline" onClick={handleExportCSV} className="gap-2" disabled={filteredAndSortedDocuments.length === 0}>
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="outline" onClick={handleExportExcel} className="gap-2" disabled={filteredAndSortedDocuments.length === 0}>
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          {/* NEW: Bulk action buttons */}
          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary" className="gap-1">
                {selectedIds.size} seçili
              </Badge>
              <Button
                variant="outline"
                onClick={() => setBulkCategoryDialogOpen(true)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Kategori Değiştir
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Sil ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Döküman</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeDocuments} aktif
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Süre Dolacak</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.expiringWithin30Days}</div>
              <p className="text-xs text-muted-foreground mt-1">30 gün içinde</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Süresi Dolmuş</CardTitle>
              <FileWarning className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Güncelleme gerekli</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Son 7 Gün</CardTitle>
              <Upload className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUploads}</div>
              <p className="text-xs text-muted-foreground mt-1">Yeni yükleme</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Döküman, firma, personel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {STATUSES.map((stat) => (
                    <SelectItem key={stat.value} value={stat.value}>
                      {stat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dökümanlar</CardTitle>
              <CardDescription>
                {filteredAndSortedDocuments.length} döküman listeleniyor
                {selectedIds.size > 0 && ` (${selectedIds.size} seçili)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Tümünü seç"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-transparent"
                        onClick={() => handleSort('title')}
                      >
                        Döküman
                        {renderSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-transparent"
                        onClick={() => handleSort('category')}
                      >
                        Kategori
                        {renderSortIcon('category')}
                      </Button>
                    </TableHead>
                    <TableHead>Firma/Personel</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-transparent"
                        onClick={() => handleSort('expiryDate')}
                      >
                        Son Kullanma
                        {renderSortIcon('expiryDate')}
                      </Button>
                    </TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-transparent"
                        onClick={() => handleSort('fileSize')}
                      >
                        Boyut
                        {renderSortIcon('fileSize')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Döküman bulunamadı</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedDocuments.map((doc) => (
                      <TableRow 
                        key={doc.id}
                        className={selectedIds.has(doc.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(doc.id)}
                            onCheckedChange={() => toggleSelection(doc.id)}
                            aria-label={`Select ${doc.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {doc.title}
                              {isExpiringSoon(doc.expiryDate) && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                              {isExpired(doc.expiryDate) && (
                                <FileWarning className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{doc.fileName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(doc.category)}>
                            {getCategoryLabel(doc.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {doc.companyName && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {doc.companyName}
                              </div>
                            )}
                            {doc.employeeName && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doc.employeeName}
                              </div>
                            )}
                            {!doc.companyName && !doc.employeeName && '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? (
                            <div className="text-sm">
                              {new Date(doc.expiryDate).toLocaleDateString('tr-TR')}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(doc.status)} text-white border-0`}
                          >
                            {getStatusLabel(doc.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Döküman Detayları</DialogTitle>
            <DialogDescription>Döküman bilgileri ve detayları</DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Başlık</Label>
                  <p className="font-medium">{selectedDocument.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kategori</Label>
                  <p className="font-medium">{getCategoryLabel(selectedDocument.category)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dosya Adı</Label>
                  <p className="font-medium text-sm">{selectedDocument.fileName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Boyut</Label>
                  <p className="font-medium">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Yüklenme Tarihi</Label>
                  <p className="font-medium">
                    {new Date(selectedDocument.uploadDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Son Kullanma</Label>
                  <p className="font-medium">
                    {selectedDocument.expiryDate
                      ? new Date(selectedDocument.expiryDate).toLocaleDateString('tr-TR')
                      : '-'}
                  </p>
                </div>
                {selectedDocument.companyName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Firma</Label>
                    <p className="font-medium">{selectedDocument.companyName}</p>
                  </div>
                )}
                {selectedDocument.employeeName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Personel</Label>
                    <p className="font-medium">{selectedDocument.employeeName}</p>
                  </div>
                )}
              </div>
              {selectedDocument.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Açıklama</Label>
                  <p className="text-sm">{selectedDocument.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Kapat
            </Button>
            {selectedDocument && (
              <Button onClick={() => window.open(selectedDocument.fileUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                İndir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Döküman Yükle</DialogTitle>
            <DialogDescription>
              Döküman bilgilerini doldurun ve kaydedin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Döküman başlığı"
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Döküman açıklaması"
                  rows={3}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="fileUrl">Dosya URL *</Label>
                <Input
                  id="fileUrl"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="https://example.com/file.pdf"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileName">Dosya Adı *</Label>
                <Input
                  id="fileName"
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                  placeholder="dokuman.pdf"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileType">Dosya Tipi *</Label>
                <Input
                  id="fileType"
                  value={formData.fileType}
                  onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                  placeholder="application/pdf"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileSize">Dosya Boyutu (bytes)</Label>
                <Input
                  id="fileSize"
                  type="number"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  placeholder="1024000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId">Firma</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="companyId">
                    <SelectValue placeholder="Firma seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screeningId">Tarama</Label>
                <Select
                  value={formData.screeningId}
                  onValueChange={(value) => setFormData({ ...formData, screeningId: value })}
                >
                  <SelectTrigger id="screeningId">
                    <SelectValue placeholder="Tarama seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {screenings.map((screening) => (
                      <SelectItem key={screening.id} value={screening.id.toString()}>
                        {screening.participantName} - {new Date(screening.date).toLocaleDateString('tr-TR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Son Kullanma Tarihi</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uploadedBy">Yükleyen</Label>
                <Input
                  id="uploadedBy"
                  value={formData.uploadedBy}
                  onChange={(e) => setFormData({ ...formData, uploadedBy: e.target.value })}
                  placeholder="Yükleyen kişi"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Yükle
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NEW: Bulk Category Change Dialog */}
      <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Kategori Değişikliği</DialogTitle>
            <DialogDescription>
              {selectedIds.size} dökümanın kategorisini değiştirmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Yeni Kategori</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCategoryDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleBulkCategoryChange} disabled={!bulkCategory}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}