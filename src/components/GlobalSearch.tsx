import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, User, Package, DollarSign, ClipboardCheck, TrendingUp, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchHistory {
  id: string;
  search_term: string;
  result_count: number;
  searched_at: string;
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { results, loading } = useGlobalSearch(searchTerm);

  // Load search history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
    }
  }, [isOpen]);

  // Save search to history when results are loaded
  useEffect(() => {
    if (searchTerm && !loading && results.length >= 0) {
      saveSearchToHistory(searchTerm, results.length);
    }
  }, [results, loading, searchTerm]);

  const loadSearchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setSearchHistory(data);
    }
  };

  const saveSearchToHistory = async (term: string, count: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || term.length < 2) return;

    await supabase.from('search_history').insert({
      user_id: user.id,
      search_term: term,
      result_count: count
    });
  };

  const deleteSearchHistory = async (id: string) => {
    await supabase.from('search_history').delete().eq('id', id);
    setSearchHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearAllHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('search_history').delete().eq('user_id', user.id);
    setSearchHistory([]);
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'supplier':
        return <User className="h-4 w-4" />;
      case 'batch':
        return <Package className="h-4 w-4" />;
      case 'employee':
        return <User className="h-4 w-4" />;
      case 'transaction':
        return <TrendingUp className="h-4 w-4" />;
      case 'quality':
        return <ClipboardCheck className="h-4 w-4" />;
      case 'payment':
      case 'expense':
        return <DollarSign className="h-4 w-4" />;
      case 'department':
        return <Search className="h-4 w-4" />;
      case 'eudr':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResultColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'supplier':
        return 'text-blue-500';
      case 'batch':
        return 'text-green-500';
      case 'employee':
        return 'text-purple-500';
      case 'transaction':
        return 'text-orange-500';
      case 'quality':
        return 'text-teal-500';
      case 'payment':
      case 'expense':
        return 'text-emerald-500';
      case 'department':
        return 'text-primary';
      case 'eudr':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.navigateTo);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className="relative hover-scale transition-all duration-200 hover:bg-primary/10"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          
          {/* Search Modal */}
          <div ref={modalRef} className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-2 p-4 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search suppliers, batches, employees, transactions... (Ctrl+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Results */}
              <ScrollArea className="max-h-96">
                {loading && (
                  <div className="p-8 text-center text-muted-foreground">
                    Searching...
                  </div>
                )}

                {!loading && searchTerm && results.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No results found for "{searchTerm}"
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="p-2">
                    {results.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className={cn("mt-0.5", getResultColor(result.type))}>
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm truncate">
                              {result.title}
                            </div>
                            {(result.department || result.module) && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                {result.module || result.department}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground capitalize shrink-0">
                          {result.type}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchTerm && searchHistory.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <History className="h-4 w-4" />
                        <span>Recent Searches</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllHistory}
                        className="h-7 text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {searchHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent group"
                        >
                          <button
                            onClick={() => setSearchTerm(item.search_term)}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            <Search className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{item.search_term}</span>
                            <span className="text-xs text-muted-foreground">
                              ({item.result_count} results)
                            </span>
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSearchHistory(item.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!searchTerm && searchHistory.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Start typing to search across the entire system
                    </p>
                    <p className="text-xs mt-2 opacity-70">
                      Search for suppliers, batches, employees, transactions, and more
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSearch;
