import React from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { 
  FileText, 
  CreditCard, 
  Users, 
  DollarSign, 
  Activity, 
  Banknote, 
  TrendingUp,
  Wallet,
  BarChart3,
  PieChart
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface FinanceSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

const financeNavItems = [
  {
    title: "Quality Reports",
    key: "quality-reports",
    icon: FileText,
    description: "Review assessments from Quality Control"
  },
  {
    title: "Payment Processing",
    key: "payments", 
    icon: CreditCard,
    description: "Process supplier payments"
  },
  {
    title: "Customer Balances",
    key: "balances",
    icon: Users,
    description: "Track customer account balances"
  },
  {
    title: "HR Salary Requests",
    key: "salary-requests",
    icon: Users,
    description: "Approve salary payment requests"
  },
  {
    title: "Money Requests",
    key: "money-requests",
    icon: DollarSign,
    description: "Review employee money requests"
  },
  {
    title: "Withdrawal Processing",
    key: "withdrawals",
    icon: Banknote,
    description: "Process user withdrawal requests"
  },
  {
    title: "Supplier Advances",
    key: "advances",
    icon: DollarSign,
    description: "Manage supplier advance payments"
  },
  {
    title: "Daily Reports",
    key: "daily",
    icon: Activity,
    description: "View daily financial activities"
  },
  {
    title: "Cash Management",
    key: "cash",
    icon: Banknote,
    description: "Manage cash assignments and flow"
  },
  {
    title: "Expenses",
    key: "expenses",
    icon: Wallet,
    description: "Track operational expenses"
  },
  {
    title: "Analytics",
    key: "analytics",
    icon: TrendingUp,
    description: "Financial performance insights"
  }
];

export function FinanceSidebar({ currentSection, onSectionChange }: FinanceSidebarProps) {
  const isActive = (key: string) => currentSection === key;

  const getNavCls = (key: string) => {
    const baseClasses = "w-full justify-start text-left transition-colors";
    return isActive(key) 
      ? `${baseClasses} bg-primary/10 text-primary font-medium border-r-2 border-primary` 
      : `${baseClasses} hover:bg-muted/50 text-muted-foreground hover:text-foreground`;
  };

  return (
    <Sidebar
      className="w-64 border-r bg-background"
      collapsible="none"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="font-semibold text-lg">Finance</h2>
        </div>
      </div>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {financeNavItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton 
                    asChild
                    className={getNavCls(item.key)}
                  >
                    <button 
                      onClick={() => onSectionChange(item.key)}
                      className="w-full"
                    >
                      <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Cash</span>
                <PieChart className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-bold text-green-600">UGX 2.4M</div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-muted-foreground">Pending Payments</span>
                <BarChart3 className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-amber-600">12</div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}