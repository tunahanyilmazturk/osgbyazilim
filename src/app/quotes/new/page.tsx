"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, Trash2, Save, FileText, Edit2, GripVertical, Copy, Percent, DollarSign, Building2, FileText as FileTextIcon, Clock, Search, Star, AlertCircle, X, History, Sparkles, BookmarkPlus, TrendingUp, TrendingDown, Zap, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Company = {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
};

type HealthTest = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  price: number | null;
  isActive: boolean;
};

type QuoteItemForm = {
  id: string;
  healthTestId: number | null;
  quantity: number;
  unitPrice: number;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  selected: boolean;
};

type Quote = {
  id: number;
  quoteNumber: string;
  issueDate: string;
  total: number;
};

type Currency = 'TRY' | 'USD' | 'EUR';

// NEW: Template type
type QuoteTemplate = {
  id: string;
  name: string;
  items: Omit<QuoteItemForm, 'id' | 'selected'>[];
  createdAt: number;
};

const CURRENCY_RATES: Record<Currency, number> = {
  TRY: 1,
  USD: 34.50,
  EUR: 37.80,
};

type QuoteDragEndEvent = Parameters<NonNullable<React.ComponentProps<typeof DndContext>["onDragEnd"]>>[0];

const NOTE_TEMPLATES = [
  'Teklif fiyatlarımız KDV hariçtir.',
  'Ödeme şartları: Peşin ödeme',
  'Ödeme şartları: 30 gün vadeli',
  'Teslimat süresi: 7-10 iş günü',
  'Teslimat süresi: 15-20 iş günü',
  'Tüm fiyatlar cari döviz kuru üzerinden hesaplanmıştır.',
  'Teklifimiz 30 gün süre ile geçerlidir.',
];

const PAYMENT_TERMS_TEMPLATES = [
  'Peşin ödeme',
  '30 gün vadeli ödeme',
  '60 gün vadeli ödeme',
  '50% peşin, 50% iş bitiminde',
  '40% peşin, 60% iş bitiminde',
];

