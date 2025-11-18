"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, Clock, ArrowRight, Activity, Loader2, Stethoscope, TrendingUp, TrendingDown, CheckCircle2, XCircle, MinusCircle, RefreshCw, Filter, X, BarChart3, Target, Timer, Percent, Users2, Bell, AlertCircle, FileWarning, CalendarDays, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

// Lazy load chart components for better performance
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });

type Company = {
  id: number;
  name: string;
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

type DocumentStats = {
  totalDocuments: number;
  expiringWithin30Days: number;
  expiredCount: number;
};

type ExpiringDocument = {
  id: number;
  title: string;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  company: { name: string } | null;
  employee: { fullName: string } | null;
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

// Chart Skeleton Component
const ChartSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-[300px] w-full" />
  </div>
);

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'analytics'>('overview');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companiesRes, screeningsRes, docStatsRes, expiringRes] = await Promise.all([
        fetch('/api/companies?limit=1000'),
        fetch('/api/screenings?limit=1000'),
        fetch('/api/documents/stats'),
        fetch('/api/documents/expiring?days=30'),
      ]);

      if (!companiesRes.ok || !screeningsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [companiesData, screeningsData, docStatsData, expiringData] = await Promise.all([
        companiesRes.json(),
        screeningsRes.json(),
        docStatsRes.ok ? docStatsRes.json() : null,
        expiringRes.ok ? expiringRes.json() : [],
      ]);

      setCompanies(companiesData);
      setScreenings(screeningsData);
      setDocumentStats(docStatsData);
      setExpiringDocuments(expiringData);
    } catch (error) {
      logger.error('Dashboard veri yükleme hatası', error, {
        endpoints: ['companies', 'screenings', 'documents'],
        timestamp: new Date().toISOString(),
      });
      toast.error('Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    if (!autoRefresh) {
      toast.success('Veriler güncellendi');
    }
  }, [fetchData, autoRefresh]);

  const clearDateFilter = useCallback(() => {
    setDateRange({ start: '', end: '' });
    toast.success('Filtre temizlendi');
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, handleRefresh]);

  // Memoized filtered screenings
  const filteredScreenings = useMemo(() => {
    if (!dateRange.start && !dateRange.end) {
      return screenings;
    }

    return screenings.filter(s => {
      const screeningDate = new Date(s.date);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;

      if (startDate && endDate) {
        return screeningDate >= startDate && screeningDate <= endDate;
      } else if (startDate) {
        return screeningDate >= startDate;
      } else if (endDate) {
        return screeningDate <= endDate;
      }
      return true;
    });
  }, [screenings, dateRange]);

  const isDateFilterActive = dateRange.start !== '' || dateRange.end !== '';

  // Memoized company lookup
  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.id, c]));
  }, [companies]);

  const screeningStats = useMemo(() => {
    const statusCounts: Record<Screening['status'], number> = {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      'no-show': 0,
    };
    const typeCounts: Record<Screening['type'], number> = {
      periodic: 0,
      initial: 0,
      special: 0,
    };
    const companyCounts = new Map<number, number>();
    let participantsTotal = 0;

    filteredScreenings.forEach((screening) => {
      statusCounts[screening.status] = (statusCounts[screening.status] ?? 0) + 1;
      typeCounts[screening.type] = (typeCounts[screening.type] ?? 0) + 1;
      participantsTotal += screening.employeeCount;

      companyCounts.set(
        screening.companyId,
        (companyCounts.get(screening.companyId) ?? 0) + 1
      );
    });

    const total = filteredScreenings.length;
    const completionRate = total === 0 ? 0 : Math.round((statusCounts.completed / total) * 100);
    const avgParticipants = total === 0 ? 0 : Math.round(participantsTotal / total);

    const statusData = [
      { name: 'Planlandı', value: statusCounts.scheduled, color: STATUS_COLORS.scheduled },
      { name: 'Tamamlandı', value: statusCounts.completed, color: STATUS_COLORS.completed },
      { name: 'İptal', value: statusCounts.cancelled, color: STATUS_COLORS.cancelled },
      { name: 'Gelmedi', value: statusCounts['no-show'], color: STATUS_COLORS['no-show'] },
    ].filter(item => item.value > 0);

    const typeData = [
      { name: 'Periyodik', value: typeCounts.periodic, color: TYPE_COLORS.periodic },
      { name: 'İşe Giriş', value: typeCounts.initial, color: TYPE_COLORS.initial },
      { name: 'Özel', value: typeCounts.special, color: TYPE_COLORS.special },
    ].filter(item => item.value > 0);

    const topCompanies = Array.from(companyCounts.entries())
      .map(([companyId, count]) => ({
        name: companyMap.get(companyId)?.name || 'Bilinmeyen Firma',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      statusCounts,
      completionRate,
      avgParticipants,
      statusData,
      typeData,
      topCompanies,
    };
  }, [companyMap, filteredScreenings]);

  const {
    statusCounts,
    completionRate,
    avgParticipants,
    statusData,
    typeData,
    topCompanies,
  } = screeningStats;

  const getCompanyById = useCallback((id: number) => companyMap.get(id), [companyMap]);

  // NEW: Today's screenings
  const todayScreenings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return filteredScreenings.filter(s => {
      const screeningDate = new Date(s.date);
      return screeningDate >= today && screeningDate < tomorrow;
    }).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [filteredScreenings]);

  // Memoized upcoming screenings
  const upcomingScreenings = useMemo(() => {
    const now = new Date();
    return filteredScreenings
      .filter(s => {
        const screeningDate = new Date(s.date);
        return screeningDate >= now && s.status === 'scheduled';
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [filteredScreenings]);

  // Memoized status counts
  // NEW: Weekly comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = filteredScreenings.filter(s => {
      const date = new Date(s.date);
      return date >= oneWeekAgo && date <= now;
    }).length;

    const lastWeek = filteredScreenings.filter(s => {
      const date = new Date(s.date);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).length;

    const change = lastWeek === 0 ? 0 : ((thisWeek - lastWeek) / lastWeek) * 100;

    return { thisWeek, lastWeek, change: Math.round(change), isPositive: change >= 0 };
  }, [filteredScreenings]);

  // NEW: Recent activity feed
  const recentActivity = useMemo(() => {
    return filteredScreenings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(screening => {
        const company = getCompanyById(screening.companyId);
        return {
          ...screening,
          companyName: company?.name || 'Bilinmeyen Firma',
        };
      });
  }, [filteredScreenings, getCompanyById]);

  // NEW: This month target (example: 50 screenings)
  const monthlyTarget = useMemo(() => {
    const target = 50;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthCount = filteredScreenings.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    const progress = Math.round((thisMonthCount / target) * 100);
    return { target, current: thisMonthCount, progress: Math.min(progress, 100) };
  }, [filteredScreenings]);

  const heroStats = useMemo(
    () => [
      {
        label: 'Bugün',
        value: todayScreenings.length.toString(),
        helper: 'planlanan randevu',
        accent: 'from-primary/30 via-primary/10 to-background/60',
      },
      {
        label: 'Bu Hafta',
        value: weeklyComparison.thisWeek.toString(),
        helper: weeklyComparison.isPositive
          ? `%${Math.abs(weeklyComparison.change)} artış`
          : `%${Math.abs(weeklyComparison.change)} düşüş`,
        accent: 'from-blue-400/25 via-blue-500/10 to-background/60',
      },
      {
        label: 'Tamamlanma',
        value: `${screeningStats.completionRate}%`,
        helper: 'başarı oranı',
        accent: 'from-emerald-400/30 via-emerald-500/10 to-background/60',
      },
      {
        label: 'Aylık Hedef',
        value: `${monthlyTarget.progress}%`,
        helper: `${monthlyTarget.current}/${monthlyTarget.target} tamamlandı`,
        accent: 'from-purple-400/25 via-purple-500/10 to-background/60',
      },
    ],
    [todayScreenings.length, weeklyComparison, completionRate, monthlyTarget]
  );

  // NEW: Weekly trend data
  const weeklyTrendData = useMemo(() => {
    const weeks = ['4 Hafta Önce', '3 Hafta Önce', '2 Hafta Önce', 'Geçen Hafta', 'Bu Hafta'];
    const now = new Date();
    
    return weeks.map((week, index) => {
      const weekStart = new Date(now.getTime() - (4 - index) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - (3 - index) * 7 * 24 * 60 * 60 * 1000);
      
      const count = filteredScreenings.filter(s => {
        const date = new Date(s.date);
        return date >= weekStart && date < weekEnd;
      }).length;
      
      return { week, tarama: count };
    });
  }, [filteredScreenings]);

  // Memoized monthly screenings data
  const monthlyData = useMemo(() => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => ({
      month,
      tarama: filteredScreenings.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      }).length,
    }));
  }, [filteredScreenings]);

  // Memoized status distribution
  // Memoized trend calculation
  const screeningsTrend = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthScreenings = filteredScreenings.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    const lastMonthScreenings = filteredScreenings.filter(s => {
      const date = new Date(s.date);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;
    
    if (lastMonthScreenings === 0) return { trend: 0, isPositive: true };
    const change = ((currentMonthScreenings - lastMonthScreenings) / lastMonthScreenings) * 100;
    return { trend: Math.abs(Math.round(change)), isPositive: change >= 0 };
  }, [filteredScreenings]);

  // NEW: Critical alerts
  const alerts = useMemo(() => {
    const alertList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for today's screenings
    const todayCount = todayScreenings.length;
    if (todayCount > 0) {
      alertList.push({
        type: 'info' as const,
        title: 'Bugünkü Randevular',
        message: `${todayCount} adet randevu bugün gerçekleşecek`,
        icon: Calendar,
      });
    }

    // Check for overdue screenings
    const overdueCount = filteredScreenings.filter(s => {
      const screeningDate = new Date(s.date);
      return screeningDate < today && s.status === 'scheduled';
    }).length;

    if (overdueCount > 0) {
      alertList.push({
        type: 'warning' as const,
        title: 'Geçmiş Randevular',
        message: `${overdueCount} adet geçmiş randevu güncellenmeli`,
        icon: AlertCircle,
      });
    }

    // Check for no-show rate
    const noShowRate = (screeningStats.statusCounts['no-show'] / filteredScreenings.length) * 100;
    if (noShowRate > 15 && screeningStats.statusCounts['no-show'] > 0) {
      alertList.push({
        type: 'warning' as const,
        title: 'Yüksek Gelmeme Oranı',
        message: `%${noShowRate.toFixed(0)} gelmeme oranı tespit edildi`,
        icon: AlertCircle,
      });
    }

    // NEW: Document expiry alerts
    if (documentStats) {
      if (documentStats.expiredCount > 0) {
        alertList.push({
          type: 'warning' as const,
          title: 'Süresi Dolmuş Dökümanlar',
          message: `${documentStats.expiredCount} dökümanın süresi dolmuş, güncelleme gerekiyor`,
          icon: FileWarning,
        });
      }
      
      if (documentStats.expiringWithin30Days > 0) {
        alertList.push({
          type: 'info' as const,
          title: 'Süresi Dolacak Dökümanlar',
          message: `${documentStats.expiringWithin30Days} dökümanın süresi 30 gün içinde dolacak`,
          icon: AlertCircle,
        });
      }
    }

    return alertList;
  }, [todayScreenings, filteredScreenings, statusCounts, documentStats]);

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

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'no-show':
        return <MinusCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Planlandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'no-show':
        return 'Gelmedi';
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6 bg-linear-to-b from-background to-muted/60">
      {/* Header with Actions */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90">
            ISGOne AI Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Genel bakış ve istatistikler
            {autoRefresh && (
              <Badge variant="secondary" className="ml-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Otomatik Güncelleme Aktif</span>
                  <span className="sm:hidden">Aktif</span>
                </div>
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/80 rounded-lg border border-border/70">
            <Button
              variant={selectedView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('overview')}
              className="h-8 text-xs md:text-sm"
            >
              <Activity className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden sm:inline">Genel</span>
            </Button>
            <Button
              variant={selectedView === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('analytics')}
              className="h-8 text-xs md:text-sm"
            >
              <BarChart3 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden sm:inline">Analizler</span>
            </Button>
          </div>

          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAutoRefresh(!autoRefresh);
              toast.success(autoRefresh ? 'Otomatik güncelleme kapatıldı' : 'Otomatik güncelleme açıldı (30 saniye)');
            }}
            className="gap-1 h-8 text-xs md:text-sm"
          >
            <Bell className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">{autoRefresh ? 'Aktif' : 'Oto-Güncelleme'}</span>
          </Button>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs md:text-sm">
                <Filter className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Tarih Filtresi</span>
                {isDateFilterActive && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] border border-border/60">
                    Aktif
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Tarih Aralığı</h4>
                  {isDateFilterActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                      className="h-8 px-2"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Temizle
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Başlangıç Tarihi</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Bitiş Tarihi</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, end: e.target.value })
                      }
                    />
                  </div>
                </div>
                {isDateFilterActive && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {filteredScreenings.length} tarama gösteriliyor
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1 h-8"
          >
            <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
        </div>
      </div>

      {/* Hero Summary */}
      <section className="rounded-3xl border bg-card p-3 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 lg:max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Anlık Durum</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Operasyon Kontrol Merkezi</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Bugünün randevularını, hedef ilerlemesini ve kritik uyarıları tek bakışta izleyin.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/screenings/new" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Yeni Randevu Planla
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/reports" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Raporları Gör
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border bg-background px-4 py-3 text-foreground">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Filter Badge */}
      {isDateFilterActive && (
        <div className="flex items-center gap-2 p-2 md:p-3 bg-muted/80 rounded-lg border border-border/70">
          <Filter className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
          <span className="text-xs md:text-sm font-medium">
            Filtre aktif:
          </span>
          <span className="text-xs md:text-sm text-muted-foreground truncate flex-1">
            {dateRange.start && `${new Date(dateRange.start).toLocaleDateString('tr-TR')}`}
            {dateRange.start && dateRange.end && ' - '}
            {dateRange.end && `${new Date(dateRange.end).toLocaleDateString('tr-TR')}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateFilter}
            className="ml-auto h-6 px-2 shrink-0"
          >
            <X className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert, index) => {
            const Icon = alert.icon;
            return (
              <Card
                key={index}
                className={`border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)] ${
                  alert.type === 'warning'
                    ? 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                    : 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                }`}
              >
                <CardContent className="pt-3 md:pt-4 p-3 md:p-6">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div
                      className={`p-1.5 md:p-2 rounded-lg ${
                        alert.type === 'warning'
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}
                    >
                      <Icon
                        className={`w-3 h-3 md:w-4 md:h-4 ${
                          alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs md:text-sm">{alert.title}</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedView === 'overview' ? (
        <>
          {/* Quick Actions */}
          <Card className="border">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base md:text-lg font-semibold tracking-tight">
                Hızlı İşlemler
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-muted-foreground">
                Sık kullanılan aksiyonlara anında erişim
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/calendar">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-3 border-border hover:border-foreground/40 hover:bg-muted transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <CalendarDays className="w-4 h-4 text-foreground/80" />
                      </div>
                      <div className="text-left text-sm">
                        <div className="font-semibold">Takvim</div>
                        <div className="text-xs text-muted-foreground">Planları görüntüle</div>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Link href="/screenings/new">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-3 border-border hover:border-primary hover:bg-primary/5 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left text-sm">
                        <div className="font-semibold">Yeni Randevu</div>
                        <div className="text-xs text-muted-foreground">Tarama planla</div>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Link href="/companies">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-3 border-border hover:border-blue-500 hover:bg-blue-50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-left text-sm">
                        <div className="font-semibold">Firmalar</div>
                        <div className="text-xs text-muted-foreground">{companies.length} kayıt</div>
                      </div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Primary Stats Cards */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Toplam Tarama
                </CardTitle>
                <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
                  <Activity className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                <div className="text-xl md:text-3xl font-bold">{filteredScreenings.length}</div>
                <div className="flex items-center text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                  {screeningsTrend.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                  )}
                  <span className={screeningsTrend.isPositive ? 'text-green-500' : 'text-red-500'}>
                    {screeningsTrend.trend}%
                  </span>
                  <span className="ml-1">geçen aya göre</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Bu Hafta
                </CardTitle>
                <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{weeklyComparison.thisWeek}</div>
                <div className="flex items-center text-[10px] md:text-xs text-muted-foreground mt-1">
                  {weeklyComparison.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                  )}
                  <span className={weeklyComparison.isPositive ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(weeklyComparison.change)}%
                  </span>
                  <span className="ml-1">geçen haftaya göre</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Tamamlanma Oranı
                </CardTitle>
                <div className="p-1.5 md:p-2 bg-green-500/10 rounded-lg">
                  <Percent className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{completionRate}%</div>
                <Progress value={completionRate} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Ort. Katılımcı
                </CardTitle>
                <div className="p-1.5 md:p-2 bg-muted/60 rounded-lg">
                  <Users2 className="h-3 w-3 md:h-4 md:w-4 text-foreground/80" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{avgParticipants}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tarama başına ortalama
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Target */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Aylık Hedef
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Bu ay için tarama hedefi</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm md:text-lg px-2 md:px-3 py-0.5 md:py-1 w-fit">
                  {monthlyTarget.current} / {monthlyTarget.target}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground">İlerleme</span>
                  <span className="font-bold">{monthlyTarget.progress}%</span>
                </div>
                <Progress value={monthlyTarget.progress} className="h-3" />
                <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground pt-1">
                  <span>Kalan: {monthlyTarget.target - monthlyTarget.current} tarama</span>
                  <span>
                    {monthlyTarget.progress >= 100 ? '🎉 Hedef tamamlandı!' : ''}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule and Status Summary */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Today's Screenings */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      Bugünkü Randevular
                    </CardTitle>
                    <CardDescription>
                      {new Date().toLocaleDateString('tr-TR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {todayScreenings.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {todayScreenings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Bugün randevu yok</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {todayScreenings.map((screening) => {
                      const company = getCompanyById(screening.companyId);
                      return (
                        <Link key={screening.id} href={`/screenings/${screening.id}`}>
                          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                            <div className="flex flex-col items-center justify-center min-w-[60px] rounded-lg bg-muted px-3 py-2 text-primary">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold text-sm">{screening.timeStart}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{company?.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Users2 className="w-3 h-3" />
                                {screening.employeeCount} katılımcı
                              </div>
                            </div>
                            <Badge variant="outline">{getStatusText(screening.status)}</Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Summary Cards Grid */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Planlandı</CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.scheduled}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((statusCounts.scheduled / filteredScreenings.length) * 100 || 0).toFixed(0)}% toplam
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Tamamlandı</CardTitle>
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.completed}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((statusCounts.completed / filteredScreenings.length) * 100 || 0).toFixed(0)}% toplam
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">İptal Edildi</CardTitle>
                  <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.cancelled}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((statusCounts.cancelled / filteredScreenings.length) * 100 || 0).toFixed(0)}% toplam
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Gelmedi</CardTitle>
                  <MinusCircle className="w-3 h-3 md:h-4 md:w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts['no-show']}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((statusCounts['no-show'] / filteredScreenings.length) * 100 || 0).toFixed(0)}% toplam
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Section: Upcoming, Recent Activity & Expiring Documents */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Upcoming Screenings */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Yaklaşan Randevular</CardTitle>
                    <CardDescription>Önümüzdeki randevular</CardDescription>
                  </div>
                  <Link href="/screenings">
                    <Button variant="ghost" size="sm">
                      Tümü
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {upcomingScreenings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Yaklaşan randevu yok</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingScreenings.slice(0, 5).map((screening) => {
                      const company = getCompanyById(screening.companyId);
                      const screeningDate = new Date(screening.date);
                      
                      return (
                        <Link key={screening.id} href={`/screenings/${screening.id}`}>
                          <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                            <div className="flex flex-col items-center justify-center min-w-[50px] p-2 bg-primary/10 rounded-lg">
                              <div className="text-xs text-muted-foreground font-medium">
                                {screeningDate.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}
                              </div>
                              <div className="text-lg font-bold text-primary">
                                {screeningDate.getDate()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{company?.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{screening.timeStart}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Son Aktiviteler</CardTitle>
                    <CardDescription>Güncel işlemler</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 border-b last:border-0 hover:bg-accent/30 rounded transition-colors">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getStatusText(activity.status)} • {new Date(activity.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expiring Documents */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileWarning className="w-5 h-5 text-orange-500" />
                      Süre Dolacak Dökümanlar
                    </CardTitle>
                    <CardDescription>30 gün içinde</CardDescription>
                  </div>
                  <Link href="/documents">
                    <Button variant="ghost" size="sm">
                      Tümü
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {expiringDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Süre dolacak döküman yok</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {expiringDocuments.slice(0, 8).map((doc) => (
                      <div key={doc.id} className="flex items-start gap-3 p-2 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${doc.isExpired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                          {doc.isExpired ? (
                            <FileWarning className="w-4 h-4 text-red-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {doc.isExpired ? (
                                <span className="text-red-500">Süresi doldu</span>
                              ) : (
                                <span className="text-orange-500">{doc.daysUntilExpiry} gün kaldı</span>
                              )}
                            </Badge>
                          </div>
                          {(doc.company || doc.employee) && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {doc.company?.name || doc.employee?.fullName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Analytics View */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base md:text-lg">Detaylı Analizler</CardTitle>
              <CardDescription className="text-xs md:text-sm">Tarama verilerinizin grafiksel gösterimi</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <Tabs defaultValue="monthly" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                  <TabsTrigger value="monthly" className="text-xs md:text-sm py-2">Aylık</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs md:text-sm py-2">Haftalık</TabsTrigger>
                  <TabsTrigger value="status" className="text-xs md:text-sm py-2">Durum</TabsTrigger>
                  <TabsTrigger value="type" className="text-xs md:text-sm py-2">Tip</TabsTrigger>
                </TabsList>

                <TabsContent value="monthly" className="space-y-4">
                  {typeof window === 'undefined' ? (
                    <ChartSkeleton />
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[500px]">
                        <ResponsiveContainer width="100%" height={250} className="md:h-[350px]">
                          <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))'
                              }}
                            />
                            <Bar dataKey="tarama" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="weekly" className="space-y-4">
                  {typeof window === 'undefined' ? (
                    <ChartSkeleton />
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[500px]">
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={weeklyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="tarama" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  {typeof window === 'undefined' ? (
                    <ChartSkeleton />
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[400px]">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={120}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="type" className="space-y-4">
                  {typeof window === 'undefined' ? (
                    <ChartSkeleton />
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[400px]">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={typeData}
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                              label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                              {typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Top Companies Chart */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base md:text-lg">En Aktif Firmalar</CardTitle>
              <CardDescription className="text-xs md:text-sm">Firma bazlı tarama sayıları</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {typeof window === 'undefined' ? (
                <ChartSkeleton />
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[500px]">
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <BarChart data={topCompanies} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150} 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--popover-foreground))'
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}