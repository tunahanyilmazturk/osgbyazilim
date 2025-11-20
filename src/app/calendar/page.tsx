"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Building2, 
  Users, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Download,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Setup moment locale
moment.locale('tr');
const localizer = momentLocalizer(moment);
const RawCalendar = Calendar as unknown as React.ComponentType<any>;
const BigCalendar = withDragAndDrop(RawCalendar);

type Company = {
  id: number;
  name: string;
};

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

type CalendarSlotInfo = {
  start: Date;
  end: Date;
  slots: Date[];
  action: 'select' | 'doubleClick' | 'click';
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
};

type CalendarEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Screening;
};

type CalendarToolbarProps = {
  label: string;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', date?: Date) => void;
  onView: (view: CalendarView) => void;
  view: CalendarView;
};

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
  'no-show': '#f97316',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  'no-show': 'Gelmedi',
};

const TYPE_COLORS = {
  periodic: '#6b7280',
  initial: '#06b6d4',
  special: '#ec4899',
};

const messages = {
  allDay: 'Tüm gün',
  previous: 'Önceki',
  next: 'Sonraki',
  today: 'Bugün',
  month: 'Ay',
  week: 'Hafta',
  day: 'Gün',
  agenda: 'Ajanda',
  date: 'Tarih',
  time: 'Saat',
  event: 'Etkinlik',
  noEventsInRange: 'Bu aralıkta randevu yok.',
  showMore: (total: number) => `+ ${total} daha`,
};

