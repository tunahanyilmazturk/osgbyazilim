"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
  'no-show': '#f97316',
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
  const [currentView, setCurrentView] = useState<View>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<CalendarEvent[]>([]);
  const [pendingMove, setPendingMove] = useState<{ event: CalendarEvent; start: Date; end: Date } | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');

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

  // Handle slot selection (create new screening)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
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

  // Handle event drop (drag & drop)
  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    // Check for conflicts
    const conflicts = checkConflicts(event, start, end);
    
    if (conflicts.length > 0) {
      setConflictingEvents(conflicts);
      setPendingMove({ event, start, end });
      setShowConflictDialog(true);
      return;
    }

    // No conflicts, proceed with move
    try {
      const newDate = moment(start).format('YYYY-MM-DD');
      const timeStart = moment(start).format('HH:mm');
      const timeEnd = moment(end).format('HH:mm');

      const response = await fetch(`/api/screenings/${event.id}`, {
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
      toast.success('Randevu başarıyla taşındı');
    } catch (error) {
      console.error('Error moving screening:', error);
      toast.error('Randevu taşınırken hata oluştu');
    }
  }, [checkConflicts, fetchData]);

  // Confirm move despite conflicts
  const confirmMoveWithConflicts = useCallback(async () => {
    if (!pendingMove) return;

    const { event, start, end } = pendingMove;

    try {
      const newDate = moment(start).format('YYYY-MM-DD');
      const timeStart = moment(start).format('HH:mm');
      const timeEnd = moment(end).format('HH:mm');

      const response = await fetch(`/api/screenings/${event.id}`, {
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
      toast.success('Randevu başarıyla taşındı', {
        description: `${conflictingEvents.length} çakışan randevu mevcut`,
      });
    } catch (error) {
      console.error('Error moving screening:', error);
      toast.error('Randevu taşınırken hata oluştu');
    } finally {
      setShowConflictDialog(false);
      setPendingMove(null);
      setConflictingEvents([]);
    }
  }, [pendingMove, conflictingEvents, fetchData]);

  // Handle event resize
  const handleEventResize = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      const newDate = moment(start).format('YYYY-MM-DD');
      const timeStart = moment(start).format('HH:mm');
      const timeEnd = moment(end).format('HH:mm');

      const response = await fetch(`/api/screenings/${event.id}`, {
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
      toast.success('Randevu süresi güncellendi');
    } catch (error) {
      console.error('Error resizing screening:', error);
      toast.error('Randevu süresi güncellenirken hata oluştu');
    }
  }, [fetchData]);

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
    <div className={`flex flex-1 flex-col gap-5 md:gap-7 p-3 md:p-5 lg:p-8 ${isFullscreen ? 'fixed inset-0 z-50 bg-background overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="rounded-[32px] border bg-linear-to-r from-background via-background/70 to-muted/40 p-5 shadow-[0_25px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planlama Merkezi</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Takvim Görünümü</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Randevuları takvim üzerinde görüntüleyin, filtreleyin ve hızlı aksiyonlarla yönetin.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-background/80"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtreler
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {[filterStatus !== 'all', filterType !== 'all', filterCompany !== 'all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-background/80"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Normal Görünüm' : 'Tam Ekran'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Link href="/screenings/new" className="w-full sm:w-auto">
                <Button className="w-full rounded-full bg-primary px-6 text-primary-foreground shadow-[0_15px_40px_rgba(79,70,229,0.35)]">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Randevu Oluştur
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Bugün', value: stats.today, icon: CalendarIcon, accent: 'from-primary/20 to-primary/5' },
            { label: 'Bu Hafta', value: stats.thisWeek, icon: Clock, accent: 'from-sky-400/20 to-sky-100/60' },
            { label: 'Bu Ay', value: stats.thisMonth, icon: Users, accent: 'from-emerald-400/20 to-emerald-50' },
            { label: 'Toplam', value: stats.total, icon: Building2, accent: 'from-muted/40 to-muted/10' },
          ].map((stat) => (
            <Card key={stat.label} className="overflow-hidden border bg-background/95">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-linear-to-br ${stat.accent}`}>
                    <stat.icon className="h-5 w-5 text-foreground/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="border bg-linear-to-br from-background via-background/80 to-muted/30">
            <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
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

      {/* Calendar */}
      <Card className="flex-1">
        <CardContent className="p-3 md:p-6" style={{ minHeight: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', minHeight: '500px' }}
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
            onView={setCurrentView}
            messages={messages}
            views={['month', 'week', 'day', 'agenda']}
            step={30}
            showMultiDayTimes
            popup
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
              agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
            }}
          />
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Randevu Detayları</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Firma</Label>
                  <p className="font-semibold">
                    {getCompanyById(selectedEvent.resource.companyId)?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Katılımcı</Label>
                  <p className="font-semibold">{selectedEvent.resource.participantName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tarih</Label>
                  <p className="font-semibold">
                    {moment(selectedEvent.start).format('DD MMMM YYYY, dddd')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Saat</Label>
                  <p className="font-semibold">
                    {moment(selectedEvent.start).format('HH:mm')} - {moment(selectedEvent.end).format('HH:mm')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Çalışan Sayısı</Label>
                  <p className="font-semibold">{selectedEvent.resource.employeeCount} kişi</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tarama Tipi</Label>
                  <Badge variant="outline">{getTypeBadge(selectedEvent.resource.type)}</Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Durum</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const statusBadge = getStatusBadge(selectedEvent.resource.status);
                      const StatusIcon = statusBadge.icon;
                      return (
                        <>
                          <StatusIcon className={`w-4 h-4 ${statusBadge.color}`} />
                          <span className="font-semibold">{statusBadge.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {selectedEvent.resource.notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Notlar</Label>
                    <p className="text-sm mt-1">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Kapat
            </Button>
            <Button onClick={() => {
              if (selectedEvent) {
                router.push(`/screenings/${selectedEvent.id}`);
              }
            }}>
              Detayları Görüntüle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Warning Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
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
                <div key={event.id} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="font-semibold text-sm">{company?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.resource.employeeCount} çalışan
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConflictDialog(false);
                setPendingMove(null);
                setConflictingEvents([]);
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

      {/* Legend */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Renk Göstergeleri</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.scheduled }} />
              <span className="text-sm">Planlandı</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.completed }} />
              <span className="text-sm">Tamamlandı</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.cancelled }} />
              <span className="text-sm">İptal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS['no-show'] }} />
              <span className="text-sm">Gelmedi</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}