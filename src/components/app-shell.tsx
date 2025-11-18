"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/contexts/auth-context";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const { status } = useAuth();
  const isCheckingAuth = status === "idle" || status === "loading";

  // If user is not authenticated, redirect to login for all routes except /login
  useEffect(() => {
    if (isLoginPage) return;
    if (isCheckingAuth) return;

    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [isCheckingAuth, isLoginPage, router, status]);

  if (!isLoginPage && isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Kullanıcı bilgileri yükleniyor…</p>
      </div>
    );
  }

  if (isLoginPage) {
    // Login sayfasında sadece içerik (login formu) gösterilsin
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-background">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <div className="relative z-10">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ErrorBoundary>
  );
}
