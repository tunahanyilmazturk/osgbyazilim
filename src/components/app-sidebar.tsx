"use client";

import * as React from "react";
import { Home, Building2, Calendar, Stethoscope, Plus, TestTube, FileText, BarChart3, User, FolderOpen, CalendarDays, Bell, UserCog, ChevronDown, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "Genel",
    items: [
      {
        title: "Ana Sayfa",
        url: "/",
        icon: Home,
      },
      {
        title: "Bildirimler",
        url: "/notifications",
        icon: Bell,
      },
    ],
  },
  {
    label: "Yönetim",
    items: [
      {
        title: "Firmalar",
        url: "/companies",
        icon: Building2,
      },
      {
        title: "Sağlık Testleri",
        url: "/health-tests",
        icon: TestTube,
      },
      {
        title: "Kullanıcı Yönetimi",
        url: "/users",
        icon: UserCog,
      },
    ],
  },
  {
    label: "Randevular",
    items: [
      {
        title: "Takvim Görünümü",
        url: "/calendar",
        icon: CalendarDays,
      },
      {
        title: "Sağlık Taraması",
        url: "/screenings",
        icon: Calendar,
      },
      {
        title: "Randevu Oluştur",
        url: "/screenings/new",
        icon: Plus,
      },
    ],
  },
  {
    label: "Dökümanlar",
    items: [
      {
        title: "Döküman Yönetimi",
        url: "/documents",
        icon: FolderOpen,
      },
    ],
  },
  {
    label: "Teklifler",
    items: [
      {
        title: "Teklif Yönetimi",
        url: "/quotes",
        icon: FileText,
      },
    ],
  },
  {
    label: "Raporlar",
    items: [
      {
        title: "Raporlama",
        url: "/reports",
        icon: BarChart3,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("OSGB Müdürü");
  const [userEmail, setUserEmail] = useState("admin@osgb.com");
  const [sidebarMetrics, setSidebarMetrics] = useState({
    unreadNotifications: 0,
    todayScreenings: 0,
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { user: currentUser } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed-groups");
    if (savedState) {
      try {
        setCollapsedGroups(JSON.parse(savedState));
      } catch (error) {
        console.error("Sidebar collapse state parse error", error);
      }
    }
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("sidebar-collapsed-groups", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const loadFromLocalSettings = () => {
      const savedSettings = localStorage.getItem("app-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.userName) setUserName(parsed.userName);
          if (parsed.userEmail) setUserEmail(parsed.userEmail);
        } catch (e) {
          console.error("Error loading user info:", e);
        }
      }
    };

    if (currentUser) {
      setUserName(currentUser.fullName);
      setUserEmail(currentUser.email);
    } else {
      loadFromLocalSettings();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-settings") {
        loadFromLocalSettings();
      }
    };

    const handleSettingsUpdate = () => {
      loadFromLocalSettings();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    const fetchSidebarMetrics = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [notificationsRes, screeningsRes] = await Promise.all([
          fetch("/api/notifications?isRead=false&limit=1000"),
          fetch(`/api/screenings?status=scheduled&date=${today}&limit=1000`),
        ]);

        const [notificationsData, screeningsData] = await Promise.all([
          notificationsRes.ok ? notificationsRes.json() : [],
          screeningsRes.ok ? screeningsRes.json() : [],
        ]);

        if (!isMounted) return;
        setSidebarMetrics({
          unreadNotifications: Array.isArray(notificationsData) ? notificationsData.length : 0,
          todayScreenings: Array.isArray(screeningsData) ? screeningsData.length : 0,
        });
      } catch (error) {
        console.error("Sidebar metrics fetch error:", error);
      }
    };

    fetchSidebarMetrics();
    const interval = setInterval(fetchSidebarMetrics, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getBadgeCount = (url: string) => {
    if (url === "/notifications") return sidebarMetrics.unreadNotifications;
    if (url === "/screenings" || url === "/calendar") return sidebarMetrics.todayScreenings;
    return 0;
  };

  const filteredMenuGroups = useMemo(() => menuGroups, []);

  const groupBadges = useMemo(() => ({
    Genel: sidebarMetrics.unreadNotifications > 0 ? `${sidebarMetrics.unreadNotifications} yeni` : null,
    Randevular: sidebarMetrics.todayScreenings > 0 ? `${sidebarMetrics.todayScreenings} bugün` : null,
  }), [sidebarMetrics]);

  const handleNavigate = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b px-3 py-3 gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border bg-sidebar px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-semibold text-sidebar-foreground">ISGOne AI</h2>
            <p className="text-xs text-muted-foreground">OSGB Yönetim Sistemi</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2.5 py-2.5 gap-2">
        {isMobile && (
          <div className="mb-2 flex gap-2">
            <Button asChild size="sm" className="w-1/2" onClick={handleNavigate}>
              <Link href="/screenings/new">
                <CalendarPlus className="h-4 w-4" />
                Yeni
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-1/2" onClick={handleNavigate}>
              <Link href="/calendar">
                <CalendarDays className="h-4 w-4" />
                Takvim
              </Link>
            </Button>
          </div>
        )}
        {/* Menu Groups */}
        {filteredMenuGroups.map((group) => (
          <div key={group.label} className="mt-2 first:mt-0">
            <SidebarGroup className="p-1.5">
              <SidebarGroupLabel className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span>{group.label}</span>
                <div className="flex items-center gap-2">
                  {groupBadges[group.label as keyof typeof groupBadges] && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                      {groupBadges[group.label as keyof typeof groupBadges]}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${group.label} bölümünü ${collapsedGroups[group.label] ? "aç" : "kapat"}`}
                    className="rounded-full p-1 hover:bg-muted"
                    onClick={() => toggleGroup(group.label)}
                  >
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform",
                      collapsedGroups[group.label] && "rotate-180"
                    )} />
                  </button>
                </div>
              </SidebarGroupLabel>
              {!collapsedGroups[group.label] && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.url;
                      const isPrimaryAction = item.url === "/screenings/new";
                      const badgeCount = getBadgeCount(item.url);
                      const showBadge = badgeCount > 0;

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className="rounded-lg px-2.5 py-1.5 text-sm hover:bg-sidebar-accent"
                          >
                            <Link href={item.url} onClick={handleNavigate}>
                              <item.icon className="w-4 h-4" />
                              <span className="flex-1 text-sm group-data-[collapsible=icon]:hidden whitespace-nowrap">
                                {item.title}
                              </span>
                              {isPrimaryAction && <span className="text-[10px] uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">Yeni</span>}
                              {showBadge && (
                                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold group-data-[collapsible=icon]:hidden">
                                  {badgeCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{userName}</span>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
            {currentUser?.role && (
              <span className="text-[10px] uppercase text-muted-foreground tracking-wide">{currentUser.role}</span>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}