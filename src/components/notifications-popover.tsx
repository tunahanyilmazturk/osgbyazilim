"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Building2, User, Users, Loader2, Check, Trash2, X, CheckCheck } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  screeningId: number | null;
  employeeId: number | null;
  isRead: boolean;
  createdAt: string;
  scheduledFor: string | null;
};

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
};

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    // Refresh every 2 minutes
    const interval = setInterval(fetchData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [notificationsRes, screeningsRes, companiesRes] = await Promise.all([
        fetch('/api/notifications?limit=50'),
        fetch('/api/screenings?limit=1000'),
        fetch('/api/companies?limit=1000'),
      ]);

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData);
      }

      if (screeningsRes.ok) {
        const screeningsData = await screeningsRes.json();
        setScreenings(screeningsData);
      }

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        toast.success('Bildirim okundu olarak işaretlendi');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Bildirim güncellenirken hata oluştu');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      await Promise.all(
        unreadNotifications.map(n =>
          fetch(`/api/notifications?id=${n.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Bildirimler güncellenirken hata oluştu');
    }
  };

  const deleteNotification = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Bildirim silindi');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Bildirim silinirken hata oluştu');
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Promise.all(
        notifications.map(n =>
          fetch(`/api/notifications?id=${n.id}`, {
            method: 'DELETE',
          })
        )
      );

      setNotifications([]);
      toast.success('Tüm bildirimler temizlendi');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Bildirimler temizlenirken hata oluştu');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.screeningId) {
      setNotificationsOpen(false);
      router.push(`/screenings/${notification.screeningId}`);
    }
  };

  const getScreeningById = (id: number | null) => {
    if (!id) return null;
    return screenings.find(s => s.id === id);
  };

  const getCompanyById = (id: number) => companies.find(c => c.id === id);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upcoming_screening':
      case 'screening_today':
        return <Clock className="w-5 h-5 text-primary" />;
      case 'screening_completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'screening_cancelled':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Bildirimler</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 px-2 text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Tümünü Okundu İşaretle
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {notifications.length} Toplam
            </Badge>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} Okunmamış
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Bildirim yok</p>
              <p className="text-xs mt-1">Henüz bildiriminiz bulunmuyor</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const screening = getScreeningById(notification.screeningId);
                const company = screening ? getCompanyById(screening.companyId) : null;
                
                return (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer relative ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm">
                            {notification.title}
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 bg-primary rounded-full ml-2" />
                            )}
                          </p>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => markAsRead(notification.id, e)}
                                className="h-6 w-6 p-0"
                                title="Okundu işaretle"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="h-6 w-6 p-0"
                              title="Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        {screening && (
                          <div className="space-y-1 mb-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(screening.date).toLocaleDateString('tr-TR')} - {screening.timeStart}</span>
                            </div>
                            {company && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 className="w-3 h-3" />
                                <span className="truncate">{company.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}