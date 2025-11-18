"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building2, Phone, Mail, User, MapPin, Plus, Loader2, UserPlus, Calendar, Briefcase, Users, ChevronRight, AlertCircle, TestTube, Trash2, Edit, Search, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';

type Company = {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  createdAt: string;
};

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
  startDate: string;
  isActive: boolean;
  createdAt: string;
};

type HealthTest = {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  isActive: boolean;
};

type CompanyTest = {
  assignmentId: number;
  companyId: number;
  testId: number;
  assignedAt: string;
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  isActive: boolean;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [companyTests, setCompanyTests] = useState<CompanyTest[]>([]);
  const [availableTests, setAvailableTests] = useState<HealthTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [editWorkerOpen, setEditWorkerOpen] = useState(false);
  const [deleteWorkerOpen, setDeleteWorkerOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [addTestsOpen, setAddTestsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingTests, setIsAddingTests] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [workerForm, setWorkerForm] = useState({
    fullName: '',
    tcNo: '',
    birthDate: '',
    gender: 'male',
    phone: '',
    email: '',
    jobTitle: '',
    department: '',
    bloodType: '',
    chronicDiseases: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchCompanyDetails();
    fetchWorkers(true);
    fetchCompanyTests();
  }, [companyId]);

  useEffect(() => {
    fetchWorkers(activeTab === 'active');
  }, [activeTab]);

  const fetchCompanyDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/companies?limit=1000`);
      if (!response.ok) throw new Error('Firma bilgileri yüklenemedi');
      
      const companies = await response.json();
      const foundCompany = companies.find((c: Company) => c.id === parseInt(companyId));
      
      if (!foundCompany) {
        toast.error('Firma bulunamadı');
        router.push('/companies');
        return;
      }
      
      setCompany(foundCompany);
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Firma bilgileri yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkers = async (isActive: boolean) => {
    try {
      setIsLoadingWorkers(true);
      const response = await fetch(`/api/companies/${companyId}/workers?isActive=${isActive}&limit=1000`);
      if (!response.ok) throw new Error('Çalışanlar yüklenemedi');
      
      const data = await response.json();
      setWorkers(data);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Çalışanlar yüklenirken hata oluştu');
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const fetchCompanyTests = async () => {
    try {
      setIsLoadingTests(true);
      const response = await fetch(`/api/companies/${companyId}/tests`);
      if (!response.ok) throw new Error('Testler yüklenemedi');
      
      const data = await response.json();
      setCompanyTests(data);
    } catch (error) {
      console.error('Error fetching company tests:', error);
      toast.error('Testler yüklenirken hata oluştu');
    } finally {
      setIsLoadingTests(false);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      const response = await fetch('/api/health-tests?isActive=true&limit=1000');
      if (!response.ok) throw new Error('Testler yüklenemedi');
      
      const data = await response.json();
      // Filter out already assigned tests
      const assignedTestIds = companyTests.map(ct => ct.testId);
      const available = data.filter((test: HealthTest) => !assignedTestIds.includes(test.id));
      setAvailableTests(available);
    } catch (error) {
      console.error('Error fetching available tests:', error);
      toast.error('Testler yüklenirken hata oluştu');
    }
  };

  const handleOpenAddTests = async () => {
    setSelectedTestIds([]);
    setTestSearchQuery('');
    await fetchAvailableTests();
    setAddTestsOpen(true);
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

  const handleSelectAllTests = () => {
    const filtered = availableTests.filter(test => {
      const searchLower = testSearchQuery.toLowerCase();
      return (
        test.name.toLowerCase().includes(searchLower)
      );
    });

    if (selectedTestIds.length === filtered.length && filtered.length > 0) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(filtered.map(t => t.id));
    }
  };

  const handleAddTests = async () => {
    if (selectedTestIds.length === 0) {
      toast.error('En az bir test seçmelisiniz');
      return;
    }

    try {
      setIsAddingTests(true);
      const response = await fetch(`/api/companies/${companyId}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testIds: selectedTestIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Testler eklenemedi');
      }

      toast.success(`${selectedTestIds.length} test başarıyla eklendi`);
      setAddTestsOpen(false);
      setSelectedTestIds([]);
      fetchCompanyTests();
    } catch (error) {
      console.error('Error adding tests:', error);
      toast.error(error instanceof Error ? error.message : 'Testler eklenirken hata oluştu');
    } finally {
      setIsAddingTests(false);
    }
  };

  const handleRemoveTest = async (testId: number, testName: string) => {
    if (!confirm(`"${testName}" testini firmadan kaldırmak istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/tests/${testId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test kaldırılamadı');
      }

      toast.success('Test başarıyla kaldırıldı');
      fetchCompanyTests();
    } catch (error) {
      console.error('Error removing test:', error);
      toast.error(error instanceof Error ? error.message : 'Test kaldırılırken hata oluştu');
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...workerForm,
        birthDate: new Date(workerForm.birthDate).toISOString(),
        startDate: new Date(workerForm.startDate).toISOString(),
        email: workerForm.email.trim() || null,
        department: workerForm.department.trim() || null,
        bloodType: workerForm.bloodType.trim() || null,
        chronicDiseases: workerForm.chronicDiseases.trim() || null,
        allergies: workerForm.allergies.trim() || null,
        emergencyContactName: workerForm.emergencyContactName.trim() || null,
        emergencyContactPhone: workerForm.emergencyContactPhone.trim() || null,
      };

      const response = await fetch(`/api/companies/${companyId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Çalışan eklenemedi');
      }

      toast.success('Çalışan başarıyla eklendi');
      setAddWorkerOpen(false);
      setWorkerForm({
        fullName: '',
        tcNo: '',
        birthDate: '',
        gender: 'male',
        phone: '',
        email: '',
        jobTitle: '',
        department: '',
        bloodType: '',
        chronicDiseases: '',
        allergies: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      fetchWorkers(activeTab === 'active');
    } catch (error) {
      console.error('Error adding worker:', error);
      toast.error(error instanceof Error ? error.message : 'Çalışan eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setWorkerForm({
      fullName: worker.fullName,
      tcNo: worker.tcNo,
      birthDate: new Date(worker.birthDate).toISOString().split('T')[0],
      gender: worker.gender,
      phone: worker.phone,
      email: worker.email || '',
      jobTitle: worker.jobTitle,
      department: worker.department || '',
      bloodType: worker.bloodType || '',
      chronicDiseases: '',
      allergies: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      startDate: new Date(worker.startDate).toISOString().split('T')[0],
    });
    setEditWorkerOpen(true);
  };

  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: workerForm.fullName,
        tcNo: workerForm.tcNo,
        birthDate: new Date(workerForm.birthDate).toISOString(),
        gender: workerForm.gender,
        phone: workerForm.phone,
        email: workerForm.email.trim() || null,
        jobTitle: workerForm.jobTitle,
        department: workerForm.department.trim() || null,
        bloodType: workerForm.bloodType.trim() || null,
        startDate: new Date(workerForm.startDate).toISOString(),
      };

      const response = await fetch(`/api/companies/${companyId}/workers/${selectedWorker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Çalışan güncellenemedi');
      }

      toast.success('Çalışan başarıyla güncellendi');
      setEditWorkerOpen(false);
      setSelectedWorker(null);
      fetchWorkers(activeTab === 'active');
    } catch (error) {
      console.error('Error updating worker:', error);
      toast.error(error instanceof Error ? error.message : 'Çalışan güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorker = async () => {
    if (!selectedWorker) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/workers/${selectedWorker.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Çalışan silinemedi');
      }

      toast.success('Çalışan başarıyla silindi');
      setDeleteWorkerOpen(false);
      setSelectedWorker(null);
      fetchWorkers(activeTab === 'active');
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error(error instanceof Error ? error.message : 'Çalışan silinirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWorkerStatus = async (worker: Worker) => {
    try {
      const newStatus = !worker.isActive;
      const response = await fetch(`/api/companies/${companyId}/workers/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Durum güncellenemedi');
      }

      toast.success(`Çalışan ${newStatus ? 'aktif' : 'pasif'} duruma getirildi`);
      fetchWorkers(activeTab === 'active');
    } catch (error) {
      console.error('Error toggling worker status:', error);
      toast.error(error instanceof Error ? error.message : 'Durum güncellenirken hata oluştu');
    }
  };

  const handleOpenEditCompany = () => {
    if (!company) return;
    setCompanyForm({
      name: company.name,
      address: company.address,
      contactPerson: company.contactPerson,
      phone: company.phone,
      email: company.email,
    });
    setEditCompanyOpen(true);
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Firma bilgileri güncellenemedi');
      }

      const updatedCompany = await response.json();
      setCompany(updatedCompany);
      toast.success('Firma bilgileri başarıyla güncellendi');
      setEditCompanyOpen(false);
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error instanceof Error ? error.message : 'Firma güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportWorkersToExcel = () => {
    try {
      // Prepare data for export
      const dataToExport = workers.map(worker => ({
        'Ad Soyad': worker.fullName,
        'TC Kimlik No': worker.tcNo,
        'Doğum Tarihi': new Date(worker.birthDate).toLocaleDateString('tr-TR'),
        'Yaş': calculateAge(worker.birthDate),
        'Cinsiyet': worker.gender === 'male' ? 'Erkek' : 'Kadın',
        'Telefon': worker.phone,
        'E-posta': worker.email || '-',
        'Pozisyon': worker.jobTitle,
        'Departman': worker.department || '-',
        'Kan Grubu': worker.bloodType || '-',
        'İşe Başlama': new Date(worker.startDate).toLocaleDateString('tr-TR'),
        'Durum': worker.isActive ? 'Aktif' : 'Pasif',
      }));

      // Convert to CSV
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Add BOM for Turkish character support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${company?.name || 'firma'}_calisanlar_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${workers.length} çalışan Excel'e aktarıldı`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Excel aktarımı sırasında hata oluştu');
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

  const filteredAvailableTests = availableTests.filter(test => {
    const searchLower = testSearchQuery.toLowerCase();
    return test.name.toLowerCase().includes(searchLower);
  });

  const filteredWorkers = workers.filter(worker => {
    const searchLower = workerSearchQuery.toLowerCase();
    return (
      worker.fullName.toLowerCase().includes(searchLower) ||
      worker.jobTitle.toLowerCase().includes(searchLower) ||
      (worker.department && worker.department.toLowerCase().includes(searchLower)) ||
      worker.phone.includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Firma bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Firma Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">Aradığınız firma bulunamadı.</p>
          <Link href="/companies">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Firmalara Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-4">
          <Link href="/companies">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            <p className="text-muted-foreground mt-2">Firma detayları ve çalışan yönetimi</p>
          </div>
        </div>
        <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <UserPlus className="w-4 h-4 mr-2" />
              Çalışan Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Çalışan Ekle</DialogTitle>
              <DialogDescription>
                {company.name} firması için yeni çalışan bilgilerini girin
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWorker}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="fullName">Ad Soyad *</Label>
                    <Input
                      id="fullName"
                      value={workerForm.fullName}
                      onChange={(e) => setWorkerForm({ ...workerForm, fullName: e.target.value })}
                      placeholder="Örn: Ahmet Yılmaz"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tcNo">TC Kimlik No *</Label>
                    <Input
                      id="tcNo"
                      value={workerForm.tcNo}
                      onChange={(e) => setWorkerForm({ ...workerForm, tcNo: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      placeholder="11 haneli TC No"
                      maxLength={11}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Doğum Tarihi *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={workerForm.birthDate}
                      onChange={(e) => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Cinsiyet *</Label>
                    <Select value={workerForm.gender} onValueChange={(value) => setWorkerForm({ ...workerForm, gender: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={workerForm.phone}
                      onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                      placeholder="0555 123 4567"
                      required
                      autoComplete="tel"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={workerForm.email}
                      onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                      placeholder="ornek@email.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="jobTitle">Pozisyon *</Label>
                    <Input
                      id="jobTitle"
                      value={workerForm.jobTitle}
                      onChange={(e) => setWorkerForm({ ...workerForm, jobTitle: e.target.value })}
                      placeholder="Örn: Mühendis"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Departman</Label>
                    <Input
                      id="department"
                      value={workerForm.department}
                      onChange={(e) => setWorkerForm({ ...workerForm, department: e.target.value })}
                      placeholder="Örn: Üretim"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bloodType">Kan Grubu</Label>
                    <Input
                      id="bloodType"
                      value={workerForm.bloodType}
                      onChange={(e) => setWorkerForm({ ...workerForm, bloodType: e.target.value })}
                      placeholder="Örn: A+"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">İşe Başlama Tarihi *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={workerForm.startDate}
                      onChange={(e) => setWorkerForm({ ...workerForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="chronicDiseases">Kronik Hastalıklar</Label>
                    <Input
                      id="chronicDiseases"
                      value={workerForm.chronicDiseases}
                      onChange={(e) => setWorkerForm({ ...workerForm, chronicDiseases: e.target.value })}
                      placeholder="Varsa virgülle ayırın"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="allergies">Alerjiler</Label>
                    <Input
                      id="allergies"
                      value={workerForm.allergies}
                      onChange={(e) => setWorkerForm({ ...workerForm, allergies: e.target.value })}
                      placeholder="Varsa virgülle ayırın"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactName">Acil Durumda İsim</Label>
                    <Input
                      id="emergencyContactName"
                      value={workerForm.emergencyContactName}
                      onChange={(e) => setWorkerForm({ ...workerForm, emergencyContactName: e.target.value })}
                      placeholder="Yakın ismi"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactPhone">Acil Durumda Telefon</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={workerForm.emergencyContactPhone}
                      onChange={(e) => setWorkerForm({ ...workerForm, emergencyContactPhone: e.target.value })}
                      placeholder="Yakın telefonu"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddWorkerOpen(false)} disabled={isSubmitting}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Çalışan Ekle'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Company Dialog */}
      <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Firma Bilgilerini Düzenle</DialogTitle>
            <DialogDescription>
              Firma bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCompany}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Firma Adı *</Label>
                <Input
                  id="company-name"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="Örn: ABC Şirketi"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-contactPerson">Yetkili Kişi *</Label>
                <Input
                  id="company-contactPerson"
                  value={companyForm.contactPerson}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactPerson: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company-phone">Telefon *</Label>
                  <Input
                    id="company-phone"
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="0555 123 4567"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company-email">E-posta *</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="info@firma.com"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-address">Adres *</Label>
                <Textarea
                  id="company-address"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Firma adresi"
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditCompanyOpen(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Güncelle'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={editWorkerOpen} onOpenChange={setEditWorkerOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Çalışan Düzenle</DialogTitle>
            <DialogDescription>
              Çalışan bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditWorker}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="edit-fullName">Ad Soyad *</Label>
                  <Input
                    id="edit-fullName"
                    value={workerForm.fullName}
                    onChange={(e) => setWorkerForm({ ...workerForm, fullName: e.target.value })}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-tcNo">TC Kimlik No *</Label>
                  <Input
                    id="edit-tcNo"
                    value={workerForm.tcNo}
                    onChange={(e) => setWorkerForm({ ...workerForm, tcNo: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="11 haneli TC No"
                    maxLength={11}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-birthDate">Doğum Tarihi *</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    value={workerForm.birthDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-gender">Cinsiyet *</Label>
                  <Select value={workerForm.gender} onValueChange={(value) => setWorkerForm({ ...workerForm, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Erkek</SelectItem>
                      <SelectItem value="female">Kadın</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefon *</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={workerForm.phone}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                    placeholder="0555 123 4567"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-posta</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={workerForm.email}
                    onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                    placeholder="ornek@email.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-jobTitle">Pozisyon *</Label>
                  <Input
                    id="edit-jobTitle"
                    value={workerForm.jobTitle}
                    onChange={(e) => setWorkerForm({ ...workerForm, jobTitle: e.target.value })}
                    placeholder="Örn: Mühendis"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-department">Departman</Label>
                  <Input
                    id="edit-department"
                    value={workerForm.department}
                    onChange={(e) => setWorkerForm({ ...workerForm, department: e.target.value })}
                    placeholder="Örn: Üretim"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bloodType">Kan Grubu</Label>
                  <Input
                    id="edit-bloodType"
                    value={workerForm.bloodType}
                    onChange={(e) => setWorkerForm({ ...workerForm, bloodType: e.target.value })}
                    placeholder="Örn: A+"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate">İşe Başlama Tarihi *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={workerForm.startDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditWorkerOpen(false)} disabled={isSubmitting}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Güncelle'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Worker Dialog */}
      <Dialog open={deleteWorkerOpen} onOpenChange={setDeleteWorkerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çalışanı Sil</DialogTitle>
            <DialogDescription>
              Bu çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{selectedWorker.fullName}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker.jobTitle}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteWorkerOpen(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteWorker}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Sil'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Firma Bilgileri
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleOpenEditCompany}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <User className="w-5 h-5" />
              <div>
                <p className="text-xs text-muted-foreground">Yetkili Kişi</p>
                <p className="text-foreground font-medium">{company.contactPerson}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="w-5 h-5" />
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="text-foreground font-medium">{company.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <div>
                <p className="text-xs text-muted-foreground">E-posta</p>
                <p className="text-foreground font-medium">{company.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <div>
                <p className="text-xs text-muted-foreground">Adres</p>
                <p className="text-foreground font-medium">{company.address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Tests Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-primary" />
              Firma Testleri ({companyTests.length})
            </CardTitle>
            <Dialog open={addTestsOpen} onOpenChange={setAddTestsOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddTests}>
                  <Plus className="w-4 h-4 mr-2" />
                  Test Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Firmaya Test Ekle</DialogTitle>
                  <DialogDescription>
                    {company.name} firması için testler seçin
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <Input
                      placeholder="Test ara..."
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllTests}
                    >
                      {selectedTestIds.length === filteredAvailableTests.length && filteredAvailableTests.length > 0
                        ? 'Tümünü Kaldır'
                        : 'Tümünü Seç'}
                    </Button>
                  </div>

                  {availableTests.length === 0 ? (
                    <div className="text-center py-8">
                      <TestTube className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">Eklenecek test kalmadı</p>
                    </div>
                  ) : filteredAvailableTests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                      {filteredAvailableTests.map((test) => (
                        <Card
                          key={test.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
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
                      ))}
                    </div>
                  )}

                  {selectedTestIds.length > 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <p className="text-sm font-medium text-primary">
                        ✓ {selectedTestIds.length} test seçildi
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddTestsOpen(false)}
                    disabled={isAddingTests}
                  >
                    İptal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddTests}
                    disabled={isAddingTests || selectedTestIds.length === 0}
                  >
                    {isAddingTests ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      'Testleri Ekle'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : companyTests.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-4">Henüz test eklenmemiş</p>
              <Button variant="outline" onClick={handleOpenAddTests}>
                <Plus className="w-4 h-4 mr-2" />
                İlk Testi Ekle
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {companyTests.map((test) => (
                <div
                  key={test.assignmentId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TestTube className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{test.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTest(test.testId, test.name)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workers Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Firma Çalışanları
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportWorkersToExcel}
              disabled={workers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel'e Aktar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'inactive')}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="active">Aktif Çalışanlar</TabsTrigger>
                <TabsTrigger value="inactive">Pasif Çalışanlar</TabsTrigger>
              </TabsList>
              
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Çalışan ara..."
                  value={workerSearchQuery}
                  onChange={(e) => setWorkerSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <TabsContent value="active" className="mt-0">
              {isLoadingWorkers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  {workerSearchQuery ? (
                    <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">Henüz aktif çalışan eklenmemiş</p>
                      <Button variant="outline" onClick={() => setAddWorkerOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        İlk Çalışanı Ekle
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorkers.map((worker) => (
                    <Card key={worker.id} className="hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Link href={`/companies/${companyId}/workers/${worker.id}`} className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors">
                              {worker.fullName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{worker.jobTitle}</p>
                          </Link>
                        </div>
                        <div className="space-y-2 text-sm mb-3">
                          {worker.department && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Briefcase className="w-4 h-4" />
                              <span>{worker.department}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{calculateAge(worker.birthDate)} yaş</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span className="truncate">{worker.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {worker.bloodType && (
                            <Badge variant="secondary">
                              {worker.bloodType}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleOpenEditWorker(worker);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleWorkerStatus(worker);
                              }}
                              title="Pasif yap"
                            >
                              <ToggleRight className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedWorker(worker);
                                setDeleteWorkerOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inactive" className="mt-0">
              {isLoadingWorkers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  {workerSearchQuery ? (
                    <p className="text-muted-foreground">Arama sonucu bulunamadı</p>
                  ) : (
                    <p className="text-muted-foreground">Pasif çalışan bulunmuyor</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorkers.map((worker) => (
                    <Card key={worker.id} className="hover:shadow-lg transition-shadow h-full opacity-70">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Link href={`/companies/${companyId}/workers/${worker.id}`} className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors">
                              {worker.fullName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{worker.jobTitle}</p>
                          </Link>
                        </div>
                        <div className="space-y-2 text-sm mb-3">
                          {worker.department && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Briefcase className="w-4 h-4" />
                              <span>{worker.department}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{calculateAge(worker.birthDate)} yaş</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">Pasif</Badge>
                          <div className="flex items-center gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleOpenEditWorker(worker);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleWorkerStatus(worker);
                              }}
                              title="Aktif yap"
                            >
                              <ToggleLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedWorker(worker);
                                setDeleteWorkerOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}