"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { TestTube, Plus, Edit, Trash2, Loader2, Upload, X, Search, SortAsc, SortDesc, Copy, Download, FileSpreadsheet, FileText, Printer, TrendingUp, DollarSign, CheckSquare, XSquare, FileUp, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type HealthTest = {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  price: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BulkTestRow = {
  id: string;
  name: string;
  price: string;
  code: string;
};

export default function HealthTestsPage() {
  const [tests, setTests] = useState<HealthTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<HealthTest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [filePreviewData, setFilePreviewData] = useState<BulkTestRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [bulkAddTab, setBulkAddTab] = useState<'manual' | 'file'>('manual');
  const [detailTest, setDetailTest] = useState<HealthTest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Selection states
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [priceRangeMin, setPriceRangeMin] = useState('');
  const [priceRangeMax, setPriceRangeMax] = useState('');

  // Inline price editing states
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    price: '',
    isActive: true,
  });

  const [bulkRows, setBulkRows] = useState<BulkTestRow[]>([
    { id: '1', name: '', price: '', code: '' }
  ]);

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        document.getElementById('search-tests')?.focus();
      },
    },
    {
      key: 'n',
      ctrl: true,
      callback: () => {
        handleOpenDialog();
      },
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        fetchTests();
      },
    },
  ]);

  const fetchTests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/health-tests?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Testler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleOpenDialog = useCallback((test?: HealthTest) => {
    if (test) {
      setSelectedTest(test);
      setFormData({
        name: test.name,
        description: test.description || '',
        code: test.code || '',
        price: test.price !== null ? test.price.toString() : '',
        isActive: test.isActive,
      });
    } else {
      setSelectedTest(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        price: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedTest(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      price: '',
      isActive: true,
    });
  }, []);

  const handleCopyTest = useCallback((test: HealthTest) => {
    setSelectedTest(null);
    setFormData({
      name: `${test.name} (Kopya)`,
      description: test.description || '',
      code: test.code || '',
      price: test.price !== null ? test.price.toString() : '',
      isActive: test.isActive,
    });
    setIsDialogOpen(true);
    toast.info('Test kopyalandı, düzenleyip kaydedin');
  }, []);

  const handleOpenDetailDialog = useCallback((test: HealthTest) => {
    setDetailTest(test);
    setIsDetailDialogOpen(true);
  }, []);

  const handleCloseDetailDialog = useCallback(() => {
    setIsDetailDialogOpen(false);
    setDetailTest(null);
  }, []);

  const handleOpenBulkDialog = useCallback(() => {
    setBulkRows([{ id: '1', name: '', price: '', code: '' }]);
    setIsBulkDialogOpen(true);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const header = ['Test Adı *', 'Test Kodu', 'Fiyat (TRY)', 'Açıklama'];

    // Mevcut testleri satırlara dönüştür (boş ise sadece örnek satırlar kullanılır)
    const existingRows = tests.map((test) => [
      test.name,
      test.code || '',
      test.price !== null ? test.price.toFixed(2) : '',
      test.description || '',
    ]);

    const exampleRows = existingRows.length
      ? []
      : [
          ['EKG', 'EKG-001', '150.00', 'Elektrokardiyografi testi'],
          ['Kan Tahlili', 'KAN-001', '200.00', 'Tam kan sayımı'],
          ['Odyometri', 'ODY-001', '180.00', 'İşitme testi'],
        ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...existingRows, ...exampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Testler');

    // Set column widths
    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 },
    ];
    XLSX.writeFile(wb, 'saglik-testleri-ornek-sablonu.xlsx');
    toast.success('Örnek şablon indirildi');
  }, [tests]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessingFile(true);
    setFileErrors([]);
    setFilePreviewData([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let rows: any[] = [];

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = new TextDecoder('utf-8').decode(data as ArrayBuffer);
          const lines = text.split('\n').filter(line => line.trim());
          
          // Skip header
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            if (values[0]) {
              rows.push({
                name: values[0] || '',
                code: values[1] || '',
                price: values[2] || '',
                description: values[3] || '',
              });
            }
          }
        } else {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Skip header row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row[0]) {
              rows.push({
                name: String(row[0] || '').trim(),
                code: String(row[1] || '').trim(),
                price: String(row[2] || '').trim(),
                description: String(row[3] || '').trim(),
              });
            }
          }
        }

        // Validate and create preview data
        const errors: string[] = [];
        const previewData: BulkTestRow[] = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2; // +2 because we skip header and Excel rows start at 1

          if (!row.name) {
            errors.push(`Satır ${rowNum}: Test adı boş olamaz`);
            return;
          }

          if (row.price) {
            const priceValue = parseFloat(row.price.toString().replace(',', '.'));
            if (isNaN(priceValue) || priceValue < 0) {
              errors.push(`Satır ${rowNum}: Geçersiz fiyat "${row.price}"`);
            }
          }

          previewData.push({
            id: String(index + 1),
            name: row.name,
            code: row.code,
            price: row.price,
          });
        });

        if (previewData.length === 0) {
          errors.push('Dosyada geçerli test verisi bulunamadı');
        }

        setFilePreviewData(previewData);
        setFileErrors(errors);

        if (errors.length === 0) {
          toast.success(`${previewData.length} test başarıyla yüklendi`);
        } else if (previewData.length > 0) {
          toast.warning(`${previewData.length} test yüklendi, ${errors.length} hata var`);
        } else {
          toast.error('Dosya işlenirken hata oluştu');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Dosya işlenirken hata oluştu. Lütfen dosya formatını kontrol edin.');
        setFileErrors(['Dosya formatı geçersiz veya okunamıyor']);
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      toast.error('Dosya okunamadı');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileImportSubmit = useCallback(async () => {
    if (filePreviewData.length === 0) {
      toast.error('Yüklenecek test bulunamadı');
      return;
    }

    if (fileErrors.length > 0) {
      toast.error('Lütfen önce hataları düzeltin');
      return;
    }

    try {
      setIsSubmitting(true);

      const promises = filePreviewData.map(row => {
        const name = row.name.trim();
        const code = row.code.trim();
        const price = row.price ? parseFloat(row.price.toString().replace(',', '.')) : null;

        // Mevcut testlerden kod veya isim eşleşen var mı?
        const existing = tests.find(t =>
          (code && t.code && t.code.trim().toLowerCase() === code.toLowerCase()) ||
          t.name.trim().toLowerCase() === name.toLowerCase()
        );

        const baseBody = {
          name,
          // Dosyada açıklama kolonunu tutmuyoruz, mevcut açıklamayı koru
          description: existing ? existing.description : null,
          code: code || null,
          price,
          isActive: existing ? existing.isActive : true,
        };

        if (existing) {
          // Güncelleme (PUT)
          return fetch(`/api/health-tests/${existing.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(baseBody),
          });
        }

        // Yeni kayıt (POST)
        return fetch('/api/health-tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(baseBody),
        });
      });

      const results = await Promise.allSettled(promises);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        toast.success(`${successCount} test başarıyla eklendi${failCount > 0 ? `, ${failCount} test eklenemedi` : ''}`);
      } else {
        toast.error('Testler eklenirken hata oluştu');
      }

      handleCloseBulkDialog();
      fetchTests();
    } catch (error) {
      console.error('Error importing tests:', error);
      toast.error('Toplu test eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [filePreviewData, fileErrors, fetchTests, tests]);

  const handleCloseBulkDialog = useCallback(() => {
    setIsBulkDialogOpen(false);
    setBulkRows([{ id: '1', name: '', price: '', code: '' }]);
    setUploadedFile(null);
    setFilePreviewData([]);
    setFileErrors([]);
    setBulkAddTab('manual');
  }, []);

  const handleAddBulkRow = useCallback(() => {
    const newId = (Math.max(...bulkRows.map(r => parseInt(r.id))) + 1).toString();
    setBulkRows(prev => [...prev, { id: newId, name: '', price: '', code: '' }]);
  }, [bulkRows]);

  const handleRemoveBulkRow = useCallback((id: string) => {
    if (bulkRows.length === 1) {
      toast.error('En az bir test satırı olmalıdır');
      return;
    }
    setBulkRows(prev => prev.filter(row => row.id !== id));
  }, [bulkRows]);

  const handleBulkRowChange = useCallback((id: string, field: 'name' | 'price' | 'code', value: string) => {
    setBulkRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  }, []);

  const handleBulkSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const testsToAdd: Array<{
      name: string;
      code: string | null;
      price: number | null;
      isActive: boolean;
    }> = [];

    const errors: string[] = [];

    bulkRows.forEach((row, index) => {
      const name = row.name.trim();
      
      if (!name) {
        errors.push(`Satır ${index + 1}: Test adı boş olamaz`);
        return;
      }

      let price: number | null = null;

      if (row.price.trim()) {
        const priceValue = parseFloat(row.price);
        if (isNaN(priceValue) || priceValue < 0) {
          errors.push(`Satır ${index + 1}: Geçersiz fiyat "${row.price}"`);
          return;
        }
        price = priceValue;
      }

      testsToAdd.push({
        name,
        code: row.code.trim() || null,
        price,
        isActive: true,
      });
    });

    if (errors.length > 0) {
      toast.error(
        <div>
          <div className="font-semibold">Hatalar bulundu:</div>
          {errors.slice(0, 3).map((err, i) => (
            <div key={i} className="text-sm">{err}</div>
          ))}
          {errors.length > 3 && <div className="text-sm">... ve {errors.length - 3} hata daha</div>}
        </div>
      );
      return;
    }

    if (testsToAdd.length === 0) {
      toast.error('En az bir geçerli test girmelisiniz');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const promises = testsToAdd.map(test => 
        fetch('/api/health-tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: test.name,
            description: null,
            code: test.code,
            price: test.price,
            isActive: test.isActive,
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        toast.success(`${successCount} test başarıyla eklendi${failCount > 0 ? `, ${failCount} test eklenemedi` : ''}`);
      } else {
        toast.error('Testler eklenirken hata oluştu');
      }

      handleCloseBulkDialog();
      fetchTests();
    } catch (error) {
      console.error('Error bulk adding tests:', error);
      toast.error('Toplu test eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [bulkRows, handleCloseBulkDialog, fetchTests]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Test adı zorunludur');
      return;
    }

    if (formData.price && formData.price.trim() !== '') {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue < 0) {
        toast.error('Geçerli bir fiyat girin');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      const url = selectedTest 
        ? `/api/health-tests/${selectedTest.id}`
        : '/api/health-tests';
      
      const method = selectedTest ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          code: formData.code.trim() || null,
          price: formData.price && formData.price.trim() !== '' ? parseFloat(formData.price) : null,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save test');
      }

      toast.success(selectedTest ? 'Test güncellendi' : 'Test eklendi');
      handleCloseDialog();
      fetchTests();
    } catch (error) {
      console.error('Error saving test:', error);
      toast.error('Test kaydedilirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedTest, handleCloseDialog, fetchTests]);

  const handleDeleteClick = useCallback((test: HealthTest) => {
    setSelectedTest(test);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTest) return;

    try {
      const response = await fetch(`/api/health-tests/${selectedTest.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete test');

      toast.success('Test silindi');
      setIsDeleteDialogOpen(false);
      setSelectedTest(null);
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Test silinirken hata oluştu');
    }
  }, [selectedTest, fetchTests]);

  const handleFormChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectTest = useCallback((testId: number, checked: boolean) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(testId);
      } else {
        next.delete(testId);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedTestIds.size === 0) {
      toast.error('Lütfen silinecek testleri seçin');
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  }, [selectedTestIds]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedTestIds.size === 0) return;

    try {
      const promises = Array.from(selectedTestIds).map(id =>
        fetch(`/api/health-tests/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        toast.success(`${successCount} test silindi${failCount > 0 ? `, ${failCount} test silinemedi` : ''}`);
      } else {
        toast.error('Testler silinirken hata oluştu');
      }

      setSelectedTestIds(new Set());
      setIsBulkDeleteDialogOpen(false);
      fetchTests();
    } catch (error) {
      console.error('Error bulk deleting tests:', error);
      toast.error('Toplu silme işlemi başarısız');
    }
  }, [selectedTestIds, fetchTests]);

  const handleBulkActivate = useCallback(async (isActive: boolean) => {
    if (selectedTestIds.size === 0) {
      toast.error('Lütfen güncellenecek testleri seçin');
      return;
    }

    try {
      const promises = Array.from(selectedTestIds).map(async (id) => {
        const test = tests.find(t => t.id === id);
        if (!test) return;

        return fetch(`/api/health-tests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: test.name,
            description: test.description,
            code: test.code,
            price: test.price,
            isActive,
          }),
        });
      });

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (successCount > 0) {
        toast.success(`${successCount} test ${isActive ? 'aktif' : 'pasif'} yapıldı`);
      } else {
        toast.error('Testler güncellenirken hata oluştu');
      }

      setSelectedTestIds(new Set());
      fetchTests();
    } catch (error) {
      console.error('Error bulk updating tests:', error);
      toast.error('Toplu güncelleme başarısız');
    }
  }, [selectedTestIds, tests, fetchTests]);

  // Inline price editing handlers
  const handlePriceClick = useCallback((test: HealthTest) => {
    setEditingPriceId(test.id);
    setEditingPriceValue(test.price !== null ? test.price.toString() : '');
  }, []);

  const handlePriceChange = useCallback((value: string) => {
    setEditingPriceValue(value);
  }, []);

  const handlePriceSave = useCallback(async (testId: number) => {
    if (editingPriceValue.trim() !== '') {
      const priceValue = parseFloat(editingPriceValue);
      if (isNaN(priceValue) || priceValue < 0) {
        toast.error('Geçerli bir fiyat girin');
        return;
      }
    }

    try {
      setIsSavingPrice(true);
      
      const test = tests.find(t => t.id === testId);
      if (!test) return;

      const response = await fetch(`/api/health-tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: test.name,
          description: test.description,
          code: test.code,
          price: editingPriceValue.trim() !== '' ? parseFloat(editingPriceValue) : null,
          isActive: test.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update price');
      }

      toast.success('Fiyat güncellendi');
      setEditingPriceId(null);
      setEditingPriceValue('');
      fetchTests();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Fiyat güncellenirken hata oluştu');
    } finally {
      setIsSavingPrice(false);
    }
  }, [editingPriceValue, tests, fetchTests]);

  const handlePriceCancel = useCallback(() => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  }, []);

  const handlePriceKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, testId: number) => {
    if (e.key === 'Enter') {
      handlePriceSave(testId);
    } else if (e.key === 'Escape') {
      handlePriceCancel();
    }
  }, [handlePriceSave, handlePriceCancel]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriceRangeMin('');
    setPriceRangeMax('');
    setSortBy('name');
    setSortOrder('asc');
    toast.info('Filtreler temizlendi');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // Filtered and sorted tests
  const filteredAndSortedTests = useMemo(() => {
    let filtered = tests;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(test => 
        test.name.toLowerCase().includes(query) ||
        (test.code && test.code.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(test => test.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(test => !test.isActive);
    }

    // Apply price range filter
    if (priceRangeMin || priceRangeMax) {
      const min = priceRangeMin ? parseFloat(priceRangeMin) : 0;
      const max = priceRangeMax ? parseFloat(priceRangeMax) : Infinity;
      
      filtered = filtered.filter(test => {
        if (test.price === null) return false;
        return test.price >= min && test.price <= max;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'tr');
          break;
        case 'price':
          const priceA = a.price ?? 0;
          const priceB = b.price ?? 0;
          comparison = priceA - priceB;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tests, searchQuery, statusFilter, sortBy, sortOrder, priceRangeMin, priceRangeMax]);

  // Memoized stats
  const stats = useMemo(() => {
    const testsWithPrice = tests.filter(t => t.price !== null);
    const totalValue = testsWithPrice.reduce((sum, t) => sum + (t.price || 0), 0);
    const avgPrice = testsWithPrice.length > 0 ? totalValue / testsWithPrice.length : 0;
    const prices = testsWithPrice.map(t => t.price!).sort((a, b) => a - b);

    return {
      total: tests.length,
      active: tests.filter(t => t.isActive).length,
      inactive: tests.filter(t => !t.isActive).length,
      avgPrice,
      totalValue,
      minPrice: prices.length > 0 ? prices[0] : 0,
      maxPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
      withPrice: testsWithPrice.length,
    };
  }, [tests]);

  // Selection handlers that depend on filteredAndSortedTests
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTestIds(new Set(filteredAndSortedTests.map(t => t.id)));
    } else {
      setSelectedTestIds(new Set());
    }
  }, [filteredAndSortedTests]);

  // Export handlers that depend on filteredAndSortedTests
  const handleExportCSV = useCallback(() => {
    try {
      setIsExporting(true);
      const headers = ['Test Adı', 'Test Kodu', 'Fiyat', 'Durum', 'Oluşturma Tarihi'];
      const rows = filteredAndSortedTests.map(test => [
        test.name,
        test.code || '-',
        test.price !== null ? test.price.toFixed(2) : '-',
        test.isActive ? 'Aktif' : 'Pasif',
        new Date(test.createdAt).toLocaleDateString('tr-TR'),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `saglik-testleri-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('CSV dosyası indirildi');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('CSV dışa aktarma başarısız');
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedTests]);

  const handleExportExcel = useCallback(() => {
    try {
      setIsExporting(true);
      
      const headers = ['Test Adı', 'Test Kodu', 'Açıklama', 'Fiyat', 'Durum', 'Oluşturma Tarihi', 'Güncelleme Tarihi'];
      const rows = filteredAndSortedTests.map(test => [
        test.name,
        test.code || '-',
        test.description || '-',
        test.price !== null ? test.price.toFixed(2) + ' TL' : '-',
        test.isActive ? 'Aktif' : 'Pasif',
        new Date(test.createdAt).toLocaleDateString('tr-TR'),
        new Date(test.updatedAt).toLocaleDateString('tr-TR'),
      ]);

      let html = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>Sağlık Testleri Raporu</h2>
            <p>Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
            <br>
            <p><strong>Toplam Test Sayısı:</strong> ${stats.total}</p>
            <p><strong>Aktif Test Sayısı:</strong> ${stats.active}</p>
            <p><strong>Pasif Test Sayısı:</strong> ${stats.inactive}</p>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `saglik-testleri-${new Date().toISOString().split('T')[0]}.xls`;
      link.click();

      toast.success('Excel dosyası indirildi');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Excel dışa aktarma başarısız');
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedTests, stats]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  }, []);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priceRangeMin || priceRangeMax;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-3">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-9 w-24" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-8 rounded" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24 mt-2" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 p-3 md:p-4 lg:p-6 bg-linear-to-b from-background via-background to-muted/40">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90">Sağlık Testleri</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Aktif testleri yönetin, yeni test ekleyin veya toplu içe aktarın
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleOpenBulkDialog} className="border-border/70 hover:border-primary/60 hover:bg-primary/5">
            <Upload className="w-4 h-4 mr-2" />
            Toplu Ekle
          </Button>
          <Button onClick={() => handleOpenDialog()} className="shadow-sm shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Test
            <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>N
            </kbd>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/70 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Test</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} aktif, {stats.inactive} pasif
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Fiyat</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.withPrice} testte fiyat mevcut
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Değer</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tüm testlerin toplam değeri
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiyat Aralığı</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.minPrice > 0 ? formatCurrency(stats.minPrice) : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En yüksek: {stats.maxPrice > 0 ? formatCurrency(stats.maxPrice) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTestIds.size > 0 && (
        <Card className="border border-primary/40 bg-card/70 shadow-[0_20px_45px_-30px_rgba(64,17,109,0.4)]">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-sm">
                  {selectedTestIds.size} test seçildi
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTestIds(new Set())}
                >
                  Seçimi Temizle
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkActivate(true)}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Aktif Yap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkActivate(false)}
                >
                  <XSquare className="w-4 h-4 mr-2" />
                  Pasif Yap
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Toplu Sil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests List */}
      <Card className="border border-border/70 bg-card/70">
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <div>
              <CardTitle>Test Listesi</CardTitle>
              <CardDescription>
                Tüm sağlık testlerini görüntüleyin ve yönetin
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExporting || tests.length === 0}
                className="border-border/70"
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || tests.length === 0}
                className="border-border/70"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={tests.length === 0}
                className="border-border/70"
              >
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-tests"
                  placeholder="Test adı veya kodu ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[160px] border-border/70">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Testler</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[160px] border-border/70">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">İsme Göre</SelectItem>
                  <SelectItem value="price">Fiyata Göre</SelectItem>
                  <SelectItem value="date">Tarihe Göre</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
                title={sortOrder === 'asc' ? 'Artan sırada' : 'Azalan sırada'}
                className="border-border/70"
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="priceMin" className="text-xs">Min Fiyat (TRY)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={priceRangeMin}
                    onChange={(e) => setPriceRangeMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax" className="text-xs">Max Fiyat (TRY)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="∞"
                    value={priceRangeMax}
                    onChange={(e) => setPriceRangeMax(e.target.value)}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="border-border/70" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Filtreleri Temizle
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Badge variant="secondary" className="text-sm">
                {filteredAndSortedTests.length} test gösteriliyor
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Henüz test eklenmemiş</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                İlk Testi Ekle
              </Button>
            </div>
          ) : filteredAndSortedTests.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Arama kriterlerine uygun test bulunamadı</p>
              <Button 
                variant="outline" 
                onClick={clearFilters} 
                className="mt-4 border-border/70"
              >
                Filtreleri Temizle
              </Button>
            </div>
          ) : (
            filteredAndSortedTests.length === 0 ? (
              <div className="border rounded-md p-8 text-center space-y-3">
                <p className="text-muted-foreground">
                  Bu filtrelerle eşleşen sağlık testi bulunamadı.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Filtreleri Temizle
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/60 shadow-[0_20px_45px_-30px_rgba(64,17,109,0.4)]">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTestIds.size === filteredAndSortedTests.length && filteredAndSortedTests.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Test Adı</TableHead>
                        <TableHead>Kod</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTestIds.has(test.id)}
                              onCheckedChange={(checked) => handleSelectTest(test.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <TestTube className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex items-start gap-2">
                                <div>
                                  <div className="font-medium">{test.name}</div>
                                  {test.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      {test.description}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                                  onClick={() => handleOpenDetailDialog(test)}
                                  title="Detayları görüntüle"
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {test.code ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {test.code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingPriceId === test.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingPriceValue}
                                  onChange={(e) => handlePriceChange(e.target.value)}
                                  onKeyDown={(e) => handlePriceKeyDown(e, test.id)}
                                  onBlur={() => handlePriceSave(test.id)}
                                  disabled={isSavingPrice}
                                  autoFocus
                                  className="w-32 h-8"
                                />
                                {isSavingPrice && (
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handlePriceClick(test)}
                                className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                                title="Fiyatı düzenlemek için tıklayın"
                              >
                                {test.price !== null ? (
                                  formatCurrency(test.price)
                                ) : (
                                  <span className="text-muted-foreground text-sm">Fiyat ekle</span>
                                )}
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={test.isActive ? 'default' : 'secondary'}
                            >
                              {test.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyTest(test)}
                                title="Kopyala"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(test)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(test)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y">
                  {filteredAndSortedTests.map((test) => (
                    <div key={test.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTestIds.has(test.id)}
                          onCheckedChange={(checked) => handleSelectTest(test.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <TestTube className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate">{test.name}</h3>
                                {test.code && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {test.code}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
                                onClick={() => handleOpenDetailDialog(test)}
                                title="Detayları görüntüle"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {test.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {test.description}
                              </p>
                            )}
                            {editingPriceId === test.id ? (
                              <div className="mt-2 flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingPriceValue}
                                  onChange={(e) => handlePriceChange(e.target.value)}
                                  onKeyDown={(e) => handlePriceKeyDown(e, test.id)}
                                  onBlur={() => handlePriceSave(test.id)}
                                  disabled={isSavingPrice}
                                  autoFocus
                                  className="w-24 h-7 text-xs"
                                />
                                {isSavingPrice && (
                                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handlePriceClick(test)}
                                className="mt-2 text-sm font-medium hover:text-primary transition-colors"
                                title="Fiyatı düzenlemek için tıklayın"
                              >
                                {test.price !== null ? (
                                  formatCurrency(test.price)
                                ) : (
                                  <span className="text-muted-foreground text-xs">Fiyat ekle</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end pt-2 border-t gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyTest(test)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(test)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(test)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Test Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDetailDialog();
      }}>
        <DialogContent className="border border-border/70 bg-card/80 backdrop-blur-2xl shadow-[0_30px_90px_-40px_rgba(64,17,109,0.7)]">
          <DialogHeader>
            <DialogTitle>{detailTest?.name || 'Test Detayı'}</DialogTitle>
            {detailTest?.code && (
              <DialogDescription>
                Kod: <span className="font-mono">{detailTest.code}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          {detailTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Durum</span>
                  <div className="mt-1">
                    <Badge variant={detailTest.isActive ? 'default' : 'secondary'}>
                      {detailTest.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Fiyat</span>
                  <div className="mt-1">
                    {detailTest.price !== null ? (
                      <span>{detailTest.price.toFixed(2)} TL</span>
                    ) : (
                      <span className="text-muted-foreground">Tanımlı değil</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Oluşturma Tarihi</span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(detailTest.createdAt).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Güncelleme Tarihi</span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(detailTest.updatedAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground text-sm">Açıklama</span>
                <div className="mt-1 text-sm bg-muted/60 rounded-md p-3 min-h-[60px]">
                  {detailTest.description && detailTest.description.trim().length > 0
                    ? detailTest.description
                    : <span className="text-muted-foreground">Açıklama girilmemiş</span>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl border border-border/70 bg-card/85 backdrop-blur-2xl shadow-[0_35px_95px_-45px_rgba(64,17,109,0.75)]">
          <DialogHeader>
            <DialogTitle>
              {selectedTest ? 'Test Düzenle' : 'Yeni Test Ekle'}
            </DialogTitle>
            <DialogDescription>
              Sağlık testi bilgilerini girin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Test Adı *</Label>
                  <Input
                    id="name"
                    placeholder="Örn: EKG, Odyometri"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="code">Test Kodu</Label>
                  <Input
                    id="code"
                    placeholder="Örn: EKG-001"
                    value={formData.code}
                    onChange={(e) => handleFormChange('code', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  placeholder="Test hakkında kısa açıklama..."
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Varsayılan Fiyat (TRY)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Örn: 150.00"
                  value={formData.price}
                  onChange={(e) => handleFormChange('price', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Teklif oluştururken bu fiyat otomatik yüklenecektir
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Aktif Durum</Label>
                  <p className="text-sm text-muted-foreground">
                    Test randevularda seçilebilir olsun mu?
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleFormChange('isActive', checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={handleCloseBulkDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col border border-border/70 bg-card/90 backdrop-blur-2xl shadow-[0_40px_110px_-50px_rgba(64,17,109,0.8)]">
          <DialogHeader>
            <DialogTitle>Toplu Test Ekle</DialogTitle>
            <DialogDescription>
              Excel/CSV dosyasından yükleyin veya manuel olarak girin
            </DialogDescription>
          </DialogHeader>

          <Tabs value={bulkAddTab} onValueChange={(v) => setBulkAddTab(v as 'manual' | 'file')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted/40 p-1">
              <TabsTrigger value="file" className="rounded-2xl data-[state=active]:bg-card/80 data-[state=active]:text-foreground">
                <FileUp className="w-4 h-4 mr-2" />
                Dosyadan Yükle
              </TabsTrigger>
              <TabsTrigger value="manual" className="rounded-2xl data-[state=active]:bg-card/80 data-[state=active]:text-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Manuel Ekle
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="flex-1 flex flex-col overflow-hidden mt-4">
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Excel veya CSV Dosyası Yükleyin</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test listesini içeren Excel (.xlsx) veya CSV (.csv) dosyanızı seçin
                  </p>
                  
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isProcessingFile}
                    >
                      {isProcessingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Dosya Seç
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Örnek Şablon İndir
                    </Button>
                  </div>

                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {uploadedFile && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm">
                      <FileSpreadsheet className="w-4 h-4" />
                      {uploadedFile.name}
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setFilePreviewData([]);
                          setFileErrors([]);
                        }}
                        className="ml-1 hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* File Format Info */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Dosya Formatı:</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>İlk satır başlık olmalı: Test Adı, Test Kodu, Fiyat, Açıklama</li>
                      <li>Test Adı alanı zorunludur (diğer alanlar opsiyonel)</li>
                      <li>Fiyat sayısal değer olmalıdır (örn: 150.00)</li>
                      <li>CSV dosyaları virgül ile ayrılmış olmalıdır</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Errors */}
                {fileErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Dosyada hatalar bulundu:</div>
                      <ul className="text-xs space-y-0.5 list-disc list-inside">
                        {fileErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {fileErrors.length > 5 && (
                          <li>... ve {fileErrors.length - 5} hata daha</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview Table */}
                {filePreviewData.length > 0 && (
                  <div className="border rounded-2xl border-border/60">
                    <div className="bg-muted px-4 py-2 font-medium text-sm">
                      Önizleme ({filePreviewData.length} test)
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium">#</th>
                            <th className="px-4 py-2 text-left text-xs font-medium">Test Adı</th>
                            <th className="px-4 py-2 text-left text-xs font-medium">Test Kodu</th>
                            <th className="px-4 py-2 text-left text-xs font-medium">Fiyat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filePreviewData.map((row, index) => (
                            <tr key={row.id} className="border-b text-sm">
                              <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                              <td className="px-4 py-2">{row.name}</td>
                              <td className="px-4 py-2">
                                {row.code ? (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {row.code}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {row.price ? `${row.price} TL` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseBulkDialog}
                  disabled={isSubmitting}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleFileImportSubmit}
                  disabled={isSubmitting || filePreviewData.length === 0 || fileErrors.length > 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ekleniyor...
                    </>
                  ) : (
                    `${filePreviewData.length} Test Ekle`
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="flex-1 flex flex-col overflow-hidden mt-4">
              <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-3">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_140px_140px_48px] gap-3 px-1 text-sm font-medium text-muted-foreground">
                      <div>Test Adı *</div>
                      <div>Test Kodu</div>
                      <div>Fiyat (TRY)</div>
                      <div></div>
                    </div>

                    {/* Table Rows */}
                    {bulkRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-[1fr_140px_140px_48px] gap-3 items-start">
                        <Input
                          placeholder={`Test ${index + 1} adını girin`}
                          value={row.name}
                          onChange={(e) => handleBulkRowChange(row.id, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Kod"
                          value={row.code}
                          onChange={(e) => handleBulkRowChange(row.id, 'code', e.target.value)}
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => handleBulkRowChange(row.id, 'price', e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBulkRow(row.id)}
                          disabled={bulkRows.length === 1}
                          className="h-10 w-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Add Row Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBulkRow}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Yeni Satır Ekle
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">💡 İpuçları:</p>
                      <p>• Test adı her satır için zorunludur</p>
                      <p>• Test kodu ve fiyat alanlarını boş bırakabilirsiniz</p>
                      <p>• Tüm testler aktif olarak eklenecektir</p>
                      <p>• Satır eklemek için "Yeni Satır Ekle" butonunu kullanın</p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseBulkDialog}
                    disabled={isSubmitting}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      `${bulkRows.filter(r => r.name.trim()).length} Test Ekle`
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-border/70 bg-card/90 backdrop-blur-2xl shadow-[0_30px_80px_-45px_rgba(64,17,109,0.7)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Test Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedTest?.name}</strong> testini silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="border border-border/70 bg-card/90 backdrop-blur-2xl shadow-[0_30px_80px_-45px_rgba(64,17,109,0.7)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Seçili <strong>{selectedTestIds.size} testi</strong> silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm}>
              Toplu Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}