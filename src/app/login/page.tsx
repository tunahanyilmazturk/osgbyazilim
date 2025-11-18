"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const raw = searchParams.get("redirect");
    if (!raw) return "/";
    if (!raw.startsWith("/") || raw.startsWith("//")) {
      return "/";
    }
    return raw;
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Lütfen e-posta ve şifreyi girin");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Giriş yapılamadı", {
          description: data.code === "USER_INACTIVE" ? "Kullanıcı devre dışı bırakılmış" : undefined,
        });
        return;
      }

      toast.success("Giriş başarılı", {
        description: `${data.fullName} (${data.role}) olarak giriş yaptınız`,
      });

      await refresh();
      router.push(redirectPath);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Giriş sırasında bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-muted/50 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)40%,transparent),transparent_45%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,color-mix(in_oklch,var(--accent)35%,transparent),transparent_40%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_0)] bg-size-[28px_28px]" />
      </div>

      <Card className="relative z-10 w-full max-w-md border border-border/70 bg-card/80 backdrop-blur-2xl shadow-[0_35px_95px_-45px_rgba(64,17,109,0.65)]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Giriş Yap</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            E-posta ve şifreniz ile sisteme giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 shadow-[0_15px_35px_-20px_rgba(64,17,109,0.7)] hover:shadow-[0_25px_65px_-30px_rgba(64,17,109,0.85)]" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
