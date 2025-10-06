import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, User, Package, DollarSign, ClipboardCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { cn } from '@/lib/utils';

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { results, loading } = useGlobalSearch(searchTerm);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
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
        return <DollarSign className="h-4 w-4" />;
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
        return 'text-emerald-500';
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
    <div className="relative" ref={searchRef}>
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
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
          
          {/* Search Modal */}
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
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
                          <div className="font-medium text-sm truncate">
                            {result.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {result.type}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchTerm && (
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
