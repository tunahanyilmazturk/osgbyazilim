"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Search,
  ArrowLeft,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  LogIn,
  FileText,
  Building2,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type ActivityLog = {
  id: number;
  userId: number;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
};

const actionLabels: Record<string, string> = {
  login: "Giriş Yaptı",
  create_user: "Kullanıcı Ekledi",
  update_user: "Kullanıcı Güncelledi",
  delete_user: "Kullanıcı Sildi",
  create_company: "Firma Ekledi",
  update_company: "Firma Güncelledi",
  create_screening: "Tarama Ekledi",
  update_screening: "Tarama Güncelledi",
  view_report: "Rapor Görüntüledi",
};

const actionIcons: Record<string, any> = {
  login: LogIn,
  create_user: UserPlus,
  update_user: Edit,
  delete_user: Trash2,
  create_company: Building2,
  update_company: Building2,
  create_screening: Calendar,
  update_screening: Calendar,
  view_report: Eye,
};

const actionColors: Record<string, string> = {
  login: "bg-blue-500/10 text-blue-700 border-blue-200",
  create_user: "bg-green-500/10 text-green-700 border-green-200",
  update_user: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  delete_user: "bg-red-500/10 text-red-700 border-red-200",
  create_company: "bg-gray-500/10 text-gray-800 border-gray-200",
  update_company: "bg-gray-500/10 text-gray-800 border-gray-200",
  create_screening: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  update_screening: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  view_report: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Load activity logs
  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      params.append("limit", limit.toString());
      params.append("offset", (page * limit).toString());
      
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (userFilter !== "all") params.append("userId", userFilter);
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Aktivite logları yüklenemedi");
      }

      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Aktivite logları yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, userFilter, startDate, endDate, page]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Parse details JSON
  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/users">
                <ArrowLeft className="w-4 h-4" />
                Geri
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Aktivite Logları</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Kullanıcı aktivitelerini ve sistem olaylarını takip edin
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrele</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Aktivite Türü</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                  <SelectItem value="login">Giriş</SelectItem>
                  <SelectItem value="create_user">Kullanıcı Ekleme</SelectItem>
                  <SelectItem value="update_user">Kullanıcı Güncelleme</SelectItem>
                  <SelectItem value="create_company">Firma Ekleme</SelectItem>
                  <SelectItem value="update_company">Firma Güncelleme</SelectItem>
                  <SelectItem value="create_screening">Tarama Ekleme</SelectItem>
                  <SelectItem value="update_screening">Tarama Güncelleme</SelectItem>
                  <SelectItem value="view_report">Rapor Görüntüleme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setActionFilter("all");
                  setUserFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setPage(0);
                }}
              >
                Filtreleri Temizle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivite Geçmişi</CardTitle>
          <CardDescription>
            {logs.length} aktivite kaydı listeleniyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aktivite kaydı bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Filtreleri değiştirerek farklı sonuçlar görebilirsiniz
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>Aktivite</TableHead>
                      <TableHead>Kaynak</TableHead>
                      <TableHead>IP Adresi</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const details = parseDetails(log.details);
                      
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.user?.fullName || "Bilinmeyen"}</div>
                              <div className="text-sm text-muted-foreground">
                                {log.user?.email || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={actionColors[log.action] || actionColors.view_report}
                            >
                              <span className="mr-1">{getActionIcon(log.action)}</span>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.resourceType ? (
                              <div className="text-sm">
                                <div className="font-medium capitalize">{log.resourceType}</div>
                                {log.resourceId && (
                                  <div className="text-xs text-muted-foreground">
                                    ID: {log.resourceId}
                                  </div>
                                )}
                                {details && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Object.entries(details).slice(0, 2).map(([key, value]) => (
                                      <div key={key}>
                                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {log.ipAddress || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(log.createdAt)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Sayfa {page + 1} - {logs.length} kayıt gösteriliyor
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={logs.length < limit}
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