// Sortable Item Component
function SortableItem({ item, index, onEdit, onRemove, onToggleSelect, formatCurrency, onPriceChange, onQuantityChange }: any) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(item.unitPrice.toString());
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [quantityValue, setQuantityValue] = useState(item.quantity.toString());

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const itemSubtotal = item.quantity * item.unitPrice;
  const discountAmount = item.discountType === 'percentage' 
    ? itemSubtotal * (item.discount / 100)
    : item.discount;
  const afterDiscount = itemSubtotal - discountAmount;
  const taxAmount = afterDiscount * (item.taxRate / 100);
  const itemTotal = afterDiscount + taxAmount;

  const handlePriceClick = () => {
    setIsEditingPrice(true);
    setPriceValue(item.unitPrice.toString());
  };

  const handlePriceSave = () => {
    const newPrice = parseFloat(priceValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      onPriceChange(item.id, newPrice);
      setIsEditingPrice(false);
    } else {
      toast.error('Geçerli bir fiyat girin');
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSave();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setPriceValue(item.unitPrice.toString());
    }
  };

  const handleQuantityClick = () => {
    setIsEditingQuantity(true);
    setQuantityValue(item.quantity.toString());
  };

  const handleQuantitySave = () => {
    const newQuantity = parseInt(quantityValue);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onQuantityChange(item.id, newQuantity);
      setIsEditingQuantity(false);
    } else {
      toast.error('Geçerli bir miktar girin');
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantitySave();
    } else if (e.key === 'Escape') {
      setIsEditingQuantity(false);
      setQuantityValue(item.quantity.toString());
    }
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={item.selected ? 'bg-muted/50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={item.selected}
            onCheckedChange={() => onToggleSelect(item.id)}
          />
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </TableCell>
      <TableCell className="font-medium">{index + 1}</TableCell>
      <TableCell>
        <div>
          <div>{item.description}</div>
          {item.discount > 0 && (
            <Badge variant="secondary" className="mt-1 text-xs">
              İskonto: {item.discountType === 'percentage' ? `%${item.discount}` : formatCurrency(item.discount)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {isEditingQuantity ? (
          <Input
            type="number"
            min="1"
            value={quantityValue}
            onChange={(e) => setQuantityValue(e.target.value)}
            onBlur={handleQuantitySave}
            onKeyDown={handleQuantityKeyDown}
            className="w-24 text-center"
            autoFocus
          />
        ) : (
          <button
            onClick={handleQuantityClick}
            className="text-center hover:text-primary hover:underline cursor-pointer w-full"
          >
            {item.quantity}
          </button>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isEditingPrice ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            onBlur={handlePriceSave}
            onKeyDown={handlePriceKeyDown}
            className="w-32 text-right"
            autoFocus
          />
        ) : (
          <button
            onClick={handlePriceClick}
            className="text-right hover:text-primary hover:underline cursor-pointer w-full"
          >
            {formatCurrency(item.unitPrice)}
          </button>
        )}
      </TableCell>
      <TableCell className="text-center">%{item.taxRate}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(itemTotal)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="gap-1"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function NewQuotePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [healthTests, setHealthTests] = useState<HealthTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previousQuotes, setPreviousQuotes] = useState<Quote[]>([]);
  const [loadingPreviousQuotes, setLoadingPreviousQuotes] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntilDate, setValidUntilDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItemForm[]>([]);
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [generalDiscount, setGeneralDiscount] = useState(0);
  const [generalDiscountType, setGeneralDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [extraCosts, setExtraCosts] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [manualRate, setManualRate] = useState<number | null>(null);

  // Enhanced state
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [bulkTestSearchQuery, setBulkTestSearchQuery] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [favoriteTests, setFavoriteTests] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // NEW: Template & Smart Features state
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [suggestedTests, setSuggestedTests] = useState<HealthTest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentlyUsedTests, setRecentlyUsedTests] = useState<number[]>([]);

  // Dialog state
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [previousQuotesDialogOpen, setPreviousQuotesDialogOpen] = useState(false);
  const [bulkAddTestsDialogOpen, setBulkAddTestsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<QuoteItemForm>({
    id: '',
    healthTestId: null,
    quantity: 1,
    unitPrice: 0,
    description: '',
    discount: 0,
    discountType: 'percentage',
    taxRate: 10,
    selected: false,
  });
  const [editingItem, setEditingItem] = useState<QuoteItemForm | null>(null);

  // Bulk add tests state
  const [selectedTestsForBulkAdd, setSelectedTestsForBulkAdd] = useState<number[]>([]);
  const [bulkAddSettings, setBulkAddSettings] = useState({
    quantity: 1,
    discount: 0,
    discountType: 'percentage' as 'percentage' | 'fixed',
    taxRate: 10,
  });

  // Company form state
  const [newCompany, setNewCompany] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
  });
  const [isAddingCompany, setIsAddingCompany] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // NEW: Load templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('quote-templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
  }, []);

  // NEW: Load recently used tests
  useEffect(() => {
    const savedRecentTests = localStorage.getItem('recently-used-tests');
    if (savedRecentTests) {
      try {
        setRecentlyUsedTests(JSON.parse(savedRecentTests));
      } catch (error) {
        console.error('Error loading recent tests:', error);
      }
    }
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorite-tests');
    if (savedFavorites) {
      try {
        setFavoriteTests(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  // NEW: Track test usage for smart suggestions
  const trackTestUsage = useCallback((testId: number, companyId: string) => {
    const key = `company-${companyId}-tests`;
    const existing = localStorage.getItem(key);
    const usage: { [key: number]: number } = existing ? JSON.parse(existing) : {};
    usage[testId] = (usage[testId] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(usage));
  }, []);

  // NEW: Get suggested tests for company
  useEffect(() => {
    if (companyId && healthTests.length > 0) {
      const key = `company-${companyId}-tests`;
      const usage = localStorage.getItem(key);
      if (usage) {
        try {
          const usageData: { [key: number]: number } = JSON.parse(usage);
          const sorted = Object.entries(usageData)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => parseInt(id));
          
          const suggested = healthTests.filter(test => sorted.includes(test.id));
          setSuggestedTests(suggested);
          setShowSuggestions(suggested.length > 0);
        } catch (error) {
          console.error('Error loading suggestions:', error);
        }
      }
    } else {
      setSuggestedTests([]);
      setShowSuggestions(false);
    }
  }, [companyId, healthTests]);

  // NEW: Save template
  const handleSaveTemplate = useCallback(() => {
    if (!newTemplateName.trim()) {
      toast.error('Lütfen şablon adı girin');
      return;
    }
    if (items.length === 0) {
      toast.error('Şablon kaydetmek için en az bir kalem ekleyin');
      return;
    }

    const template: QuoteTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName,
      items: items.map(item => ({
        healthTestId: item.healthTestId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: item.description,
        discount: item.discount,
        discountType: item.discountType,
        taxRate: item.taxRate,
      })),
      createdAt: Date.now(),
    };

    const newTemplates = [...templates, template];
    setTemplates(newTemplates);
    localStorage.setItem('quote-templates', JSON.stringify(newTemplates));
    setNewTemplateName('');
    setSaveTemplateDialogOpen(false);
    toast.success('Şablon kaydedildi', {
      description: `${items.length} kalem ile "${newTemplateName}"`
    });
  }, [newTemplateName, items, templates]);

  // NEW: Load template
  const handleLoadTemplate = useCallback((template: QuoteTemplate) => {
    const loadedItems: QuoteItemForm[] = template.items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random()}`,
      selected: false,
    }));
    setItems(loadedItems);
    setTemplatesDialogOpen(false);
    toast.success('Şablon yüklendi', {
      description: `${loadedItems.length} kalem eklendi`
    });
  }, []);

  // NEW: Delete template
  const handleDeleteTemplate = useCallback((templateId: string) => {
    const newTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(newTemplates);
    localStorage.setItem('quote-templates', JSON.stringify(newTemplates));
    toast.success('Şablon silindi');
  }, [templates]);

  // NEW: Bulk price adjustment
  const handleBulkPriceAdjustment = useCallback((type: 'increase' | 'decrease') => {
    const percentageStr = prompt(`Tüm kalemlere % kaç ${type === 'increase' ? 'artış' : 'azalış'} uygulamak istersiniz?`);
    if (percentageStr === null) return;

    const percentage = parseFloat(percentageStr);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast.error('Geçerli bir yüzde değeri girin (0-100)');
      return;
    }

    setItems(prev => prev.map(item => {
      const multiplier = type === 'increase' ? (1 + percentage / 100) : (1 - percentage / 100);
      return {
        ...item,
        unitPrice: Math.round(item.unitPrice * multiplier * 100) / 100
      };
    }));

    toast.success(`Tüm kalemlere %${percentage} ${type === 'increase' ? 'artış' : 'azalış'} uygulandı`);
  }, []);

  // NEW: Quick add suggested test
  const handleQuickAddTest = useCallback((test: HealthTest) => {
    let suggestedPrice = test.price || 0;
    
    if (!suggestedPrice) {
      const priceHistory = localStorage.getItem(`test-price-${test.id}`);
      suggestedPrice = priceHistory ? parseFloat(priceHistory) : 0;
    }

    const newItemData: QuoteItemForm = {
      id: `item-${Date.now()}`,
      healthTestId: test.id,
      quantity: 1,
      unitPrice: suggestedPrice,
      description: test.name,
      discount: 0,
      discountType: 'percentage',
      taxRate: 20,
      selected: false,
    };

    setItems(prev => [...prev, newItemData]);
    
    // Track usage
    if (companyId) {
      trackTestUsage(test.id, companyId);
    }

    // Update recently used
    setRecentlyUsedTests(prev => {
      const updated = [test.id, ...prev.filter(id => id !== test.id)].slice(0, 5);
      localStorage.setItem('recently-used-tests', JSON.stringify(updated));
      return updated;
    });

    toast.success('Test eklendi', {
      description: test.name
    });
  }, [companyId, trackTestUsage]);

  // NEW: Quick add recently used tests
  const handleAddRecentTests = useCallback(() => {
    const testsToAdd = healthTests.filter(test => recentlyUsedTests.includes(test.id));
    
    if (testsToAdd.length === 0) {
      toast.error('Yakın zamanda kullanılmış test bulunamadı');
      return;
    }

    const newItems: QuoteItemForm[] = testsToAdd.map(test => {
      let suggestedPrice = test.price || 0;
      
      if (!suggestedPrice) {
        const priceHistory = localStorage.getItem(`test-price-${test.id}`);
        suggestedPrice = priceHistory ? parseFloat(priceHistory) : 0;
      }

      return {
        id: `item-${Date.now()}-${test.id}`,
        healthTestId: test.id,
        quantity: 1,
        unitPrice: suggestedPrice,
        description: test.name,
        discount: 0,
        discountType: 'percentage',
        taxRate: 20,
        selected: false,
      };
    });

    setItems(prev => [...prev, ...newItems]);
    toast.success(`${newItems.length} test eklendi`, {
      description: 'Son kullanılan testler'
    });
  }, [healthTests, recentlyUsedTests]);

  // Save favorites to localStorage
  const toggleFavoriteTest = useCallback((testId: number) => {
    setFavoriteTests(prev => {
      const newFavorites = prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId];
      localStorage.setItem('favorite-tests', JSON.stringify(newFavorites));
      return newFavorites;
    });
    toast.success(
      favoriteTests.includes(testId)
        ? 'Favorilerden çıkarıldı'
        : 'Favorilere eklendi'
    );
  }, [favoriteTests]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAddItemDialogOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving && !isGeneratingPDF) {
          handleSubmit();
        }
      }
      if (e.key === 'Escape') {
        setAddItemDialogOpen(false);
        setEditItemDialogOpen(false);
        setAddCompanyDialogOpen(false);
        setPreviousQuotesDialogOpen(false);
        setBulkAddTestsDialogOpen(false);
        setTemplatesDialogOpen(false);
        setSaveTemplateDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, isGeneratingPDF]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companiesRes, testsRes] = await Promise.all([
        fetch('/api/companies?limit=1000'),
        fetch('/api/health-tests?limit=1000'),
      ]);

      if (!companiesRes.ok || !testsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [companiesData, testsData] = await Promise.all([
        companiesRes.json(),
        testsRes.json(),
      ]);

      setCompanies(companiesData);
      setHealthTests(testsData.filter((t: HealthTest) => t.isActive));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPreviousQuotes = useCallback(async (companyId: string) => {
    if (!companyId) return;
    
    try {
      setLoadingPreviousQuotes(true);
      const response = await fetch(`/api/quotes?companyId=${companyId}&limit=5`);
      if (!response.ok) throw new Error('Failed to fetch quotes');
      
      const data = await response.json();
      setPreviousQuotes(data);
    } catch (error) {
      console.error('Error fetching previous quotes:', error);
    } finally {
      setLoadingPreviousQuotes(false);
    }
  }, []);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('quote-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setCompanyId(parsed.companyId || '');
        setIssueDate(parsed.issueDate || new Date().toISOString().split('T')[0]);
        setValidUntilDate(parsed.validUntilDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setNotes(parsed.notes || '');
        setItems(parsed.items || []);
        setCurrency(parsed.currency || 'TRY');
        setGeneralDiscount(parsed.generalDiscount || 0);
        setGeneralDiscountType(parsed.generalDiscountType || 'percentage');
        setPaymentTerms(parsed.paymentTerms || '');
        setExtraCosts(parsed.extraCosts || 0);
        setDownPayment(parsed.downPayment || 0);
        setManualRate(typeof parsed.manualRate === 'number' ? parsed.manualRate : null);
        setHasDraft(true);
        toast.success('Taslak yüklendi', {
          description: `${parsed.items?.length || 0} kalem içeriyor`
        });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    if (items.length > 0 || companyId || notes || paymentTerms || extraCosts || downPayment || manualRate) {
      const draft = {
        companyId,
        issueDate,
        validUntilDate,
        notes,
        items,
        currency,
        generalDiscount,
        generalDiscountType,
        paymentTerms,
        extraCosts,
        downPayment,
        manualRate,
      };
      localStorage.setItem('quote-draft', JSON.stringify(draft));
      setHasDraft(true);
    }
  }, [companyId, issueDate, validUntilDate, notes, items, currency, generalDiscount, generalDiscountType, paymentTerms, extraCosts, downPayment, manualRate]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (confirm('Taslağı temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      localStorage.removeItem('quote-draft');
      setCompanyId('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setValidUntilDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setNotes('');
      setItems([]);
      setCurrency('TRY');
      setGeneralDiscount(0);
      setGeneralDiscountType('percentage');
      setPaymentTerms('');
      setExtraCosts(0);
      setDownPayment(0);
      setManualRate(null);
      setHasDraft(false);
      toast.success('Taslak temizlendi');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (companyId) {
      fetchPreviousQuotes(companyId);
    }
  }, [companyId, fetchPreviousQuotes]);

  const getPriceHistory = useCallback((testId: number): number | null => {
    const priceHistory = localStorage.getItem(`test-price-${testId}`);
    return priceHistory ? parseFloat(priceHistory) : null;
  }, []);

  const handleHealthTestSelect = useCallback((testId: string) => {
    const test = healthTests.find((t) => t.id.toString() === testId);
    if (test) {
      let suggestedPrice = test.price || 0;
      
      if (!suggestedPrice) {
        const priceHistory = getPriceHistory(test.id);
        suggestedPrice = priceHistory || 0;
      }

      setNewItem((prev) => ({
        ...prev,
        healthTestId: test.id,
        description: test.name,
        unitPrice: suggestedPrice,
      }));

      if (suggestedPrice > 0) {
        toast.success(`Önerilen fiyat: ${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(suggestedPrice)} TL`, {
          description: 'Son kullanılan fiyat yüklendi'
        });
      }
    }
  }, [healthTests, getPriceHistory]);

  const handleAddItem = useCallback(() => {
    if (!newItem.description.trim()) {
      toast.error('Lütfen açıklama girin');
      return;
    }
    if (newItem.quantity <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır');
      return;
    }
    if (newItem.unitPrice <= 0) {
      toast.error('Birim fiyat 0\'dan büyük olmalıdır');
      return;
    }

    const itemWithId = { ...newItem, id: `item-${Date.now()}` };
    setItems((prev) => [...prev, itemWithId]);
    
    // Save price to history
    if (newItem.healthTestId) {
      localStorage.setItem(`test-price-${newItem.healthTestId}`, newItem.unitPrice.toString());
      
      // Track usage for smart suggestions
      if (companyId) {
        trackTestUsage(newItem.healthTestId, companyId);
      }

      // Update recently used
      setRecentlyUsedTests(prev => {
        const updated = [newItem.healthTestId!, ...prev.filter(id => id !== newItem.healthTestId)].slice(0, 5);
        localStorage.setItem('recently-used-tests', JSON.stringify(updated));
        return updated;
      });
    }

    setNewItem({
      id: '',
      healthTestId: null,
      quantity: 1,
      unitPrice: 0,
      description: '',
      discount: 0,
      discountType: 'percentage',
      taxRate: 10,
      selected: false,
    });
    setTestSearchQuery('');
    setAddItemDialogOpen(false);
    toast.success('Kalem eklendi', {
      description: `${itemWithId.quantity}x ${itemWithId.description}`
    });
  }, [newItem, companyId, trackTestUsage]);

  const handleEditItem = useCallback(() => {
    if (!editingItem) return;

    if (!editingItem.description.trim()) {
      toast.error('Lütfen açıklama girin');
      return;
    }
    if (editingItem.quantity <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır');
      return;
    }
    if (editingItem.unitPrice <= 0) {
      toast.error('Birim fiyat 0\'dan büyük olmalıdır');
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === editingItem.id ? editingItem : item)));
    setEditItemDialogOpen(false);
    setEditingItem(null);
    toast.success('Kalem güncellendi');
  }, [editingItem]);

  const openEditDialog = useCallback((item: QuoteItemForm) => {
    setEditingItem({ ...item });
    setEditItemDialogOpen(true);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Kalem silindi');
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  }, []);

  const handleBulkDelete = useCallback(() => {
    const selectedCount = items.filter(item => item.selected).length;
    if (selectedCount === 0) {
      toast.error('Lütfen silinecek kalemleri seçin');
      return;
    }
    setItems((prev) => prev.filter((item) => !item.selected));
    toast.success(`${selectedCount} kalem silindi`);
  }, [items]);

  const handleBulkDiscount = useCallback(() => {
    const selected = items.filter(item => item.selected);
    if (selected.length === 0) {
      toast.error('Lütfen işlem yapılacak kalemleri seçin');
      return;
    }
    
    const discount = prompt('İskonto yüzdesi girin:');
    if (discount === null) return;
    
    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      toast.error('Geçerli bir iskonto yüzdesi girin (0-100)');
      return;
    }

    setItems((prev) => prev.map((item) => 
      item.selected ? { ...item, discount: discountValue, discountType: 'percentage' as const } : item
    ));
    toast.success(`${selected.length} kaleme iskonto uygulandı`);
  }, [items]);

  const handleBulkTaxRate = useCallback(() => {
    const selected = items.filter(item => item.selected);
    if (selected.length === 0) {
      toast.error('Lütfen işlem yapılacak kalemleri seçin');
      return;
    }
    
    const taxRate = prompt('KDV oranı girin (0, 1, 8, 10, 20):');
    if (taxRate === null) return;
    
    const taxRateValue = parseFloat(taxRate);
    if (isNaN(taxRateValue) || ![0, 1, 8, 10, 20].includes(taxRateValue)) {
      toast.error('Geçerli bir KDV oranı girin (0, 1, 8, 10, 20)');
      return;
    }

    setItems((prev) => prev.map((item) => 
      item.selected ? { ...item, taxRate: taxRateValue } : item
    ));
    toast.success(`${selected.length} kalemin KDV oranı güncellendi`);
  }, [items]);

  const handleDragEnd = useCallback((event: QuoteDragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleCopyQuote = useCallback(async (quoteId: number) => {
    try {
      const [quoteRes, itemsRes] = await Promise.all([
        fetch(`/api/quotes/${quoteId}`),
        fetch(`/api/quotes/${quoteId}/items`),
      ]);

      if (!quoteRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch quote');
      }

      const [quoteData, itemsData] = await Promise.all([
        quoteRes.json(),
        itemsRes.json(),
      ]);

      const copiedItems: QuoteItemForm[] = itemsData.map((item: any) => ({
        id: `item-${Date.now()}-${Math.random()}`,
        healthTestId: item.healthTestId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: item.description,
        discount: 0,
        discountType: 'percentage' as const,
        taxRate: 20,
        selected: false,
      }));

      setItems(copiedItems);
      setNotes(quoteData.notes || '');
      setPreviousQuotesDialogOpen(false);
      toast.success('Teklif kopyalandı');
    } catch (error) {
      console.error('Error copying quote:', error);
      toast.error('Teklif kopyalanırken hata oluştu');
    }
  }, []);

  const handleAddCompany = useCallback(async () => {
    if (!newCompany.name.trim()) {
      toast.error('Lütfen firma adı girin');
      return;
    }
    if (!newCompany.email.trim()) {
      toast.error('Lütfen e-posta adresi girin');
      return;
    }

    try {
      setIsAddingCompany(true);
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      });

      if (!response.ok) throw new Error('Failed to add company');

      const company = await response.json();
      setCompanies((prev) => [...prev, company]);
      setCompanyId(company.id.toString());
      setNewCompany({
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: '',
      });
      setAddCompanyDialogOpen(false);
      toast.success('Firma eklendi');
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error('Firma eklenirken hata oluştu');
    } finally {
      setIsAddingCompany(false);
    }
  }, [newCompany]);

  const setValidityPreset = useCallback((days: number) => {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setValidUntilDate(date.toISOString().split('T')[0]);
    toast.success(`Geçerlilik tarihi ${days} gün olarak ayarlandı`);
  }, []);

  const addNoteTemplate = useCallback((template: string) => {
    setNotes((prev) => (prev ? `${prev}\n${template}` : template));
    toast.success('Not şablonu eklendi');
  }, []);

  const applyPaymentTermsTemplate = useCallback((template: string) => {
    setPaymentTerms(template);
    toast.success('Ödeme şartı şablonu eklendi');
  }, []);

  const handleToggleTestForBulkAdd = useCallback((testId: number) => {
    setSelectedTestsForBulkAdd((prev) => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  }, []);

  const handleSelectAllTestsForBulkAdd = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTestsForBulkAdd(healthTests.map(t => t.id));
    } else {
      setSelectedTestsForBulkAdd([]);
    }
  }, [healthTests]);

  const handleBulkAddTests = useCallback(() => {
    if (selectedTestsForBulkAdd.length === 0) {
      toast.error('Lütfen en az bir test seçin');
      return;
    }

    const newItems: QuoteItemForm[] = selectedTestsForBulkAdd.map(testId => {
      const test = healthTests.find(t => t.id === testId);
      if (!test) return null;

      let suggestedPrice = test.price || 0;
      
      if (!suggestedPrice) {
        const priceHistory = localStorage.getItem(`test-price-${test.id}`);
        suggestedPrice = priceHistory ? parseFloat(priceHistory) : 0;
      }

      return {
        id: `item-${Date.now()}-${testId}`,
        healthTestId: test.id,
        quantity: bulkAddSettings.quantity,
        unitPrice: suggestedPrice,
        description: test.name,
        discount: bulkAddSettings.discount,
        discountType: bulkAddSettings.discountType,
        taxRate: bulkAddSettings.taxRate,
        selected: false,
      };
    }).filter(Boolean) as QuoteItemForm[];

    setItems((prev) => [...prev, ...newItems]);
    setSelectedTestsForBulkAdd([]);
    setBulkAddSettings({
      quantity: 1,
      discount: 0,
      discountType: 'percentage',
      taxRate: 10,
    });
    setBulkAddTestsDialogOpen(false);
    toast.success(`${newItems.length} test eklendi`);
  }, [selectedTestsForBulkAdd, healthTests, bulkAddSettings]);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountType === 'percentage' 
        ? itemSubtotal * (item.discount / 100)
        : item.discount;
      const afterDiscount = itemSubtotal - discountAmount;
      const taxAmount = afterDiscount * (item.taxRate / 100);
      
      subtotal += itemSubtotal;
      totalTax += taxAmount;
    });

    const totalBeforeGeneralDiscount = subtotal + totalTax;
    const generalDiscountAmount = generalDiscountType === 'percentage'
      ? totalBeforeGeneralDiscount * (generalDiscount / 100)
      : generalDiscount;
    const total = totalBeforeGeneralDiscount - generalDiscountAmount;

    return { subtotal, totalTax, totalBeforeGeneralDiscount, generalDiscountAmount, total };
  }, [items, generalDiscount, generalDiscountType]);

  const totalWithExtras = calculations.total + (extraCosts || 0);
  const netPayable = totalWithExtras - (downPayment || 0);
  const vatRate = calculations.subtotal > 0 ? Math.round((calculations.totalTax / calculations.subtotal) * 100) : 0;

  const validateForm = useCallback(() => {
    const errors: { [key: string]: string } = {};

    if (!companyId) {
      errors.companyId = 'Firma seçmeniz gerekiyor';
    }
    if (!issueDate) {
      errors.issueDate = 'Oluşturma tarihi gerekli';
    }
    if (!validUntilDate) {
      errors.validUntilDate = 'Geçerlilik tarihi gerekli';
    }
    if (new Date(validUntilDate) < new Date(issueDate)) {
      errors.validUntilDate = 'Geçerlilik tarihi oluşturma tarihinden önce olamaz';
    }
    if (items.length === 0) {
      errors.items = 'En az bir kalem eklemeniz gerekiyor';
    }

    // Anomaly checks on items (no auto-fix, just warn)
    if (items.length > 0) {
      const problematicItems = items.filter((item) => 
        item.quantity <= 0 ||
        item.unitPrice <= 0 ||
        item.taxRate < 0 ||
        item.taxRate > 50
      );

      if (problematicItems.length > 0) {
        errors.items = `${problematicItems.length} kalemde geçersiz değerler var (miktar / birim fiyat / KDV oranı). Lütfen bu kalemleri kontrol edin.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [companyId, issueDate, validUntilDate, items]);

  const filteredHealthTests = useMemo(() => {
    let filtered = healthTests;

    if (showFavoritesOnly) {
      filtered = filtered.filter(test => favoriteTests.includes(test.id));
    }

    if (testSearchQuery) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
        test.code?.toLowerCase().includes(testSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [healthTests, testSearchQuery, showFavoritesOnly, favoriteTests]);

  const filteredBulkTests = useMemo(() => {
    let filtered = healthTests;

    if (bulkTestSearchQuery) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(bulkTestSearchQuery.toLowerCase()) ||
        test.code?.toLowerCase().includes(bulkTestSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [healthTests, bulkTestSearchQuery]);

  const formatCurrency = useCallback((amount: number, curr?: Currency) => {
    const selectedCurrency = curr || currency;
    let rate = CURRENCY_RATES[selectedCurrency];

    if (selectedCurrency !== 'TRY' && manualRate && manualRate > 0) {
      rate = manualRate;
    }

    const convertedAmount = amount / rate;
    
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: selectedCurrency,
    }).format(convertedAmount);
  }, [currency, manualRate]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0];
      toast.error('Form eksik veya hatalı', {
        description: firstError
      });
      return;
    }

    try {
      setIsSaving(true);

      const notesParts = [
        notes.trim(),
        paymentTerms && `Ödeme Şartları: ${paymentTerms}`,
        extraCosts > 0 && `Ek Masraflar: ${extraCosts.toFixed(2)} TL`,
        downPayment > 0 && `Peşinat: ${downPayment.toFixed(2)} TL`,
        downPayment > 0 && `Net Ödenecek: ${netPayable.toFixed(2)} TL`,
      ].filter(Boolean) as string[];

      const composedNotes = notesParts.join('\n');

      const quoteResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: parseInt(companyId),
          issueDate,
          validUntilDate,
          subtotal: calculations.subtotal,
          tax: calculations.totalTax,
          total: totalWithExtras,
          notes: composedNotes || null,
          status: 'draft',
        }),
      });

      if (!quoteResponse.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await quoteResponse.json();

      await Promise.all(
        items.map((item) =>
          fetch(`/api/quotes/${quote.id}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              healthTestId: item.healthTestId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              description: item.description,
            }),
          })
        )
      );

      localStorage.removeItem('quote-draft');

      toast.success('Teklif başarıyla oluşturuldu', {
        description: `${items.length} kalem ile ${formatCurrency(totalWithExtras)}`
      });
      router.push(`/quotes/${quote.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Teklif oluşturulurken hata oluştu', {
        description: 'Lütfen tekrar deneyin'
      });
    } finally {
      setIsSaving(false);
    }
  }, [companyId, issueDate, validUntilDate, notes, items, calculations, router, validateForm, formErrors, formatCurrency, paymentTerms, extraCosts, downPayment]);

  const handlePreviewPDF = useCallback(async () => {
    if (!companyId) {
      toast.error('Lütfen firma seçin');
      return;
    }
    if (items.length === 0) {
      toast.error('Lütfen en az bir kalem ekleyin');
      return;
    }

    try {
      setIsGeneratingPDF(true);

      const totalWithExtras = calculations.total + (extraCosts || 0);
      const netPayable = totalWithExtras - (downPayment || 0);

      const notesParts = [
        notes.trim(),
        paymentTerms && `Ödeme Şartları: ${paymentTerms}`,
        extraCosts > 0 && `Ek Masraflar: ${extraCosts.toFixed(2)} TL`,
        downPayment > 0 && `Peşinat: ${downPayment.toFixed(2)} TL`,
        downPayment > 0 && `Net Ödenecek: ${netPayable.toFixed(2)} TL`,
      ].filter(Boolean) as string[];

      const composedNotes = notesParts.join('\n');

      const quoteResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: parseInt(companyId),
          issueDate,
          validUntilDate,
          subtotal: calculations.subtotal,
          tax: calculations.totalTax,
          total: totalWithExtras,
          notes: composedNotes || null,
          status: 'draft',
        }),
      });

      if (!quoteResponse.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await quoteResponse.json();

      await Promise.all(
        items.map((item) =>
          fetch(`/api/quotes/${quote.id}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              healthTestId: item.healthTestId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              description: item.description,
            }),
          })
        )
      );
      localStorage.removeItem('quote-draft');
      
      toast.success('Teklif taslak olarak oluşturuldu. PDF için detay sayfasını kullanabilirsiniz.');
      
      setTimeout(() => {
        router.push(`/quotes/${quote.id}`);
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [companyId, issueDate, validUntilDate, notes, items, calculations, router, paymentTerms, extraCosts, downPayment]);

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

  const selectedCount = items.filter(item => item.selected).length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* Hero */}
      <div className="rounded-[32px] border bg-linear-to-r from-background via-primary/5 to-muted/40 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3">
              <Link href="/quotes">
                <Button variant="outline" size="icon" className="rounded-full">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Yeni süreç
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Yeni Teklif Oluştur</h1>
            <p className="text-sm text-muted-foreground">
              Müşteriniz için kalem bazlı teklif oluşturun, şablonlardan faydalanın ve geçmiş tekliflerden ilham alın.
              <span className="ml-2 opacity-70">(Kısayollar: Ctrl+K kalem ekle, Ctrl+S kaydet)</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasDraft && (
              <Button variant="ghost" size="sm" onClick={clearDraft} className="gap-2 text-muted-foreground">
                <X className="w-4 h-4" />
                Taslağı Temizle
              </Button>
            )}
            <Select value={currency} onValueChange={(val) => setCurrency(val as Currency)}>
              <SelectTrigger className="w-[120px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ TRY</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handlePreviewPDF}
              disabled={isGeneratingPDF || isSaving}
              className="gap-2 rounded-full border-white/20"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              PDF Önizle
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || isGeneratingPDF} className="gap-2 rounded-full shadow-[0_15px_45px_rgba(79,70,229,0.4)]">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* NEW: Smart Suggestions Banner */}
      {showSuggestions && suggestedTests.length > 0 && (
        <Card className="border-blue-200 bg-linear-to-r from-blue-50 via-background to-transparent dark:from-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Bu firmaya sık eklenen testler</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Geçmiş tekliflerinizi analiz ederek öneriyoruz.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTests.map(test => (
                    <Button
                      key={test.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAddTest(test)}
                      className="gap-2 border-blue-200"
                    >
                      <Plus className="w-3 h-3" />
                      {test.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW: Quick Actions Bar */}
      <Card className="border bg-linear-to-r from-background via-background/80 to-muted/40">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Hızlı İşlemler
              </CardTitle>
              <CardDescription>Sık kullanılan aksiyonları tek dokunuşla uygulayın</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {recentlyUsedTests.length > 0 && (
              <Button variant="outline" onClick={handleAddRecentTests} className="gap-2 rounded-full">
                <History className="w-4 h-4" />
                Son Kullanılan Testleri Ekle ({recentlyUsedTests.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setTemplatesDialogOpen(true)} className="gap-2 rounded-full">
              <BookmarkPlus className="w-4 h-4" />
              Şablondan Yükle {templates.length > 0 && `(${templates.length})`}
            </Button>
            {items.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(true)} className="gap-2 rounded-full">
                  <Save className="w-4 h-4" />
                  Şablon Olarak Kaydet
                </Button>
                <Button variant="outline" onClick={() => handleBulkPriceAdjustment('increase')} className="gap-2 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                  Toplu Fiyat Artışı
                </Button>
                <Button variant="outline" onClick={() => handleBulkPriceAdjustment('decrease')} className="gap-2 rounded-full">
                  <TrendingDown className="w-4 h-4" />
                  Toplu Fiyat İndirimi
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Errors Alert */}
      {Object.keys(formErrors).length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Lütfen aşağıdaki hataları düzeltin:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {Object.values(formErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`border bg-background/90 shadow-[0_20px_55px_rgba(15,23,42,0.25)] ${formErrors.companyId || formErrors.issueDate || formErrors.validUntilDate ? 'border-destructive/60' : ''}`}>
          <CardHeader>
            <CardTitle>Teklif Bilgileri</CardTitle>
            <CardDescription>Temel teklif bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Firma *</Label>
              <div className="flex gap-2">
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Firma seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-xs text-muted-foreground">{company.contactPerson}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAddCompanyDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {companyId && previousQuotes.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setPreviousQuotesDialogOpen(true)}
                  className="h-auto p-0 text-xs"
                >
                  {previousQuotes.length} önceki teklifi görüntüle
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Oluşturma Tarihi *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntilDate">Geçerlilik Tarihi *</Label>
                <Input
                  id="validUntilDate"
                  type="date"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => setValidityPreset(15)}>
                <Clock className="w-3 h-3 mr-1" />
                15 Gün
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValidityPreset(30)}>
                <Clock className="w-3 h-3 mr-1" />
                30 Gün
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValidityPreset(60)}>
                <Clock className="w-3 h-3 mr-1" />
                60 Gün
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValidityPreset(90)}>
                <Clock className="w-3 h-3 mr-1" />
                90 Gün
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="paymentTerms">Ödeme Şartları</Label>
                <Select onValueChange={applyPaymentTermsTemplate}>
                  <SelectTrigger className="w-[140px] h-7">
                    <SelectValue placeholder="Şablon ekle" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_TEMPLATES.map((template, index) => (
                      <SelectItem key={index} value={template}>
                        {template.substring(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Örneğin: %40 peşin, %60 iş bitiminde; 30 gün vade vb."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notes">Notlar</Label>
                <Select onValueChange={addNoteTemplate}>
                  <SelectTrigger className="w-[140px] h-7">
                    <SelectValue placeholder="Şablon ekle" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TEMPLATES.map((template, index) => (
                      <SelectItem key={index} value={template}>
                        {template.substring(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teklif hakkında notlar ekleyin..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-linear-to-br from-background/95 via-background to-muted/30 shadow-[0_25px_60px_rgba(15,23,42,0.25)]">
          <CardHeader>
            <CardTitle>Özet</CardTitle>
            <CardDescription>Teklif özet bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Toplam Kalem</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ara Toplam</span>
                <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">KDV (%{vatRate})</span>
                <span className="font-medium">{formatCurrency(calculations.totalTax)}</span>
              </div>
              {generalDiscount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Toplam (İskonto Öncesi)</span>
                    <span className="font-medium">{formatCurrency(calculations.totalBeforeGeneralDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm">Genel İskonto</span>
                    <span className="font-medium">-{formatCurrency(calculations.generalDiscountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold">Genel Toplam</span>
                <span className="text-xl font-bold">{formatCurrency(calculations.total)}</span>
              </div>

              {/* General Discount */}
              <div className="pt-3 border-t space-y-2">
                <Label>Genel İskonto</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={generalDiscount}
                    onChange={(e) => setGeneralDiscount(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Select value={generalDiscountType} onValueChange={(val) => setGeneralDiscountType(val as 'percentage' | 'fixed')}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">TL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extra costs & down payment */}
              <div className="pt-3 border-t space-y-3">
                <div className="space-y-2">
                  <Label>Ek Masraflar (yol, konaklama vb.)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraCosts}
                    onChange={(e) => setExtraCosts(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peşinat</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ek Masraflar Dahil Toplam</span>
                  <span className="font-medium">{formatCurrency(totalWithExtras)}</span>
                </div>
                {downPayment > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Net Ödenecek</span>
                    <span className="text-lg font-bold">{formatCurrency(netPayable)}</span>
                  </div>
                )}
              </div>

              {/* Currency conversions */}
              {currency !== 'TRY' && (
                <div className="pt-3 border-t space-y-1">
                  <div className="space-y-2 mb-2">
                    <Label>Manuel Kur ({currency} → TRY)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={manualRate ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setManualRate(isNaN(val) ? null : val);
                      }}
                      placeholder={CURRENCY_RATES[currency].toString()}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Kur:</span>
                    <span>
                      1 {currency} = {((manualRate && manualRate > 0) ? manualRate : CURRENCY_RATES[currency]).toFixed(4)} TL
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>TRY Karşılığı:</span>
                    <span>{formatCurrency(totalWithExtras, 'TRY')}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className={`border bg-background/95 shadow-[0_25px_60px_rgba(15,23,42,0.25)] ${formErrors.items ? 'border-destructive/60' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Teklif Kalemleri</CardTitle>
              <CardDescription>
                {items.length} kalem
                {selectedCount > 0 && ` (${selectedCount} seçili)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCount > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleBulkDiscount} className="gap-2">
                    <Percent className="w-4 h-4" />
                    İskonto Uygula
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkTaxRate} className="gap-2">
                    <DollarSign className="w-4 h-4" />
                    KDV Değiştir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2 text-destructive">
                    <Trash2 className="w-4 h-4" />
                    Seçilenleri Sil
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setBulkAddTestsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Toplu Test Ekle
              </Button>
              <Button onClick={() => setAddItemDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Kalem Ekle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-4">Henüz kalem eklenmedi</p>
              <Button onClick={() => setAddItemDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                İlk Kalemi Ekle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={items.length > 0 && items.every(item => item.selected)}
                            onCheckedChange={handleSelectAll}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-center">Miktar</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-center">KDV</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="text-right w-[120px]">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={items.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item, index) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          index={index}
                          onEdit={openEditDialog}
                          onRemove={handleRemoveItem}
                          onToggleSelect={handleToggleSelect}
                          formatCurrency={formatCurrency}
                          onPriceChange={(id: string, price: number) => {
                            setItems((prev) => prev.map((entry) => 
                              entry.id === id ? { ...entry, unitPrice: price } : entry
                            ));
                          }}
                          onQuantityChange={(id: string, quantity: number) => {
                            setItems((prev) => prev.map((entry) => 
                              entry.id === id ? { ...entry, quantity } : entry
                            ));
                          }}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-medium">
                        Ara Toplam
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calculations.subtotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-medium">
                        KDV
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calculations.totalTax)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {generalDiscount > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={6} className="text-right font-medium">
                            Toplam (İskonto Öncesi)
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(calculations.totalBeforeGeneralDiscount)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} className="text-right font-medium text-green-600">
                            Genel İskonto ({generalDiscountType === 'percentage' ? `%${generalDiscount}` : formatCurrency(generalDiscount)})
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            -{formatCurrency(calculations.generalDiscountAmount)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                    <TableRow>
                      <TableCell colSpan={6} className="text-right text-lg font-bold">
                        Genel Toplam
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        {formatCurrency(calculations.total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Kalem Ekle</DialogTitle>
            <DialogDescription>Teklife yeni kalem ekleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* NEW: Search and Filter */}
            <div className="space-y-2">
              <Label htmlFor="healthTest">Sağlık Testi (Opsiyonel)</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Test ara..."
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button
                    variant={showFavoritesOnly ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    title={showFavoritesOnly ? "Tüm testleri göster" : "Sadece favorileri göster"}
                  >
                    <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  </Button>
                </div>
                <Select
                  value={newItem.healthTestId?.toString() || ''}
                  onValueChange={handleHealthTestSelect}
                >
                  <SelectTrigger id="healthTest">
                    <SelectValue placeholder="Test seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredHealthTests.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {testSearchQuery ? 'Test bulunamadı' : 'Aktif test yok'}
                      </div>
                    ) : (
                      filteredHealthTests.map((test) => {
                        const priceHistory = getPriceHistory(test.id);
                        const isFavorite = favoriteTests.includes(test.id);
                        return (
                          <SelectItem key={test.id} value={test.id.toString()}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {isFavorite && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                                  <span className="font-medium">{test.name}</span>
                                </div>
                                {test.code && (
                                  <div className="text-xs text-muted-foreground">{test.code}</div>
                                )}
                              </div>
                              {priceHistory && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <History className="w-3 h-3" />
                                  {formatCurrency(priceHistory)}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {newItem.healthTestId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavoriteTest(newItem.healthTestId!)}
                    className="gap-2"
                  >
                    <Star className={`w-4 h-4 ${favoriteTests.includes(newItem.healthTestId) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    {favoriteTests.includes(newItem.healthTestId) ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama *</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Kalem açıklaması girin..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Miktar *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Birim Fiyat ({currency}) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">İskonto</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.discount}
                    onChange={(e) =>
                      setNewItem({ ...newItem, discount: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Select value={newItem.discountType} onValueChange={(val) => setNewItem({ ...newItem, discountType: val as 'percentage' | 'fixed' })}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">TL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">KDV Oranı *</Label>
                <Select value={newItem.taxRate.toString()} onValueChange={(val) => setNewItem({ ...newItem, taxRate: parseFloat(val) })}>
                  <SelectTrigger id="taxRate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">%0</SelectItem>
                    <SelectItem value="1">%1</SelectItem>
                    <SelectItem value="8">%8</SelectItem>
                    <SelectItem value="10">%10</SelectItem>
                    <SelectItem value="20">%20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span>Ara Toplam:</span>
                <span>{formatCurrency(newItem.quantity * newItem.unitPrice)}</span>
              </div>
              {newItem.discount > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>İskonto:</span>
                  <span>
                    -{newItem.discountType === 'percentage' 
                      ? formatCurrency((newItem.quantity * newItem.unitPrice) * (newItem.discount / 100))
                      : formatCurrency(newItem.discount)
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span>KDV (%{newItem.taxRate}):</span>
                <span>
                  {formatCurrency(
                    (newItem.quantity * newItem.unitPrice - 
                      (newItem.discountType === 'percentage' 
                        ? (newItem.quantity * newItem.unitPrice) * (newItem.discount / 100)
                        : newItem.discount)
                    ) * (newItem.taxRate / 100)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Kalem Toplamı:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    (() => {
                      const subtotal = newItem.quantity * newItem.unitPrice;
                      const discount = newItem.discountType === 'percentage' 
                        ? subtotal * (newItem.discount / 100)
                        : newItem.discount;
                      const afterDiscount = subtotal - discount;
                      const tax = afterDiscount * (newItem.taxRate / 100);
                      return afterDiscount + tax;
                    })()
                  )}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddItem} className="gap-2">
              <Plus className="w-4 h-4" />
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kalemi Düzenle</DialogTitle>
            <DialogDescription>Kalem bilgilerini güncelleyin</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Açıklama *</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Kalem açıklaması girin..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Miktar *</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={editingItem.quantity}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unitPrice">Birim Fiyat ({currency}) *</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.unitPrice}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-discount">İskonto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.discount}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, discount: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <Select value={editingItem.discountType} onValueChange={(val) => setEditingItem({ ...editingItem, discountType: val as 'percentage' | 'fixed' })}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">TL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-taxRate">KDV Oranı *</Label>
                  <Select value={editingItem.taxRate.toString()} onValueChange={(val) => setEditingItem({ ...editingItem, taxRate: parseFloat(val) })}>
                    <SelectTrigger id="edit-taxRate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="8">%8</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span>Ara Toplam:</span>
                  <span>{formatCurrency(editingItem.quantity * editingItem.unitPrice)}</span>
                </div>
                {editingItem.discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>İskonto:</span>
                    <span>
                      -{editingItem.discountType === 'percentage' 
                        ? formatCurrency((editingItem.quantity * editingItem.unitPrice) * (editingItem.discount / 100))
                        : formatCurrency(editingItem.discount)
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span>KDV (%{editingItem.taxRate}):</span>
                  <span>
                    {formatCurrency(
                      (editingItem.quantity * editingItem.unitPrice - 
                        (editingItem.discountType === 'percentage' 
                          ? (editingItem.quantity * editingItem.unitPrice) * (editingItem.discount / 100)
                          : editingItem.discount)
                      ) * (editingItem.taxRate / 100)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Kalem Toplamı:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(
                      (() => {
                        const subtotal = editingItem.quantity * editingItem.unitPrice;
                        const discount = editingItem.discountType === 'percentage' 
                          ? subtotal * (editingItem.discount / 100)
                          : editingItem.discount;
                        const afterDiscount = subtotal - discount;
                        const tax = afterDiscount * (editingItem.taxRate / 100);
                        return afterDiscount + tax;
                      })()
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleEditItem} className="gap-2">
              <Save className="w-4 h-4" />
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Company Dialog */}
      <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Hızlı Firma Ekle</DialogTitle>
            <DialogDescription>Yeni firma bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Firma Adı *</Label>
              <Input
                id="company-name"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="Firma adı"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">E-posta *</Label>
              <Input
                id="company-email"
                type="email"
                value={newCompany.email}
                onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                placeholder="ornek@firma.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-contact">İletişim Kişisi</Label>
              <Input
                id="company-contact"
                value={newCompany.contactPerson}
                onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                placeholder="İletişim kişisi"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telefon</Label>
              <Input
                id="company-phone"
                value={newCompany.phone}
                onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                placeholder="+90 555 123 4567"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Adres</Label>
              <Textarea
                id="company-address"
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                placeholder="Firma adresi"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCompanyDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddCompany} disabled={isAddingCompany} className="gap-2">
              {isAddingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Firma Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Previous Quotes Dialog */}
      <Dialog open={previousQuotesDialogOpen} onOpenChange={setPreviousQuotesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Önceki Teklifler</DialogTitle>
            <DialogDescription>Bu firmaya ait son teklifler</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingPreviousQuotes ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : previousQuotes.length === 0 ? (
              <div className="text-center py-8">
                <FileTextIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground">Önceki teklif bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {previousQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="font-medium">{quote.quoteNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(quote.issueDate).toLocaleDateString('tr-TR')} - {formatCurrency(quote.total)}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleCopyQuote(quote.id)} className="gap-2">
                      <Copy className="w-3 h-3" />
                      Kopyala
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviousQuotesDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Tests Dialog */}
      <Dialog open={bulkAddTestsDialogOpen} onOpenChange={setBulkAddTestsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Toplu Test Ekle</DialogTitle>
            <DialogDescription>
              Birden fazla testi aynı anda seçip teklife ekleyin
              {selectedTestsForBulkAdd.length > 0 && ` (${selectedTestsForBulkAdd.length} test seçildi)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Common Settings */}
            <div className="space-y-4 pb-4 border-b">
              <Label className="text-base font-semibold">Ortak Ayarlar</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-quantity">Miktar</Label>
                  <Input
                    id="bulk-quantity"
                    type="number"
                    min="1"
                    value={bulkAddSettings.quantity}
                    onChange={(e) =>
                      setBulkAddSettings({ ...bulkAddSettings, quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-discount">İskonto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bulk-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkAddSettings.discount}
                      onChange={(e) =>
                        setBulkAddSettings({ ...bulkAddSettings, discount: parseFloat(e.target.value) || 0 })
                      }
                      className="flex-1"
                    />
                    <Select value={bulkAddSettings.discountType} onValueChange={(val) => setBulkAddSettings({ ...bulkAddSettings, discountType: val as 'percentage' | 'fixed' })}>
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">₺</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-taxRate">KDV Oranı</Label>
                  <Select value={bulkAddSettings.taxRate.toString()} onValueChange={(val) => setBulkAddSettings({ ...bulkAddSettings, taxRate: parseFloat(val) })}>
                    <SelectTrigger id="bulk-taxRate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="8">%8</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Test Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Testleri Seçin</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tümünü Seç</span>
                  <Checkbox
                    checked={selectedTestsForBulkAdd.length === filteredBulkTests.length && filteredBulkTests.length > 0}
                    onCheckedChange={handleSelectAllTestsForBulkAdd}
                  />
                </div>
              </div>
              
              {/* NEW: Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Testlerde ara..."
                  value={bulkTestSearchQuery}
                  onChange={(e) => setBulkTestSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="border rounded-lg max-h-[320px] overflow-y-auto">
                {filteredBulkTests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {bulkTestSearchQuery ? 'Arama sonucu bulunamadı' : 'Aktif test bulunamadı'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBulkTests.map((test) => {
                      const priceHistory = getPriceHistory(test.id);
                      const isFavorite = favoriteTests.includes(test.id);
                      return (
                        <div 
                          key={test.id} 
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/60 cursor-pointer transition-colors text-xs"
                          onClick={() => handleToggleTestForBulkAdd(test.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              {isFavorite && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 shrink-0" />}
                              <span className="font-medium truncate" title={test.name}>{test.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {test.code && (
                                <span className="truncate" title={test.code}>{test.code}</span>
                              )}
                              {priceHistory && (
                                <span className="truncate" title={formatCurrency(priceHistory)}>
                                  · {formatCurrency(priceHistory)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedTestsForBulkAdd.includes(test.id)}
                            onCheckedChange={() => handleToggleTestForBulkAdd(test.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Info Message */}
            {selectedTestsForBulkAdd.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedTestsForBulkAdd.length} test</strong> seçildi. 
                  Testlerin birim fiyatları kayıtlı fiyat geçmişinden otomatik olarak yüklenecek.
                  Fiyatları daha sonra düzenleyebilirsiniz.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setBulkAddTestsDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleBulkAddTests} 
              disabled={selectedTestsForBulkAdd.length === 0}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {selectedTestsForBulkAdd.length} Testi Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Şablonlar</DialogTitle>
            <DialogDescription>Geçmiş tekliflerinizi şablon olarak kaydedin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSaveTemplateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Yeni Şablon Oluştur
              </Button>
              <Button
                variant="outline"
                onClick={() => setTemplatesDialogOpen(false)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileTextIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Şablon bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.items.length} kalem - {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadTemplate(template)}
                        className="gap-2"
                      >
                        <FileText className="w-3 h-3" />
                        Yükle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="gap-2 text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplatesDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Yeni Şablon Oluştur</DialogTitle>
            <DialogDescription>Şablon adı girin ve kaydedin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Şablon Adı *</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Şablon adı"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Açıklama</Label>
              <Textarea
                id="template-description"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Şablon açıklaması"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveTemplate} className="gap-2">
              <Save className="w-4 h-4" />
              Şablonu Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}