import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { Theme } from "@radix-ui/themes";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "ISGOne AI - OSGB Yönetim Sistemi",
  description: "ISGOne AI ile iş sağlığı ve güvenliği sağlık taraması ve personel yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <Theme
          appearance="inherit"
          accentColor="gray"
          grayColor="gray"
          radius="medium"
        >
          <AuthProvider>
            <ErrorReporter />
            <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
            />
            <AppShell>{children}</AppShell>
            <Toaster />
            <VisualEditsMessenger />
          </AuthProvider>
        </Theme>
      </body>
    </html>
  );
}