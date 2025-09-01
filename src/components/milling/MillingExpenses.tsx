import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, FileText, TrendingDown, Calendar } from "lucide-react";
import { useMillingData, type MillingExpense } from '@/hooks/useMillingData';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0
  }).format(amount);
};

const MillingExpenses = () => {
  const { expenses, addExpense, loading } = useMillingData();
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operating Expense');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleExpenseSubmit = async () => {
    if (!expenseAmount || !expenseDescription) {
      return;
    }

    try {
      setSubmitting(true);
      await addExpense({
        description: expenseDescription,
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        date: expenseDate,
        status: 'Approved',
        created_by: 'Current User', // This would be from auth context in real app
        notes: expenseNotes || undefined
      });

      // Reset form
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('Operating Expense');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseNotes('');
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Operating Expense',
    'Equipment',
    'Maintenance',
    'Utilities',
    'Transportation',
    'Supplies',
    'Other'
  ];

  if (loading) {
    return <div>Loading expenses...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add New Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Record New Expense
          </CardTitle>
          <CardDescription>Record milling department expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Expense Description</label>
              <Input
                placeholder="Enter expense description"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (UGX)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                placeholder="Additional notes about this expense"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleExpenseSubmit} 
              className="w-full"
              disabled={submitting || !expenseAmount || !expenseDescription}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>

          <div className="p-6 bg-gradient-to-br from-red-50 to-rose-100 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(expenses
                    .filter(e => {
                      const expenseDate = new Date(e.date);
                      const now = new Date();
                      return expenseDate.getMonth() === now.getMonth() && 
                             expenseDate.getFullYear() === now.getFullYear();
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0)
                  )}
                </p>
              </div>
              <TrendingDown className="h-12 w-12 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
          <CardDescription>Recent milling expense transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No expenses recorded</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{expense.category}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                    <Badge 
                      variant={expense.status === "Approved" ? "default" : "secondary"}
                      className={expense.status === "Approved" ? "bg-green-100 text-green-800" : ""}
                    >
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MillingExpenses;