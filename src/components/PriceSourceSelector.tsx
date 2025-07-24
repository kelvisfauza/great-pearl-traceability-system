import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Globe, TrendingUp } from 'lucide-react';

interface PriceSourceSelectorProps {
  currentSource: 'investing' | 'rapidapi' | 'fallback';
  onSourceChange: (source: 'investing' | 'rapidapi' | 'fallback') => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: string;
}

export const PriceSourceSelector: React.FC<PriceSourceSelectorProps> = ({
  currentSource,
  onSourceChange,
  onRefresh,
  isLoading,
  lastUpdated
}) => {
  const sources = [
    {
      key: 'investing' as const,
      name: 'Investing.com Scraper',
      description: 'Direct scraping from Investing.com',
      icon: <Globe className="h-4 w-4" />,
      status: 'active'
    },
    {
      key: 'rapidapi' as const,
      name: 'RapidAPI Scraper',
      description: 'Investing.com via RapidAPI (requires key)',
      icon: <TrendingUp className="h-4 w-4" />,
      status: 'premium'
    },
    {
      key: 'fallback' as const,
      name: 'Simulated Data',
      description: 'Realistic simulated market data',
      icon: <RefreshCw className="h-4 w-4" />,
      status: 'demo'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Market Data Source</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          {sources.map((source) => (
            <div
              key={source.key}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                currentSource === source.key 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSourceChange(source.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {source.icon}
                  <div>
                    <h4 className="font-medium">{source.name}</h4>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSource === source.key && (
                    <Badge variant="default">Active</Badge>
                  )}
                  <Badge 
                    variant={
                      source.status === 'active' ? 'default' : 
                      source.status === 'premium' ? 'secondary' : 'outline'
                    }
                  >
                    {source.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <h5 className="font-medium text-sm mb-2">Current Source: {sources.find(s => s.key === currentSource)?.name}</h5>
          <p className="text-xs text-muted-foreground">
            {currentSource === 'investing' && 'Fetching real-time data directly from Investing.com'}
            {currentSource === 'rapidapi' && 'Using RapidAPI for reliable data access'}
            {currentSource === 'fallback' && 'Using simulated data with realistic market patterns'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};