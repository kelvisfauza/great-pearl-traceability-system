import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Gift, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeLoyalty {
  id: string;
  name: string;
  email: string;
  department: string;
  totalEarned: number;
  totalWithdrawn: number;
  currentBalance: number;
}

const LoyaltyBalances = () => {
  const [search, setSearch] = useState("");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["hr-loyalty-balances"],
    queryFn: async () => {
      // Get all active employees
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name, email, department, auth_user_id")
        .eq("status", "Active")
        .order("name");

      if (empError) throw empError;
      if (!empData) return [];

      // For each employee with auth_user_id, get their loyalty ledger entries
      const results: EmployeeLoyalty[] = [];

      for (const emp of empData) {
        if (!emp.auth_user_id) {
          results.push({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            department: emp.department,
            totalEarned: 0,
            totalWithdrawn: 0,
            currentBalance: 0,
          });
          continue;
        }

        const { data: ledger } = await supabase
          .from("ledger_entries")
          .select("entry_type, amount")
          .eq("user_id", emp.auth_user_id);

        let totalEarned = 0;
        let totalWithdrawn = 0;

        (ledger || []).forEach((entry: any) => {
          if (entry.entry_type === "LOYALTY_REWARD" && entry.amount > 0) {
            totalEarned += Number(entry.amount);
          }
          if (entry.entry_type === "WITHDRAWAL" && entry.amount < 0) {
            totalWithdrawn += Math.abs(Number(entry.amount));
          }
        });

        results.push({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: emp.department,
          totalEarned,
          totalWithdrawn,
          currentBalance: totalEarned - totalWithdrawn,
        });
      }

      return results;
    },
    refetchInterval: 30000,
  });

  const filtered = (employees || []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  );

  const totalLoyaltyBalance = filtered.reduce((sum, e) => sum + e.currentBalance, 0);
  const totalEarned = filtered.reduce((sum, e) => sum + e.totalEarned, 0);
  const totalWithdrawn = filtered.reduce((sum, e) => sum + e.totalWithdrawn, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-8 w-8 text-purple-600" />
              <h1 className="text-4xl font-bold text-foreground">Loyalty Balances</h1>
            </div>
            <p className="text-muted-foreground text-lg">Track employee loyalty reward balances</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Earned (All)</p>
                  <p className="text-2xl font-bold text-green-600">UGX {totalEarned.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-2xl font-bold text-red-600">UGX {totalWithdrawn.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-purple-600">UGX {totalLoyaltyBalance.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Search & Table */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Loyalty Balances
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading balances...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-right">Earned</TableHead>
                          <TableHead className="text-right">Withdrawn</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{emp.department}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {emp.totalEarned.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {emp.totalWithdrawn.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              UGX {emp.currentBalance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No employees found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyBalances;
