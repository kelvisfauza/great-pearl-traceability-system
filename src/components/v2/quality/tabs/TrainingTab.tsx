import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, GraduationCap, Play, CheckCircle, XCircle } from "lucide-react";

// Generate a random simulation batch
const generateSimulation = () => {
  const types = ['Arabica', 'Robusta'];
  const type = types[Math.floor(Math.random() * types.length)];
  const moisture = parseFloat((10 + Math.random() * 10).toFixed(1));
  const outturn = parseFloat((50 + Math.random() * 20).toFixed(1));
  const defects = {
    group1: parseFloat((Math.random() * 15).toFixed(1)),
    group2: parseFloat((Math.random() * 10).toFixed(1)),
    pods: parseFloat((Math.random() * 5).toFixed(1)),
    husks: parseFloat((Math.random() * 5).toFixed(1)),
    fm: parseFloat((Math.random() * 3).toFixed(1)),
  };
  const totalDefects = defects.group1 + defects.group2 + defects.pods + defects.husks + defects.fm;
  
  // Business rules
  let correctDecision: 'Accept' | 'Reject' = 'Accept';
  if (moisture > 19) correctDecision = 'Reject';
  if (totalDefects > 7) correctDecision = 'Reject';
  if (type === 'Arabica' && defects.group1 > 12) correctDecision = 'Reject';

  // Price calc (simplified)
  let correctPrice = 0;
  if (correctDecision === 'Accept') {
    const basePrice = type === 'Arabica' ? 12000 : 8000;
    const moistureDeduction = moisture > 13 ? (moisture - 13) * 100 : 0;
    correctPrice = Math.max(0, basePrice - moistureDeduction - totalDefects * 50);
  }

  return {
    batch_number: `SIM-${Date.now().toString(36).toUpperCase()}`,
    coffee_type: type,
    moisture, outturn, defects, totalDefects: parseFloat(totalDefects.toFixed(1)),
    correctDecision,
    correctPrice: Math.round(correctPrice)
  };
};

const TrainingTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [simulation, setSimulation] = useState<any>(null);
  const [decision, setDecision] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<any>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['training-history'],
    queryFn: async () => {
      const { data, error } = await supabase.from('training_simulations').select('*')
        .eq('trainee_email', employee?.email || '')
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.email
  });

  const submitResult = useMutation({
    mutationFn: async () => {
      if (!simulation || !decision) return;
      const isCorrect = decision === simulation.correctDecision;
      const priceAccuracy = decision === 'Accept' ? Math.max(0, 100 - Math.abs(parseFloat(price) - simulation.correctPrice) / simulation.correctPrice * 100) : 100;
      const score = isCorrect ? (decision === 'Accept' ? priceAccuracy : 100) : 0;

      const { error } = await supabase.from('training_simulations').insert({
        trainee_email: employee?.email || '',
        trainee_name: employee?.full_name || '',
        batch_number: simulation.batch_number,
        coffee_type: simulation.coffee_type,
        simulated_moisture: simulation.moisture,
        simulated_outturn: simulation.outturn,
        simulated_defects: simulation.defects,
        trainee_decision: decision,
        trainee_price: decision === 'Accept' ? parseFloat(price) || 0 : 0,
        correct_decision: simulation.correctDecision,
        correct_price: simulation.correctPrice,
        is_correct: isCorrect,
        score: parseFloat(score.toFixed(1)),
        completed_at: new Date().toISOString()
      });
      if (error) throw error;
      setResult({ isCorrect, score: score.toFixed(1), correctDecision: simulation.correctDecision, correctPrice: simulation.correctPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-history'] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const startNew = () => {
    setSimulation(generateSimulation());
    setDecision('');
    setPrice('');
    setResult(null);
  };

  const avgScore = history?.length ? (history.reduce((sum: number, h: any) => sum + (h.score || 0), 0) / history.length).toFixed(0) : '0';

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5" />Training & Simulation</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">Avg Score: {avgScore}%</Badge>
          <Button onClick={startNew}><Play className="mr-1 h-4 w-4" />New Simulation</Button>
        </div>
      </div>

      {simulation && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle>Simulated Batch: {simulation.batch_number}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Coffee Type</p><p className="font-bold">{simulation.coffee_type}</p></div>
              <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Moisture</p><p className="font-bold">{simulation.moisture}%</p></div>
              <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Outturn</p><p className="font-bold">{simulation.outturn}%</p></div>
              <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Total Defects</p><p className="font-bold">{simulation.totalDefects}%</p></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(simulation.defects).map(([k, v]: [string, any]) => (
                <div key={k} className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{k}</p>
                  <p className="font-mono text-sm">{v}%</p>
                </div>
              ))}
            </div>

            {!result ? (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Decision</Label>
                    <Select value={decision} onValueChange={setDecision}>
                      <SelectTrigger><SelectValue placeholder="Accept or Reject?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Accept">Accept</SelectItem>
                        <SelectItem value="Reject">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {decision === 'Accept' && (
                    <div>
                      <Label>Your Price (UGX/kg)</Label>
                      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter price..." />
                    </div>
                  )}
                </div>
                <Button onClick={() => submitResult.mutate()} disabled={!decision || submitResult.isPending}>
                  {submitResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Answer
                </Button>
              </div>
            ) : (
              <div className={`p-4 rounded-lg border ${result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <span className="font-semibold">{result.isCorrect ? 'Correct!' : 'Incorrect'} — Score: {result.score}%</span>
                </div>
                <p className="text-sm">Correct decision: <strong>{result.correctDecision}</strong></p>
                {result.correctDecision === 'Accept' && <p className="text-sm">Correct price: <strong>{result.correctPrice.toLocaleString()} UGX/kg</strong></p>}
                <Button className="mt-3" variant="outline" onClick={startNew}>Try Another</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Your Training History</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Your Decision</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-mono">{h.batch_number}</TableCell>
                      <TableCell>{h.coffee_type}</TableCell>
                      <TableCell>{h.trainee_decision}</TableCell>
                      <TableCell>{h.is_correct ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}</TableCell>
                      <TableCell><Badge variant={Number(h.score) >= 70 ? "secondary" : "destructive"}>{h.score}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingTab;