export default function CalendarPage() {
  const router = useRouter();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<CalendarEvent[]>([]);
  const [pendingMove, setPendingMove] = useState<{ event: CalendarEvent; start: Date; end: Date } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [alternativeSlots, setAlternativeSlots] = useState<{ start: Date; end: Date }[]>([]);

  const toggleFilters = useCallback(() => setShowFilters((prev) => !prev), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');

  const handleExport = useCallback(() => {
    toast.info('İndirme hazırlanıyor...');
    router.push('/reports');
  }, [router]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Company lookup map
  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.id, c]));
  }, [companies]);

  const getCompanyById = useCallback((id: number) => companyMap.get(id), [companyMap]);

  // Convert screenings to calendar events
  const events = useMemo(() => {
    return screenings
      .filter((screening) => {
        if (filterStatus !== 'all' && screening.status !== filterStatus) return false;
        if (filterType !== 'all' && screening.type !== filterType) return false;
        if (filterCompany !== 'all' && screening.companyId !== parseInt(filterCompany)) return false;
        return true;
      })
      .map((screening): CalendarEvent => {
        const company = getCompanyById(screening.companyId);
        const [startHour, startMinute] = screening.timeStart.split(':').map(Number);
        const [endHour, endMinute] = screening.timeEnd.split(':').map(Number);

        const start = new Date(screening.date);
        start.setHours(startHour, startMinute, 0);

        const end = new Date(screening.date);
        end.setHours(endHour, endMinute, 0);

        return {
          id: screening.id,
          title: `${company?.name || 'Bilinmeyen'} - ${screening.employeeCount} kişi`,
          start,
          end,
          resource: screening,
        };
      });
  }, [screenings, filterStatus, filterType, filterCompany, getCompanyById]);

  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterType('all');
    setFilterCompany('all');
    toast.success('Filtreler temizlendi');
  }, []);

  const hasActiveFilters = useMemo(
    () => filterStatus !== 'all' || filterType !== 'all' || filterCompany !== 'all',
    [filterStatus, filterType, filterCompany]
  );

  const activeFilterBadges = useMemo(() => {
    const badges: { key: string; label: string; value: string; onClear: () => void }[] = [];
    if (filterStatus !== 'all') {
      badges.push({
        key: 'status',
        label: 'Durum',
        value: STATUS_LABELS[filterStatus] || 'Belirtilmemiş',
        onClear: () => setFilterStatus('all'),
      });
    }
    if (filterType !== 'all') {
      const typeLabels: Record<string, string> = {
        periodic: 'Periyodik',
        initial: 'İşe Giriş',
        special: 'Özel',
      };
      badges.push({
        key: 'type',
        label: 'Tarama Tipi',
        value: typeLabels[filterType] || 'Belirtilmemiş',
        onClear: () => setFilterType('all'),
      });
    }
    if (filterCompany !== 'all') {
      const companyName = companies.find((c) => c.id === Number(filterCompany))?.name || 'Firma';
      badges.push({
        key: 'company',
        label: 'Firma',
        value: companyName,
        onClear: () => setFilterCompany('all'),
      });
    }
    return badges;
  }, [filterStatus, filterType, filterCompany, companies]);

  // Event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const screening = event.resource;
    const backgroundColor = STATUS_COLORS[screening.status];
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
      },
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  }, []);

  const handleStatusChange = useCallback(async (nextStatus: Screening['status']) => {
    if (!selectedEvent) return;

    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/screenings?id=${selectedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchData();
      setSelectedEvent((prev) =>
        prev ? { ...prev, resource: { ...prev.resource, status: nextStatus } } : prev
      );
      toast.success('Randevu durumu güncellendi');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [selectedEvent, fetchData]);

  // Handle slot selection (create new screening)
  const handleSelectSlot = useCallback((slotInfo: CalendarSlotInfo) => {
    const start = moment(slotInfo.start).format('YYYY-MM-DD');
    const time = moment(slotInfo.start).format('HH:mm');
    router.push(`/screenings/new?date=${start}&time=${time}`);
  }, [router]);

  // Check for conflicts
  const checkConflicts = useCallback((newEvent: CalendarEvent, newStart: Date, newEnd: Date): CalendarEvent[] => {
    return events.filter(event => {
      if (event.id === newEvent.id) return false;
      
      // Check if events overlap
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      const checkStart = newStart.getTime();
      const checkEnd = newEnd.getTime();
      
      return (checkStart < eventEnd && checkEnd > eventStart);
    });
  }, [events]);

  const generateAlternativeSlots = useCallback((event: CalendarEvent, desiredStart: Date, desiredEnd: Date, limit = 3) => {
    const suggestions: { start: Date; end: Date }[] = [];
    const duration = desiredEnd.getTime() - desiredStart.getTime();
    const stepMs = 30 * 60 * 1000;
    let candidateStart = new Date(desiredStart);
    let iterations = 0;

    while (suggestions.length < limit && iterations < 7 * 24 * 2) {
      candidateStart = new Date(candidateStart.getTime() + stepMs);
      const candidateEnd = new Date(candidateStart.getTime() + duration);
      const hasConflicts = checkConflicts(event, candidateStart, candidateEnd).length > 0;
      if (!hasConflicts) {
        suggestions.push({ start: candidateStart, end: candidateEnd });
      }
      iterations++;
    }

    return suggestions;
  }, [checkConflicts]);

  const persistEventUpdate = useCallback(async (
    event: CalendarEvent,
    start: Date,
    end: Date,
    successMessage: string,
    toastOptions?: { description?: string }
  ) => {
    try {
      const newDate = moment(start).format('YYYY-MM-DD');
      const timeStart = moment(start).format('HH:mm');
      const timeEnd = moment(end).format('HH:mm');

      const response = await fetch(`/api/screenings?id=${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          timeStart,
          timeEnd,
        }),
      });

      if (!response.ok) throw new Error('Failed to update screening');

      await fetchData();
      toast.success(successMessage, toastOptions);
      return true;
    } catch (error) {
      console.error('Error updating screening:', error);
      toast.error('Randevu güncellenirken hata oluştu');
      return false;
    }
  }, [fetchData]);

  // Handle event drop (drag & drop)
  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    // Check for conflicts
    const conflicts = checkConflicts(event, start, end);

    if (conflicts.length > 0) {
      setConflictingEvents(conflicts);
      setPendingMove({ event, start, end });
      setAlternativeSlots(generateAlternativeSlots(event, start, end));
      setShowConflictDialog(true);
      return;
    }

    setAlternativeSlots([]);
    await persistEventUpdate(event, start, end, 'Randevu başarıyla taşındı');
  }, [checkConflicts, generateAlternativeSlots, persistEventUpdate]);

  // Confirm move despite conflicts
  const confirmMoveWithConflicts = useCallback(async () => {
    if (!pendingMove) return;

    const { event, start, end } = pendingMove;

    await persistEventUpdate(event, start, end, 'Randevu başarıyla taşındı', {
      description: `${conflictingEvents.length} çakışan randevu mevcut`,
    });

    setShowConflictDialog(false);
    setPendingMove(null);
    setConflictingEvents([]);
    setAlternativeSlots([]);
  }, [pendingMove, conflictingEvents.length, persistEventUpdate]);

  // Handle event resize
  const handleEventResize = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    await persistEventUpdate(event, start, end, 'Randevu süresi güncellendi');
  }, [persistEventUpdate]);

  const handleApplyAlternativeSlot = useCallback(async (slot: { start: Date; end: Date }) => {
    if (!pendingMove) return;

    await persistEventUpdate(pendingMove.event, slot.start, slot.end, 'Randevu önerilen slota taşındı');

    setShowConflictDialog(false);
    setPendingMove(null);
    setConflictingEvents([]);
    setAlternativeSlots([]);
  }, [pendingMove, persistEventUpdate]);

  const getStatusBadge = useCallback((status: Screening['status']) => {
    const variants: Record<Screening['status'], { label: string; icon: any; color: string }> = {
      scheduled: { label: 'Planlandı', icon: Clock, color: 'text-blue-500' },
      completed: { label: 'Tamamlandı', icon: CheckCircle2, color: 'text-green-500' },
      cancelled: { label: 'İptal', icon: XCircle, color: 'text-red-500' },
      'no-show': { label: 'Gelmedi', icon: AlertCircle, color: 'text-orange-500' },
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

  const CalendarToolbar = useCallback((toolbar: CalendarToolbarProps) => {
    const { label, onNavigate, onView, view } = toolbar;
    const viewOptions: { key: CalendarView; label: string }[] = [
      { key: 'month', label: 'Ay' },
      { key: 'week', label: 'Hafta' },
      { key: 'day', label: 'Gün' },
      { key: 'agenda', label: 'Ajanda' },
    ];

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onNavigate('PREV')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold text-foreground">{label}</div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onNavigate('NEXT')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={() => onNavigate('TODAY')}>
              Bugün
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Yazdır
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
              <Download className="w-4 h-4" /> Dışa Aktar
            </Button>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={toggleFilters}
            >
              <Filter className="w-4 h-4" /> Filtreler
            </Button>
            <Button
              variant={isFullscreen ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={toggleFullscreen}
              title="Tam Ekran"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button asChild className="gap-1 rounded-full px-4" size="sm">
              <Link href="/screenings/new">
                <Plus className="w-4 h-4" /> Yeni Randevu
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewOptions.map((opt) => (
            <Button
              key={opt.key}
              variant={view === opt.key ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
              onClick={() => onView(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }, [handleExport, handlePrint, showFilters, isFullscreen, toggleFilters, toggleFullscreen]);

  const handleViewChange = useCallback((view: CalendarView | string) => {
    if (view === 'month' || view === 'week' || view === 'day' || view === 'agenda') {
      setCurrentView(view);
    }
  }, []);

  const AgendaEvent = useCallback(({ event }: { event: CalendarEvent }) => {
  const company = getCompanyById(event.resource.companyId);
  const statusBadge = getStatusBadge(event.resource.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="rounded-2xl border bg-card/80 p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{company?.name}</p>
          <p className="text-xs text-muted-foreground">
            {moment(event.start).format('DD MMMM YYYY, dddd')}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <StatusIcon className={`w-3.5 h-3.5 ${statusBadge.color}`} />
          <span>{statusBadge.label}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}</span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {event.resource.employeeCount} çalışan
        </span>
        <Badge variant="outline">{getTypeBadge(event.resource.type)}</Badge>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link href={`/screenings/${event.id}`}>Detayları Aç</Link>
        </Button>
      </div>
    </div>
  );
}, [getCompanyById, getStatusBadge, getTypeBadge]);

const calendarComponents = useMemo(
  () => ({ toolbar: CalendarToolbar, agenda: { event: AgendaEvent } }),
  [CalendarToolbar, AgendaEvent]
);

  // Stats
  const stats = useMemo(() => ({
    total: events.length,
    today: events.filter(e => moment(e.start).isSame(moment(), 'day')).length,
    thisWeek: events.filter(e => moment(e.start).isSame(moment(), 'week')).length,
    thisMonth: events.filter(e => moment(e.start).isSame(moment(), 'month')).length,
  }), [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Takvim yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-1 flex-col bg-linear-to-b from-background via-background to-muted/40 ${isFullscreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <div className="flex flex-1 flex-col min-h-0 gap-5 md:gap-7 p-3 md:p-5 lg:p-8 overflow-auto">
        <div className="flex flex-col gap-4 shrink-0">
        {hasActiveFilters && activeFilterBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterBadges.map((badge) => (
              <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 pr-2">
                <span className="text-xs uppercase text-muted-foreground">{badge.label}:</span>
                <span className="font-semibold text-foreground">{badge.value}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={badge.onClear}>
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
              Tüm filtreleri temizle
            </Button>
          </div>
        )}

        {showFilters && (
          <Card className="border bg-linear-to-br from-background via-background/80 to-muted/30">
            <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setCurrentView('day');
                    setCurrentDate(new Date());
                  }}
                >
                  <CalendarIcon className="w-3 h-3" /> Bugün
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setCurrentView('week');
                    setCurrentDate(new Date());
                  }}
                >
                  <Clock className="w-3 h-3" /> Bu Hafta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setCurrentView('month');
                    setCurrentDate(new Date());
                  }}
                >
                  <CalendarIcon className="w-3 h-3" /> Bu Ay
                </Button>
              </div>
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="w-full h-9 gap-1 md:gap-2"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                    Temizle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
          {/* Calendar */}
          <Card className="flex-1 min-h-0 border bg-linear-to-br from-background via-background/80 to-muted/30 shadow-sm">
            <CardContent className="flex h-full flex-col p-3 md:p-6">
              <div className="relative flex-1 min-h-0">
                {events.length === 0 && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border/70 bg-card/70 text-center p-6">
                    <div className="space-y-2">
                      <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">Henüz randevu bulunamadı</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Yeni bir randevu oluşturarak veya filtreleri temizleyerek takvimi doldurabilirsiniz.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button asChild>
                        <Link href="/screenings/new" className="gap-2">
                          <Plus className="w-4 h-4" /> Yeni Randevu Oluştur
                        </Link>
                      </Button>
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                          Filtreleri Temizle
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  eventPropGetter={eventStyleGetter}
                  selectable
                  resizable
                  draggableAccessor={() => true}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  view={currentView}
                  onView={handleViewChange}
                  messages={messages}
                  views={['month', 'week', 'day', 'agenda']}
                  step={30}
                  showMultiDayTimes
                  popup
                  components={calendarComponents}
                  formats={{
                    timeGutterFormat: 'HH:mm',
                    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                    agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Side rail for stats & legend */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="rounded-3xl border bg-card/70 px-4 py-3 shadow-sm flex flex-wrap items-center gap-2 justify-between">
              {[
                { label: 'Bugün', value: stats.today, icon: CalendarIcon },
                { label: 'Bu Hafta', value: stats.thisWeek, icon: Clock },
                { label: 'Bu Ay', value: stats.thisMonth, icon: Users },
                { label: 'Toplam', value: stats.total, icon: Building2 },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 rounded-2xl border bg-background/80 px-3 py-2 text-sm shadow-inner">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="border bg-card/80 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Renk Göstergeleri</CardTitle>
                <CardDescription className="text-xs">Durumlara göre etkinlik renkleri</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  {[{
                    label: 'Planlandı',
                    color: STATUS_COLORS.scheduled,
                  }, {
                    label: 'Tamamlandı',
                    color: STATUS_COLORS.completed,
                  }, {
                    label: 'İptal',
                    color: STATUS_COLORS.cancelled,
                  }, {
                    label: 'Gelmedi',
                    color: STATUS_COLORS['no-show'],
                  }].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Event Details Dialog */}
        {/* remains below */}

        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Randevu Detayları</DialogTitle>
              <DialogDescription>
                {selectedEvent && moment(selectedEvent.start).format('DD MMMM YYYY, dddd HH:mm')} •
                {selectedEvent && ` ${getCompanyById(selectedEvent.resource.companyId)?.name || ''}`}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="rounded-2xl border bg-card/70 p-3">
                    <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Firma</Label>
                    <p className="text-base font-semibold">
                      {getCompanyById(selectedEvent.resource.companyId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.resource.employeeCount} çalışan • {getTypeBadge(selectedEvent.resource.type)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-card/70 p-3">
                    <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Tarih & Saat</Label>
                    <p className="text-base font-semibold">
                      {moment(selectedEvent.start).format('DD MMMM YYYY, dddd')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {moment(selectedEvent.start).format('HH:mm')} - {moment(selectedEvent.end).format('HH:mm')}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-card/70 p-3">
                    <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Katılımcı</Label>
                    <p className="text-base font-semibold">{selectedEvent.resource.participantName}</p>
                  </div>
                  <div className="rounded-2xl border bg-card/70 p-3 space-y-3">
                    <div>
                      <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Durum</Label>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                        {(() => {
                          const statusBadge = getStatusBadge(selectedEvent.resource.status);
                          const StatusIcon = statusBadge.icon;
                          return (
                            <>
                              <StatusIcon className={`w-4 h-4 ${statusBadge.color}`} />
                              <span>{statusBadge.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedEvent.resource.status}
                        onValueChange={(value) => handleStatusChange(value as Screening['status'])}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Planlandı</SelectItem>
                          <SelectItem value="completed">Tamamlandı</SelectItem>
                          <SelectItem value="cancelled">İptal</SelectItem>
                          <SelectItem value="no-show">Gelmedi</SelectItem>
                        </SelectContent>
                      </Select>
                      {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                  </div>
                </div>
                {selectedEvent.resource.notes && (
                  <div className="rounded-2xl border bg-card/70 p-3">
                    <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Notlar</Label>
                    <p className="text-sm mt-2 whitespace-pre-line">{selectedEvent.resource.notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/screenings/new?companyId=${selectedEvent.resource.companyId}`)}
                  >
                    Aynı Firma İçin Yeni Randevu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/companies/${selectedEvent.resource.companyId}`)}
                  >
                    Firmayı Görüntüle
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Kapat
              </Button>
              <Button
                onClick={() => {
                  if (selectedEvent) {
                    router.push(`/screenings/${selectedEvent.id}`);
                  }
                }}
              >
                Detayları Görüntüle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conflict Warning Dialog */}
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-orange-500">
                <AlertCircle className="w-5 h-5" />
                Çakışan Randevular Tespit Edildi
              </DialogTitle>
              <DialogDescription>
                Bu zaman diliminde {conflictingEvents.length} adet çakışan randevu bulunmaktadır.
                Yine de bu randevuyu taşımak istediğinizden emin misiniz?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conflictingEvents.map((event) => {
                const company = getCompanyById(event.resource.companyId);
                return (
                  <div key={event.id} className="p-3 border rounded-xl bg-orange-50 dark:bg-orange-950/20 space-y-1">
                    <div className="font-semibold text-sm">{company?.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.resource.employeeCount} çalışan
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => router.push(`/screenings/${event.id}`)}
                    >
                      Randevuyu Aç
                    </Button>
                  </div>
                );
              })}
            </div>
            {alternativeSlots.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Önerilen Müsait Slotlar</p>
                <div className="space-y-2">
                  {alternativeSlots.map((slot) => (
                    <div
                      key={`${slot.start.toISOString()}-${slot.end.toISOString()}`}
                      className="flex flex-col gap-2 rounded-xl border p-3"
                    >
                      <div className="text-sm font-semibold">
                        {moment(slot.start).format('DD MMMM YYYY, dddd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {moment(slot.start).format('HH:mm')} - {moment(slot.end).format('HH:mm')}
                      </div>
                      <Button size="sm" className="self-start" onClick={() => handleApplyAlternativeSlot(slot)}>
                        Bu slota taşı
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConflictDialog(false);
                  setPendingMove(null);
                  setConflictingEvents([]);
                  setAlternativeSlots([]);
                }}
              >
                İptal Et
              </Button>
              <Button onClick={confirmMoveWithConflicts} variant="default">
                Yine de Taşı
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}