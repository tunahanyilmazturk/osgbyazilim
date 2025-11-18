"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Building2, Calendar, FileText, Users, UserCheck, Mail, Phone, MapPin, Briefcase, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type Company = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

type AssignedEmployee = {
  assignmentId: number;
  assignedAt: string;
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
  specialization: string | null;
};

type Screening = {
  id: number;
  companyId: number;
  participantName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  employeeCount: number;
  type: 'periodic' | 'initial' | 'special';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string | null;
  createdAt: string;
  assignedEmployees?: AssignedEmployee[];
};

interface ScreeningDetailDialogProps {
  screening: Screening | null;
  company: Company | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onStatusChange?: () => void;
}

export function ScreeningDetailDialog({ screening, company, open, onOpenChange, onDelete, onStatusChange }: ScreeningDetailDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!screening) return null;

  const getStatusBadge = (status: Screening['status']) => {
    const variants: Record<Screening['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: 'Planlandı', variant: 'default' },
      completed: { label: 'Tamamlandı', variant: 'secondary' },
      cancelled: { label: 'İptal', variant: 'destructive' },
      'no-show': { label: 'Gelmedi', variant: 'outline' },
    };
    return variants[status];
  };

  const getTypeBadge = (type: Screening['type']) => {
    const labels: Record<Screening['type'], string> = {
      periodic: 'Periyodik Muayene',
      initial: 'İşe Giriş Muayenesi',
      special: 'Özel Durum Muayenesi',
    };
    return labels[type];
  };

  const handleStatusChange = async (newStatus: Screening['status']) => {
    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/screenings/${screening.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Durum güncellenirken hata oluştu');
      }

      const statusLabels: Record<Screening['status'], string> = {
        scheduled: 'Planlandı',
        completed: 'Tamamlandı',
        cancelled: 'İptal Edildi',
        'no-show': 'Gelmedi',
      };

      toast.success(`Randevu durumu "${statusLabels[newStatus]}" olarak güncellendi`);
      
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/screenings/${screening.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Randevu silinirken hata oluştu');
      }

      toast.success('Randevu başarıyla silindi');
      setDeleteDialogOpen(false);
      onOpenChange(false);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting screening:', error);
      toast.error('Randevu silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = getStatusBadge(screening.status);
  const screeningDate = new Date(screening.date);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">Randevu Detayları</DialogTitle>
                <DialogDescription>
                  Randevu #{screening.id} - {screeningDate.toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    weekday: 'long'
                  })}
                </DialogDescription>
              </div>
              <Badge variant={statusBadge.variant} className="text-sm">
                {statusBadge.label}
              </Badge>
            </div>
          </DialogHeader>

          {/* Quick Status Change Buttons */}
          {screening.status === 'scheduled' && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm font-medium mb-3">Hızlı Durum Değiştir:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Tamamlandı Olarak İşaretle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isUpdatingStatus}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  İptal Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-700 hover:bg-orange-50"
                  onClick={() => handleStatusChange('no-show')}
                  disabled={isUpdatingStatus}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Gelmedi Olarak İşaretle
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6 mt-4">
            {/* Time and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Saat</span>
                </div>
                <p className="text-lg font-semibold ml-6">
                  {screening.timeStart} - {screening.timeEnd}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">Muayene Tipi</span>
                </div>
                <p className="text-sm ml-6">{getTypeBadge(screening.type)}</p>
              </div>
            </div>

            <Separator />

            {/* Company Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Firma Bilgileri</span>
              </div>
              {company && (
                <div className="ml-7 space-y-2 text-sm">
                  <div>
                    <p className="font-semibold text-base">{company.name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{company.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{company.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{company.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{company.address}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Participant Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="w-5 h-5 text-primary" />
                <span>Katılımcı Bilgileri</span>
              </div>
              <div className="ml-7 space-y-2">
                <p className="font-semibold">{screening.participantName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{screening.employeeCount} çalışan için tarama yapılacak</span>
                </div>
              </div>
            </div>

            {/* Assigned Employees */}
            {screening.assignedEmployees && screening.assignedEmployees.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserCheck className="w-5 h-5 text-primary" />
                    <span>Atanmış Personel ({screening.assignedEmployees.length})</span>
                  </div>
                  <div className="ml-7 space-y-3">
                    {screening.assignedEmployees.map((emp) => (
                      <div key={emp.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{emp.jobTitle}</p>
                            {emp.specialization && (
                              <Badge variant="secondary" className="text-xs">
                                {emp.specialization}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{emp.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{emp.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              Atandı: {new Date(emp.assignedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {screening.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Notlar</span>
                  </div>
                  <div className="ml-7">
                    <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                      {screening.notes}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Oluşturulma: {new Date(screening.createdAt).toLocaleString('tr-TR')}</p>
              <p>Randevu ID: #{screening.id}</p>
            </div>
          </div>

          <div className="flex justify-between gap-2 mt-6">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sil
              </Button>
              <Link href={`/screenings/${screening.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Düzenle
                </Button>
              </Link>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Randevuyu silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Randevu #{screening.id} kalıcı olarak silinecektir.
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <p><strong>Firma:</strong> {company?.name}</p>
                <p><strong>Katılımcı:</strong> {screening.participantName}</p>
                <p><strong>Tarih:</strong> {screeningDate.toLocaleDateString('tr-TR')} - {screening.timeStart}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}