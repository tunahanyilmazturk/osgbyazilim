"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  Activity,
  Shield,
  UserCog,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type User = {
  id: number;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "user" | "viewer";
  phone: string | null;
  department: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActivityLog = {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const roleLabels = {
  admin: "Admin",
  manager: "Yönetici",
  user: "Kullanıcı",
  viewer: "Görüntüleyici",
};

const roleColors = {
  admin: "bg-red-500/10 text-red-700 border-red-200",
  manager: "bg-blue-500/10 text-blue-700 border-blue-200",
  user: "bg-green-500/10 text-green-700 border-green-200",
  viewer: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const roleDescriptions: Record<User["role"], string> = {
  admin: "Tüm modüllerde tam yetki (kullanıcı, firma, tarama, rapor vb.)",
  manager: "Operasyonel yönetim yetkisi (firma, tarama, rapor) – kullanıcı yönetimi kısıtlı",
  user: "Günlük iş akışı için temel kullanım (tarama planlama, rapor görüntüleme)",
  viewer: "Sadece görüntüleme yetkisi, değişiklik yapamaz",
};

const actionLabels: Record<string, string> = {
  login: "Giriş Yaptı",
  logout: "Çıkış Yaptı",
  create: "Oluşturdu",
  update: "Güncelledi",
  delete: "Sildi",
  view: "Görüntüledi",
  export: "Export Etti",
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user" as "admin" | "manager" | "user" | "viewer",
    phone: "",
    department: "",
  });

  // Load user details
  const loadUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        throw new Error("Kullanıcı yüklenemedi");
      }

      const data = await response.json();
      setUser(data);
      setFormData({
        fullName: data.fullName,
        email: data.email,
        password: "",
        role: data.role,
        phone: data.phone || "",
        department: data.department || "",
      });
    } catch (error) {
      console.error("Error loading user:", error);
      toast.error("Kullanıcı yüklenirken hata oluştu");
      router.push("/users");
    } finally {
      setIsLoading(false);
    }
  };

  // Load user activities
  const loadActivities = async () => {
    try {
      setIsActivitiesLoading(true);
      const response = await fetch(`/api/activity-logs?userId=${userId}&limit=20`);

      if (!response.ok) {
        throw new Error("Aktiviteler yüklenemedi");
      }

      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error("Error loading activities:", error);
      toast.error("Aktiviteler yüklenirken hata oluştu");
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    loadActivities();
  }, [userId]);

  // Handle edit user
  const handleEditUser = async () => {
    if (!user) return;

    if (!formData.fullName || !formData.email) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    try {
      setIsSaving(true);
      const updateData: any = {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || null,
        department: formData.department || null,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kullanıcı güncellenemedi");
      }

      toast.success("Kullanıcı başarıyla güncellendi");
      setIsEditDialogOpen(false);
      loadUser();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Kullanıcı güncellenirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!user) return;
    
    const deleteDialog = window.confirm(
      "Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?"
    );
    
    if (!deleteDialog) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kullanıcı silinemedi");
      }

      toast.success("Kullanıcı başarıyla devre dışı bırakıldı");
      router.push("/users");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Kullanıcı silinirken hata oluştu");
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2"
          onClick={() => router.push("/users")}
        >
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {user.fullName}
              </h1>
              <Badge
                variant="outline"
                className={roleColors[user.role]}
                title={roleDescriptions[user.role]}
              >
                {roleLabels[user.role]}
              </Badge>
              {user.isActive ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                  Pasif
                </Badge>
              )}
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              Kullanıcı profil detayları ve aktivite geçmişi
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Düzenle
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700"
              onClick={handleDeleteUser}
            >
              <Trash2 className="h-4 w-4" />
              Devre Dışı Bırak
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Kullanıcı Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">E-posta</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telefon</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              )}

              {user.department && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Departman</p>
                    <p className="text-sm text-muted-foreground">{user.department}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Rol</p>
                  <p className="text-sm text-muted-foreground">{roleLabels[user.role]}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Kayıt Tarihi</p>
                  <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Son Giriş</p>
                  <p className="text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Son Güncelleme</p>
                  <p className="text-sm text-muted-foreground">{formatDate(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Aktivite İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam Aktivite</span>
                <span className="text-2xl font-bold">{activities.length}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hesap Durumu</span>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Yetki Seviyesi</span>
                  <Badge variant="outline" className={roleColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Son Aktiviteler
          </CardTitle>
          <CardDescription>
            Kullanıcının son 20 aktivite kaydı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isActivitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aktivite kaydı bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Bu kullanıcıya ait henüz aktivite bulunmuyor
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Varlık Türü</TableHead>
                    <TableHead>Detaylar</TableHead>
                    <TableHead>IP Adresi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <span className="text-sm">{formatDateShort(activity.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {actionLabels[activity.action] || activity.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {activity.entityType || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {activity.details || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {activity.ipAddress || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin (Şifreyi boş bırakarak değiştirmeyebilirsiniz)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">
                Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ahmet Yılmaz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">
                E-posta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ahmet@isgone.com.tr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Yeni Şifre (Opsiyonel)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Boş bırakarak şifreyi koruyun"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" title={roleDescriptions.admin}>
                    Admin
                    <span className="ml-1 text-xs text-muted-foreground">– {roleDescriptions.admin}</span>
                  </SelectItem>
                  <SelectItem value="manager" title={roleDescriptions.manager}>
                    Yönetici
                    <span className="ml-1 text-xs text-muted-foreground">– {roleDescriptions.manager}</span>
                  </SelectItem>
                  <SelectItem value="user" title={roleDescriptions.user}>
                    Kullanıcı
                    <span className="ml-1 text-xs text-muted-foreground">– {roleDescriptions.user}</span>
                  </SelectItem>
                  <SelectItem value="viewer" title={roleDescriptions.viewer}>
                    Görüntüleyici
                    <span className="ml-1 text-xs text-muted-foreground">– {roleDescriptions.viewer}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-department">Departman</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="İSG Uzmanı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+90 532 123 4567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              İptal
            </Button>
            <Button onClick={handleEditUser} disabled={isSaving}>
              {isSaving ? "Güncelleniyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
