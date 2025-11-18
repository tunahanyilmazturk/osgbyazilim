"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, User, Phone, Mail, Calendar, Briefcase, 
  Heart, AlertTriangle, Droplet, Users, FileText, 
  Loader2, AlertCircle, Clock, Building2, Download,
  CheckCircle, XCircle, Clock3, Ban, Bell, Edit, Trash2, ToggleLeft, ToggleRight, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

type Worker = {
  id: number;
  companyId: number;
  fullName: string;
  tcNo: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string | null;
  jobTitle: string;
  department: string | null;
  bloodType: string | null;
  chronicDiseases: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Company = {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
};

type HealthHistory = {
  workerScreeningId: number;
  result: string | null;
  findings: string | null;
  recommendations: string | null;
  nextScreeningDate: string | null;
  recordedAt: string;
  screening: {
    screeningId: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    type: string;
    status: string;
    notes: string | null;
    participantName: string;
  };
  documents: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedAt: string;
    notes: string | null;
  }>;
};

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const workerId = params.workerId as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    tcNo: '',
    birthDate: '',
    gender: '',
    phone: '',
    email: '',
    jobTitle: '',
    department: '',
    bloodType: '',
    chronicDiseases: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    startDate: '',
  });

  useEffect(() => {
    fetchWorkerDetails();
    fetchCompanyDetails();
    fetchHealthHistory();
  }, [companyId, workerId]);

  const fetchWorkerDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/companies/${companyId}/workers/${workerId}`);
      
      if (!response.ok) {
        throw new Error('Çalışan bilgileri yüklenemedi');
      }

      const data = await response.json();
      setWorker(data);
      
      // Initialize edit form data
      setEditFormData({
        fullName: data.fullName || '',
        tcNo: data.tcNo || '',
        birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
        gender: data.gender || '',
        phone: data.phone || '',
        email: data.email || '',
        jobTitle: data.jobTitle || '',
        department: data.department || '',
        bloodType: data.bloodType || '',
        chronicDiseases: data.chronicDiseases || '',
        allergies: data.allergies || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        startDate: data.startDate ? data.startDate.split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error fetching worker:', error);
      toast.error('Çalışan bilgileri yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      const response = await fetch(`/api/companies?limit=1000`);
      if (!response.ok) throw new Error('Firma bilgileri yüklenemedi');
      
      const companies = await response.json();
      const foundCompany = companies.find((c: Company) => c.id === parseInt(companyId));
      setCompany(foundCompany || null);
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchHealthHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/companies/${companyId}/workers/${workerId}/health-history`);
      
      if (!response.ok) {
        throw new Error('Sağlık geçmişi yüklenemedi');
      }

      const data = await response.json();
      setHealthHistory(data);
    } catch (error) {
      console.error('Error fetching health history:', error);
      toast.error('Sağlık geçmişi yüklenirken hata oluştu');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEdit = () => {
    if (!worker) return;
    
    setEditFormData({
      fullName: worker.fullName || '',
      tcNo: worker.tcNo || '',
      birthDate: worker.birthDate ? worker.birthDate.split('T')[0] : '',
      gender: worker.gender || '',
      phone: worker.phone || '',
      email: worker.email || '',
      jobTitle: worker.jobTitle || '',
      department: worker.department || '',
      bloodType: worker.bloodType || '',
      chronicDiseases: worker.chronicDiseases || '',
      allergies: worker.allergies || '',
      emergencyContactName: worker.emergencyContactName || '',
      emergencyContactPhone: worker.emergencyContactPhone || '',
      startDate: worker.startDate ? worker.startDate.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/companies/${companyId}/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Güncelleme başarısız');
      }

      const updatedWorker = await response.json();
      setWorker(updatedWorker);
      setIsEditDialogOpen(false);
      toast.success('Çalışan başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating worker:', error);
      toast.error(error instanceof Error ? error.message : 'Güncelleme sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!worker) return;

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/companies/${companyId}/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !worker.isActive }),
      });

      if (!response.ok) {
        throw new Error('Durum değiştirilemedi');
      }

      const updatedWorker = await response.json();
      setWorker(updatedWorker);
      toast.success(`Çalışan ${updatedWorker.isActive ? 'aktif' : 'pasif'} yapıldı`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Durum değiştirme sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/companies/${companyId}/workers/${workerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Çalışan silinemedi');
      }

      toast.success('Çalışan başarıyla silindi');
      router.push(`/companies/${companyId}`);
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error('Silme sırasında hata oluştu');
      setIsSubmitting(false);
    }
  };

  const handleExportHealthReport = () => {
    if (!worker) return;
    
    try {
      // Create HTML content for PDF
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sağlık Raporu - ${worker.fullName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e40af; margin: 0 0 10px 0; }
    .header p { color: #64748b; margin: 5px 0; }
    .section { margin-bottom: 30px; }
    .section-title { background: #eff6ff; color: #1e40af; padding: 10px 15px; border-radius: 5px; font-weight: bold; margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { padding: 10px; border-left: 3px solid #2563eb; background: #f8fafc; }
    .info-label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
    .info-value { font-weight: bold; color: #1e293b; }
    .history-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .history-header { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .findings { background: #fef9c3; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #eab308; }
    .recommendations { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #10b981; }
    .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Sağlık Raporu</h1>
    <p><strong>${worker.fullName}</strong></p>
    <p>${company?.name || 'Bilinmeyen Firma'} • ${worker.jobTitle}</p>
    <p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>

  <!-- Personal Info -->
  <div class="section">
    <div class="section-title">👤 Kişisel Bilgiler</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">TC Kimlik No</div>
        <div class="info-value">${worker.tcNo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Doğum Tarihi / Yaş</div>
        <div class="info-value">${new Date(worker.birthDate).toLocaleDateString('tr-TR')} (${calculateAge(worker.birthDate)} yaş)</div>
      </div>
      <div class="info-item">
        <div class="info-label">Cinsiyet</div>
        <div class="info-value">${worker.gender === 'male' ? 'Erkek' : 'Kadın'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Kan Grubu</div>
        <div class="info-value">${worker.bloodType || 'Belirtilmemiş'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Telefon</div>
        <div class="info-value">${worker.phone}</div>
      </div>
      <div class="info-item">
        <div class="info-label">E-posta</div>
        <div class="info-value">${worker.email || 'Belirtilmemiş'}</div>
      </div>
    </div>
  </div>

  <!-- Job Info -->
  <div class="section">
    <div class="section-title">💼 İş Bilgileri</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Pozisyon</div>
        <div class="info-value">${worker.jobTitle}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Departman</div>
        <div class="info-value">${worker.department || 'Belirtilmemiş'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">İşe Başlama Tarihi</div>
        <div class="info-value">${new Date(worker.startDate).toLocaleDateString('tr-TR')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Firma</div>
        <div class="info-value">${company?.name || 'Bilinmeyen Firma'}</div>
      </div>
    </div>
  </div>

  <!-- Health Info -->
  <div class="section">
    <div class="section-title">❤️ Sağlık Bilgileri</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Kronik Hastalıklar</div>
        <div class="info-value">${worker.chronicDiseases || 'Yok'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Alerjiler</div>
        <div class="info-value">${worker.allergies || 'Yok'}</div>
      </div>
    </div>
  </div>

  <!-- Health History -->
  <div class="section">
    <div class="section-title">📋 Sağlık Taramaları Geçmişi (${healthHistory.length} Kayıt)</div>
`;

      if (healthHistory.length === 0) {
        htmlContent += '<p style="text-align: center; color: #64748b; padding: 20px;">Henüz sağlık taraması kaydı bulunmuyor.</p>';
      } else {
        healthHistory.forEach((record, index) => {
          const resultBadge = getResultBadge(record.result);
          const statusBadge = getStatusBadge(record.screening.status);
          const screeningType = getScreeningType(record.screening.type);
          
          let resultClass = 'badge-info';
          if (record.result === 'fit') resultClass = 'badge-success';
          else if (record.result === 'conditional') resultClass = 'badge-warning';
          else if (record.result === 'unfit') resultClass = 'badge-danger';

          htmlContent += `
    <div class="history-item">
      <div class="history-header">
        <div>
          <h3 style="margin: 0 0 5px 0; color: #1e293b;">${index + 1}. ${screeningType}</h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            📅 ${new Date(record.screening.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
            • 🕐 ${record.screening.timeStart} - ${record.screening.timeEnd}
          </p>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-info">${statusBadge.label}</span><br>
          ${record.result ? `<span class="badge ${resultClass}" style="margin-top: 5px;">${resultBadge.label}</span>` : ''}
        </div>
      </div>
      
      ${record.findings ? `
      <div class="findings">
        <strong>🔍 Bulgular:</strong><br>
        ${record.findings}
      </div>
      ` : ''}
      
      ${record.recommendations ? `
      <div class="recommendations">
        <strong>💡 Öneriler:</strong><br>
        ${record.recommendations}
      </div>
      ` : ''}
      
      ${record.nextScreeningDate ? `
      <div style="margin: 10px 0; padding: 10px; background: #fef3c7; border-radius: 5px;">
        <strong>📆 Sonraki Tarama Tarihi:</strong> 
        ${new Date(record.nextScreeningDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      ` : ''}
      
      ${record.screening.notes ? `
      <div style="margin: 10px 0; padding: 10px; background: #f1f5f9; border-radius: 5px; font-style: italic; color: #64748b;">
        <strong>📝 Notlar:</strong> ${record.screening.notes}
      </div>
      ` : ''}
      
      ${record.documents.length > 0 ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
        <strong>📎 Belgeler (${record.documents.length}):</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${record.documents.map(doc => `
            <li style="margin: 5px 0;">
              ${doc.fileName} (${formatFileSize(doc.fileSize)})
              ${doc.notes ? `<br><em style="color: #64748b; font-size: 13px;">${doc.notes}</em>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Kayıt Tarihi: ${new Date(record.recordedAt).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
`;
        });
      }

      htmlContent += `
  </div>

  <div class="footer">
    <p><strong>ISGOne AI</strong> - İş Sağlığı ve Güvenliği Yönetim Sistemi</p>
    <p>Bu rapor ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} tarihinde oluşturulmuştur.</p>
  </div>
</body>
</html>
      `;

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${worker.fullName}_saglik_raporu_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Sağlık raporu indirildi. Tarayıcınızdan yazdırabilirsiniz.');
    } catch (error) {
      console.error('Error exporting health report:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('docx')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return { label: 'Beklemede', variant: 'outline' as const, icon: Clock3 };
    
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      fit: { label: 'Uygun', variant: 'default', icon: CheckCircle },
      conditional: { label: 'Koşullu Uygun', variant: 'secondary', icon: AlertCircle },
      unfit: { label: 'Uygun Değil', variant: 'destructive', icon: XCircle },
      pending: { label: 'Beklemede', variant: 'outline', icon: Clock3 },
    };
    return variants[result] || variants.pending;
  };

  const getScreeningType = (type: string) => {
    const types: Record<string, string> = {
      periodic: 'Periyodik Muayene',
      initial: 'İşe Giriş Muayenesi',
      special: 'Özel Durum Muayenesi',
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: 'Planlandı', variant: 'default' },
      completed: { label: 'Tamamlandı', variant: 'secondary' },
      cancelled: { label: 'İptal', variant: 'destructive' },
      'no-show': { label: 'Gelmedi', variant: 'outline' },
    };
    return variants[status] || variants.scheduled;
  };

  // Calculate next screening reminder
  const getNextScreeningReminder = () => {
    if (healthHistory.length === 0) return null;
    
    const lastRecord = healthHistory[0];
    if (!lastRecord.nextScreeningDate) return null;
    
    const nextDate = new Date(lastRecord.nextScreeningDate);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      date: nextDate,
      daysUntil: diffDays,
      isOverdue: diffDays < 0,
      isUrgent: diffDays >= 0 && diffDays <= 30,
    };
  };

  const screeningReminder = getNextScreeningReminder();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Çalışan bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Çalışan Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">Aradığınız çalışan bulunamadı.</p>
          <Link href={`/companies/${companyId}`}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Firmaya Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Link href={`/companies/${companyId}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{worker.fullName}</h1>
            <p className="text-muted-foreground mt-2">
              {worker.jobTitle} • {company?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={worker.isActive ? 'default' : 'outline'} className="text-base px-4 py-2">
            {worker.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportHealthReport}
            disabled={!worker}
          >
            <Printer className="w-4 h-4 mr-2" />
            Rapor İndir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={isSubmitting}
          >
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isSubmitting}
          >
            {worker.isActive ? (
              <>
                <ToggleRight className="w-4 h-4 mr-2" />
                Pasif Yap
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 mr-2" />
                Aktif Yap
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isSubmitting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      {/* Screening Reminder Alert */}
      {screeningReminder && (
        <Alert variant={screeningReminder.isOverdue ? 'destructive' : screeningReminder.isUrgent ? 'default' : 'default'} className="border-l-4">
          <Bell className="h-5 w-5" />
          <AlertTitle className="text-base font-semibold">
            {screeningReminder.isOverdue ? 'Tarama Gecikmiş!' : 'Yaklaşan Periyodik Tarama'}
          </AlertTitle>
          <AlertDescription>
            {screeningReminder.isOverdue ? (
              <>
                Sonraki periyodik tarama tarihi <strong>{Math.abs(screeningReminder.daysUntil)} gün önce</strong> geçti ({screeningReminder.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}). Lütfen en kısa sürede randevu oluşturun.
              </>
            ) : (
              <>
                Sonraki periyodik tarama <strong>{screeningReminder.daysUntil} gün sonra</strong> ({screeningReminder.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}). Randevu planlaması yapılması önerilir.
              </>
            )}
          </AlertDescription>
          <div className="mt-3">
            <Link href="/screenings/new">
              <Button size="sm" variant={screeningReminder.isOverdue ? 'default' : 'outline'}>
                <Calendar className="w-4 h-4 mr-2" />
                Randevu Oluştur
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Kişisel Bilgiler</TabsTrigger>
              <TabsTrigger value="health">Sağlık Geçmişi</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Temel Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">TC Kimlik No</p>
                      <p className="font-medium">{worker.tcNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Doğum Tarihi / Yaş</p>
                      <p className="font-medium">
                        {new Date(worker.birthDate).toLocaleDateString('tr-TR')} ({calculateAge(worker.birthDate)} yaş)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cinsiyet</p>
                      <p className="font-medium">{worker.gender === 'male' ? 'Erkek' : 'Kadın'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kan Grubu</p>
                      <p className="font-medium">{worker.bloodType || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    İletişim Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                      <p className="font-medium">{worker.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">E-posta</p>
                      <p className="font-medium">{worker.email || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Job Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    İş Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pozisyon</p>
                      <p className="font-medium">{worker.jobTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Departman</p>
                      <p className="font-medium">{worker.department || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">İşe Başlama Tarihi</p>
                      <p className="font-medium">{new Date(worker.startDate).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Firma</p>
                      <p className="font-medium">{company?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Sağlık Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kronik Hastalıklar</p>
                      <p className="font-medium">{worker.chronicDiseases || 'Yok'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Alerjiler</p>
                      <p className="font-medium">{worker.allergies || 'Yok'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              {(worker.emergencyContactName || worker.emergencyContactPhone) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                      Acil Durum İletişim
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">İsim</p>
                        <p className="font-medium">{worker.emergencyContactName || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Telefon</p>
                        <p className="font-medium">{worker.emergencyContactPhone || 'Belirtilmemiş'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Health History Tab */}
            <TabsContent value="health" className="space-y-6 mt-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : healthHistory.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">Henüz sağlık taraması yok</h3>
                    <p className="text-muted-foreground text-center">
                      Bu çalışan için henüz bir sağlık taraması kaydı bulunmuyor
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {healthHistory.map((record) => {
                    const resultBadge = getResultBadge(record.result);
                    const statusBadge = getStatusBadge(record.screening.status);
                    const ResultIcon = resultBadge.icon;

                    return (
                      <Card key={record.workerScreeningId} className="overflow-hidden">
                        <CardHeader className="bg-muted/30">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {getScreeningType(record.screening.type)}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(record.screening.date).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  weekday: 'long'
                                })} • {record.screening.timeStart} - {record.screening.timeEnd}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                              {record.result && (
                                <Badge variant={resultBadge.variant} className="flex items-center gap-1">
                                  <ResultIcon className="w-3 h-3" />
                                  {resultBadge.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {/* Screening Details */}
                          {record.findings && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Bulgular:</p>
                              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                {record.findings}
                              </p>
                            </div>
                          )}

                          {record.recommendations && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Öneriler:</p>
                              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                {record.recommendations}
                              </p>
                            </div>
                          )}

                          {record.nextScreeningDate && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Sonraki Tarama Tarihi:</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {new Date(record.nextScreeningDate).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          )}

                          {record.screening.notes && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Notlar:</p>
                              <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                                {record.screening.notes}
                              </p>
                            </div>
                          )}

                          {/* Documents */}
                          {record.documents.length > 0 && (
                            <>
                              <Separator className="my-4" />
                              <div>
                                <p className="text-sm font-medium mb-3">
                                  Belgeler ({record.documents.length})
                                </p>
                                <div className="space-y-2">
                                  {record.documents.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                                    >
                                      <div className="text-2xl">{getFileIcon(doc.fileType)}</div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                          <span>{formatFileSize(doc.fileSize)}</span>
                                          <span>•</span>
                                          <span>
                                            {new Date(doc.uploadedAt).toLocaleDateString('tr-TR', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                        {doc.notes && (
                                          <p className="text-xs text-muted-foreground italic mt-1">
                                            {doc.notes}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                      >
                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          <Separator className="my-4" />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              Kayıt Tarihi: {new Date(record.recordedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">İstatistikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Toplam Tarama</p>
                <p className="text-2xl font-bold">{healthHistory.length}</p>
              </div>
              {healthHistory.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Son Tarama</p>
                    <p className="text-sm font-medium">
                      {new Date(healthHistory[0].screening.date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {healthHistory[0].result && (
                      <Badge variant={getResultBadge(healthHistory[0].result).variant} className="mt-2">
                        {getResultBadge(healthHistory[0].result).label}
                      </Badge>
                    )}
                  </div>
                  {healthHistory[0].nextScreeningDate && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Sonraki Tarama</p>
                        <p className="text-sm font-medium">
                          {new Date(healthHistory[0].nextScreeningDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Company Info */}
          {company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Firma Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Firma</p>
                  <p className="text-sm font-medium">{company.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yetkili</p>
                  <p className="text-sm">{company.contactPerson}</p>
                </div>
                <Link href={`/companies/${companyId}`}>
                  <Button variant="outline" className="w-full mt-2" size="sm">
                    Firmayı Görüntüle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kayıt Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Oluşturulma</p>
                <p className="text-sm">
                  {new Date(worker.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Son Güncelleme</p>
                <p className="text-sm">
                  {new Date(worker.updatedAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Çalışan Düzenle</DialogTitle>
            <DialogDescription>
              Çalışan bilgilerini düzenleyin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Temel Bilgiler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-fullName">Ad Soyad *</Label>
                  <Input
                    id="edit-fullName"
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tcNo">TC Kimlik No *</Label>
                  <Input
                    id="edit-tcNo"
                    value={editFormData.tcNo}
                    onChange={(e) => setEditFormData({ ...editFormData, tcNo: e.target.value })}
                    maxLength={11}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-birthDate">Doğum Tarihi *</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    value={editFormData.birthDate}
                    onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Cinsiyet *</Label>
                  <Select
                    value={editFormData.gender}
                    onValueChange={(value) => setEditFormData({ ...editFormData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Erkek</SelectItem>
                      <SelectItem value="female">Kadın</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-bloodType">Kan Grubu</Label>
                  <Select
                    value={editFormData.bloodType}
                    onValueChange={(value) => setEditFormData({ ...editFormData, bloodType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="0+">0+</SelectItem>
                      <SelectItem value="0-">0-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">İletişim Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Telefon *</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">E-posta</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Job Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">İş Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-jobTitle">Pozisyon *</Label>
                  <Input
                    id="edit-jobTitle"
                    value={editFormData.jobTitle}
                    onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-department">Departman</Label>
                  <Input
                    id="edit-department"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-startDate">İşe Başlama Tarihi *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Health Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Sağlık Bilgileri</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="edit-chronicDiseases">Kronik Hastalıklar</Label>
                  <Textarea
                    id="edit-chronicDiseases"
                    value={editFormData.chronicDiseases}
                    onChange={(e) => setEditFormData({ ...editFormData, chronicDiseases: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-allergies">Alerjiler</Label>
                  <Textarea
                    id="edit-allergies"
                    value={editFormData.allergies}
                    onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Acil Durum İletişim</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-emergencyContactName">İsim</Label>
                  <Input
                    id="edit-emergencyContactName"
                    value={editFormData.emergencyContactName}
                    onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-emergencyContactPhone">Telefon</Label>
                  <Input
                    id="edit-emergencyContactPhone"
                    value={editFormData.emergencyContactPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              İptal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Çalışanı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{worker.fullName}</strong> adlı çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Sil'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}