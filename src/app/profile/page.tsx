"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";

type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "user" | "viewer";
};

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const meData: CurrentUser = await meRes.json();
        setCurrentUser(meData);

        const userRes = await fetch(`/api/users/${meData.id}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setFullName(userData.fullName || "");
          setEmail(userData.email || "");
          setPhone(userData.phone || "");
        } else {
          setFullName(meData.fullName || "");
          setEmail(meData.email || "");
        }
      } catch (error) {
        console.error("Profile load error:", error);
        toast.error("Profil bilgileri yüklenirken bir hata oluştu");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!fullName.trim()) {
      toast.error("Ad soyad boş olamaz");
      return;
    }

    if (!email.trim()) {
      toast.error("E-posta boş olamaz");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      };

      if (password) {
        if (password.length < 6) {
          toast.error("Şifre en az 6 karakter olmalıdır");
          setIsSaving(false);
          return;
        }
        payload.password = password;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "DUPLICATE_EMAIL") {
          toast.error("Bu e-posta adresi zaten kullanılıyor");
        } else if (data.code === "INVALID_EMAIL_FORMAT") {
          toast.error("Geçerli bir e-posta adresi girin");
        } else if (data.code === "INVALID_PASSWORD") {
          toast.error("Şifre en az 6 karakter olmalıdır");
        } else {
          toast.error(data.error || "Profil kaydedilemedi");
        }
        return;
      }

      setPassword("");
      toast.success("Profiliniz güncellendi");

       // Sidebar / header gibi bileşenlerin güncellenmesi için custom event
       if (typeof window !== "undefined") {
         window.dispatchEvent(new Event("profile-updated"));
       }

      // Me endpoint'ini güncel bilgilerle senkron tutmak için sayfayı yenile
      router.refresh();
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Profil kaydedilirken bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Profil yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6 max-w-2xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profilim</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Kişisel bilgilerinizi ve giriş şifrenizi güncelleyebilirsiniz.
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Kişisel Bilgiler
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Bu bilgiler uygulama genelinde görüntülenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
          <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="pl-9"
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 (555) 123 45 67"
                  className="pl-9"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="password">Yeni Şifre (opsiyonel)</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yeni şifrenizi girin"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Şifrenizi değiştirmek istemiyorsanız bu alanı boş bırakın.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
