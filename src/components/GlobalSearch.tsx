import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, User, Package, DollarSign, ClipboardCheck, TrendingUp, History, Trash2, Clock, Sparkles, Lightbulb, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAISearch, AISearchResult, AISearchSuggestion } from '@/hooks/useAISearch';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  
  const { results, suggestions, loading, usingFallback } = useAISearch(searchTerm);

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

    try {
      await supabase.from('search_history').insert([{
        user_id: user.id,
        search_term: term,
        result_count: count
      }]);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
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

  const getResultIcon = (type: AISearchResult['type']) => {
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
      case 'overtime':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResultColor = (type: AISearchResult['type']) => {
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
      case 'overtime':
        return 'text-indigo-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleResultClick = (result: AISearchResult) => {
    navigate(result.navigateTo);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSuggestionClick = (suggestion: AISearchSuggestion) => {
    if (suggestion.action.startsWith('/')) {
      navigate(suggestion.action);
      setIsOpen(false);
    } else {
      setSearchTerm(suggestion.action);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className="relative hover-scale transition-all duration-200 hover:bg-primary/10 gap-2"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <Sparkles className="h-3 w-3 text-primary absolute -top-0.5 -right-0.5" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          
          {/* Search Modal */}
          <div ref={modalRef} className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-2 p-4 border-b border-border">
                <div className="flex items-center gap-1">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="AI-powered search across all departments... (Ctrl+K)"
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

              {/* AI Badge */}
              {searchTerm && (
                <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {loading ? 'AI is searching...' : usingFallback ? 'Using quick search' : 'AI-enhanced results'}
                  </span>
                </div>
              )}

              {/* Results */}
              <ScrollArea className="max-h-96">
                {loading && (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                      <span>AI is searching across all departments...</span>
                    </div>
                  </div>
                )}

                {!loading && searchTerm && results.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No results found for "{searchTerm}"
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="p-2">
                    {/* AI Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="mb-3 px-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground">AI Suggestions</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                            >
                              {suggestion.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search Results */}
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
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                {result.module || result.department}
                              </Badge>
                            )}
                            {result.relevance && result.relevance >= 80 && (
                              <Sparkles className="h-3 w-3 text-primary shrink-0" />
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
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Sparkles className="h-10 w-10 text-primary/50" />
                    </div>
                    <p className="text-sm font-medium">AI-Powered Search</p>
                    <p className="text-xs mt-2 opacity-70">
                      Search across suppliers, batches, employees, payments, EUDR docs and more
                    </p>
                    <p className="text-xs mt-1 opacity-50">
                      Results are filtered based on your permissions
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
