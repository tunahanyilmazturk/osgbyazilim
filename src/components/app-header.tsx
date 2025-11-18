"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Moon, Sun, User, LogOut, CalendarPlus, CalendarDays } from "lucide-react";
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

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
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

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="rounded-full border bg-background px-2 py-1" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kontrol Merkezi</span>
          <h1 className="text-base font-semibold text-foreground">OSGB Yönetim Sistemi</h1>
        </div>
      </div>

      <div className="ml-auto flex flex-1 items-center justify-end gap-3">
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
        <div className="hidden sm:flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/screenings/new" className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Yeni Randevu
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Takvim
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}