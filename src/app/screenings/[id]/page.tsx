"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Building2, Calendar, FileText, Users, UserCheck, Mail, Phone, MapPin, Briefcase, Edit, Trash2, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2, Upload, Download, File, X, TestTube } from 'lucide-react';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import ScreeningPDF from '@/components/pdf/ScreeningPDF';

type Company = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

type AssignedUser = {
  assignmentId: number;
  assignedAt: string;
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
  department: string | null;
};

type AssignedTest = {
  assignmentId: number;
  assignedAt: string;
  id: number;
  name: string;
  code: string | null;
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
  assignedUsers?: AssignedUser[];
  assignedTests?: AssignedTest[];
};

type Document = {
  id: number;
  screeningId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  notes: string | null;
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  user: 'Kullanıcı',
  viewer: 'Görüntüleyici',
};

export default function ScreeningDetailPage() {
  const router = useRouter();
  const params = useParams();
  const screeningId = params.id as string;

  const [screening, setScreening] = useState<Screening | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchScreeningDetails();
  }, [screeningId]);

  useEffect(() => {
    if (screening) {
      fetchDocuments();
    }
  }, [screening]);

  const fetchScreeningDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/screenings/${screeningId}`);

      if (!response.ok) {
        throw new Error('Randevu bilgileri yüklenemedi');
      }

      const data = await response.json();
      setScreening(data);

      // Fetch company details
      if (data.companyId) {
        const companyResponse = await fetch(`/api/companies?limit=1000`);
        if (companyResponse.ok) {
          const companies = await companyResponse.json();
          const foundCompany = companies.find((c: Company) => c.id === data.companyId);
          if (foundCompany) {
            setCompany(foundCompany);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching screening details:', error);
      toast.error('Randevu bilgileri yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/screenings/${screeningId}/documents`);

      if (!response.ok) {
        throw new Error('Belgeler yüklenemedi');
      }

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Belgeler yüklenirken hata oluştu');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece PDF, DOCX, JPG ve PNG dosyaları yüklenebilir');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu 10MB\'dan büyük olamaz');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (uploadNotes.trim()) {
        formData.append('notes', uploadNotes);
      }

      const response = await fetch(`/api/screenings/${screeningId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Belge yüklenemedi');
      }

      toast.success('Belge başarıyla yüklendi');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadNotes('');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : 'Belge yüklenirken hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;

    try {
      setIsDeletingDocument(true);
      const response = await fetch(`/api/screenings/${screeningId}/documents/${deleteDocumentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Belge silinemedi');
      }

      toast.success('Belge başarıyla silindi');
      setDeleteDocumentId(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Belge silinirken hata oluştu');
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const getCompanyInfo = () => {
    const settings = localStorage.getItem('app-settings');
    if (!settings) return undefined;
    
    try {
      const parsed = JSON.parse(settings);
      return {
        name: parsed.companyName || 'ISGOne AI',
        address: parsed.companyAddress || '',
        phone: parsed.companyPhone || '',
        email: parsed.companyEmail || '',
        stamp: parsed.companyStamp || undefined,
        logo: parsed.companyLogo || undefined,
      };
    } catch (e) {
      console.error('Error parsing settings:', e);
      return undefined;
    }
  };

  const handleViewPDF = async () => {
    if (!screening || !company) return;
    
    try {
      setIsGeneratingPDF(true);
      const companyInfo = getCompanyInfo();
      
      // Generate PDF client-side
      const blob = await pdf(
        <ScreeningPDF 
          screening={screening} 
          company={company} 
          companyInfo={companyInfo} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up URL after opening
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!screening || !company) return;
    
    try {
      setIsGeneratingPDF(true);
      const companyInfo = getCompanyInfo();
      
      // Generate PDF client-side
      const blob = await pdf(
        <ScreeningPDF 
          screening={screening} 
          company={company} 
          companyInfo={companyInfo} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `randevu-${screening.id}.pdf`;
      link.click();
      
      // Clean up URL after download
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success('PDF indirildi');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPDF(false);
    }
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
    if (!screening) return;

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
      
      // Refresh data
      fetchScreeningDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!screening) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/screenings/${screening.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Randevu silinirken hata oluştu');
      }

      toast.success('Randevu başarıyla silindi');
      router.push('/screenings');
    } catch (error) {
      console.error('Error deleting screening:', error);
      toast.error('Randevu silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Randevu detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Randevu Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">Aradığınız randevu bulunamadı veya silinmiş olabilir.</p>
          <Link href="/screenings">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Randevulara Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(screening.status);
  const screeningDate = new Date(screening.date);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-4">
          <Link href="/screenings">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Randevu Detayları</h1>
            <p className="text-muted-foreground mt-2">
              Randevu #{screening.id} - {screeningDate.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleViewPDF} 
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF Görüntüle
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF İndir
          </Button>
          <Badge variant={statusBadge.variant} className="text-base px-4 py-2">
            {statusBadge.label}
          </Badge>
        </div>
      </div>

      {/* Quick Status Change Buttons */}
      {screening.status === 'scheduled' && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium mb-4">Hızlı Durum Değiştir:</p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdatingStatus}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Tamamlandı Olarak İşaretle
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-red-500 text-red-700 hover:bg-red-50"
                onClick={() => handleStatusChange('cancelled')}
                disabled={isUpdatingStatus}
              >
                <XCircle className="w-5 h-5 mr-2" />
                İptal Et
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-700 hover:bg-orange-50"
                onClick={() => handleStatusChange('no-show')}
                disabled={isUpdatingStatus}
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                Gelmedi Olarak İşaretle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time and Type */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Randevu Bilgileri</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Saat</span>
                  </div>
                  <p className="text-2xl font-semibold ml-7">
                    {screening.timeStart} - {screening.timeEnd}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="w-5 h-5" />
                    <span className="font-medium">Muayene Tipi</span>
                  </div>
                  <p className="text-base ml-7">{getTypeBadge(screening.type)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Building2 className="w-6 h-6 text-primary" />
                <span>Firma Bilgileri</span>
              </div>
              {company && (
                <div className="ml-8 space-y-4">
                  <div>
                    <p className="font-semibold text-xl">{company.name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      <span className="text-base">{company.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5" />
                      <span className="text-base">{company.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" />
                      <span className="text-base">{company.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5" />
                      <span className="text-base">{company.address}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participant Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                <User className="w-6 h-6 text-primary" />
                <span>Katılımcı Bilgileri</span>
              </div>
              <div className="ml-8 space-y-3">
                <p className="font-semibold text-xl">{screening.participantName}</p>
                <div className="flex items-center gap-3 text-base text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span>{screening.employeeCount} çalışan için tarama yapılacak</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Tests */}
          {screening.assignedTests && screening.assignedTests.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <TestTube className="w-6 h-6 text-primary" />
                  <span>Yapılacak Sağlık Testleri ({screening.assignedTests.length})</span>
                </div>
                <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {screening.assignedTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                    >
                      <TestTube className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{test.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {screening.notes && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <span>Notlar</span>
                </div>
                <div className="ml-8">
                  <p className="text-base text-muted-foreground italic bg-muted/30 p-4 rounded-lg">
                    {screening.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="w-6 h-6 text-primary" />
                  <span>Sağlık Raporları ve Belgeler ({documents.length})</span>
                </div>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Belge Yükle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Yeni Belge Yükle</DialogTitle>
                      <DialogDescription>
                        Bu randevu için sağlık raporu veya belge yükleyin (PDF, DOCX, JPG, PNG - Max 10MB)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="file">Dosya *</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                            className="cursor-pointer"
                          />
                        </div>
                        {selectedFile && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <File className="w-4 h-4" />
                            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                            <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFile(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          İzin verilen dosya türleri: PDF, DOCX, JPG, PNG (Maksimum 10MB)
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                        <Textarea
                          id="notes"
                          value={uploadNotes}
                          onChange={(e) => setUploadNotes(e.target.value)}
                          placeholder="Belge hakkında notlar..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadDialogOpen(false);
                          setSelectedFile(null);
                          setUploadNotes('');
                        }}
                        disabled={isUploading}
                      >
                        İptal
                      </Button>
                      <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Yükleniyor...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Yükle
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground mb-4">Henüz belge yüklenmemiş</p>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    İlk Belgeyi Yükle
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="text-3xl mt-1">{getFileIcon(doc.fileType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{doc.fileName}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{new Date(doc.uploadedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            {doc.notes && (
                              <p className="text-sm text-muted-foreground italic mt-2 bg-muted/50 p-2 rounded">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDocumentId(doc.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">İşlemler</h3>
              <div className="space-y-3">
                <Link href={`/screenings/${screening.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start" size="lg">
                    <Edit className="w-5 h-5 mr-3" />
                    Randevuyu Düzenle
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  size="lg"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  Randevuyu Sil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Users */}
          {screening.assignedUsers && screening.assignedUsers.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <UserCheck className="w-6 h-6 text-primary" />
                  <span>Atanmış Kullanıcılar ({screening.assignedUsers.length})</span>
                </div>
                <div className="space-y-3">
                  {screening.assignedUsers.map((user) => (
                    <div key={user.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-2">
                        <p className="font-semibold text-base">
                          {user.fullName}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                        {user.department && (
                          <p className="text-sm text-muted-foreground">{user.department}</p>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Atandı: {new Date(user.assignedAt).toLocaleDateString('tr-TR', {
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
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ek Bilgiler</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>
                  <span className="font-medium">Oluşturulma:</span>
                  <p className="mt-1">{new Date(screening.createdAt).toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <span className="font-medium">Randevu ID:</span>
                  <p className="mt-1">#{screening.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDocumentId !== null} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Belgeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Belge kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeletingDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingDocument ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}