"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  screeningId: number | null;
  employeeId: number | null;
  isRead: boolean;
  createdAt: string;
  scheduledFor: string | null;
}

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'upcoming_screening':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'screening_today':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case 'screening_completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'screening_cancelled':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'upcoming_screening':
      return 'bg-blue-50 dark:bg-blue-950';
    case 'screening_today':
      return 'bg-orange-50 dark:bg-orange-950';
    case 'screening_completed':
      return 'bg-green-50 dark:bg-green-950';
    case 'screening_cancelled':
      return 'bg-red-50 dark:bg-red-950';
    default:
      return 'bg-muted';
  }
};

export const NotificationPanel = ({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
}: NotificationPanelProps) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Bildirimler</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} yeni
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={onMarkAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            Henüz bildirim bulunmuyor
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent/50 transition-colors ${
                  !notification.isRead ? 'bg-accent/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onMarkAsRead(notification.id)}
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(notification.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
