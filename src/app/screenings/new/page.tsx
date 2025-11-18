"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, Clock, FileText, Loader2, MapPin, Mail, Phone, User, UserCheck, Users, TestTube, X } from 'lucide-react';
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

type HealthTest = {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  isActive: boolean;
};

const STEPS = [
  { id: 1, name: 'Firma Bilgileri', icon: Building2 },
  { id: 2, name: 'Randevu Detayları', icon: Calendar },
  { id: 3, name: 'Testler', icon: TestTube },
  { id: 4, name: 'Personel Atama', icon: UserCheck },
  { id: 5, name: 'Özet & Onay', icon: CheckCircle2 },
];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  user: 'Kullanıcı',
  viewer: 'Görüntüleyici',
};

export default function NewScreeningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [healthTests, setHealthTests] = useState<HealthTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [autoLoadedTestIds, setAutoLoadedTestIds] = useState<number[]>([]);
  const [isLoadingCompanyTests, setIsLoadingCompanyTests] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    companyId: '',
    participantName: '',
    employeeCount: '',
    date: '',
    timeStart: '',
    timeEnd: '',
    type: 'periodic' as const,
    notes: '',
    hasSecondShift: false,
    timeStart2: '',
    timeEnd2: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill date and time from query params coming from the calendar
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');

    if (!dateParam && !timeParam) return;

    setFormData((prev) => {
      let next = { ...prev };

      if (dateParam && !prev.date) {
        next = { ...next, date: dateParam };
      }

      if (timeParam && !prev.timeStart) {
        let timeEnd = prev.timeEnd;

        // If no end time is set, default to +30 minutes after start
        if (!timeEnd && (dateParam || prev.date)) {
          const baseDate = dateParam || prev.date;
          try {
            const startDate = new Date(`${baseDate}T${timeParam}:00`);
            const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
            const hh = String(endDate.getHours()).padStart(2, '0');
            const mm = String(endDate.getMinutes()).padStart(2, '0');
            timeEnd = `${hh}:${mm}`;
          } catch {
            // Eğer parse sırasında bir sorun olursa sessizce geç
          }
        }

        next = {
          ...next,
          timeStart: timeParam,
          timeEnd: timeEnd || prev.timeEnd,
        };
      }

      return next;
    });
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesRes, usersRes, testsRes] = await Promise.all([
        fetch('/api/companies?limit=1000'),
        fetch('/api/users?isActive=true&limit=1000'),
        fetch('/api/health-tests?isActive=true&limit=1000'),
      ]);

      if (!companiesRes.ok || !usersRes.ok || !testsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [companiesData, usersData, testsData] = await Promise.all([
        companiesRes.json(),
        usersRes.json(),
        testsRes.json(),
      ]);

      setCompanies(companiesData);
      setUsers(usersData);
      setHealthTests(testsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
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

  const filteredTests = healthTests.filter(test => {
    const searchLower = testSearchQuery.toLowerCase();
    return (
      test.name.toLowerCase().includes(searchLower) ||
      (test.code && test.code.toLowerCase().includes(searchLower)) ||
      (test.description && test.description.toLowerCase().includes(searchLower))
    );
  });

  const prefillEmployeeCountFromLastScreening = async (companyIdNum: number) => {
    try {
      const response = await fetch(`/api/screenings?companyId=${companyIdNum}&limit=1`);
      if (!response.ok) return;

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const lastScreening = data[0] as { employeeCount?: number };
      if (!lastScreening || typeof lastScreening.employeeCount !== 'number') return;

      setFormData((prev) => {
        // Kullanıcı zaten bir değer girdiyse değiştirme
        if (prev.employeeCount && prev.companyId === String(companyIdNum)) {
          return prev;
        }

        return {
          ...prev,
          employeeCount: prev.employeeCount || String(lastScreening.employeeCount),
        };
      });
    } catch (error) {
      console.error('Error pre-filling employee count from last screening:', error);
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    const company = companies.find(c => c.id === parseInt(companyId));
    setFormData({ 
      ...formData, 
      companyId,
      participantName: company?.contactPerson || ''
    });
    setErrors({ ...errors, companyId: '' });

    // Fetch and auto-load company tests
    if (companyId) {
      const numericId = parseInt(companyId);
      await fetchCompanyTests(numericId);
      // Firma için daha önce girilmiş bir çalışan sayısı varsa otomatik doldur
      prefillEmployeeCountFromLastScreening(numericId);
    } else {
      setAutoLoadedTestIds([]);
    }
  };

  const fetchCompanyTests = async (companyId: number) => {
    try {
      setIsLoadingCompanyTests(true);
      const response = await fetch(`/api/companies/${companyId}/tests`);
      
      if (response.ok) {
        const companyTests = await response.json();
        const testIds = companyTests.map((ct: any) => ct.testId);
        
        // Auto-select company tests
        setSelectedTestIds(testIds);
        setAutoLoadedTestIds(testIds);
        
        if (testIds.length > 0) {
          toast.success(`${testIds.length} firma testi otomatik yüklendi`);
        }
      }
    } catch (error) {
      console.error('Error fetching company tests:', error);
    } finally {
      setIsLoadingCompanyTests(false);
    }
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

  const handleTestToggle = (testId: number) => {
    setSelectedTestIds(prev => {
      if (prev.includes(testId)) {
        return prev.filter(id => id !== testId);
      } else {
        return [...prev, testId];
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

  const handleSelectAllTests = () => {
    if (selectedTestIds.length === filteredTests.length) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(filteredTests.map(t => t.id));
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

      // İkinci vardiya opsiyonel; sadece doldurulmuşsa kontrol et
      if (formData.hasSecondShift) {
        const hasStart2 = !!formData.timeStart2;
        const hasEnd2 = !!formData.timeEnd2;

        if ((hasStart2 && !hasEnd2) || (!hasStart2 && hasEnd2)) {
          const msg = 'İkinci vardiya için başlangıç ve bitiş saati birlikte girilmelidir';
          newErrors.timeStart2 = msg;
          newErrors.timeEnd2 = msg;
        }

        if (formData.timeStart2 && formData.timeEnd2 && formData.timeStart2 >= formData.timeEnd2) {
          newErrors.timeEnd2 = 'İkinci vardiya bitiş saati, başlangıç saatinden sonra olmalıdır';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;

    // Geriye serbest geçiş
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // İleriye giderken önceki adımların validasyonunu yap
    for (let step = 1; step < targetStep; step++) {
      const isValid = validateStep(step);
      if (!isValid) {
        // Hata olan adımı öne çıkarmak için o adıma dön
        setCurrentStep(step);
        return;
      }
    }

    setCurrentStep(targetStep);
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
      const baseNotes = (formData.notes || '').trim();
      let enhancedNotes = baseNotes;

      if (formData.hasSecondShift && formData.timeStart2 && formData.timeEnd2) {
        const secondShiftText = `İkinci vardiya saat aralığı: ${formData.timeStart2} - ${formData.timeEnd2}`;
        enhancedNotes = baseNotes
          ? `${baseNotes}\n\n${secondShiftText}`
          : secondShiftText;
      }

      // Create screening first
      const screeningResponse = await fetch('/api/screenings', {
        method: 'POST',
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
          notes: enhancedNotes || null,
          userIds: selectedUserIds,
        }),
      });

      if (!screeningResponse.ok) {
        const error = await screeningResponse.json();
        throw new Error(error.error || 'Randevu oluşturulamadı');
      }

      const screening = await screeningResponse.json();

      // Add selected tests to the screening if any
      if (selectedTestIds.length > 0) {
        const testsResponse = await fetch(`/api/screenings/${screening.id}/tests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testIds: selectedTestIds,
          }),
        });

        if (!testsResponse.ok) {
          console.error('Failed to add tests to screening');
          toast.error('Testler eklenirken bir sorun oluştu');
        }
      }

      toast.success('🎉 Randevu başarıyla oluşturuldu!');
      router.push('/screenings');
    } catch (error) {
      console.error('Error creating screening:', error);
      toast.error(error instanceof Error ? error.message : 'Randevu oluşturulurken hata oluştu');
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
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 bg-linear-to-b from-background via-background to-muted/40">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/screenings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground/90">Yeni Randevu Oluştur</h1>
            <p className="text-muted-foreground mt-1">
              Adım adım sağlık taraması randevusu oluşturun
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className="flex flex-col items-center gap-2 focus:outline-none"
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40 scale-110' : ''}
                      ${isCompleted ? 'bg-primary/15 text-primary border border-primary/30' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground border border-border/70' : ''}
                    `}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium text-center hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${isCompleted ? 'bg-primary/70' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="max-w-4xl mx-auto w-full border border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <><Building2 className="w-5 h-5" /> Firma Bilgileri</>}
            {currentStep === 2 && <><Calendar className="w-5 h-5" /> Randevu Detayları</>}
            {currentStep === 3 && <><TestTube className="w-5 h-5" /> Sağlık Testleri</>}
            {currentStep === 4 && <><UserCheck className="w-5 h-5" /> Personel Atama</>}
            {currentStep === 5 && <><CheckCircle2 className="w-5 h-5" /> Özet ve Onay</>}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Randevu için firma bilgilerini girin'}
            {currentStep === 2 && 'Randevu tarih ve saatini belirleyin'}
            {currentStep === 3 && 'Yapılacak testleri seçin'}
            {currentStep === 4 && 'Görevli kullanıcıları seçin'}
            {currentStep === 5 && 'Bilgileri kontrol edin ve onaylayın'}
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
                <Card className="bg-card border border-border/60 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
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
                  min={new Date().toISOString().split('T')[0]}
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

              {/* Optional second shift */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasSecondShift"
                    checked={formData.hasSecondShift}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked);
                      setFormData({
                        ...formData,
                        hasSecondShift: enabled,
                        ...(enabled
                          ? {}
                          : {
                              timeStart2: '',
                              timeEnd2: '',
                            }),
                      });
                      setErrors({
                        ...errors,
                        timeStart2: '',
                        timeEnd2: '',
                      });
                    }}
                  />
                  <Label htmlFor="hasSecondShift" className="text-sm text-muted-foreground">
                    Aynı gün ikinci vardiya ekle (opsiyonel)
                  </Label>
                </div>

                <p className="text-xs text-muted-foreground">
                  İkinci vardiya aynı randevu kaydı içinde ek bir saat aralığı olarak notlara işlenir, ayrı bir randevu oluşturmaz.
                </p>

                {formData.hasSecondShift && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="timeStart2" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        2. Vardiya Başlangıç Saati
                      </Label>
                      <Input
                        id="timeStart2"
                        type="time"
                        value={formData.timeStart2}
                        onChange={(e) => {
                          setFormData({ ...formData, timeStart2: e.target.value });
                          setErrors({ ...errors, timeStart2: '', timeEnd2: '' });
                        }}
                        className={errors.timeStart2 ? 'border-destructive' : ''}
                      />
                      {errors.timeStart2 && (
                        <p className="text-sm text-destructive">{errors.timeStart2}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeEnd2" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        2. Vardiya Bitiş Saati
                      </Label>
                      <Input
                        id="timeEnd2"
                        type="time"
                        value={formData.timeEnd2}
                        onChange={(e) => {
                          setFormData({ ...formData, timeEnd2: e.target.value });
                          setErrors({ ...errors, timeStart2: '', timeEnd2: '' });
                        }}
                        className={errors.timeEnd2 ? 'border-destructive' : ''}
                      />
                      {errors.timeEnd2 && (
                        <p className="text-sm text-destructive">{errors.timeEnd2}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {formData.timeStart && formData.timeEnd && formData.timeStart < formData.timeEnd && (
                <div className="bg-primary/10 border border-primary/25 rounded-lg p-4 space-y-1">
                  <p className="text-sm text-primary font-medium">
                    ⏱️ 1. Vardiya Süresi: {(() => {
                      const [startH, startM] = formData.timeStart.split(':').map(Number);
                      const [endH, endM] = formData.timeEnd.split(':').map(Number);
                      const duration = (endH * 60 + endM) - (startH * 60 + startM);
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
                    })()}
                  </p>
                  {formData.hasSecondShift &&
                    formData.timeStart2 &&
                    formData.timeEnd2 &&
                    formData.timeStart2 < formData.timeEnd2 && (
                      <p className="text-sm text-primary font-medium">
                        ⏱️ 2. Vardiya Süresi: {(() => {
                          const [startH2, startM2] = formData.timeStart2.split(':').map(Number);
                          const [endH2, endM2] = formData.timeEnd2.split(':').map(Number);
                          const duration2 = (endH2 * 60 + endM2) - (startH2 * 60 + startM2);
                          const hours2 = Math.floor(duration2 / 60);
                          const minutes2 = duration2 % 60;
                          return hours2 > 0 ? `${hours2} saat ${minutes2} dakika` : `${minutes2} dakika`;
                        })()}
                      </p>
                    )}
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

          {/* Step 3: Health Tests Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {isLoadingCompanyTests && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Firma testleri yükleniyor...
                    </p>
                  </div>
                </div>
              )}

              {autoLoadedTestIds.length > 0 && !isLoadingCompanyTests && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ {autoLoadedTestIds.length} firma testi otomatik yüklendi. İstediğiniz testleri ekleyebilir veya çıkarabilirsiniz.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Test ara (ad, kod, açıklama)..."
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllTests}
                >
                  {selectedTestIds.length === filteredTests.length && filteredTests.length > 0
                    ? 'Tümünü Kaldır'
                    : 'Tümünü Seç'}
                </Button>
              </div>

              {healthTests.length === 0 ? (
                <Card className="bg-muted/40 border border-border/70">
                  <CardContent className="py-12 text-center">
                    <TestTube className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Henüz test eklenmemiş</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/health-tests">Test Ekle</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredTests.length === 0 ? (
                <Card className="bg-muted/40 border border-border/70">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 max-h-[400px] overflow-y-auto border border-border/70 rounded-lg p-4">
                    {filteredTests.map((test) => {
                      const isAutoLoaded = autoLoadedTestIds.includes(test.id);
                      return (
                        <Card
                          key={test.id}
                          className={`cursor-pointer transition-all border border-border/60 hover:border-primary/60 hover:shadow-md ${
                            selectedTestIds.includes(test.id) ? 'bg-primary/5 border-primary' : ''
                          }`}
                          onClick={() => handleTestToggle(test.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedTestIds.includes(test.id)}
                                onCheckedChange={() => handleTestToggle(test.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-semibold">{test.name}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {selectedTestIds.length > 0 && (
                    <div className="bg-primary/10 border border-primary/25 rounded-lg p-4">
                      <p className="text-sm font-medium text-primary">
                        ✓ {selectedTestIds.length} test seçildi
                        {autoLoadedTestIds.length > 0 && ` (${autoLoadedTestIds.length} firma testi dahil)`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: User Assignment */}
          {currentStep === 4 && (
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
                <Card className="bg-muted/40 border border-border/70">
                  <CardContent className="py-12 text-center">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Henüz aktif kullanıcı yok</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/users">Kullanıcı Yönetimi</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredUsers.length === 0 ? (
                <Card className="bg-muted/40 border border-border/70">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 max-h-[400px] overflow-y-auto border border-border/70 rounded-lg p-4">
                    {filteredUsers.map((user) => (
                      <Card
                        key={user.id}
                        className={`cursor-pointer transition-all border border-border/60 hover:border-primary/60 hover:shadow-md ${
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

          {/* Step 5: Summary */}
          {currentStep === 5 && (
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
                      {formData.hasSecondShift && formData.timeStart2 && formData.timeEnd2 && (
                        <div>
                          <p className="text-sm text-muted-foreground">2. Vardiya Saat</p>
                          <p className="font-medium">{formData.timeStart2} - {formData.timeEnd2}</p>
                        </div>
                      )}
                    </div>
                    {formData.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notlar</p>
                        <p className="text-sm mt-1 p-3 bg-muted rounded-md">{formData.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Selected Tests Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      Seçilen Testler ({selectedTestIds.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTestIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Test seçilmedi</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {healthTests
                          .filter(t => selectedTestIds.includes(t.id))
                          .map(test => (
                            <Badge key={test.id} variant="secondary" className="px-3 py-1">
                              {test.name}
                            </Badge>
                          ))}
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

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Dikkat:</strong> Randevuyu oluşturduktan sonra firma ve atanan kullanıcılara bildirim gönderilecektir.
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
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Randevuyu Onayla
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