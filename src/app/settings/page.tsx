"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Building2, Bell, User, Save, Upload, X, FileCheck, Image as ImageIcon, Calendar, UserCog, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    // Temel Firma Bilgileri
    companyName: "ISGOne AI",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: "",
    companyFax: "",
    
    // Resmi Bilgiler
    taxOffice: "",
    taxNumber: "",
    osgbClass: "",
    authorizationNumber: "",
    authorizationExpiry: "",
    activityLicense: "",
    establishmentYear: "",
    employeeCount: "",
    
    // Faaliyet Bilgileri
    serviceArea: "",
    serviceDescription: "",
    
    // Görseller
    companyStamp: "",
    companyLogo: "",
    
    // Bildirim Ayarları
    emailNotifications: true,
    smsNotifications: false,
    reminderNotifications: true,
    
    // Kullanıcı Bilgileri
    userName: "OSGB Müdürü",
    userEmail: "admin@osgb.com",
    userPhone: "",
  });
  const { user: currentUser, status } = useAuth();
  const isAuthLoading = status === "idle" || status === "loading";
  const canManageUsers = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: "s",
      ctrl: true,
      callback: () => {
        handleSave();
      },
    },
  ]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const savedSettings = localStorage.getItem("app-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          if (parsed.companyStamp) {
            setStampPreview(parsed.companyStamp);
          }
          if (parsed.companyLogo) {
            setLogoPreview(parsed.companyLogo);
          }
        } catch (e) {
          console.error("Error loading settings:", e);
        }
      }
      setIsLoading(false);
    };

    loadSettings();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'stamp' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Lütfen geçerli bir resim dosyası seçin");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB'dan küçük olmalıdır");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'stamp') {
        setStampPreview(base64);
        setSettings(prev => ({ ...prev, companyStamp: base64 }));
        toast.success("Kaşe başarıyla yüklendi");
      } else {
        setLogoPreview(base64);
        setSettings(prev => ({ ...prev, companyLogo: base64 }));
        toast.success("Logo başarıyla yüklendi");
      }
    };
    reader.onerror = () => {
      toast.error("Dosya yüklenirken hata oluştu");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'stamp' | 'logo') => {
    if (type === 'stamp') {
      setStampPreview(null);
      setSettings(prev => ({ ...prev, companyStamp: "" }));
      toast.success("Kaşe kaldırıldı");
    } else {
      setLogoPreview(null);
      setSettings(prev => ({ ...prev, companyLogo: "" }));
      toast.success("Logo kaldırıldı");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.setItem("app-settings", JSON.stringify(settings));
      
      const savedData = localStorage.getItem("app-settings");
      if (!savedData) {
        throw new Error("Ayarlar kaydedilemedi");
      }
      
      window.dispatchEvent(new Event("settings-updated"));
      
      setIsSaving(false);
      toast.success("Ayarlar başarıyla kaydedildi");
    } catch (error) {
      console.error("Save error:", error);
      setIsSaving(false);
      toast.error("Ayarlar kaydedilirken bir hata oluştu");
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Kurum Bilgileri Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 md:p-6">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Kullanıcı Bilgileri Skeleton */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bildirim Ayarları Skeleton */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                  {i < 3 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Yetkisiz Erişim</h1>
          <p className="text-muted-foreground">
            Bu sayfayı yalnızca yönetici yetkisine sahip kullanıcılar görüntüleyebilir.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Kontrol Paneline Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Genel Ayarlar</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Uygulama ve kurum ayarlarınızı yönetin
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2 md:size-default w-full sm:w-auto">
          <Save className="w-3 h-3 md:w-4 md:h-4" />
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
          <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>S
          </kbd>
        </Button>
      </div>

      {/* Quick Access Card - only for admin/manager */}
      {canManageUsers && (
        <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Sistem Yönetimi
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Kullanıcılar ve yetkilendirme ayarları</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
              <Link href="/users">
                <Button variant="outline" className="w-full justify-between h-auto py-4 px-4 hover:bg-primary/5 hover:border-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <UserCog className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm md:text-base">Kullanıcı Yönetimi</div>
                      <div className="text-xs text-muted-foreground">Kullanıcılar, roller ve yetkiler</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              </Link>

              <Link href="/users/activity">
                <Button variant="outline" className="w-full justify-between h-auto py-4 px-4 hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950/20 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <Settings className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm md:text-base">Aktivite Logları</div>
                      <div className="text-xs text-muted-foreground">Sistem aktivitelerini görüntüle</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Kurum Bilgileri - Genişletilmiş */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Kurum Bilgileri
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">OSGB kurum bilgilerinizi güncelleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
            {/* Temel Bilgiler */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Temel Bilgiler</h3>
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyName" className="text-xs md:text-sm">Kurum Adı *</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="ISGOne AI"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyEmail" className="text-xs md:text-sm">E-posta *</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => handleChange("companyEmail", e.target.value)}
                    placeholder="info@osgb.com"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyPhone" className="text-xs md:text-sm">Telefon *</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={settings.companyPhone}
                    onChange={(e) => handleChange("companyPhone", e.target.value)}
                    placeholder="+90 (555) 123 45 67"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyFax" className="text-xs md:text-sm">Fax</Label>
                  <Input
                    id="companyFax"
                    type="tel"
                    value={settings.companyFax}
                    onChange={(e) => handleChange("companyFax", e.target.value)}
                    placeholder="+90 (212) 123 45 67"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyWebsite" className="text-xs md:text-sm">Web Sitesi</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={settings.companyWebsite}
                    onChange={(e) => handleChange("companyWebsite", e.target.value)}
                    placeholder="https://www.osgb.com"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="establishmentYear" className="text-xs md:text-sm">Kuruluş Yılı</Label>
                  <Input
                    id="establishmentYear"
                    type="number"
                    value={settings.establishmentYear}
                    onChange={(e) => handleChange("establishmentYear", e.target.value)}
                    placeholder="2020"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:gap-4 grid-cols-1">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyAddress" className="text-xs md:text-sm">Adres *</Label>
                  <Textarea
                    id="companyAddress"
                    value={settings.companyAddress}
                    onChange={(e) => handleChange("companyAddress", e.target.value)}
                    placeholder="Kurum adresi"
                    className="min-h-[80px] text-sm md:text-base resize-none"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Resmi Bilgiler */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Resmi Bilgiler</h3>
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="taxOffice" className="text-xs md:text-sm">Vergi Dairesi</Label>
                  <Input
                    id="taxOffice"
                    value={settings.taxOffice}
                    onChange={(e) => handleChange("taxOffice", e.target.value)}
                    placeholder="Kadıköy"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="taxNumber" className="text-xs md:text-sm">Vergi No</Label>
                  <Input
                    id="taxNumber"
                    value={settings.taxNumber}
                    onChange={(e) => handleChange("taxNumber", e.target.value)}
                    placeholder="1234567890"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="osgbClass" className="text-xs md:text-sm">OSGB Sınıfı</Label>
                  <Select value={settings.osgbClass} onValueChange={(value) => handleChange("osgbClass", value)}>
                    <SelectTrigger className="h-9 md:h-10 text-sm md:text-base">
                      <SelectValue placeholder="Sınıf seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A Sınıfı</SelectItem>
                      <SelectItem value="B">B Sınıfı</SelectItem>
                      <SelectItem value="C">C Sınıfı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="authorizationNumber" className="text-xs md:text-sm">Yetki Belgesi No</Label>
                  <Input
                    id="authorizationNumber"
                    value={settings.authorizationNumber}
                    onChange={(e) => handleChange("authorizationNumber", e.target.value)}
                    placeholder="YB-2020-1234"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="authorizationExpiry" className="text-xs md:text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Belge Geçerlilik Tarihi
                  </Label>
                  <Input
                    id="authorizationExpiry"
                    type="date"
                    value={settings.authorizationExpiry}
                    onChange={(e) => handleChange("authorizationExpiry", e.target.value)}
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="activityLicense" className="text-xs md:text-sm">Faaliyet İzin Belgesi No</Label>
                  <Input
                    id="activityLicense"
                    value={settings.activityLicense}
                    onChange={(e) => handleChange("activityLicense", e.target.value)}
                    placeholder="FİB-2020-5678"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="employeeCount" className="text-xs md:text-sm">Personel Sayısı</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    value={settings.employeeCount}
                    onChange={(e) => handleChange("employeeCount", e.target.value)}
                    placeholder="25"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Faaliyet Bilgileri */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Faaliyet Bilgileri</h3>
              <div className="grid gap-3 md:gap-4 grid-cols-1">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="serviceArea" className="text-xs md:text-sm">Hizmet Alanları</Label>
                  <Input
                    id="serviceArea"
                    value={settings.serviceArea}
                    onChange={(e) => handleChange("serviceArea", e.target.value)}
                    placeholder="İmalat, İnşaat, Sağlık, Eğitim"
                    className="h-9 md:h-10 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="serviceDescription" className="text-xs md:text-sm">Hizmet Açıklaması</Label>
                  <Textarea
                    id="serviceDescription"
                    value={settings.serviceDescription}
                    onChange={(e) => handleChange("serviceDescription", e.target.value)}
                    placeholder="Kurumunuzun sunduğu hizmetleri kısaca açıklayın..."
                    className="min-h-[100px] text-sm md:text-base resize-none"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Görseller */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Görseller</h3>
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                {/* Logo */}
                <div className="space-y-2 md:space-y-3">
                  <Label htmlFor="companyLogo" className="flex items-center gap-2 text-xs md:text-sm">
                    <ImageIcon className="w-3 h-3 md:w-4 md:h-4" />
                    Kurum Logosu
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Raporlarda ve belgelerde görünecek logo (Max 2MB)
                  </p>
                  
                  {logoPreview ? (
                    <div className="space-y-2 md:space-y-3">
                      <div className="relative w-32 h-32 md:w-40 md:h-40 border-2 border-dashed border-primary rounded-lg p-3 md:p-4 bg-muted/30">
                        <Image
                          src={logoPreview}
                          alt="Kurum Logosu"
                          fill
                          className="object-contain p-1 md:p-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage('logo')}
                          className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
                        >
                          <X className="w-3 h-3 md:w-4 md:h-4" />
                          Kaldır
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('companyLogo')?.click()}
                          className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
                        >
                          <Upload className="w-3 h-3 md:w-4 md:h-4" />
                          Değiştir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="companyLogo"
                        className="flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-4 pb-5 md:pt-5 md:pb-6">
                          <ImageIcon className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-muted-foreground" />
                          <p className="mb-1 md:mb-2 text-xs md:text-sm text-muted-foreground">
                            <span className="font-semibold">Tıklayın</span> veya sürükleyin
                          </p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            PNG, JPG veya JPEG (Max 2MB)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  <Input
                    id="companyLogo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                </div>

                {/* Kaşe */}
                <div className="space-y-2 md:space-y-3">
                  <Label htmlFor="companyStamp" className="flex items-center gap-2 text-xs md:text-sm">
                    <FileCheck className="w-3 h-3 md:w-4 md:h-4" />
                    Kurum Kaşesi
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    PDF belgelerinde görünecek kaşe (Max 2MB)
                  </p>
                  
                  {stampPreview ? (
                    <div className="space-y-2 md:space-y-3">
                      <div className="relative w-32 h-32 md:w-40 md:h-40 border-2 border-dashed border-primary rounded-lg p-3 md:p-4 bg-muted/30">
                        <Image
                          src={stampPreview}
                          alt="Kurum Kaşesi"
                          fill
                          className="object-contain p-1 md:p-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage('stamp')}
                          className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
                        >
                          <X className="w-3 h-3 md:w-4 md:h-4" />
                          Kaldır
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('companyStamp')?.click()}
                          className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
                        >
                          <Upload className="w-3 h-3 md:w-4 md:h-4" />
                          Değiştir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="companyStamp"
                        className="flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-4 pb-5 md:pt-5 md:pb-6">
                          <Upload className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-muted-foreground" />
                          <p className="mb-1 md:mb-2 text-xs md:text-sm text-muted-foreground">
                            <span className="font-semibold">Tıklayın</span> veya sürükleyin
                          </p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            PNG, JPG veya JPEG (Max 2MB)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  <Input
                    id="companyStamp"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'stamp')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bildirim Ayarları */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Bildirim Ayarları
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Bildirim tercihlerinizi yönetin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="emailNotifications" className="text-sm md:text-base font-medium">
                  E-posta Bildirimleri
                </Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Randevu ve görevler için e-posta bildirimleri alın
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleChange("emailNotifications", checked)}
                className="shrink-0"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="smsNotifications" className="text-sm md:text-base font-medium">
                  SMS Bildirimleri
                </Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Önemli güncellemeler için SMS bildirimleri alın
                </p>
              </div>
              <Switch
                id="smsNotifications"
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleChange("smsNotifications", checked)}
                className="shrink-0"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="reminderNotifications" className="text-sm md:text-base font-medium">
                  Hatırlatma Bildirimleri
                </Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Yaklaşan randevular için hatırlatma bildirimleri alın
                </p>
              </div>
              <Switch
                id="reminderNotifications"
                checked={settings.reminderNotifications}
                onCheckedChange={(checked) => handleChange("reminderNotifications", checked)}
                className="shrink-0"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button - Bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2 md:size-lg w-full sm:w-auto">
          <Save className="w-3 h-3 md:w-4 md:h-4" />
          {isSaving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
          <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>S
          </kbd>
        </Button>
      </div>
    </div>
  );
}