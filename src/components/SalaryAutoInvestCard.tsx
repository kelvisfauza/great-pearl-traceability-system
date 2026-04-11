import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, TrendingUp, Percent, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const SalaryAutoInvestCard = () => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{
    id?: string;
    invest_type: string;
    fixed_amount: number;
    percentage: number;
    is_enabled: boolean;
  }>({
    invest_type: 'fixed',
    fixed_amount: 100000,
    percentage: 10,
    is_enabled: false,
  });

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('salary_auto_invest' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setConfig({
          id: (data as any).id,
          invest_type: (data as any).invest_type || 'fixed',
          fixed_amount: Number((data as any).fixed_amount) || 100000,
          percentage: Number((data as any).percentage) || 10,
          is_enabled: (data as any).is_enabled ?? false,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !user?.email) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        user_email: employee?.email || user.email,
        employee_name: employee?.name || user.email,
        invest_type: config.invest_type,
        fixed_amount: config.invest_type === 'fixed' ? config.fixed_amount : 0,
        percentage: config.invest_type === 'percentage' ? config.percentage : 0,
        is_enabled: config.is_enabled,
      };

      if (config.id) {
        const { error } = await supabase
          .from('salary_auto_invest' as any)
          .update(payload as any)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salary_auto_invest' as any)
          .insert([payload] as any);
        if (error) throw error;
      }

      toast({
        title: config.is_enabled ? 'Auto-Invest Enabled ✅' : 'Auto-Invest Disabled',
        description: config.is_enabled
          ? `${config.invest_type === 'fixed'
              ? `UGX ${config.fixed_amount.toLocaleString()}`
              : `${config.percentage}% of salary`
            } will be auto-invested monthly after salary credit`
          : 'Monthly auto-investment has been turned off',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Repeat className="h-4 w-4 text-indigo-600" />
            Auto-Invest from Salary
          </CardTitle>
          <Badge variant={config.is_enabled ? 'default' : 'outline'}
            className={config.is_enabled ? 'bg-green-100 text-green-800 text-[10px]' : 'text-[10px]'}>
            {config.is_enabled ? 'Active' : 'Off'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Automatically invest a portion of your salary each month after it's credited. Earns 25% every 3 months, compounding if left!
        </p>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Auto-Invest</Label>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={(v) => setConfig(c => ({ ...c, is_enabled: v }))}
          />
        </div>

        <div>
          <Label className="text-xs">Investment Type</Label>
          <Select value={config.invest_type} onValueChange={(v) => setConfig(c => ({ ...c, invest_type: v }))}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Fixed Amount (UGX)</span>
              </SelectItem>
              <SelectItem value="percentage">
                <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Percentage of Salary</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.invest_type === 'fixed' ? (
          <div>
            <Label className="text-xs">Amount (UGX)</Label>
            <Input
              type="number"
              value={config.fixed_amount}
              onChange={(e) => setConfig(c => ({ ...c, fixed_amount: Number(e.target.value) || 0 }))}
              placeholder="Min 100,000"
              min={100000}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Minimum: UGX 100,000</p>
          </div>
        ) : (
          <div>
            <Label className="text-xs">Percentage of Net Salary</Label>
            <Input
              type="number"
              value={config.percentage}
              onChange={(e) => setConfig(c => ({ ...c, percentage: Math.min(50, Math.max(1, Number(e.target.value) || 0)) }))}
              min={1}
              max={50}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">1% to 50% of your net salary</p>
          </div>
        )}

        {config.is_enabled && (
          <div className="bg-indigo-100/60 rounded-lg p-2.5 text-xs text-indigo-800 flex items-start gap-2">
            <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              After each salary credit, {config.invest_type === 'fixed'
                ? `UGX ${config.fixed_amount.toLocaleString()}`
                : `${config.percentage}% of your salary`
              } will be automatically invested at 25% interest for 3 months (compounds if left).
            </span>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</> : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
