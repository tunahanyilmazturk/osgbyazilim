"use client";

import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, Phone, Mail, User, MapPin, Loader2, ChevronRight, Search, TrendingUp, Grid3x3, List, SortAsc, Calendar, Pencil, Trash2, Download, Printer, FileSpreadsheet, Upload, Users, FileText, X, ArrowUpDown, ArrowUp, ArrowDown, Copy, CheckCircle2, XCircle, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import * as XLSX from 'xlsx';

type Company = {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  companyCode?: string;
  notes?: string;
  createdAt: string;
};

type ViewMode = 'grid' | 'list';
type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';
type SortDirection = 'asc' | 'desc';

type ExcelCompany = {
  name: string;
  companyCode?: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes?: string;
  error?: string;
  warnings?: string[];
};

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; company: string; error: string }>;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [excelData, setExcelData] = useState<ExcelCompany[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    companyCode: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    notes: '',
  });

  // NEW: Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        const searchInput = document.querySelector('input[placeholder="Firma ara..."]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: 'n',
      ctrl: true,
      callback: () => {
        setIsOpen(true);
      },
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        fetchCompanies();
      },
    },
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/companies?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Firmalar yüklenemedi');
      }

      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Error fetching companies:', error);
      toast.error('Firmalar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const deferredCompanies = useDeferredValue(companies);

  // Sort companies (filtering handled mostly server-side via search)
  const filteredAndSortedCompanies = useMemo(() => {
    const sorted = [...deferredCompanies];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'tr');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'tr');
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [deferredCompanies, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = deferredCompanies.filter((c) => {
      const created = new Date(c.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const thisWeek = deferredCompanies.filter((c) => {
      const created = new Date(c.createdAt);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return created >= weekAgo;
    }).length;

    const withNotes = deferredCompanies.filter(c => c.notes && c.notes.trim().length > 0).length;

    return {
      total: deferredCompanies.length,
      thisMonth,
      thisWeek,
      withNotes,
    };
  }, [deferredCompanies]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation (Turkish format)
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s-()]/g, '');
    return cleaned.length >= 10 && /^[0-9+]+$/.test(cleaned);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!validateEmail(formData.email)) {
        throw new Error('Geçersiz e-posta adresi');
      }
      if (!validatePhone(formData.phone)) {
        throw new Error('Geçersiz telefon numarası');
      }

      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Firma eklenemedi');
      }

      const newCompany = await response.json();
      setCompanies([newCompany, ...companies]);
      setFormData({ name: '', companyCode: '', address: '', contactPerson: '', phone: '', email: '', notes: '' });
      setIsOpen(false);
      toast.success('Firma başarıyla eklendi');
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Firma eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, companies]);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSubmitting(true);

    try {
      // Validation
      if (!validateEmail(formData.email)) {
        throw new Error('Geçersiz e-posta adresi');
      }
      if (!validatePhone(formData.phone)) {
        throw new Error('Geçersiz telefon numarası');
      }

      const response = await fetch(`/api/companies?id=${selectedCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Firma güncellenemedi');
      }

      const updatedCompany = await response.json();
      setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      setIsEditOpen(false);
      setSelectedCompany(null);
      toast.success('Firma başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error instanceof Error ? error.message : 'Firma güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedCompany, companies]);

  const handleDelete = useCallback(async () => {
    if (!selectedCompany) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/companies?id=${selectedCompany.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Firma silinemedi');
      }

      setCompanies(companies.filter(c => c.id !== selectedCompany.id));
      setIsDeleteOpen(false);
      setSelectedCompany(null);
      toast.success('Firma başarıyla silindi');
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error instanceof Error ? error.message : 'Firma silinirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCompany, companies]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCompanies.size === 0) return;
    setIsSubmitting(true);

    try {
      const ids = Array.from(selectedCompanies);
      const idsSet = new Set(selectedCompanies);
      const deletePromises = ids.map((id) =>
        fetch(`/api/companies?id=${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter(r => !r.ok).length;

      if (failedCount > 0) {
        toast.error(`${failedCount} firma silinemedi`);
      } else {
        toast.success(`${ids.length} firma başarıyla silindi`);
      }

      setCompanies(companies.filter(c => !idsSet.has(c.id)));
      setSelectedCompanies(new Set());
      setIsBulkDeleteOpen(false);
    } catch (error) {
      console.error('Error bulk deleting companies:', error);
      toast.error('Firmalar silinirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCompanies, companies]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const openEditDialog = useCallback((company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      companyCode: company.companyCode || '',
      address: company.address,
      contactPerson: company.contactPerson,
      phone: company.phone,
      email: company.email,
      notes: company.notes || '',
    });
    setIsEditOpen(true);
  }, []);

  const openDeleteDialog = useCallback((company: Company) => {
    setSelectedCompany(company);
    setIsDeleteOpen(true);
  }, []);

  const handleCopyCompany = useCallback((company: Company) => {
    setFormData({
      name: `${company.name} (Kopya)`,
      companyCode: company.companyCode ? `${company.companyCode}-COPY` : '',
      address: company.address,
      contactPerson: company.contactPerson,
      phone: company.phone,
      email: company.email,
      notes: company.notes || '',
    });
    setIsOpen(true);
    toast.success('Firma bilgileri kopyalandı');
  }, []);

  const toggleCompanySelection = useCallback((id: number) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedCompanies((prev) => {
      if (prev.size === filteredAndSortedCompanies.length) {
        return new Set();
      }
      return new Set(filteredAndSortedCompanies.map((c) => c.id));
    });
  }, [filteredAndSortedCompanies]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setSortBy(prev => {
      if (prev.includes('name')) return prev.includes('asc') ? 'name-desc' : 'name-asc';
      return prev.includes('asc') ? 'date-desc' : 'date-asc';
    });
  }, []);

  // Excel Import Functions
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error('Excel dosyası boş veya geçersiz');
          return;
        }

        const rows = jsonData.slice(1);

        const parsedData: ExcelCompany[] = rows
          .filter(row => row.some(cell => cell))
          .map((row, index) => {
            const company: ExcelCompany = {
              name: String(row[0] || '').trim(),
              companyCode: String(row[1] || '').trim(),
              address: String(row[2] || '').trim(),
              contactPerson: String(row[3] || '').trim(),
              phone: String(row[4] || '').trim(),
              email: String(row[5] || '').trim(),
              notes: String(row[6] || '').trim(),
              warnings: [],
            };

            // Validation
            if (!company.name) {
              company.error = `Satır ${index + 2}: Firma adı zorunludur`;
            } else if (!company.address) {
              company.error = `Satır ${index + 2}: Adres zorunludur`;
            } else if (!company.contactPerson) {
              company.error = `Satır ${index + 2}: Yetkili kişi zorunludur`;
            } else if (!company.phone) {
              company.error = `Satır ${index + 2}: Telefon zorunludur`;
            } else if (!company.email) {
              company.error = `Satır ${index + 2}: E-posta zorunludur`;
            } else {
              // Additional validations
              if (!validateEmail(company.email)) {
                company.warnings?.push('Geçersiz e-posta formatı');
              }
              if (!validatePhone(company.phone)) {
                company.warnings?.push('Geçersiz telefon formatı');
              }
              // Check for duplicates
              const duplicate = companies.find(c => 
                c.email.toLowerCase() === company.email.toLowerCase() ||
                c.name.toLowerCase() === company.name.toLowerCase()
              );
              if (duplicate) {
                company.warnings?.push('Benzer firma mevcut');
              }
            }

            return company;
          });

        setExcelData(parsedData);

        const errorCount = parsedData.filter(c => c.error).length;
        const warningCount = parsedData.filter(c => c.warnings && c.warnings.length > 0).length;
        
        if (errorCount > 0) {
          toast.warning(`${parsedData.length} firma yüklendi, ${errorCount} hata, ${warningCount} uyarı`);
        } else if (warningCount > 0) {
          toast.warning(`${parsedData.length} firma yüklendi, ${warningCount} uyarı var`);
        } else {
          toast.success(`${parsedData.length} firma başarıyla yüklendi`);
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Dosya işlenirken hata oluştu');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input
    e.target.value = '';
  }, [companies]);

  const handleBulkImport = useCallback(async () => {
    const validData = excelData.filter(c => !c.error);
    if (validData.length === 0) {
      toast.error('Eklenecek geçerli firma yok');
      return;
    }

    setIsSubmitting(true);
    setImportProgress(0);

    const result: ImportResult = {
      total: validData.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const batchSize = 5;
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);
        const promises = batch.map(async (company, batchIndex) => {
          try {
            // Check if company exists by email or name
            const existingCompany = companies.find(c => 
              c.email.toLowerCase() === company.email.toLowerCase() ||
              (c.name.toLowerCase() === company.name.toLowerCase() && 
               c.address.toLowerCase() === company.address.toLowerCase())
            );

            let response;
            if (existingCompany) {
              // UPDATE existing company
              response = await fetch(`/api/companies?id=${existingCompany.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(company),
              });
            } else {
              // CREATE new company
              response = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(company),
              });
            }

            if (response.ok) {
              result.success++;
              return { data: await response.json(), isUpdate: !!existingCompany };
            } else {
              result.failed++;
              const error = await response.json();
              result.errors.push({
                row: i + batchIndex + 2,
                company: company.name,
                error: error.error || 'Bilinmeyen hata',
              });
              return null;
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + batchIndex + 2,
              company: company.name,
              error: error instanceof Error ? error.message : 'Bilinmeyen hata',
            });
            return null;
          }
        });

        const batchResults = await Promise.all(promises);
        const validResults = batchResults.filter(r => r !== null);
        
        if (validResults.length > 0) {
          // Update state with both new and updated companies
          setCompanies(prev => {
            const updated = [...prev];
            validResults.forEach(result => {
              if (result.isUpdate) {
                // Update existing company in array
                const index = updated.findIndex(c => c.id === result.data.id);
                if (index !== -1) {
                  updated[index] = result.data;
                }
              } else {
                // Add new company to beginning
                updated.unshift(result.data);
              }
            });
            return updated;
          });
        }

        setImportProgress(Math.round(((i + batch.length) / validData.length) * 100));
      }

      setImportResult(result);
      setExcelData([]);
      setIsOpen(false);
      setIsUploadDialogOpen(false);
      setIsResultOpen(true);

      if (result.failed === 0) {
        toast.success(`${result.success} firma başarıyla işlendi`);
      } else {
        toast.warning(`${result.success} firma işlendi, ${result.failed} başarısız`);
      }
      
      // Refresh the full list
      await fetchCompanies();
    } catch (error) {
      console.error('Error importing companies:', error);
      toast.error('Firmalar eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
      setImportProgress(0);
    }
  }, [excelData, companies, fetchCompanies]);

  const downloadTemplate = useCallback(() => {
    const headers = ['Firma Adı *', 'Firma Kodu', 'Adres *', 'Yetkili Kişi *', 'Telefon *', 'E-posta *', 'Notlar'];
    
    // Add existing companies to template
    const companyRows = companies.map(c => [
      c.name,
      c.companyCode || '',
      c.address,
      c.contactPerson,
      c.phone,
      c.email,
      c.notes || ''
    ]);

    // Add example rows if no companies exist
    const exampleRows = companies.length === 0 ? [
      ['Acme İnşaat A.Ş.', 'ACM-001', 'Atatürk Cad. No:123, Ankara', 'Mehmet Yılmaz', '0312 555 0001', 'info@acme.com', 'İnşaat sektörü'],
      ['Beta Tekstil Ltd.', 'BET-002', 'İnönü Bulvarı No:45, İstanbul', 'Ayşe Demir', '0212 555 0002', 'iletisim@beta.com', 'Tekstil üretimi'],
      ['Gamma Gıda A.Ş.', 'GAM-003', 'Cumhuriyet Meydanı No:78, İzmir', 'Ali Kaya', '0232 555 0003', 'info@gamma.com', 'Gıda sektörü'],
    ] : [];

    const template = [headers, ...companyRows, ...exampleRows];

    const ws = XLSX.utils.aoa_to_sheet(template);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Firmalar');
    
    // Add timestamp to filename
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `firma_sablonu_${timestamp}.xlsx`);
    
    if (companies.length > 0) {
      toast.success(`✅ Şablon indirildi! ${companies.length} mevcut firma Excel'e eklendi.`, {
        description: 'Şablondaki firmaları düzenleyebilir veya yeni firmalar ekleyebilirsiniz.',
        duration: 5000,
      });
    } else {
      toast.success('Şablon indirildi (Örnek firmalar dahil)');
    }
  }, [companies]);

  const exportToCSV = useCallback(() => {
    const headers = ['Firma Adı', 'Firma Kodu', 'Adres', 'Yetkili Kişi', 'Telefon', 'E-posta', 'Notlar', 'Kayıt Tarihi'];
    const rows = filteredAndSortedCompanies.map(c => [
      c.name,
      c.companyCode || '',
      c.address,
      c.contactPerson,
      c.phone,
      c.email,
      c.notes || '',
      new Date(c.createdAt).toLocaleDateString('tr-TR')
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `firmalar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV dosyası indirildi');
  }, [filteredAndSortedCompanies]);

  const exportToExcel = useCallback(() => {
    const data = filteredAndSortedCompanies.map(c => ({
      'Firma Adı': c.name,
      'Firma Kodu': c.companyCode || '',
      'Adres': c.address,
      'Yetkili Kişi': c.contactPerson,
      'Telefon': c.phone,
      'E-posta': c.email,
      'Notlar': c.notes || '',
      'Kayıt Tarihi': new Date(c.createdAt).toLocaleDateString('tr-TR'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Firmalar');
    XLSX.writeFile(wb, `firmalar_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel dosyası indirildi');
  }, [filteredAndSortedCompanies]);

  const handlePrint = useCallback(() => {
    window.print();
    toast.success('Yazdırma hazırlandı');
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 md:gap-4 p-3 md:p-4 lg:p-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="p-3 md:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <Skeleton className="h-10 w-full mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-9 w-16" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="p-4 md:p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 md:gap-4 p-3 md:p-4 lg:p-6 bg-linear-to-b from-background via-background to-muted/50">
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90">Firmalar</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Sağlık taraması hizmeti verdiğiniz firmaları yönetin
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="md:size-default border-border/70 hover:border-primary/60 hover:bg-primary/5"
            onClick={fetchCompanies}
          >
            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Yenile
            <kbd className="hidden sm:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>R
            </kbd>
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="md:size-default gap-2">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                Yeni Firma Ekle
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>N
                </kbd>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Firma Ekle</DialogTitle>
                <DialogDescription>
                  Firma bilgilerini girerek yeni müşteri ekleyin veya Excel dosyasından toplu yükleyin
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/60 border border-border/70">
                  <TabsTrigger value="manual">
                    <FileText className="w-4 h-4 mr-2" />
                    Manuel Ekle
                  </TabsTrigger>
                  <TabsTrigger value="excel">
                    <Upload className="w-4 h-4 mr-2" />
                    Toplu Yükle
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Firma Adı *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            placeholder="Örn: Acme İnşaat A.Ş."
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="companyCode">Firma Kodu</Label>
                          <Input
                            id="companyCode"
                            value={formData.companyCode}
                            onChange={(e) => handleFormChange('companyCode', e.target.value)}
                            placeholder="Örn: ACM-001"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="address">Adres *</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleFormChange('address', e.target.value)}
                          placeholder="Örn: Atatürk Cad. No:123, Ankara"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactPerson">Yetkili Kişi *</Label>
                        <Input
                          id="contactPerson"
                          value={formData.contactPerson}
                          onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                          placeholder="Örn: Mehmet Yılmaz"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Telefon *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleFormChange('phone', e.target.value)}
                            placeholder="Örn: 0312 555 0001"
                            required
                            autoComplete="tel"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">E-posta *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange('email', e.target.value)}
                            placeholder="Örn: info@firma.com"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notlar</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleFormChange('notes', e.target.value)}
                          placeholder="Firma hakkında notlar..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          'Firma Ekle'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>

                <TabsContent value="excel" className="space-y-4">
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium mb-1">📥 Excel Dosyasından Toplu Yükle</h4>
                        <p className="text-xs text-muted-foreground">
                          .xlsx veya .xls formatında dosya yükleyin
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Şablon İndir
                      </Button>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-muted/20">
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="excel-upload"
                      />
                      <Label
                        htmlFor="excel-upload"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="p-4 bg-primary/10 rounded-full">
                          <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium block mb-1">Dosya Seç veya Sürükle Bırak</span>
                          <span className="text-xs text-muted-foreground">
                            Excel (.xlsx, .xls) formatında toplu firma listesi
                          </span>
                        </div>
                      </Label>
                    </div>

                    {excelData.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">
                              📋 Önizleme ({excelData.length} firma)
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {excelData.filter(c => !c.error).length} geçerli, {excelData.filter(c => c.error).length} hatalı, {excelData.filter(c => c.warnings && c.warnings.length > 0 && !c.error).length} uyarı
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExcelData([])}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Temizle
                          </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted sticky top-0 z-10">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                                  <th className="px-3 py-2 text-left font-medium">Durum</th>
                                  <th className="px-3 py-2 text-left font-medium">Firma Adı</th>
                                  <th className="px-3 py-2 text-left font-medium">Kod</th>
                                  <th className="px-3 py-2 text-left font-medium">Yetkili</th>
                                  <th className="px-3 py-2 text-left font-medium">Telefon</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {excelData.map((company, index) => (
                                  <tr
                                    key={index}
                                    className={company.error ? 'bg-destructive/10' : company.warnings && company.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'hover:bg-muted/50'}
                                  >
                                    <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                                    <td className="px-3 py-2">
                                      {company.error ? (
                                        <XCircle className="w-4 h-4 text-destructive" />
                                      ) : company.warnings && company.warnings.length > 0 ? (
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div>
                                        {company.name || '-'}
                                        {company.error && (
                                          <p className="text-xs text-destructive mt-1">{company.error}</p>
                                        )}
                                        {company.warnings && company.warnings.length > 0 && !company.error && (
                                          <p className="text-xs text-yellow-600 mt-1">{company.warnings.join(', ')}</p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{company.companyCode || '-'}</td>
                                    <td className="px-3 py-2">{company.contactPerson || '-'}</td>
                                    <td className="px-3 py-2">{company.phone || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {isSubmitting && importProgress > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Firmalar ekleniyor...</span>
                              <span className="font-medium">{importProgress}%</span>
                            </div>
                            <Progress value={importProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={isSubmitting || excelData.length === 0 || excelData.every(c => c.error)}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Ekleniyor... {importProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {excelData.filter(c => !c.error).length} Firma Ekle
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCompanies.size > 0 && (
        <Card className="border border-primary/40 bg-primary/5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardContent className="py-2 md:py-3 px-3 md:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <Checkbox
                  checked={selectedCompanies.size === filteredAndSortedCompanies.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs md:text-sm font-medium">
                  {selectedCompanies.size} firma seçildi
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Toplu Sil</span>
                  <span className="sm:hidden">Sil</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompanies(new Set())}
                >
                  İptal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Toplam Firma</CardTitle>
            <Building2 className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Kayıtlı müşteri firması
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Bu Ay Eklenen</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Son 30 gündeki yeni firma
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Bu Hafta</CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-foreground/80" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Son 7 gündeki yeni firma
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Notlu Firmalar</CardTitle>
            <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.withNotes}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Ek bilgi içeren kayıtlar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder="Firma ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm md:text-base h-9 md:h-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 text-xs md:text-sm border-border/70">
                  <SortAsc className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">En Yeni</SelectItem>
                  <SelectItem value="date-asc">En Eski</SelectItem>
                  <SelectItem value="name-asc">İsim (A-Z)</SelectItem>
                  <SelectItem value="name-desc">İsim (Z-A)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="border-border/70"
                onClick={toggleSortDirection}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-3 w-3 md:h-4 md:w-4" />
                ) : (
                  <ArrowDown className="h-3 w-3 md:h-4 md:w-4" />
                )}
              </Button>

              <div className="flex border border-border/70 rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="border-border/70" onClick={exportToCSV} title="CSV İndir">
                <Download className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-border/70" onClick={exportToExcel} title="Excel İndir">
                <FileSpreadsheet className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-border/70" onClick={() => setIsUploadDialogOpen(true)} title="Excel Yükle">
                <Upload className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="outline" size="sm" className="print:hidden border-border/70" onClick={handlePrint} title="Yazdır">
                <Printer className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>

            {searchQuery && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {filteredAndSortedCompanies.length} sonuç bulundu
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-6 px-2 text-xs"
                >
                  Temizle
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      {filteredAndSortedCompanies.length === 0 ? (
        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 p-6">
            <Building2 className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mb-3 md:mb-4 opacity-20" />
            {searchQuery.trim() !== '' ? (
              <>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  Arama kriterlerinize göre firma bulunamadı
                </h3>
                <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6">
                  Farklı bir arama deneyebilir veya filtreleri temizleyebilirsiniz.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="md:size-default"
                  onClick={() => setSearchQuery('')}
                >
                  Filtreleri Temizle
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  Henüz firma eklenmemiş
                </h3>
                <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6">
                  Müşteri firmalarınızı ekleyerek başlayın.
                </p>
                <Button onClick={() => setIsOpen(true)} size="sm" className="md:size-default">
                  <Plus className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  İlk Firmayı Ekle
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCompanies.map((company) => (
            <Card key={company.id} className="border border-border/60 hover:border-primary/50 shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-lg transition-all h-full relative group">
              {selectedCompanies.size > 0 && (
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={selectedCompanies.has(company.id)}
                    onCheckedChange={() => toggleCompanySelection(company.id)}
                  />
                </div>
              )}
              <Link href={`/companies/${company.id}`} className="block">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">{company.name}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-2 mt-1">
                          {company.companyCode && (
                            <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                              {company.companyCode}
                            </Badge>
                          )}
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(company.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{company.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                      <span>{company.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                      <span>{company.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                    {company.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          📝 {company.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Link>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCopyCompany(company);
                    }}
                    title="Kopyala"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      openEditDialog(company);
                    }}
                    title="Düzenle"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      openDeleteDialog(company);
                    }}
                    title="Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {filteredAndSortedCompanies.map((company) => (
            <Card key={company.id} className="border border-border/60 hover:border-primary/50 shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-md transition-all relative group">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    {selectedCompanies.size > 0 && (
                      <Checkbox
                        checked={selectedCompanies.has(company.id)}
                        onCheckedChange={() => toggleCompanySelection(company.id)}
                      />
                    )}
                    <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg shrink-0">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <Link href={`/companies/${company.id}`} className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <h3 className="font-semibold text-sm md:text-base truncate">{company.name}</h3>
                        {company.companyCode && (
                          <Badge variant="outline" className="text-xs font-mono w-fit">
                            {company.companyCode}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs shrink-0 w-fit">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(company.createdAt).toLocaleDateString('tr-TR')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-1 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{company.contactPerson}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{company.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{company.email}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{company.address}</span>
                        </div>
                      </div>
                      {company.notes && (
                        <p className="text-xs text-muted-foreground mt-1 md:mt-2 line-clamp-1">
                          📝 {company.notes}
                        </p>
                      )}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 print:hidden shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyCompany(company)}
                      title="Kopyala"
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(company)}
                      title="Düzenle"
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(company)}
                      title="Sil"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0 hidden sm:block" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {filteredAndSortedCompanies.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 px-2 py-3 border rounded-md bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Sayfa <span className="font-semibold">{page}</span>
            </span>
            <div className="flex items-center gap-1">
              <span>Sayfa başı:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[80px] px-2 py-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredAndSortedCompanies.length < pageSize || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Firma Düzenle</DialogTitle>
            <DialogDescription>
              Firma bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Firma Adı *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-companyCode">Firma Kodu</Label>
                  <Input
                    id="edit-companyCode"
                    value={formData.companyCode}
                    onChange={(e) => handleFormChange('companyCode', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Adres *</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contactPerson">Yetkili Kişi *</Label>
                <Input
                  id="edit-contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefon *</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-posta *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notlar</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firmayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedCompany?.name}</strong> firmasını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Sil'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Seçili <strong>{selectedCompanies.size} firmayı</strong> silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Hepsini Sil'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Result Dialog */}
      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Toplu Yükleme Raporu</DialogTitle>
            <DialogDescription>
              İşlem tamamlandı. Sonuçları aşağıda görebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                      <p className="text-xs text-muted-foreground mt-1">Toplam</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                      <p className="text-xs text-muted-foreground mt-1">Başarılı</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                      <p className="text-xs text-muted-foreground mt-1">Başarısız</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Hatalar:</h4>
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    <div className="divide-y">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="p-3 text-sm">
                          <div className="font-medium">Satır {error.row}: {error.company}</div>
                          <div className="text-xs text-destructive mt-1">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsResultOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel'den Toplu Firma Yükle</DialogTitle>
            <DialogDescription>
              Excel dosyasından toplu firma ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium mb-1">📥 Excel Dosyasından Toplu Yükle</h4>
                <p className="text-xs text-muted-foreground">
                  .xlsx veya .xls formatında dosya yükleyin
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="border-border/70 hover:border-primary/60 hover:bg-primary/5"
              >
                <Download className="w-4 h-4 mr-2" />
                Şablon İndir
              </Button>
            </div>

            <div className="border-2 border-dashed border-border/70 rounded-lg p-8 text-center hover:border-primary/60 transition-colors bg-muted/20">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload-toolbar"
              />
              <Label
                htmlFor="excel-upload-toolbar"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium block mb-1">Dosya Seç veya Sürükle Bırak</span>
                  <span className="text-xs text-muted-foreground">
                    Excel (.xlsx, .xls) formatında toplu firma listesi
                  </span>
                </div>
              </Label>
            </div>

            {excelData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">
                      📋 Önizleme ({excelData.length} firma)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {excelData.filter(c => !c.error).length} geçerli, {excelData.filter(c => c.error).length} hatalı, {excelData.filter(c => c.warnings && c.warnings.length > 0 && !c.error).length} uyarı
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExcelData([])}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Temizle
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium w-12">#</th>
                          <th className="px-3 py-2 text-left font-medium">Durum</th>
                          <th className="px-3 py-2 text-left font-medium">Firma Adı</th>
                          <th className="px-3 py-2 text-left font-medium">Kod</th>
                          <th className="px-3 py-2 text-left font-medium">Yetkili</th>
                          <th className="px-3 py-2 text-left font-medium">Telefon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {excelData.map((company, index) => (
                          <tr
                            key={index}
                            className={company.error ? 'bg-destructive/10' : company.warnings && company.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'hover:bg-muted/50'}
                          >
                            <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                            <td className="px-3 py-2">
                              {company.error ? (
                                <XCircle className="w-4 h-4 text-destructive" />
                              ) : company.warnings && company.warnings.length > 0 ? (
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div>
                                {company.name || '-'}
                                {company.error && (
                                  <p className="text-xs text-destructive mt-1">{company.error}</p>
                                )}
                                {company.warnings && company.warnings.length > 0 && !company.error && (
                                  <p className="text-xs text-yellow-600 mt-1">{company.warnings.join(', ')}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{company.companyCode || '-'}</td>
                            <td className="px-3 py-2">{company.contactPerson || '-'}</td>
                            <td className="px-3 py-2">{company.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {isSubmitting && importProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Firmalar ekleniyor...</span>
                      <span className="font-medium">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleBulkImport}
              disabled={isSubmitting || excelData.length === 0 || excelData.every(c => c.error)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ekleniyor... {importProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {excelData.filter(c => !c.error).length} Firma Ekle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}