"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, FileSpreadsheet, Calendar, Building2, Filter, Loader2, TrendingUp, Activity, Users, CheckCircle2, XCircle, UserX, BarChart3, PieChart as PieChartIcon, Printer, X, TrendingDown, ArrowUpDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

type Company = {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
};

type Screening = {
  id: number;
  companyId: number;
  participantName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  employeeCount: number;
  type: 'periodic' | 'initial' | 'special';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  createdAt: string;
};

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
  'no-show': '#f97316',
};

const TYPE_COLORS = {
  periodic: '#8b5cf6',
  initial: '#06b6d4',
  special: '#ec4899',
};

const STATUS_LABELS = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  'no-show': 'Gelmedi',
};

const TYPE_LABELS = {
  periodic: 'Periyodik',
  initial: 'İşe Giriş',
  special: 'Özel',
};

// jsPDF varsayılan fontu Türkçe karakterleri tam desteklemediği için
// PDF içine yazmadan önce metinleri basit Latin karakterlere dönüştürüyoruz.
function normalizePdfText(text: string): string {
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
}

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [reportType, setReportType] = useState<'all' | 'company' | 'monthly' | 'status'>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'p',
      ctrl: true,
      callback: () => {
        handlePrint();
      },
    },
    {
      key: 'e',
      ctrl: true,
      callback: () => {
        generateExcelReport();
      },
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        fetchData();
      },
    },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesRes, screeningsRes] = await Promise.all([
        fetch('/api/companies?limit=1000'),
        fetch('/api/screenings?limit=1000'),
      ]);

      if (!companiesRes.ok || !screeningsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [companiesData, screeningsData] = await Promise.all([
        companiesRes.json(),
        screeningsRes.json(),
      ]);

      setCompanies(companiesData);
      setScreenings(screeningsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickDateRange = (range: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay();
        start.setDate(today.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start.setMonth(today.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(today.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastYear':
        start.setFullYear(today.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(today.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const clearFilters = () => {
    setSelectedCompany('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setDateRange({ start: '', end: '' });
    setReportType('all');
  };

  const getFilteredScreenings = () => {
    let filtered = [...screenings];

    // Company filter
    if (selectedCompany && selectedCompany !== 'all') {
      filtered = filtered.filter(s => s.companyId === parseInt(selectedCompany));
    }

    // Status filter
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }

    // Type filter
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter(s => s.type === selectedType);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(s => new Date(s.date) <= new Date(dateRange.end));
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'company') {
        const companyA = companies.find(c => c.id === a.companyId)?.name || '';
        const companyB = companies.find(c => c.id === b.companyId)?.name || '';
        comparison = companyA.localeCompare(companyB, 'tr');
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredScreenings = useMemo(() => getFilteredScreenings(), [
    screenings,
    selectedCompany,
    selectedStatus,
    selectedType,
    dateRange,
    sortBy,
    sortOrder,
    companies,
  ]);

  const hasActiveFilters =
    selectedCompany !== 'all' ||
    selectedStatus !== 'all' ||
    selectedType !== 'all' ||
    !!dateRange.start ||
    !!dateRange.end;

  const totalPages = Math.max(1, Math.ceil(filteredScreenings.length / pageSize));

  const paginatedScreenings = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredScreenings.slice(start, end);
  }, [filteredScreenings, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [selectedCompany, selectedStatus, selectedType, dateRange, pageSize]);

  // Advanced Statistics
  const stats = useMemo(() => {
    const total = filteredScreenings.length;
    const completed = filteredScreenings.filter(s => s.status === 'completed').length;
    const cancelled = filteredScreenings.filter(s => s.status === 'cancelled').length;
    const noShow = filteredScreenings.filter(s => s.status === 'no-show').length;
    const scheduled = filteredScreenings.filter(s => s.status === 'scheduled').length;
    
    const totalParticipants = filteredScreenings.reduce((sum, s) => sum + s.employeeCount, 0);
    const avgParticipants = total > 0 ? Math.round(totalParticipants / total) : 0;
    
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const cancellationRate = total > 0 ? (((cancelled + noShow) / total) * 100).toFixed(1) : '0';

    // Previous period comparison
    let prevPeriodScreenings: Screening[] = [];
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const duration = end.getTime() - start.getTime();
      
      const prevStart = new Date(start.getTime() - duration);
      const prevEnd = new Date(start);
      
      prevPeriodScreenings = screenings.filter(s => {
        const date = new Date(s.date);
        return date >= prevStart && date < prevEnd;
      });
    }

    const prevTotal = prevPeriodScreenings.length;
    const trend = prevTotal > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(1) : '0';

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      totalParticipants,
      avgParticipants,
      completionRate,
      cancellationRate,
      trend: parseFloat(trend),
    };
  }, [filteredScreenings, screenings, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  const generatePDFReport = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text(normalizePdfText('OSGB Sağlık Taraması Raporu'), 14, 20);

      // Date
      doc.setFontSize(10);
      doc.text(normalizePdfText(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 14, 30);
      
      // Current filters
      const companyFilterLabel = selectedCompany === 'all'
        ? 'Tüm Firmalar'
        : (companies.find(c => c.id === parseInt(selectedCompany))?.name || 'Seçili Firma');

      const statusFilterLabel = selectedStatus === 'all'
        ? 'Tüm Durumlar'
        : STATUS_LABELS[selectedStatus as keyof typeof STATUS_LABELS] || selectedStatus;

      const typeFilterLabel = selectedType === 'all'
        ? 'Tüm Tipler'
        : TYPE_LABELS[selectedType as keyof typeof TYPE_LABELS] || selectedType;

      let dateFilterLabel = 'Tümü';
      if (dateRange.start && dateRange.end) {
        dateFilterLabel = `${new Date(dateRange.start).toLocaleDateString('tr-TR')} - ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      } else if (dateRange.start) {
        dateFilterLabel = `>= ${new Date(dateRange.start).toLocaleDateString('tr-TR')}`;
      } else if (dateRange.end) {
        dateFilterLabel = `<= ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      }

      doc.setFontSize(12);
      doc.text(normalizePdfText('Uygulanan Filtreler'), 14, 40);
      doc.setFontSize(10);
      doc.text(normalizePdfText(`Firma: ${companyFilterLabel}`), 14, 48);
      doc.text(normalizePdfText(`Durum: ${statusFilterLabel}`), 14, 55);
      doc.text(normalizePdfText(`Tarama Tipi: ${typeFilterLabel}`), 14, 62);
      doc.text(normalizePdfText(`Tarih Aralığı: ${dateFilterLabel}`), 14, 69);

      // Summary Stats
      doc.setFontSize(12);
      doc.text(normalizePdfText('Özet İstatistikler'), 14, 83);
      doc.setFontSize(10);
      doc.text(normalizePdfText(`Toplam Tarama: ${stats.total}`), 14, 91);
      doc.text(normalizePdfText(`Tamamlandı: ${stats.completed} (${stats.completionRate}%)`), 14, 98);
      doc.text(normalizePdfText(`İptal Edildi: ${stats.cancelled}`), 14, 105);
      doc.text(normalizePdfText(`Gelmedi: ${stats.noShow}`), 14, 112);
      doc.text(normalizePdfText(`Toplam Katılımcı: ${stats.totalParticipants}`), 14, 119);
      doc.text(normalizePdfText(`Ortalama Katılımcı: ${stats.avgParticipants}`), 14, 126);

      // Table
      const tableData = filteredScreenings.map(screening => {
        const company = companies.find(c => c.id === screening.companyId);
        return [
          screening.id,
          normalizePdfText(company?.name || 'N/A'),
          normalizePdfText(new Date(screening.date).toLocaleDateString('tr-TR')),
          screening.timeStart,
          normalizePdfText(TYPE_LABELS[screening.type]),
          normalizePdfText(STATUS_LABELS[screening.status]),
          screening.employeeCount,
        ];
      });

      autoTable(doc, {
        head: [[
          'ID',
          normalizePdfText('Firma'),
          normalizePdfText('Tarih'),
          normalizePdfText('Saat'),
          normalizePdfText('Tip'),
          normalizePdfText('Durum'),
          normalizePdfText('Katılımcı'),
        ]],
        body: tableData,
        startY: 138,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 51, 51] },
      });

      // Save
      doc.save(`osgb-rapor-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF rapor başarıyla indirildi');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcelReport = () => {
    setIsGenerating(true);
    try {
      const companyFilterLabel = selectedCompany === 'all'
        ? 'Tüm Firmalar'
        : (companies.find(c => c.id === parseInt(selectedCompany))?.name || 'Seçili Firma');

      const statusFilterLabel = selectedStatus === 'all'
        ? 'Tüm Durumlar'
        : STATUS_LABELS[selectedStatus as keyof typeof STATUS_LABELS] || selectedStatus;

      const typeFilterLabel = selectedType === 'all'
        ? 'Tüm Tipler'
        : TYPE_LABELS[selectedType as keyof typeof TYPE_LABELS] || selectedType;

      let dateFilterLabel = 'Tümü';
      if (dateRange.start && dateRange.end) {
        dateFilterLabel = `${new Date(dateRange.start).toLocaleDateString('tr-TR')} - ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      } else if (dateRange.start) {
        dateFilterLabel = `>= ${new Date(dateRange.start).toLocaleDateString('tr-TR')}`;
      } else if (dateRange.end) {
        dateFilterLabel = `<= ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      }

      // Summary sheet
      const summaryData = [
        [normalizePdfText('OSGB Sağlık Taraması Raporu')],
        ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR')],
        [],
        [normalizePdfText('Özet İstatistikler')],
        [normalizePdfText('Toplam Tarama'), stats.total],
        [normalizePdfText('Tamamlandı'), stats.completed],
        [normalizePdfText('İptal Edildi'), stats.cancelled],
        [normalizePdfText('Gelmedi'), stats.noShow],
        [normalizePdfText('Planlandı'), stats.scheduled],
        [normalizePdfText('Toplam Katılımcı'), stats.totalParticipants],
        [normalizePdfText('Ortalama Katılımcı'), stats.avgParticipants],
        [normalizePdfText('Tamamlanma Oranı'), `${stats.completionRate}%`],
        [normalizePdfText('İptal Oranı'), `${stats.cancellationRate}%`],
        [],
        [normalizePdfText('Uygulanan Filtreler')],
        [normalizePdfText('Firma'), companyFilterLabel],
        [normalizePdfText('Durum'), statusFilterLabel],
        [normalizePdfText('Tarama Tipi'), typeFilterLabel],
        [normalizePdfText('Tarih Aralığı'), dateFilterLabel],
      ];

      // Screenings data
      const screeningsData = [
        ['ID', 'Firma', 'Firma Adres', 'Tarih', 'Başlangıç Saati', 'Bitiş Saati', 'Katılımcı Sayısı', 'Tip', 'Durum'],
        ...filteredScreenings.map(screening => {
          const company = companies.find(c => c.id === screening.companyId);
          return [
            screening.id,
            company?.name || 'N/A',
            company?.address || 'N/A',
            new Date(screening.date).toLocaleDateString('tr-TR'),
            screening.timeStart,
            screening.timeEnd,
            screening.employeeCount,
            TYPE_LABELS[screening.type],
            STATUS_LABELS[screening.status],
          ];
        }),
      ];

      // Companies data
      const companiesData = [
        ['ID', 'Firma Adı', 'Adres', 'Telefon', 'E-posta', 'Tarama Sayısı', 'Toplam Katılımcı'],
        ...companies.map(company => {
          const companyScreenings = filteredScreenings.filter(s => s.companyId === company.id);
          const totalParticipants = companyScreenings.reduce((sum, s) => sum + s.employeeCount, 0);
          return [
            company.id,
            company.name,
            company.address || 'N/A',
            company.phone || 'N/A',
            company.email || 'N/A',
            companyScreenings.length,
            totalParticipants,
          ];
        }),
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add sheets
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      const wsScreenings = XLSX.utils.aoa_to_sheet(screeningsData);
      const wsCompanies = XLSX.utils.aoa_to_sheet(companiesData);

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');
      XLSX.utils.book_append_sheet(wb, wsScreenings, 'Taramalar');
      XLSX.utils.book_append_sheet(wb, wsCompanies, 'Firmalar');

      // Save
      XLSX.writeFile(wb, `osgb-rapor-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel rapor başarıyla indirildi');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Excel oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVReport = () => {
    setIsGenerating(true);
    try {
      const headers = ['ID', 'Firma', 'Tarih', 'Başlangıç Saati', 'Bitiş Saati', 'Katılımcı Sayısı', 'Tip', 'Durum'];
      const rows = filteredScreenings.map(screening => {
        const company = companies.find(c => c.id === screening.companyId);
        return [
          screening.id,
          company?.name || 'N/A',
          new Date(screening.date).toLocaleDateString('tr-TR'),
          screening.timeStart,
          screening.timeEnd,
          screening.employeeCount,
          TYPE_LABELS[screening.type],
          STATUS_LABELS[screening.status],
        ];
      });

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `osgb-rapor-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('CSV rapor başarıyla indirildi');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('CSV oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCompanyReport = (companyId: number) => {
    setIsGenerating(true);
    try {
      const company = companies.find(c => c.id === companyId);
      if (!company) {
        toast.error('Firma bulunamadı');
        return;
      }

      const companyScreenings = screenings.filter(s => s.companyId === companyId);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text(normalizePdfText(`${company.name} - Rapor`), 14, 20);

      // Company Info
      doc.setFontSize(12);
      doc.text(normalizePdfText('Firma Bilgileri'), 14, 35);
      doc.setFontSize(10);
      doc.text(normalizePdfText(`Adres: ${company.address || 'N/A'}`), 14, 43);
      doc.text(normalizePdfText(`Telefon: ${company.phone || 'N/A'}`), 14, 50);
      doc.text(normalizePdfText(`E-posta: ${company.email || 'N/A'}`), 14, 57);

      // Stats
      doc.setFontSize(12);
      doc.text(normalizePdfText('İstatistikler'), 14, 70);
      doc.setFontSize(10);
      doc.text(normalizePdfText(`Toplam Tarama: ${companyScreenings.length}`), 14, 78);
      doc.text(normalizePdfText(`Tamamlanan: ${companyScreenings.filter(s => s.status === 'completed').length}`), 14, 85);
      doc.text(normalizePdfText(`Planlanmış: ${companyScreenings.filter(s => s.status === 'scheduled').length}`), 14, 92);

      // Table
      const tableData = companyScreenings.map(screening => [
        screening.id,
        normalizePdfText(new Date(screening.date).toLocaleDateString('tr-TR')),
        screening.timeStart,
        screening.employeeCount,
        normalizePdfText(TYPE_LABELS[screening.type]),
        normalizePdfText(STATUS_LABELS[screening.status]),
      ]);

      autoTable(doc, {
        head: [[
          'ID',
          normalizePdfText('Tarih'),
          normalizePdfText('Saat'),
          normalizePdfText('Katılımcı'),
          normalizePdfText('Tip'),
          normalizePdfText('Durum'),
        ]],
        body: tableData,
        startY: 105,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 51, 51] },
      });

      doc.save(`${company.name}-rapor-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Firma raporu başarıyla indirildi');
    } catch (error) {
      console.error('Error generating company report:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  // Statistics
  const getMonthlyData = () => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => ({
      month,
      tarama: filteredScreenings.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      }).length,
      tamamlanan: filteredScreenings.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === index && date.getFullYear() === currentYear && s.status === 'completed';
      }).length,
    }));
  };

  const getStatusData = () => {
    return [
      { name: 'Planlandı', value: stats.scheduled, color: STATUS_COLORS.scheduled },
      { name: 'Tamamlandı', value: stats.completed, color: STATUS_COLORS.completed },
      { name: 'İptal', value: stats.cancelled, color: STATUS_COLORS.cancelled },
      { name: 'Gelmedi', value: stats.noShow, color: STATUS_COLORS['no-show'] },
    ].filter(item => item.value > 0);
  };

  const getTypeData = () => {
    return [
      { name: 'Periyodik', value: filteredScreenings.filter(s => s.type === 'periodic').length, color: TYPE_COLORS.periodic },
      { name: 'İşe Giriş', value: filteredScreenings.filter(s => s.type === 'initial').length, color: TYPE_COLORS.initial },
      { name: 'Özel', value: filteredScreenings.filter(s => s.type === 'special').length, color: TYPE_COLORS.special },
    ].filter(item => item.value > 0);
  };

  const getTopCompanies = () => {
    return companies
      .map(company => ({
        name: company.name,
        count: filteredScreenings.filter(s => s.companyId === company.id).length,
        participants: filteredScreenings
          .filter(s => s.companyId === company.id)
          .reduce((sum, s) => sum + s.employeeCount, 0),
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Export Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 bg-linear-to-b from-background via-background to-muted/40">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground/90">Raporlar</h1>
          <p className="text-muted-foreground mt-1">
            Detaylı raporlar oluşturun ve analiz edin
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={fetchData} className="gap-2 border-border/70 hover:border-primary/60 hover:bg-primary/5">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2 border-border/70 hover:border-primary/60 hover:bg-primary/5">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Yazdır</span>
            <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>P
            </kbd>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Gelişmiş Filtreler
              </CardTitle>
              <CardDescription>Raporlarınızı özelleştirin</CardDescription>
            </div>
            {(selectedCompany !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || dateRange.start || dateRange.end) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
                Filtreleri Temizle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Date Ranges */}
          <div className="space-y-2">
            <Label>Hızlı Tarih Seçimi</Label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('today')}>
                Bugün
              </Button>
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('thisWeek')}>
                Bu Hafta
              </Button>
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('thisMonth')}>
                Bu Ay
              </Button>
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('lastMonth')}>
                Geçen Ay
              </Button>
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('thisYear')}>
                Bu Yıl
              </Button>
              <Button size="sm" variant="outline" className="border-border/70" onClick={() => setQuickDateRange('lastYear')}>
                Geçen Yıl
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="company">Firma</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger id="company" className="border-border/70">
                  <SelectValue placeholder="Tüm Firmalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Firmalar</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="border-border/70">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="scheduled">Planlandı</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                  <SelectItem value="no-show">Gelmedi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tarama Tipi</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type" className="border-border/70">
                  <SelectValue placeholder="Tüm Tipler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  <SelectItem value="periodic">Periyodik</SelectItem>
                  <SelectItem value="initial">İşe Giriş</SelectItem>
                  <SelectItem value="special">Özel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Başlangıç</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border-border/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Bitiş</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border-border/70"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Tarama</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {stats.totalParticipants} toplam katılımcı
              </p>
              {stats.trend !== 0 && (
                <Badge variant={stats.trend > 0 ? 'default' : 'secondary'} className="gap-1">
                  {stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(stats.trend)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlandı</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              %{stats.completionRate} tamamlanma oranı
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Katılımcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tarama başına
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">İptal Oranı</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{stats.cancellationRate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cancelled + stats.noShow} iptal/gelmedi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Aylık Trend Analizi</CardTitle>
            <CardDescription>Bu yıl gerçekleştirilen ve tamamlanan taramalar</CardDescription>
          </CardHeader>
          <CardContent>
            {getMonthlyData().every(d => d.tarama === 0) ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Bu yıl için veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getMonthlyData()}>
                  <defs>
                    <linearGradient id="colorTarama" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTamamlanan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="tarama" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#colorTarama)"
                    name="Toplam Tarama"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tamamlanan" 
                    stroke="#22c55e" 
                    fill="url(#colorTamamlanan)"
                    name="Tamamlanan"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
            <CardDescription>Randevu durumları</CardDescription>
          </CardHeader>
          <CardContent>
            {getStatusData().length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getStatusData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {getStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution and Top Companies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Tarama Tipi Dağılımı</CardTitle>
            <CardDescription>Periyodik, işe giriş ve özel taramalar</CardDescription>
          </CardHeader>
          <CardContent>
            {getTypeData().length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getTypeData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {getTypeData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>En Aktif Firmalar</CardTitle>
            <CardDescription>Tarama sayısına göre sıralama</CardDescription>
          </CardHeader>
          <CardContent>
            {getTopCompanies().length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <div className="space-y-3">
                {getTopCompanies().slice(0, 5).map((company, index) => (
                  <div key={company.name} className="flex items-center gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{company.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {company.count} tarama • {company.participants} katılımcı
                      </div>
                    </div>
                    <Badge variant="secondary">{company.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <Card className="print:hidden border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Rapor İndir
          </CardTitle>
          <CardDescription>Raporunuzu farklı formatlarda dışa aktarın</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={generatePDFReport} 
              disabled={isGenerating || filteredScreenings.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              PDF Rapor
            </Button>

            <Button 
              onClick={generateExcelReport} 
              disabled={isGenerating || filteredScreenings.length === 0}
              variant="outline"
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Excel Rapor
            </Button>

            <Button 
              onClick={generateCSVReport} 
              disabled={isGenerating || filteredScreenings.length === 0}
              variant="outline"
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              CSV İndir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border border-border/70 bg-card/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tarama Detayları</CardTitle>
              <CardDescription>
                {filteredScreenings.length} sonuç bulundu
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] border-border/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Tarihe Göre</SelectItem>
                  <SelectItem value="company">Firmaya Göre</SelectItem>
                  <SelectItem value="status">Duruma Göre</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="border-border/70"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredScreenings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/60 py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              {hasActiveFilters ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">Filtrelere göre tarama bulunamadı</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Farklı filtre kombinasyonları deneyebilir veya tüm filtreleri temizleyerek tüm taramaları görüntüleyebilirsiniz.
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Filtreleri Temizle
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">Henüz sağlık taraması oluşturulmamış</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Planlanmış veya tamamlanmış taramaları görebilmek için yeni bir tarama oluşturun.
                  </p>
                  <Link href="/screenings/new">
                    <Button>
                      Yeni Tarama Oluştur
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Saat</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Katılımcı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedScreenings.map(screening => {
                    const company = companies.find(c => c.id === screening.companyId);
                    return (
                      <TableRow key={screening.id}>
                        <TableCell className="font-medium">#{screening.id}</TableCell>
                        <TableCell>{company?.name || 'N/A'}</TableCell>
                        <TableCell>{new Date(screening.date).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>{screening.timeStart}</TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ borderColor: TYPE_COLORS[screening.type] }}>
                            {TYPE_LABELS[screening.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={screening.status === 'completed' ? 'default' : 'secondary'}
                            style={{ 
                              backgroundColor: screening.status === 'completed' ? STATUS_COLORS[screening.status] : 'transparent',
                              color: screening.status === 'completed' ? 'white' : STATUS_COLORS[screening.status],
                              borderColor: STATUS_COLORS[screening.status]
                            }}
                          >
                            {STATUS_LABELS[screening.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{screening.employeeCount}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredScreenings.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-4 shadow-[0_20px_45px_-30px_rgba(64,17,109,0.5)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Toplam <span className="font-semibold">{filteredScreenings.length}</span> sonuç
                    </span>
                    <span>
                      Sayfa <span className="font-semibold">{page}</span> / {totalPages}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Sayfa başı:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                        }}
                      >
                        <SelectTrigger className="h-7 w-[80px] px-2 py-0 text-xs border-border/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border/70"
                        disabled={page === 1}
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      >
                        Önceki
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border/70"
                        disabled={page === totalPages}
                        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Reports */}
      {getTopCompanies().length > 0 && (
        <Card className="print:hidden border border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Firma Bazlı Raporlar</CardTitle>
            <CardDescription>Her firma için ayrı detaylı rapor oluşturun</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {getTopCompanies().map(company => {
                const companyData = companies.find(c => c.name === company.name);
                return (
                  <div key={company.name} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[0_20px_45px_-30px_rgba(64,17,109,0.6)] transition-colors hover:bg-card/80">
                    <div className="flex-1">
                      <div className="font-semibold">{company.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {company.count} tarama • {company.participants} katılımcı
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => companyData && generateCompanyReport(companyData.id)}
                      disabled={isGenerating}
                      className="gap-2 border-border/70"
                    >
                      <FileText className="w-4 h-4" />
                      İndir
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}