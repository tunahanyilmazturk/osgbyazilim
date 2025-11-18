"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, Clock, FileText, Loader2, MapPin, Mail, Phone, User, UserCheck, Users, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type Company = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

type SystemUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
  department: string | null;
  isActive: boolean;
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
};

const STEPS = [
  { id: 1, name: 'Firma Bilgileri', icon: Building2 },
  { id: 2, name: 'Randevu Detayları', icon: Calendar },
  { id: 3, name: 'Personel Atama', icon: UserCheck },
  { id: 4, name: 'Özet & Onay', icon: CheckCircle2 },
];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  user: 'Kullanıcı',
  viewer: 'Görüntüleyici',
};

export default function EditScreeningPage() {
  const router = useRouter();
  const params = useParams();
  const screeningId = params.id as string;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    companyId: '',
    participantName: '',
    employeeCount: '',
    date: '',
    timeStart: '',
    timeEnd: '',
    type: 'periodic' as const,
    status: 'scheduled' as const,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [screeningId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesRes, usersRes, screeningRes] = await Promise.all([
        fetch('/api/companies?limit=1000'),
        fetch('/api/users?isActive=true&limit=1000'),
        fetch(`/api/screenings/${screeningId}`),
      ]);

      if (!companiesRes.ok || !usersRes.ok || !screeningRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [companiesData, usersData, screeningData] = await Promise.all([
        companiesRes.json(),
        usersRes.json(),
        screeningRes.json(),
      ]);

      setCompanies(companiesData);
      setUsers(usersData);
      setScreening(screeningData);

      // Populate form with existing data
      setFormData({
        companyId: screeningData.companyId.toString(),
        participantName: screeningData.participantName,
        employeeCount: screeningData.employeeCount.toString(),
        date: screeningData.date,
        timeStart: screeningData.timeStart,
        timeEnd: screeningData.timeEnd,
        type: screeningData.type,
        status: screeningData.status,
        notes: screeningData.notes || '',
      });

      // Set selected users
      if (screeningData.assignedUsers) {
        setSelectedUserIds(screeningData.assignedUsers.map((u: AssignedUser) => u.id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
      router.push('/screenings');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === parseInt(formData.companyId));
  
  const filteredUsers = users.filter(user => {
    const searchLower = userSearchQuery.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.department && user.department.toLowerCase().includes(searchLower)) ||
      roleLabels[user.role]?.toLowerCase().includes(searchLower)
    );
  });

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === parseInt(companyId));
    setFormData({ 
      ...formData, 
      companyId,
      participantName: company?.contactPerson || formData.participantName
    });
    setErrors({ ...errors, companyId: '' });
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.companyId) newErrors.companyId = 'Firma seçimi zorunludur';
      if (!formData.participantName.trim()) newErrors.participantName = 'Yetkili adı zorunludur';
      if (!formData.employeeCount || parseInt(formData.employeeCount) < 1) {
        newErrors.employeeCount = 'Geçerli bir çalışan sayısı giriniz';
      }
    }

    if (step === 2) {
      if (!formData.date) newErrors.date = 'Tarih seçimi zorunludur';
      if (!formData.timeStart) newErrors.timeStart = 'Başlangıç saati zorunludur';
      if (!formData.timeEnd) newErrors.timeEnd = 'Bitiş saati zorunludur';
      
      if (formData.timeStart && formData.timeEnd && formData.timeStart >= formData.timeEnd) {
        newErrors.timeEnd = 'Bitiş saati başlangıç saatinden sonra olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/screenings/${screeningId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: parseInt(formData.companyId),
          participantName: formData.participantName,
          employeeCount: parseInt(formData.employeeCount),
          date: formData.date,
          timeStart: formData.timeStart,
          timeEnd: formData.timeEnd,
          type: formData.type,
          status: formData.status,
          notes: formData.notes || null,
          userIds: selectedUserIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Randevu güncellenemedi');
      }

      toast.success('✅ Randevu başarıyla güncellendi!');
      router.push('/screenings');
    } catch (error) {
      console.error('Error updating screening:', error);
      toast.error(error instanceof Error ? error.message : 'Randevu güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types = {
      periodic: 'Periyodik Muayene',
      initial: 'İşe Giriş Muayenesi',
      special: 'Özel Muayene',
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      scheduled: 'Planlandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
      'no-show': 'Gelmedi',
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Randevu bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Randevu bulunamadı</p>
          <Link href="/screenings">
            <Button className="mt-4">Takvime Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/screenings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Randevu Düzenle</h1>
          <p className="text-muted-foreground mt-1">
            Randevu #{screeningId} - Bilgileri güncelleyin
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 'bg-primary text-primary-foreground shadow-lg scale-110' : ''}
                      ${isCompleted ? 'bg-primary/20 text-primary' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium text-center hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <><Building2 className="w-5 h-5" /> Firma Bilgileri</>}
            {currentStep === 2 && <><Calendar className="w-5 h-5" /> Randevu Detayları</>}
            {currentStep === 3 && <><UserCheck className="w-5 h-5" /> Personel Atama</>}
            {currentStep === 4 && <><CheckCircle2 className="w-5 h-5" /> Özet ve Onay</>}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Firma bilgilerini düzenleyin'}
            {currentStep === 2 && 'Randevu tarih ve saatini düzenleyin'}
            {currentStep === 3 && 'Görevli kullanıcıları düzenleyin'}
            {currentStep === 4 && 'Değişiklikleri kontrol edin ve onaylayın'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyId" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Firma *
                </Label>
                <Select
                  value={formData.companyId}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger className={errors.companyId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Firma seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companyId && (
                  <p className="text-sm text-destructive">{errors.companyId}</p>
                )}
              </div>

              {selectedCompany && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Yetkili Kişi</p>
                        <p className="text-muted-foreground">{selectedCompany.contactPerson}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Telefon</p>
                        <p className="text-muted-foreground">{selectedCompany.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">E-posta</p>
                        <p className="text-muted-foreground">{selectedCompany.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Adres</p>
                        <p className="text-muted-foreground">{selectedCompany.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="participantName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Firma Yetkilisi Adı Soyadı *
                </Label>
                <Input
                  id="participantName"
                  value={formData.participantName}
                  onChange={(e) => {
                    setFormData({ ...formData, participantName: e.target.value });
                    setErrors({ ...errors, participantName: '' });
                  }}
                  placeholder="Örn: Ahmet Yılmaz"
                  className={errors.participantName ? 'border-destructive' : ''}
                />
                {errors.participantName && (
                  <p className="text-sm text-destructive">{errors.participantName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCount" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Firma Çalışan Sayısı *
                </Label>
                <Input
                  id="employeeCount"
                  type="number"
                  min="1"
                  value={formData.employeeCount}
                  onChange={(e) => {
                    setFormData({ ...formData, employeeCount: e.target.value });
                    setErrors({ ...errors, employeeCount: '' });
                  }}
                  placeholder="Örn: 50"
                  className={errors.employeeCount ? 'border-destructive' : ''}
                />
                {errors.employeeCount && (
                  <p className="text-sm text-destructive">{errors.employeeCount}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Appointment Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Durum *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Planlandı</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Tamamlandı</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">İptal</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="no-show">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Gelmedi</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Muayene Türü *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periodic">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Periyodik</Badge>
                        <span>Periyodik Muayene</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="initial">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">İşe Giriş</Badge>
                        <span>İşe Giriş Muayenesi</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="special">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Özel</Badge>
                        <span>Özel Muayene</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Tarih *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    setErrors({ ...errors, date: '' });
                  }}
                  className={errors.date ? 'border-destructive' : ''}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timeStart" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Başlangıç Saati *
                  </Label>
                  <Input
                    id="timeStart"
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) => {
                      setFormData({ ...formData, timeStart: e.target.value });
                      setErrors({ ...errors, timeStart: '', timeEnd: '' });
                    }}
                    className={errors.timeStart ? 'border-destructive' : ''}
                  />
                  {errors.timeStart && (
                    <p className="text-sm text-destructive">{errors.timeStart}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeEnd" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Bitiş Saati *
                  </Label>
                  <Input
                    id="timeEnd"
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) => {
                      setFormData({ ...formData, timeEnd: e.target.value });
                      setErrors({ ...errors, timeEnd: '' });
                    }}
                    className={errors.timeEnd ? 'border-destructive' : ''}
                  />
                  {errors.timeEnd && (
                    <p className="text-sm text-destructive">{errors.timeEnd}</p>
                  )}
                </div>
              </div>

              {formData.timeStart && formData.timeEnd && formData.timeStart < formData.timeEnd && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-primary font-medium">
                    ⏱️ Randevu Süresi: {(() => {
                      const [startH, startM] = formData.timeStart.split(':').map(Number);
                      const [endH, endM] = formData.timeEnd.split(':').map(Number);
                      const duration = (endH * 60 + endM) - (startH * 60 + startM);
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
                    })()}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notlar (Opsiyonel)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Randevuyla ilgili özel notlar veya talepler..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: User Assignment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Kullanıcı ara (ad, email, departman, rol)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllUsers}
                >
                  {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0
                    ? 'Tümünü Kaldır'
                    : 'Tümünü Seç'}
                </Button>
              </div>

              {users.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-12 text-center">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Henüz aktif kullanıcı yok</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/users">Kullanıcı Yönetimi</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredUsers.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                    {filteredUsers.map((user) => (
                      <Card
                        key={user.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedUserIds.includes(user.id) ? 'bg-primary/5 border-primary' : ''
                        }`}
                        onClick={() => handleUserToggle(user.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={() => handleUserToggle(user.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <p className="font-semibold">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {user.department && (
                                  <Badge variant="secondary" className="text-xs">
                                    {user.department}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {roleLabels[user.role] || user.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {selectedUserIds.length > 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-primary">
                        ✓ {selectedUserIds.length} kullanıcı seçildi
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Company Info Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Firma Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Firma</p>
                        <p className="font-medium">{selectedCompany?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Yetkili</p>
                        <p className="font-medium">{formData.participantName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Çalışan Sayısı</p>
                        <p className="font-medium">{formData.employeeCount} kişi</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">İletişim</p>
                        <p className="font-medium">{selectedCompany?.phone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment Details Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Randevu Detayları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Durum</p>
                        <Badge className="mt-1">{getStatusLabel(formData.status)}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Muayene Türü</p>
                        <Badge className="mt-1">{getTypeLabel(formData.type)}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tarih</p>
                        <p className="font-medium">{formatDate(formData.date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Saat</p>
                        <p className="font-medium">{formData.timeStart} - {formData.timeEnd}</p>
                      </div>
                    </div>
                    {formData.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notlar</p>
                        <p className="text-sm mt-1 p-3 bg-muted rounded-md">{formData.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Users Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Görevli Kullanıcılar ({selectedUserIds.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedUserIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Henüz kullanıcı atanmadı</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {users
                          .filter(u => selectedUserIds.includes(u.id))
                          .map(user => (
                            <Badge key={user.id} variant="secondary" className="px-3 py-1">
                              {user.fullName}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>ℹ️ Bilgi:</strong> Değişiklikler kaydedildikten sonra ilgili taraflara bildirim gönderilecektir.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <Separator />
          <div className="flex justify-between gap-3">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Geri
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/screenings">
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  İptal
                </Button>
              </Link>
              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  İleri
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}