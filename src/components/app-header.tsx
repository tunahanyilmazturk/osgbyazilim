"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Moon, Sun, User, LogOut, CalendarPlus, CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsPopover } from "@/components/notifications-popover";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "user" | "viewer";
};

export function AppHeader() {
  const router = useRouter();
  const { user: currentUser, status, logout: contextLogout } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userName, setUserName] = useState("OSGB Müdürü");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load user name from localStorage as fallback and sync with settings
  useEffect(() => {
    const loadUserInfoFromSettings = () => {
      const savedSettings = localStorage.getItem("app-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.userName) setUserName(parsed.userName);
        } catch (e) {
          console.error("Error loading user info:", e);
        }
      }
    };

    // Load on mount
    loadUserInfoFromSettings();

    // Listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-settings") {
        loadUserInfoFromSettings();
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleSettingsUpdate = () => {
      loadUserInfoFromSettings();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, []);

  // Sync displayed name with authenticated user when available
  useEffect(() => {
    if (currentUser?.fullName) {
      setUserName(currentUser.fullName);
    }
  }, [currentUser?.fullName]);

  const getRoleLabel = (role: CurrentUser["role"] | undefined) => {
    switch (role) {
      case "admin":
        return "Müdür";
      case "manager":
        return "Yönetici";
      case "user":
        return "Kullanıcı";
      case "viewer":
        return "Görüntüleyici";
      default:
        return "";
    }
  };

  const canManageSettings = currentUser?.role === "admin" || currentUser?.role === "manager";

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogout = async () => {
    await contextLogout();
    router.push("/login");
  };

  const formattedDate = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel = status === "authenticated" ? "Aktif" : status === "loading" ? "Doğrulanıyor" : "Pasif";

  return (
    <header className="sticky top-0 z-20 border-b bg-linear-to-r from-background via-background/95 to-background/90 px-4 py-2 shadow-[0_6px_25px_-18px_rgba(15,23,42,0.8)] backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
      <div className="flex h-14 items-center gap-4">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <SidebarTrigger className="rounded-2xl border bg-background/80 px-2.5 py-1.5 shadow-sm hover:bg-background" />
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80">Kontrol Merkezi</span>
            <h1 className="text-base font-semibold text-foreground">OSGB Yönetim Sistemi</h1>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">{formattedTime}</span>
          </div>
          {currentUser?.role && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{getRoleLabel(currentUser.role)}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className={
                status === "authenticated"
                  ? "h-2 w-2 rounded-full bg-emerald-500"
                  : "h-2 w-2 rounded-full bg-amber-500"
              }
            />
            <span>{statusLabel}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === "light" ? "Koyu Tema" : "Açık Tema"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {canManageSettings && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Ayarlar">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ayarlar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Genel Ayarlar</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <NotificationsPopover />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Profil">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  {currentUser && <p className="text-xs leading-none text-muted-foreground">{getRoleLabel(currentUser.role)}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManageSettings && (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild size="sm" className="gap-2 rounded-full px-4">
                <Link href="/screenings/new" className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Yeni Randevu
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2 rounded-full px-4">
                <Link href="/calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Takvim
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}