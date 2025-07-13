
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, CreditCard, FileText, Banknote, CheckCircle2, DollarSign, Activity, TrendingUp, Users, BarChart3 } from "lucide-react";

interface DailyReportsCardProps {
  transactions: any[];
  dailyTasks: any[];
  tasksLoading: boolean;
  stats: any;
  formatCurrency: (amount: number) => string;
}

const DailyReportsCard = ({ 
  transactions, 
  dailyTasks, 
  tasksLoading, 
  stats, 
  formatCurrency 
}: DailyReportsCardProps) => {
  return (
    <div className="space-y-6">
      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Receipts</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(stats.totalReceipts)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Payments</p>
                <p className="text-xl font-bold text-red-900">{formatCurrency(stats.totalPayments)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Net Cash Flow</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.netCashFlow)}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Tasks Completed</p>
                <p className="text-xl font-bold text-purple-900">{dailyTasks.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Transaction Report
            </CardTitle>
            <CardDescription>Today's financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions recorded today</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        transaction.type === "Receipt" ? 'bg-green-100' :
                        transaction.type === "Payment" ? 'bg-red-100' :
                        transaction.type === "Expense" ? 'bg-orange-100' :
                        'bg-blue-100'
                      }`}>
                        {transaction.type === "Receipt" && <Receipt className="h-5 w-5 text-green-600" />}
                        {transaction.type === "Payment" && <CreditCard className="h-5 w-5 text-red-600" />}
                        {transaction.type === "Expense" && <FileText className="h-5 w-5 text-orange-600" />}
                        {transaction.type === "Float" && <Banknote className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{transaction.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.type === 'Receipt' || transaction.type === 'Float' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'Receipt' || transaction.type === 'Float' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {transaction.type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daily Tasks Completed
            </CardTitle>
            <CardDescription>All tasks completed today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasksLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading tasks...</p>
                </div>
              ) : dailyTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tasks completed today</p>
                </div>
              ) : (
                dailyTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        task.task_type === "Payment" ? 'bg-red-100' :
                        task.task_type === "Receipt" ? 'bg-green-100' :
                        task.task_type === "Float" ? 'bg-blue-100' :
                        task.task_type === "Expense" ? 'bg-orange-100' :
                        task.task_type === "Quality Assessment" ? 'bg-purple-100' :
                        'bg-indigo-100'
                      }`}>
                        {task.task_type === "Payment" && <CreditCard className="h-4 w-4 text-red-600" />}
                        {task.task_type === "Receipt" && <Receipt className="h-4 w-4 text-green-600" />}
                        {task.task_type === "Float" && <Banknote className="h-4 w-4 text-blue-600" />}
                        {task.task_type === "Expense" && <FileText className="h-4 w-4 text-orange-600" />}
                        {task.task_type === "Quality Assessment" && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                        {task.task_type === "Employee Payment" && <DollarSign className="h-4 w-4 text-indigo-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.description}</p>
                        <p className="text-xs text-gray-500">
                          {task.completed_by} • {task.completed_at}
                          {task.batch_number && ` • Batch: ${task.batch_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {task.amount && (
                        <p className="font-bold text-sm">{formatCurrency(task.amount)}</p>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {task.task_type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Report Button */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Button size="lg" className="w-full md:w-auto">
              <FileText className="h-5 w-5 mr-2" />
              Generate Daily Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportsCard;
