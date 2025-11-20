"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail, Moon, Sun, ShieldCheck, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
      setFormError("Lütfen e-posta ve şifreyi girin");
      toast.error("Lütfen e-posta ve şifreyi girin");
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.error || "Giriş yapılamadı";
        setFormError(message);
        toast.error(message, {
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
      setFormError("Giriş sırasında bir hata oluştu");
      toast.error("Giriş sırasında bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div
      className={
        "relative min-h-screen flex items-center justify-center px-4 " +
        (isLight
          ? "bg-linear-to-br from-slate-50 via-slate-100 to-slate-200"
          : "bg-linear-to-br from-slate-950 via-slate-950 to-slate-900")
      }
    >
      <div className={"pointer-events-none absolute inset-0 " + (isLight ? "opacity-60" : "opacity-40")}>
        <div
          className={
            "absolute inset-0 " +
            (isLight
              ? "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_55%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_55%)]")
          }
        />
        <div
          className={
            "absolute inset-0 " +
            (isLight
              ? "bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_55%)]"
              : "bg-[radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.22),transparent_55%)]")
          }
        />
        <div
          className={
            "absolute inset-0 bg-[linear-gradient(120deg,rgba(148,163,184,0.15)_1px,transparent_0)] bg-size-[26px_26px]"
          }
        />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-10 lg:gap-16">
        <div className="hidden md:flex flex-1 flex-col gap-6">
          <div className="space-y-4">
            <div
              className={
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium backdrop-blur " +
                (isLight
                  ? "border border-slate-200 bg-white/80 text-slate-600"
                  : "border border-slate-700/70 bg-slate-900/60 text-slate-300/80")
              }
            >
              <span
                className={
                  "inline-flex h-1.5 w-1.5 rounded-full animate-pulse " +
                  (isLight ? "bg-emerald-500" : "bg-emerald-400")
                }
              />
              <span>ISGOne AI • OSGB Yönetim Sistemi</span>
            </div>

            <div
              className={
                "inline-flex items-center gap-2 rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] " +
                (isLight
                  ? "border border-slate-200 bg-white/90 text-slate-500"
                  : "border border-slate-700/70 bg-slate-900/70 text-slate-300/80")
              }
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI destekli platform
            </div>

            <h1
              className={
                "text-balance font-semibold leading-tight text-[clamp(2.75rem,4vw,3.35rem)] lg:text-[clamp(3.25rem,4.5vw,3.75rem)] " +
                (isLight ? "text-slate-900" : "text-slate-100")
              }
            >
              Yeni nesil OSGB deneyimi
              <span className="mt-2 block bg-linear-to-r from-sky-500 via-emerald-500 to-indigo-500 bg-clip-text text-transparent text-[clamp(2.25rem,3.5vw,2.85rem)] font-bold">
                yapay zekâ destekli sağlık yönetimi
              </span>
            </h1>

            <div
              className={
                "inline-flex items-center gap-2 text-xs font-medium " +
                (isLight ? "text-slate-500" : "text-slate-300/80")
              }
            >
              <span
                className={
                  "inline-flex h-6 w-6 items-center justify-center rounded-full border " +
                  (isLight
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200")
                }
              >
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>Yeni raporlama modülü devrede</span>
            </div>

            <p
              className={
                "max-w-xl text-sm lg:text-base leading-relaxed " +
                (isLight ? "text-slate-600" : "text-slate-300/80")
              }
            >
              Çalışan sağlık taramalarını, şirket kayıtlarını ve doküman akışını tek bir panelden yönetin.
              ISGOne AI ile planlama, takip ve raporlama süreçleriniz her zaman kontrol altında.
            </p>
          </div>

          <div
            className={
              "mt-2 inline-flex flex-wrap items-center gap-4 text-xs " +
              (isLight ? "text-slate-500" : "text-slate-400/90")
            }
          >
            <div className="flex items-center gap-1.5">
              <span
                className={
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold border " +
                  (isLight
                    ? "bg-slate-100 text-emerald-600 border-emerald-200"
                    : "bg-slate-800/80 text-emerald-300 border-slate-700/60")
                }
              >
                24/7
              </span>
              <span>Bulut tabanlı erişim</span>
            </div>
            <div className={"h-1 w-1 rounded-full " + (isLight ? "bg-slate-400" : "bg-slate-500")} />
            <span>Çoklu OSGB ve firma yönetimi</span>
          </div>

          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            <div
              className={
                "rounded-2xl border p-4 transition-colors " +
                (isLight
                  ? "border-white/80 bg-white/80 text-slate-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]"
                  : "border-slate-800/70 bg-slate-900/70 text-slate-100 shadow-[0_20px_60px_-45px_rgba(2,6,23,0.7)]")
              }
            >
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Denetimli süreç
                </span>
                <span className="text-emerald-500 text-xs font-semibold">+18%</span>
              </div>
              <div className="text-3xl font-semibold mt-2">128+</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aktif tarama programı</p>
            </div>
            <div
              className={
                "rounded-2xl border p-4 transition-colors " +
                (isLight
                  ? "border-white/80 bg-white/80 text-slate-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]"
                  : "border-slate-800/70 bg-slate-900/70 text-slate-100 shadow-[0_20px_60px_-45px_rgba(2,6,23,0.7)]")
              }
            >
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Activity className="w-3.5 h-3.5" />
                  Otomasyon oranı
                </span>
                <span className="text-sky-500 text-xs font-semibold">99.9%</span>
              </div>
              <div className="text-3xl font-semibold mt-2">7.320</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aylık bildirim akışı</p>
            </div>
          </div>
        </div>

        <Card
          className={
            "flex-1 max-w-md ml-auto backdrop-blur-xl shadow-[0_30px_90px_-45px_rgba(15,23,42,0.4)] border rounded-2xl " +
            (isLight ? "border-slate-200 bg-white/95" : "border-slate-700/70 bg-slate-900/80")
          }
        >
          <CardHeader className="pb-5 border-b border-slate-100/80 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <CardTitle
                className={
                  "text-2xl font-semibold tracking-tight flex items-center gap-2 " +
                  (isLight ? "text-slate-900" : "text-slate-50")
                }
              >
                <span
                  className={
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border " +
                    (isLight
                      ? "bg-sky-100 text-sky-600 border-sky-200"
                      : "bg-sky-500/15 text-sky-300 border-sky-500/30")
                  }
                >
                  <Lock className="w-4 h-4" />
                </span>
                Giriş Yap
              </CardTitle>

              <button
                type="button"
                onClick={() => setTheme(isLight ? "dark" : "light")}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors " +
                  (isLight
                    ? "border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50"
                    : "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900")
                }
              >
                {isLight ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
                <span>{isLight ? "Koyu tema" : "Açık tema"}</span>
              </button>
            </div>
            <CardDescription
              className={
                "text-xs sm:text-sm " + (isLight ? "text-slate-500" : "text-slate-300/80")
              }
            >
              ISGOne AI OSGB yönetim paneline erişmek için e-posta ve şifreniz ile giriş yapın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-6 pt-5">
            {formError && (
              <div
                className={
                  "rounded-md border px-3 py-2 text-xs sm:text-sm flex items-start gap-2 " +
                  (isLight
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-red-500/40 bg-red-500/5 text-red-200")
                }
              >
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={
                    "text-xs sm:text-sm " + (isLight ? "text-slate-800" : "text-slate-100")
                  }
                >
                  E-posta
                </Label>
                <div
                  className={
                    "relative rounded-lg border transition-colors " +
                    (isLight
                      ? "border-slate-200 bg-slate-50 hover:bg-white"
                      : "border-slate-700/80 bg-slate-900/80 hover:bg-slate-900")
                  }
                >
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@firma.com"
                    className={
                      "pl-9 text-sm border-0 bg-transparent placeholder:text-slate-400 focus-visible:ring-sky-400/70 focus-visible:ring-2 focus-visible:ring-offset-0 " +
                      (isLight ? "text-slate-900" : "text-slate-50")
                    }
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className={
                    "text-xs sm:text-sm " + (isLight ? "text-slate-800" : "text-slate-100")
                  }
                >
                  Şifre
                </Label>
                <div
                  className={
                    "relative rounded-lg border transition-colors " +
                    (isLight
                      ? "border-slate-200 bg-slate-50 hover:bg-white"
                      : "border-slate-700/80 bg-slate-900/80 hover:bg-slate-900")
                  }
                >
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifreniz"
                    className={
                      "pl-9 text-sm border-0 bg-transparent placeholder:text-slate-400 focus-visible:ring-sky-400/70 focus-visible:ring-2 focus-visible:ring-offset-0 " +
                      (isLight ? "text-slate-900" : "text-slate-50")
                    }
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div
                className={
                  "flex items-center justify-between text-[11px] sm:text-xs " +
                  (isLight ? "text-slate-500" : "text-slate-400")
                }
              >
                <span>Demo kullanıcı bilgilerinizi yöneticinizden alabilirsiniz.</span>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-[0_18px_35px_-22px_rgba(37,99,235,0.8)] hover:shadow-[0_22px_55px_-30px_rgba(37,99,235,0.9)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>

            <p
              className={
                "pt-1 text-[11px] sm:text-xs flex items-center justify-between gap-2 " +
                (isLight ? "text-slate-500" : "text-slate-400")
              }
            >
              <span>Güvenliğiniz için oturumunuz bir süre hareketsizlikte otomatik sonlandırılır.</span>
              <span className="hidden sm:inline">Sorun yaşıyorsanız sistem yöneticinizle iletişime geçin.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Giriş ekranı hazırlanıyor…</span>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
