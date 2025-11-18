"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, User, Building2, Calendar as CalendarIcon, FileText, Loader2, Users, UserCheck, Filter, X, ChevronLeft, ChevronRight, Search, TestTube, Maximize2, Minimize2, LayoutGrid, LayoutList, CalendarDays, Download, Printer, CheckCircle2, XCircle, AlertCircle, TrendingUp, Activity, RefreshCw, FileSpreadsheet, Edit } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { tr } from 'date-fns/locale';
import { DayButton } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Company = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

type AssignedEmployee = {
  assignmentId: number;
  assignedAt: string;
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
  specialization: string | null;
};

type AssignedTest = {
  assignmentId: number;
  assignedAt: string;
  id: number;
  name: string;
  code: string | null;
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
  notes: string | null;
  createdAt: string;
  assignedEmployees?: AssignedEmployee[];
  assignedTests?: AssignedTest[];
};

type ViewMode = 'month' | 'week' | 'day' | 'list';

export default function ScreeningsPage() {
  const router = useRouter();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedScreeningForStatus, setSelectedScreeningForStatus] = useState<Screening | null>(null);
  const [newStatus, setNewStatus] = useState<Screening['status'] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Bulk selection
  const [selectedScreenings, setSelectedScreenings] = useState<Set<number>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Screening['status'] | null>(null);
  
  // Filter states
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Quick edit
  const [quickEditDialogOpen, setQuickEditDialogOpen] = useState(false);
  const [selectedScreeningForEdit, setSelectedScreeningForEdit] = useState<Screening | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        router.push('/screenings/new');
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
      setIsLoading(true);
      const [screeningsRes, companiesRes] = await Promise.all([
        fetch('/api/screenings?limit=1000'),
        fetch('/api/companies?limit=1000'),
      ]);

      if (!screeningsRes.ok || !companiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [screeningsData, companiesData] = await Promise.all([
        screeningsRes.json(),
        companiesRes.json(),
      ]);

      setScreenings(screeningsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast.success('Veriler güncellendi');
  };

  // Memoized company lookup map
  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.id, c]));
  }, [companies]);

  const getCompanyById = useCallback((id: number) => companyMap.get(id), [companyMap]);

  const getStatusBadge = useCallback((status: Screening['status']) => {
    const variants: Record<Screening['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; icon: any }> = {
      scheduled: { label: 'Planlandı', variant: 'default', color: 'bg-blue-500', icon: Clock },
      completed: { label: 'Tamamlandı', variant: 'secondary', color: 'bg-green-500', icon: CheckCircle2 },
      cancelled: { label: 'İptal', variant: 'destructive', color: 'bg-red-500', icon: XCircle },
      'no-show': { label: 'Gelmedi', variant: 'outline', color: 'bg-orange-500', icon: AlertCircle },
    };
    return variants[status];
  }, []);

  const getTypeBadge = useCallback((type: Screening['type']) => {
    const labels: Record<Screening['type'], string> = {
      periodic: 'Periyodik',
      initial: 'İşe Giriş',
      special: 'Özel',
    };
    return labels[type];
  }, []);

  // Memoized filtered screenings
  const filteredScreenings = useMemo(() => {
    return screenings.filter((screening) => {
      const company = getCompanyById(screening.companyId);
      
      if (filterCompany !== 'all' && screening.companyId !== parseInt(filterCompany)) {
        return false;
      }
      
      if (filterStatus !== 'all' && screening.status !== filterStatus) {
        return false;
      }
      
      if (filterType !== 'all' && screening.type !== filterType) {
        return false;
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const screeningDate = new Date(screening.date);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        if (startDate && endDate) {
          if (screeningDate < startDate || screeningDate > endDate) return false;
        } else if (startDate) {
          if (screeningDate < startDate) return false;
        } else if (endDate) {
          if (screeningDate > endDate) return false;
        }
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCompany = company?.name.toLowerCase().includes(query);
        const matchesParticipant = screening.participantName.toLowerCase().includes(query);
        const matchesNotes = screening.notes?.toLowerCase().includes(query);
        
        if (!matchesCompany && !matchesParticipant && !matchesNotes) {
          return false;
        }
      }
      
      return true;
    });
  }, [screenings, filterCompany, filterStatus, filterType, searchQuery, dateRange, getCompanyById]);

  // Toggle selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedScreenings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedScreenings(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedScreenings.size === filteredScreenings.length) {
      setSelectedScreenings(new Set());
    } else {
      setSelectedScreenings(new Set(filteredScreenings.map(s => s.id)));
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedScreenings.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedScreenings).map(id =>
          fetch(`/api/screenings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      );

      await fetchData();
      toast.success(`${selectedScreenings.size} randevunun durumu güncellendi`);
      setSelectedScreenings(new Set());
      setBulkStatusDialogOpen(false);
      setBulkStatus(null);
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Toplu güncelleme sırasında hata oluştu');
    }
  };

  // Excel Export
  const handleExportExcel = useCallback(() => {
    setIsExporting(true);
    
    try {
      const headers = ['Tarih', 'Saat', 'Firma', 'Katılımcı', 'Tip', 'Durum', 'Çalışan Sayısı', 'Atanan Personel', 'Testler', 'Notlar'];
      const rows = filteredScreenings.map(s => {
        const company = getCompanyById(s.companyId);
        return [
          new Date(s.date).toLocaleDateString('tr-TR'),
          `${s.timeStart} - ${s.timeEnd}`,
          company?.name || '',
          s.participantName,
          getTypeBadge(s.type),
          getStatusBadge(s.status).label,
          s.employeeCount,
          s.assignedEmployees?.map(e => `${e.firstName} ${e.lastName}`).join(', ') || '-',
          s.assignedTests?.map(t => t.name).join(', ') || '-',
          s.notes || '-',
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      ws['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 30 },
        { wch: 40 },
        { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Randevular');

      const fileName = `randevular-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Randevu listesi başarıyla dışa aktarıldı');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Dışa aktarma sırasında hata oluştu');
    } finally {
      setIsExporting(false);
    }
  }, [filteredScreenings, getCompanyById, getTypeBadge, getStatusBadge]);

  // Quick Edit
  const openQuickEdit = (screening: Screening) => {
    setSelectedScreeningForEdit(screening);
    setQuickEditDialogOpen(true);
  };

  const handleQuickEdit = async (field: string, value: any) => {
    if (!selectedScreeningForEdit) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/screenings/${selectedScreeningForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error('Failed to update');

      await fetchData();
      toast.success('Randevu güncellendi');
      setQuickEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setIsUpdating(false);
    }
  };

  // Conflict detection
  const detectConflicts = useCallback((screening: Screening) => {
    const conflicts = filteredScreenings.filter(s => {
      if (s.id === screening.id) return false;
      if (s.date !== screening.date) return false;
      if (s.status === 'cancelled') return false;
      
      const start1 = screening.timeStart;
      const end1 = screening.timeEnd;
      const start2 = s.timeStart;
      const end2 = s.timeEnd;
      
      return (start1 < end2 && end1 > start2);
    });
    
    return conflicts;
  }, [filteredScreenings]);

  // Get week dates
  const getWeekDates = useCallback((date: Date) => {
    const week = [];
    const first = date.getDate() - date.getDay();
    for (let i = 0; i < 7; i++) {
      const day = new Date(date);
      day.setDate(first + i);
      week.push(day);
    }
    return week;
  }, []);

  const weekDates = useMemo(() => selectedDate ? getWeekDates(selectedDate) : [], [selectedDate, getWeekDates]);

  const handleScreeningClick = useCallback((screeningId: number) => {
    router.push(`/screenings/${screeningId}`);
  }, [router]);

  // Memoized filtered screenings (kept here only as reference marker - actual declaration moved above)

  const clearFilters = useCallback(() => {
    setFilterCompany('all');
    setFilterStatus('all');
    setFilterType('all');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
  }, []);

  const hasActiveFilters = useMemo(() => 
    filterCompany !== 'all' || 
    filterStatus !== 'all' || 
    filterType !== 'all' || 
    searchQuery !== '' ||
    dateRange.start !== '' ||
    dateRange.end !== ''
  , [filterCompany, filterStatus, filterType, searchQuery, dateRange]);

  const selectedDateScreenings = useMemo(() => {
    if (!selectedDate) return [];
    return filteredScreenings.filter((s) => {
      const screeningDate = new Date(s.date);
      return screeningDate.toDateString() === selectedDate.toDateString();
    });
  }, [filteredScreenings, selectedDate]);

  // Get days with screenings for calendar highlighting
  const daysWithScreenings = useMemo(() => {
    return filteredScreenings.reduce((acc, screening) => {
      const dateStr = new Date(screening.date).toDateString();
      if (!acc[dateStr]) {
        acc[dateStr] = {
          count: 0,
          statuses: [] as Screening['status'][],
        };
      }
      acc[dateStr].count++;
      acc[dateStr].statuses.push(screening.status);
      return acc;
    }, {} as Record<string, { count: number; statuses: Screening['status'][] }>);
  }, [filteredScreenings]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  }, []);

  const handleMonthChange = useCallback((monthIndex: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(monthIndex);
    setCurrentMonth(newDate);
  }, [currentMonth]);

  const handleYearChange = useCallback((year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
  }, [currentMonth]);

  const generateYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

  const monthNames = useMemo(() => [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ], []);

  // Get screenings for a specific date
  const getScreeningsForDate = useCallback((date: Date) => {
    return filteredScreenings.filter((s) => {
      const screeningDate = new Date(s.date);
      return screeningDate.toDateString() === date.toDateString();
    }).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [filteredScreenings]);

  // Get current view screenings
  const getCurrentViewScreenings = useCallback(() => {
    if (!selectedDate) return [];
    
    switch (viewMode) {
      case 'day':
        return getScreeningsForDate(selectedDate);
      case 'week':
        return filteredScreenings.filter((s) => {
          const screeningDate = new Date(s.date);
          return weekDates.some(d => d.toDateString() === screeningDate.toDateString());
        }).sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.timeStart.localeCompare(b.timeStart);
        });
      case 'list':
        return filteredScreenings.sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.timeStart.localeCompare(b.timeStart);
        });
      default: // month
        return selectedDateScreenings;
    }
  }, [selectedDate, viewMode, getScreeningsForDate, filteredScreenings, weekDates, selectedDateScreenings]);

  const currentViewScreenings = useMemo(() => getCurrentViewScreenings(), [getCurrentViewScreenings]);

  // Memoized stats
  const stats = useMemo(() => ({
    scheduled: filteredScreenings.filter(s => s.status === 'scheduled').length,
    completed: filteredScreenings.filter(s => s.status === 'completed').length,
    cancelled: filteredScreenings.filter(s => s.status === 'cancelled').length,
    noShow: filteredScreenings.filter(s => s.status === 'no-show').length,
    total: filteredScreenings.length,
    today: filteredScreenings.filter(s => {
      const screeningDate = new Date(s.date);
      return screeningDate.toDateString() === new Date().toDateString();
    }).length,
    thisWeek: filteredScreenings.filter(s => {
      const screeningDate = new Date(s.date);
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return screeningDate >= weekStart && screeningDate <= weekEnd;
    }).length,
    totalEmployees: filteredScreenings.reduce((sum, s) => sum + s.employeeCount, 0),
  }), [filteredScreenings]);

  // Handle status change
  const handleStatusChange = useCallback(async (screening: Screening, newStatus: Screening['status']) => {
    setSelectedScreeningForStatus(screening);
    setNewStatus(newStatus);
    setStatusDialogOpen(true);
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (!selectedScreeningForStatus || !newStatus) return;

    try {
      const response = await fetch(`/api/screenings/${selectedScreeningForStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchData();
      toast.success('Randevu durumu güncellendi');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    } finally {
      setStatusDialogOpen(false);
      setSelectedScreeningForStatus(null);
      setNewStatus(null);
    }
  }, [selectedScreeningForStatus, newStatus, fetchData]);

  // Export/Print functionality
  const handleExport = useCallback(() => {
    toast.info('Dışa aktarma özelliği yakında eklenecek');
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const ScreeningCard = useCallback(({ screening, showQuickActions = false, showCheckbox = false }: { screening: Screening; showQuickActions?: boolean; showCheckbox?: boolean }) => {
    const company = getCompanyById(screening.companyId);
    const statusBadge = getStatusBadge(screening.status);
    const StatusIcon = statusBadge.icon;
    const conflicts = detectConflicts(screening);
    const hasConflicts = conflicts.length > 0;
    
    return (
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all border-l-4 group relative ${
          selectedScreenings.has(screening.id) ? 'bg-muted/50' : ''
        } ${hasConflicts ? 'border-orange-500' : ''}`}
        style={{ borderLeftColor: hasConflicts ? undefined : statusBadge.color.replace('bg-', '').replace('500', '') }}
        onClick={() => !showCheckbox && handleScreeningClick(screening.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-1">
              {showCheckbox && (
                <Checkbox
                  checked={selectedScreenings.has(screening.id)}
                  onCheckedChange={() => toggleSelection(screening.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="flex flex-col items-center justify-center min-w-[60px] p-2 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Saat</span>
                <span className="text-sm font-semibold">{screening.timeStart}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{company?.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{screening.participantName}</p>
                {hasConflicts && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{conflicts.length} çakışma tespit edildi</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusBadge.variant} className="gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusBadge.label}
              </Badge>
              {showQuickActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Activity className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      openQuickEdit(screening);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Hızlı Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(screening, 'completed');
                    }}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      Tamamlandı Olarak İşaretle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(screening, 'no-show');
                    }}>
                      <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                      Gelmedi Olarak İşaretle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(screening, 'cancelled');
                    }} className="text-destructive">
                      <XCircle className="w-4 h-4 mr-2" />
                      İptal Et
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{screening.timeStart} - {screening.timeEnd}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{screening.employeeCount} Çalışan</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getTypeBadge(screening.type)}
            </Badge>
          </div>

          {screening.assignedTests && screening.assignedTests.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <TestTube className="w-3.5 h-3.5" />
                <span>Yapılacak Testler ({screening.assignedTests.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {screening.assignedTests.slice(0, 5).map((test) => (
                  <Badge key={test.id} variant="secondary" className="text-xs">
                    {test.name}
                  </Badge>
                ))}
                {screening.assignedTests.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{screening.assignedTests.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {screening.assignedEmployees && screening.assignedEmployees.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Atanmış Personel</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {screening.assignedEmployees.map((emp) => (
                  <Badge key={emp.id} variant="secondary" className="text-xs">
                    {emp.firstName} {emp.lastName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {screening.notes && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{screening.notes}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }, [getCompanyById, getStatusBadge, getTypeBadge, handleScreeningClick, handleStatusChange, selectedScreenings, detectConflicts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Timeline view for day mode
  const renderTimelineView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
    const dayScreenings = getScreeningsForDate(selectedDate || new Date());

    return (
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourScreenings = dayScreenings.filter((s) => {
            const startHour = parseInt(s.timeStart.split(':')[0]);
            return startHour === hour;
          });

          return (
            <div key={hour} className="flex gap-4">
              <div className="w-20 shrink-0 text-sm font-medium text-muted-foreground pt-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 min-h-[60px] border-l-2 border-border pl-4 pb-2">
                {hourScreenings.length > 0 ? (
                  <div className="space-y-2">
                    {hourScreenings.map((screening) => (
                      <ScreeningCard key={screening.id} screening={screening} showQuickActions />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center text-xs text-muted-foreground/50">
                    Boş
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, idx) => {
          const dayScreenings = getScreeningsForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          return (
            <div key={idx} className="min-h-[200px]">
              <div 
                className={`text-center p-2 rounded-t-lg border-b-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground border-primary' : 
                  isToday ? 'bg-accent border-accent-foreground' : 'border-border hover:bg-accent/50'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="text-xs font-medium">
                  {date.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className="text-2xl font-bold">{date.getDate()}</div>
                {dayScreenings.length > 0 && (
                  <div className="text-xs mt-1 opacity-80">
                    {dayScreenings.length} randevu
                  </div>
                )}
              </div>
              <div className="space-y-1 p-1">
                {dayScreenings.slice(0, 3).map((screening) => {
                  const company = getCompanyById(screening.companyId);
                  const statusBadge = getStatusBadge(screening.status);
                  return (
                    <div
                      key={screening.id}
                      className="text-xs p-2 rounded border-l-2 cursor-pointer hover:bg-accent/50 transition-colors"
                      style={{ borderLeftColor: statusBadge.color.replace('bg-', '').replace('500', '') }}
                      onClick={() => handleScreeningClick(screening.id)}
                    >
                      <div className="font-medium truncate">{screening.timeStart}</div>
                      <div className="truncate text-muted-foreground">{company?.name}</div>
                      <div className="truncate text-muted-foreground text-[10px]">
                        {screening.employeeCount} kişi
                      </div>
                    </div>
                  );
                })}
                {dayScreenings.length > 3 && (
                  <div className="text-xs text-center text-muted-foreground py-1">
                    +{dayScreenings.length - 3} daha
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {Object.entries(
        filteredScreenings.reduce((acc, screening) => {
          const date = new Date(screening.date).toDateString();
          if (!acc[date]) acc[date] = [];
          acc[date].push(screening);
          return acc;
        }, {} as Record<string, Screening[]>)
      )
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([dateStr, dayScreenings]) => {
          const date = new Date(dateStr);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div key={dateStr}>
              <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg ${isToday ? 'bg-primary/5' : ''}`}>
                <div className="flex flex-col items-center justify-center min-w-[60px] p-2 bg-primary/10 rounded-lg">
                  <div className="text-xs text-muted-foreground font-medium">
                    {date.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {date.getDate()}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dayScreenings.length} randevu • {dayScreenings.reduce((sum, s) => sum + s.employeeCount, 0)} çalışan
                  </p>
                </div>
                {isToday && (
                  <Badge variant="default" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Bugün
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                {dayScreenings
                  .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
                  .map((screening) => (
                    <ScreeningCard key={screening.id} screening={screening} showQuickActions />
                  ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <div className={`flex flex-1 flex-col gap-4 md:gap-6 p-3 md:p-4 lg:p-6 bg-linear-to-b from-background via-background to-muted/40 ${isFullscreen ? 'fixed inset-0 z-50 bg-background overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90">Randevu Takvimi</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Sağlık taramalarını görüntüleyin ve yönetin
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* NEW: Bulk action buttons */}
            {selectedScreenings.size > 0 && (
              <>
                <Badge variant="secondary" className="gap-1">
                  {selectedScreenings.size} seçili
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkStatusDialogOpen(true)}
                  className="h-9 border-border/70 hover:border-primary/60 hover:bg-primary/5"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Toplu Durum
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedScreenings(new Set())}
                  className="h-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} size="sm" className="h-9 w-9 border-border/70">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 border-border/70">
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF Olarak Kaydet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Yazdır
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Normal Görünüm' : 'Tam Ekran'}
              className="h-9 w-9 border-border/70"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 md:w-4 md:h-4" /> : <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />}
            </Button>
            <Link href="/screenings/new" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full md:size-default gap-1 md:gap-2">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Yeni Randevu</span>
                <span className="sm:hidden">Ekle</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Bugün</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.today}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">randevu</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Bu Hafta</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.thisWeek}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">randevu</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Toplam Çalışan</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.totalEmployees}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">kişi</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Tamamlanma Oranı</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                    {stats.completed}/{stats.total}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Selector and Filters */}
        <div className="flex flex-col gap-3 p-3 border border-border/70 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.04)] bg-card/70">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-3 md:p-4">
            {/* NEW: Select all checkbox for list view */}
            {viewMode === 'list' && filteredScreenings.length > 0 && (
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  checked={selectedScreenings.size === filteredScreenings.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Tümünü seç</span>
              </div>
            )}
            
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)} className="justify-start">
              <ToggleGroupItem value="month" aria-label="Ay Görünümü" className="text-xs md:text-sm h-9">
                <LayoutGrid className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Ay</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Hafta Görünümü" className="text-xs md:text-sm h-9">
                <CalendarDays className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Hafta</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="Gün Görünümü" className="text-xs md:text-sm h-9">
                <CalendarIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Gün</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Liste Görünümü" className="text-xs md:text-sm h-9">
                <LayoutList className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Liste</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Firma veya katılımcı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm md:text-base h-9 md:h-10"
                />
              </div>
              <Button 
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1 md:gap-2 h-9"
              >
                <Filter className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Filtreler</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                    {[filterCompany !== 'all', filterStatus !== 'all', filterType !== 'all', searchQuery].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 md:gap-2 h-9">
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Temizle</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card>
              <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Firma</Label>
                    <Select value={filterCompany} onValueChange={setFilterCompany}>
                      <SelectTrigger className="h-9 text-xs md:text-sm">
                        <SelectValue />
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

                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Durum</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9 text-xs md:text-sm">
                        <SelectValue />
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
                    <Label className="text-xs md:text-sm">Tarama Tipi</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9 text-xs md:text-sm">
                        <SelectValue />
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
                    <Label className="text-xs md:text-sm">Tarih Aralığı</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {dateRange.start || dateRange.end ? (
                            <span className="text-xs truncate">
                              {dateRange.start && new Date(dateRange.start).toLocaleDateString('tr-TR')}
                              {dateRange.start && dateRange.end && ' - '}
                              {dateRange.end && new Date(dateRange.end).toLocaleDateString('tr-TR')}
                            </span>
                          ) : (
                            <span className="text-xs">Tarih seç</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-xs">Başlangıç</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={dateRange.start}
                              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-xs">Bitiş</Label>
                            <Input
                              id="end-date"
                              type="date"
                              value={dateRange.end}
                              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                              className="h-9 text-xs"
                            />
                          </div>
                          {(dateRange.start || dateRange.end) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDateRange({ start: '', end: '' })}
                              className="w-full"
                            >
                              Temizle
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={viewMode === 'month' ? 'grid lg:grid-cols-[1fr_2fr] gap-4 md:gap-6' : 'space-y-4 md:space-y-6'}>
        {viewMode === 'month' && (
          <div className="space-y-3 md:space-y-4">
            <Card>
              <CardHeader className="space-y-3 md:space-y-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(currentMonth.getMonth() - 1);
                      setCurrentMonth(newDate);
                    }}
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={currentMonth.getMonth().toString()} 
                      onValueChange={(value) => handleMonthChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-8 md:h-9 w-[90px] md:w-[110px] text-xs md:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={currentMonth.getFullYear().toString()} 
                      onValueChange={(value) => handleYearChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-8 md:h-9 w-[70px] md:w-[90px] text-xs md:text-sm border-border/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generateYearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(currentMonth.getMonth() + 1);
                      setCurrentMonth(newDate);
                    }}
                    className="h-8 w-8 md:h-9 md:w-9 border-border/70"
                  >
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  onClick={goToToday}
                  className="w-full h-9 text-sm border-border/70"
                  size="sm"
                >
                  Bugüne Git
                </Button>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={tr}
                  className="rounded-md border-0"
                  classNames={{
                    months: "space-y-3",
                    month: "space-y-3",
                    caption: "hidden",
                    table: "w-full border-collapse",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-[10px] md:text-xs",
                    row: "flex w-full mt-1",
                    cell: "flex-1 text-center text-xs md:text-sm p-0 relative",
                    day: "h-9 w-9 md:h-11 md:w-11 p-0 font-normal mx-auto text-xs md:text-sm",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground font-semibold ring-2 ring-primary ring-offset-2",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_hidden: "invisible",
                  }}
                  components={{
                    DayButton: ({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
                      const dateStr = day.date.toDateString();
                      const dayInfo = daysWithScreenings[dateStr];
                      const hasScreenings = dayInfo && dayInfo.count > 0;
                      
                      return (
                        <button
                          {...props}
                          className={`
                            relative h-9 w-9 md:h-11 md:w-11 p-0 font-normal rounded-md text-xs md:text-sm
                            transition-colors
                            hover:bg-accent
                            focus:outline-none focus:ring-2 focus:ring-ring
                            ${modifiers.selected ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}
                            ${modifiers.today && !modifiers.selected ? 'bg-accent text-accent-foreground font-semibold ring-2 ring-primary ring-offset-2' : ''}
                            ${modifiers.outside ? 'text-muted-foreground opacity-50' : ''}
                            ${modifiers.disabled ? 'text-muted-foreground opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <span>{day.date.getDate()}</span>
                          {hasScreenings && (
                            <div className="absolute bottom-0.5 md:bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                              {dayInfo.statuses.slice(0, 3).map((status, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1 h-1 rounded-full ${getStatusBadge(status).color}`}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Enhanced Stats */}
            <Card className="border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-sm md:text-base">İstatistikler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3 p-4 md:p-6 pt-0">
                <div className="flex items-center justify-between group hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs md:text-sm text-muted-foreground">Planlandı</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base">{stats.scheduled}</span>
                </div>
                <div className="flex items-center justify-between group hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs md:text-sm text-muted-foreground">Tamamlandı</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between group hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs md:text-sm text-muted-foreground">İptal</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base">{stats.cancelled}</span>
                </div>
                <div className="flex items-center justify-between group hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-xs md:text-sm text-muted-foreground">Gelmedi</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base">{stats.noShow}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main View Area */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base md:text-lg truncate">
                  {viewMode === 'day' && selectedDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                  {viewMode === 'week' && `${weekDates[0]?.getDate()} - ${weekDates[6]?.getDate()} ${weekDates[0]?.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`}
                  {viewMode === 'month' && selectedDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {viewMode === 'list' && 'Tüm Randevular'}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {currentViewScreenings.length} randevu
                  {viewMode !== 'list' && currentViewScreenings.length > 0 && (
                    <> • {currentViewScreenings.reduce((sum, s) => sum + s.employeeCount, 0)} çalışan</>
                  )}
                </CardDescription>
              </div>
              
              {viewMode !== 'list' && (
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate || new Date());
                      if (viewMode === 'day') {
                        newDate.setDate(newDate.getDate() - 1);
                      } else if (viewMode === 'week') {
                        newDate.setDate(newDate.getDate() - 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() - 1);
                      }
                      setSelectedDate(newDate);
                      setCurrentMonth(newDate);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs md:text-sm">
                    Bugün
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate || new Date());
                      if (viewMode === 'day') {
                        newDate.setDate(newDate.getDate() + 1);
                      } else if (viewMode === 'week') {
                        newDate.setDate(newDate.getDate() + 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() + 1);
                      }
                      setSelectedDate(newDate);
                      setCurrentMonth(newDate);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {currentViewScreenings.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <CalendarIcon className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground opacity-20" />
                <p className="text-sm md:text-base text-muted-foreground font-medium">Bu görünümde randevu yok</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Başka bir tarih seçin veya yeni randevu oluşturun</p>
              </div>
            ) : (
              <>
                {viewMode === 'day' && renderTimelineView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'list' && renderListView()}
                {viewMode === 'month' && (
                  <div className="space-y-2 md:space-y-3">
                    {currentViewScreenings.map((screening) => (
                      <ScreeningCard key={screening.id} screening={screening} showQuickActions />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu Durumunu Değiştir</DialogTitle>
            <DialogDescription>
              {selectedScreeningForStatus && (
                <>
                  <span className="font-semibold">
                    {getCompanyById(selectedScreeningForStatus.companyId)?.name}
                  </span>{' '}
                  firmasının randevusunun durumunu{' '}
                  <span className="font-semibold">
                    {newStatus && getStatusBadge(newStatus).label}
                  </span>{' '}
                  olarak değiştirmek istediğinizden emin misiniz?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={confirmStatusChange}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Bulk Status Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Durum Değişikliği</DialogTitle>
            <DialogDescription>
              {selectedScreenings.size} randevunun durumunu değiştirmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Yeni Durum</Label>
              <Select value={bulkStatus || ''} onValueChange={(value) => setBulkStatus(value as Screening['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planlandı</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                  <SelectItem value="no-show">Gelmedi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={!bulkStatus}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog */}
      <Dialog open={quickEditDialogOpen} onOpenChange={setQuickEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hızlı Düzenleme</DialogTitle>
            <DialogDescription>
              Randevu bilgilerini hızlıca güncelleyin
            </DialogDescription>
          </DialogHeader>
          {selectedScreeningForEdit && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select
                  value={selectedScreeningForEdit.status}
                  onValueChange={(value) => handleQuickEdit('status', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Planlandı</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                    <SelectItem value="no-show">Gelmedi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <Select
                  value={selectedScreeningForEdit.type}
                  onValueChange={(value) => handleQuickEdit('type', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periodic">Periyodik</SelectItem>
                    <SelectItem value="initial">İşe Giriş</SelectItem>
                    <SelectItem value="special">Özel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  Detaylı düzenleme için randevu detay sayfasını kullanın
                </span>
                <Link href={`/screenings/${selectedScreeningForEdit.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Detaylı Düzenle
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}