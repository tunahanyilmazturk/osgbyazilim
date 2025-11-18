"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Users, Calendar, FileText, TestTube, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  type: 'company' | 'screening' | 'quote' | 'health-test';
  url: string;
};

const typeIcons = {
  company: Building2,
  screening: Calendar,
  quote: FileText,
  'health-test': TestTube,
};

const typeLabels = {
  company: 'Firma',
  screening: 'Tarama',
  quote: 'Teklif',
  'health-test': 'Sağlık Testi',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchData = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [companiesRes, screeningsRes, quotesRes, testsRes] = await Promise.all([
        fetch('/api/companies?limit=100'),
        fetch('/api/screenings?limit=100'),
        fetch('/api/quotes?limit=100'),
        fetch('/api/health-tests?limit=100'),
      ]);

      const [companies, screenings, quotes, tests] = await Promise.all([
        companiesRes.ok ? companiesRes.json() : [],
        screeningsRes.ok ? screeningsRes.json() : [],
        quotesRes.ok ? quotesRes.json() : [],
        testsRes.ok ? testsRes.json() : [],
      ]);

      const lowerQuery = searchQuery.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search companies
      companies.forEach((company: any) => {
        if (
          company.name?.toLowerCase().includes(lowerQuery) ||
          company.address?.toLowerCase().includes(lowerQuery) ||
          company.email?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            id: `company-${company.id}`,
            title: company.name,
            subtitle: company.address || company.email,
            type: 'company',
            url: `/companies/${company.id}`,
          });
        }
      });

      // Search screenings
      screenings.forEach((screening: any) => {
        const company = companies.find((c: any) => c.id === screening.companyId);
        const searchText = `${company?.name || ''} ${screening.participantName || ''} ${screening.date}`.toLowerCase();
        
        if (searchText.includes(lowerQuery)) {
          searchResults.push({
            id: `screening-${screening.id}`,
            title: `${company?.name || 'Tarama'} - ${new Date(screening.date).toLocaleDateString('tr-TR')}`,
            subtitle: `${screening.participantName || ''} • ${screening.timeStart}`,
            type: 'screening',
            url: `/screenings/${screening.id}`,
          });
        }
      });

      // Search quotes
      quotes.forEach((quote: any) => {
        const company = companies.find((c: any) => c.id === quote.companyId);
        const searchText = `${company?.name || ''} ${quote.title || ''} ${quote.quoteNumber || ''}`.toLowerCase();
        
        if (searchText.includes(lowerQuery)) {
          searchResults.push({
            id: `quote-${quote.id}`,
            title: quote.quoteNumber || `Teklif #${quote.id}`,
            subtitle: `${company?.name || ''} • ${quote.totalAmount ? `${quote.totalAmount} TL` : ''}`,
            type: 'quote',
            url: `/quotes/${quote.id}`,
          });
        }
      });

      // Search health tests
      tests.forEach((test: any) => {
        if (
          test.name?.toLowerCase().includes(lowerQuery) ||
          test.code?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            id: `test-${test.id}`,
            title: test.name,
            subtitle: test.code || test.category,
            type: 'health-test',
            url: `/health-tests?id=${test.id}`,
          });
        }
      });

      setResults(searchResults.slice(0, 50)); // Limit to 50 results
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchData(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, searchData]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(url);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-background border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Firma, tarama ara..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {results.length === 0 && query.length > 0 && !isLoading ? (
                <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
              ) : (
                Object.entries(groupedResults).map(([type, items]) => {
                  const Icon = typeIcons[type as keyof typeof typeIcons];
                  const label = typeLabels[type as keyof typeof typeLabels];

                  return (
                    <CommandGroup key={type} heading={label}>
                      {items.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={result.id}
                          onSelect={() => handleSelect(result.url)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}