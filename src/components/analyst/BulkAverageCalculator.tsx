import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface Batch {
  id: number;
  kgs: string;
  pricePerKg: string;
}

const BulkAverageCalculator = () => {
  const [batches, setBatches] = useState<Batch[]>([
    { id: 1, kgs: '', pricePerKg: '' },
    { id: 2, kgs: '', pricePerKg: '' },
  ]);

  const addBatch = () => {
    setBatches(prev => [...prev, { id: Date.now(), kgs: '', pricePerKg: '' }]);
  };

  const removeBatch = (id: number) => {
    if (batches.length <= 2) return;
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  const updateBatch = (id: number, field: 'kgs' | 'pricePerKg', value: string) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const validBatches = batches.filter(b => Number(b.kgs) > 0 && Number(b.pricePerKg) > 0);
  const totalKgs = validBatches.reduce((sum, b) => sum + Number(b.kgs), 0);
  const totalValue = validBatches.reduce((sum, b) => sum + Number(b.kgs) * Number(b.pricePerKg), 0);
  const avgPrice = totalKgs > 0 ? totalValue / totalKgs : 0;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Bulk Average Price Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">Add batches to calculate the weighted average price per kg</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center text-xs font-medium text-muted-foreground px-1">
          <span className="w-6">#</span>
          <span>Quantity (kgs)</span>
          <span>Price/kg (USh)</span>
          <span className="w-8" />
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
          {batches.map((batch, i) => (
            <div key={batch.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
              <Input
                type="number"
                placeholder="e.g. 8000"
                value={batch.kgs}
                onChange={e => updateBatch(batch.id, 'kgs', e.target.value)}
                className="h-9 text-sm"
              />
              <Input
                type="number"
                placeholder="e.g. 15600"
                value={batch.pricePerKg}
                onChange={e => updateBatch(batch.id, 'pricePerKg', e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeBatch(batch.id)}
                disabled={batches.length <= 2}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addBatch} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Batch ({batches.length}/50)
        </Button>

        {validBatches.length >= 2 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Quantity</span>
              <span className="font-semibold">{fmt(totalKgs)} kgs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-semibold">USh {fmt(totalValue)}</span>
            </div>
            <div className="border-t border-primary/20 pt-2 flex justify-between">
              <span className="font-medium">Average Price/kg</span>
              <span className="text-lg font-bold text-primary">USh {fmt(avgPrice)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkAverageCalculator;
