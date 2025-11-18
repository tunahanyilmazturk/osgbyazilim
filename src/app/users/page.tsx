"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
  Shield,
  Users,
  UserCheck,
  UserX,
  Activity,
  Eye,
  Download,
  CheckSquare,
  XSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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

type UserStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    admin: number;
    manager: number;
    user: number;
    viewer: number;
  };
  recentLogins: number;
};

type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  role: User["role"];
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

const DEPARTMENT_OPTIONS = [
  "Laborant",
  "Radyoloji Teknikeri",
  "Odyometrist",
  "ATT",
  "Müdür",
  "İş Güvenliği Uzmanı",
  "Yönetici",
  "Hemşire",
  "İş Yeri Hekimi",
  "İş Yeri Hemşiresi",
  "Diğer Sağlık Personeli",
  "Danışman",
  "Tıbbi Sekreter",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<"name" | "role" | "department" | "lastLogin">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  
  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | "role" | null>(null);
  const [bulkRole, setBulkRole] = useState<"admin" | "manager" | "user" | "viewer">("user");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user" as "admin" | "manager" | "user" | "viewer",
    phone: "",
    department: "",
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const hasActiveFilters =
    searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  // Reset page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, roleFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const usersCopy = [...users];

    usersCopy.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      if (sortField === "name") {
        aVal = a.fullName.toLowerCase();
        bVal = b.fullName.toLowerCase();
      } else if (sortField === "role") {
        aVal = roleLabels[a.role];
        bVal = roleLabels[b.role];
      } else if (sortField === "department") {
        aVal = (a.department || "").toLowerCase();
        bVal = (b.department || "").toLowerCase();
      } else if (sortField === "lastLogin") {
        const aDate = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const bDate = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        aVal = aDate;
        bVal = bDate;
      }

      if (aVal === bVal) return 0;

      if (aVal === null || aVal === undefined) return sortDirection === "asc" ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDirection === "asc" ? 1 : -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      const compare = aStr.localeCompare(bStr, "tr-TR");
      return sortDirection === "asc" ? compare : -compare;
    });

    return usersCopy;
  }, [users, sortField, sortDirection]);

  const canManageUsers = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Load users
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("isActive", statusFilter);
      params.append("limit", pageSize.toString());
      params.append("offset", ((page - 1) * pageSize).toString());

      const response = await fetch(`/api/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Kullanıcılar yüklenemedi");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      setIsStatsLoading(true);
      const response = await fetch("/api/users/stats");
      
      if (!response.ok) {
        throw new Error("İstatistikler yüklenemedi");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("İstatistikler yüklenirken hata oluştu");
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Load current user for permission checks
  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      
      if (!response.ok) {
        throw new Error("Kullanıcı verileri yüklenemedi");
      }

      const data = await response.json();
      setCurrentUser(data);
    } catch (error) {
      console.error("Error loading current user:", error);
      toast.error("Kullanıcı verileri yüklenirken hata oluştu");
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
    loadCurrentUser();
  }, [debouncedSearchQuery, roleFilter, statusFilter, page, pageSize]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // Handle select user
  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Lütfen en az bir kullanıcı seçin");
      return;
    }

    try {
      setIsProcessing(true);
      
      for (const userId of selectedUserIds) {
        const user = users.find(u => u.id === userId);
        if (!user) continue;

        let updateData: any = {};
        
        if (bulkAction === "activate") {
          updateData = { isActive: true };
        } else if (bulkAction === "deactivate") {
          updateData = { isActive: false };
        } else if (bulkAction === "role") {
          updateData = { role: bulkRole };
        }

        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            role: updateData.role || user.role,
            phone: user.phone,
            department: user.department,
            ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
          }),
        });

        if (!response.ok) {
          throw new Error(`Kullanıcı ${user.fullName} güncellenemedi`);
        }
      }

      toast.success(`${selectedUserIds.length} kullanıcı başarıyla güncellendi`);
      setIsBulkDialogOpen(false);
      setSelectedUserIds([]);
      setBulkAction(null);
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error("Error in bulk action:", error);
      toast.error(error.message || "Toplu işlem sırasında hata oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSort = (field: "name" | "role" | "department" | "lastLogin") => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortDirection("asc");
      return field;
    });
  };

  const renderSortIcon = (field: "name" | "role" | "department" | "lastLogin") => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="inline-block h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="inline-block h-3 w-3 ml-1" />
    );
  };

  // Export to Excel (.xlsx) with ordered columns
  const handleExportExcel = () => {
    if (users.length === 0) {
      toast.error("Dışa aktarılacak kullanıcı bulunamadı");
      return;
    }

    const headers = [
      "ID",
      "Ad Soyad",
      "E-posta",
      "Rol",
      "Departman",
      "Telefon",
      "Durum",
      "Son Giriş",
      "Kayıt Tarihi",
    ];

    const rows = users.map((user) => [
      user.id,
      user.fullName,
      user.email,
      roleLabels[user.role],
      user.department || "-",
      user.phone || "-",
      user.isActive ? "Aktif" : "Pasif",
      user.lastLoginAt
        ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR")
        : "-",
      new Date(user.createdAt).toLocaleDateString("tr-TR"),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Kolon genişliklerini daha okunaklı olacak şekilde ayarla
    worksheet["!cols"] = [
      { wch: 6 }, // ID
      { wch: 24 }, // Ad Soyad
      { wch: 30 }, // E-posta
      { wch: 14 }, // Rol
      { wch: 18 }, // Departman
      { wch: 16 }, // Telefon
      { wch: 12 }, // Durum
      { wch: 16 }, // Son Giriş
      { wch: 16 }, // Kayıt Tarihi
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kullanicilar");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `kullanicilar_${dateStr}.xlsx`);

    toast.success("Kullanıcı listesi Excel olarak dışa aktarıldı");
  };

  const validateAddForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Ad Soyad zorunludur";
    }
    if (!formData.email.trim()) {
      errors.email = "E-posta zorunludur";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Geçerli bir e-posta adresi girin";
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = "Şifre en az 6 karakter olmalıdır";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Ad Soyad zorunludur";
    }
    if (!formData.email.trim()) {
      errors.email = "E-posta zorunludur";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Geçerli bir e-posta adresi girin";
    }
    // Şifre edit ekranında opsiyonel; sadece girilmişse minimum uzunluk kontrolü yap
    if (formData.password && formData.password.length < 6) {
      errors.password = "Şifre en az 6 karakter olmalıdır";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add user
  const handleAddUser = async () => {
    if (!validateAddForm()) {
      toast.error("Lütfen formdaki hataları düzeltin");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend'den gelen e-posta/şifre hatalarını da ilgili alana yansıtmayı dene
        if (data?.code === "INVALID_EMAIL_FORMAT" || data?.code === "MISSING_EMAIL" || data?.code === "DUPLICATE_EMAIL") {
          setFormErrors(prev => ({ ...prev, email: data.error || "Geçersiz e-posta" }));
        }
        if (data?.code === "INVALID_PASSWORD") {
          setFormErrors(prev => ({ ...prev, password: data.error || "Geçersiz şifre" }));
        }
        throw new Error(data.error || "Kullanıcı eklenemedi");
      }

      toast.success("Kullanıcı başarıyla eklendi");
      setIsAddDialogOpen(false);
      resetForm();
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Kullanıcı eklenirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    if (!validateEditForm()) {
      toast.error("Lütfen formdaki hataları düzeltin");
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

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
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
      setSelectedUser(null);
      resetForm();
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Kullanıcı güncellenirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    if (!canManageUsers) {
      toast.error("Bu işlem için yetkiniz yok (yalnızca Admin ve Yönetici silebilir)");
      return;
    }

    if (!confirm("Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?")) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kullanıcı silinemedi");
      }

      toast.success("Kullanıcı başarıyla devre dışı bırakıldı");
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Kullanıcı silinirken hata oluştu");
    }
  };

  const handleHardDeleteUser = async (userId: number) => {
    if (!canManageUsers) {
      toast.error("Bu işlem için yetkiniz yok (yalnızca Admin ve Yönetici silebilir)");
      return;
    }

    if (!confirm("Bu kullanıcıyı KALICI olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}?hard=true`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kullanıcı silinemedi");
      }

      toast.success("Kullanıcı kalıcı olarak silindi");
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error("Error hard deleting user:", error);
      toast.error(error.message || "Kullanıcı kalıcı silinirken hata oluştu");
    }
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      department: user.department || "",
    });
    setIsEditDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "user",
      phone: "",
      department: "",
    });
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
      {/* Unauthorized state */}
      {currentUser && !canManageUsers && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Bu sayfaya erişim yetkiniz yok</h1>
            <p className="text-sm text-muted-foreground">
              Kullanıcı yönetimi sadece Admin ve Yönetici rollerine açıktır.
            </p>
          </div>
        </div>
      )}

      {(!currentUser || canManageUsers) && (
      <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Sistem kullanıcılarını ve yetkilerini yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/users/activity">
              <Activity className="w-4 h-4" />
              Aktivite Logları
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportExcel}
          >
            <Download className="w-4 h-4" />
            Excel Export
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            size="sm"
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Kullanıcı Ekle
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Sistemdeki tüm kullanıcılar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Aktif hesaplar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pasif Kullanıcı</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Devre dışı hesaplar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Son 7 Gün Giriş</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.recentLogins}</div>
                <p className="text-xs text-muted-foreground">
                  Aktif kullanıcı sayısı
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrele</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İsim veya e-posta ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={roleFilter} onValueChange={(value) => {
                setRoleFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Roller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Yönetici</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="viewer">Görüntüleyici</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedUserIds.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {selectedUserIds.length} kullanıcı seçildi
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkAction("activate");
                    setIsBulkDialogOpen(true);
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Aktif Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkAction("deactivate");
                    setIsBulkDialogOpen(true);
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Pasif Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkAction("role");
                    setIsBulkDialogOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Rol Değiştir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUserIds([])}
                >
                  <XSquare className="h-4 w-4 mr-2" />
                  İptal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kullanıcılar</CardTitle>
          <CardDescription>
            {users.length} kullanıcı listeleniyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground/50" />
              {hasActiveFilters ? (
                <>
                  <h3 className="mt-2 text-lg font-semibold">Filtrelere göre sonuç bulunamadı</h3>
                  <p className="text-sm text-muted-foreground">
                    Farklı arama terimleri deneyebilir veya filtreleri temizleyebilirsiniz.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Filtreleri Temizle
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="mt-2 text-lg font-semibold">Henüz kullanıcı eklenmemiş</h3>
                  <p className="text-sm text-muted-foreground">
                    Sisteme yeni kullanıcı ekleyerek başlamanız gerekiyor.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    İlk Kullanıcıyı Ekle
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUserIds.length === users.length && users.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("name")}
                    >
                      Kullanıcı
                      {renderSortIcon("name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("role")}
                    >
                      Rol
                      {renderSortIcon("role")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("department")}
                    >
                      Departman
                      {renderSortIcon("department")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("lastLogin")}
                    >
                      Son Giriş
                      {renderSortIcon("lastLogin")}
                    </TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => {
                        // Don't navigate if clicking on checkbox, button, or dropdown
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('button') || 
                          target.closest('[role="checkbox"]') ||
                          target.closest('[role="menu"]')
                        ) {
                          return;
                        }
                        router.push(`/users/${user.id}`);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-muted-foreground">{user.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={roleColors[user.role]}
                          title={roleDescriptions[user.role]}
                        >
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{user.department || "-"}</span>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                            Pasif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(user.lastLoginAt)}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detayları Görüntüle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            {canManageUsers && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Devre Dışı Bırak
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleHardDeleteUser(user.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Kalıcı Sil
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination controls */}
              <div className="flex flex-col gap-2 px-4 py-3 border-t bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Sayfa <span className="font-semibold">{page}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span>Sayfa başı:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[80px] px-2 py-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={users.length < pageSize || isLoading}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu İşlem</DialogTitle>
            <DialogDescription>
              {selectedUserIds.length} kullanıcı için toplu işlem yapılacak
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {bulkAction === "activate" && (
              <p>Seçili kullanıcılar aktif edilecek. Devam etmek istiyor musunuz?</p>
            )}
            {bulkAction === "deactivate" && (
              <p>Seçili kullanıcılar pasif edilecek. Devam etmek istiyor musunuz?</p>
            )}
            {bulkAction === "role" && (
              <div className="space-y-4">
                <p>Seçili kullanıcıların rolü değiştirilecek.</p>
                <div className="space-y-2">
                  <Label>Yeni Rol</Label>
                  <Select
                    value={bulkRole}
                    onValueChange={(value: any) => setBulkRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Yönetici</SelectItem>
                      <SelectItem value="user">Kullanıcı</SelectItem>
                      <SelectItem value="viewer">Görüntüleyici</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(false)}
              disabled={isProcessing}
            >
              İptal
            </Button>
            <Button onClick={handleBulkAction} disabled={isProcessing}>
              {isProcessing ? "İşleniyor..." : "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir kullanıcı ekleyin ve rol atayın
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-fullName">
                Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ahmet Yılmaz"
              />
              {formErrors.fullName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-email">
                E-posta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ahmet@isgone.com.tr"
              />
              {formErrors.email && (
                <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-password">
                Şifre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 6 karakter"
              />
              {formErrors.password && (
                <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" title={roleDescriptions.admin}>
                    Admin
                  </SelectItem>
                  <SelectItem value="manager" title={roleDescriptions.manager}>
                    Yönetici
                  </SelectItem>
                  <SelectItem value="user" title={roleDescriptions.user}>
                    Kullanıcı
                  </SelectItem>
                  <SelectItem value="viewer" title={roleDescriptions.viewer}>
                    Görüntüleyici
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-department">Departman</Label>
              <Select
                value={formData.department || ""}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, department: value })
                }
              >
                <SelectTrigger id="add-department">
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-phone">Telefon</Label>
              <Input
                id="add-phone"
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
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSaving}
            >
              İptal
            </Button>
            <Button onClick={handleAddUser} disabled={isSaving}>
              {isSaving ? "Ekleniyor..." : "Kullanıcı Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {formErrors.fullName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
              )}
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
              {formErrors.password && (
                <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
              )}
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
              <Select
                value={formData.department || ""}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, department: value })
                }
              >
                <SelectTrigger id="edit-department">
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...DEPARTMENT_OPTIONS,
                    ...(formData.department && !DEPARTMENT_OPTIONS.includes(formData.department)
                      ? [formData.department]
                      : []),
                  ].map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
              }}
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
      </>
      )}
    </div>
  );
}