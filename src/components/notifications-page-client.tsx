"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { NotificationPanel } from "@/components/NotificationPanel";

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

export const NotificationsPageClient = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications?limit=100");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error(e);
      toast.error("Bildirimler yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error("Update failed");
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      toast.success("Bildirim okundu olarak işaretlendi");
    } catch (e) {
      console.error(e);
      toast.error("Bildirim güncellenemedi");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications?id=${n.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Tüm bildirimler okundu");
    } catch (e) {
      console.error(e);
      toast.error("İşlem başarısız");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Bildirim silindi");
    } catch (e) {
      console.error(e);
      toast.error("Bildirim silinemedi");
    }
  };

  return (
    <NotificationPanel
      notifications={notifications}
      isLoading={isLoading}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDelete={handleDelete}
      onRefresh={fetchNotifications}
    />
  );
};
