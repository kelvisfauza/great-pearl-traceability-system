
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusCircle, FileText, TrendingDown } from "lucide-react";

interface ExpensesCardProps {
  expenses: any[];
  expenseAmount: string;
  setExpenseAmount: (value: string) => void;
  expenseDescription: string;
  setExpenseDescription: (value: string) => void;
  onExpenseSubmit: () => void;
  formatCurrency: (amount: number) => string;
}

const ExpensesCard = ({ 
  expenses, 
  expenseAmount, 
  setExpenseAmount, 
  expenseDescription, 
  setExpenseDescription, 
  onExpenseSubmit, 
  formatCurrency 
}: ExpensesCardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add New Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Record New Expense
          </CardTitle>
          <CardDescription>Add expenses and payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Expense Description</label>
              <Input
                placeholder="Enter expense description"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (UGX)</label>
              <Input
                placeholder="Enter expense amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={onExpenseSubmit} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Record Expense
            </Button>
          </div>

          <div className="p-6 bg-gradient-to-br from-red-50 to-rose-100 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(expenses.reduce((sum, expense) => sum + expense.amount, 0))}
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
          <CardDescription>Recent expense transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No expenses recorded</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-500">{expense.category} • {expense.date}</p>
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

export default ExpensesCard;
