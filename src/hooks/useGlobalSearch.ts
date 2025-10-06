import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SearchResult {
  id: string;
  type: 'supplier' | 'batch' | 'employee' | 'transaction' | 'quality' | 'payment' | 'expense' | 'department' | 'eudr';
  title: string;
  subtitle: string;
  navigateTo: string;
  department?: string;
  module?: string;
  metadata?: any;
}

export const useGlobalSearch = (searchTerm: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { employee, hasPermission } = useAuth();

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        const lowerSearch = searchTerm.toLowerCase();
        console.log('🔍 Global search - term:', searchTerm, 'hasPermission check:', hasPermission('Store Management'));

        // Department/Module suggestions based on keywords
        const departmentKeywords: Record<string, { name: string; path: string; keywords: string[] }> = {
          expenses: { name: 'Expenses & Finance', path: '/expenses', keywords: ['expense', 'expens', 'money', 'payment', 'finance', 'cash'] },
          eudr: { name: 'EUDR Documentation', path: '/eudr-documentation', keywords: ['eudr', 'eud', 'documentation', 'compliance', 'eu'] },
          hr: { name: 'Human Resources', path: '/human-resources', keywords: ['hr', 'human', 'employee', 'staff', 'salary', 'payroll'] },
          store: { name: 'Store Management', path: '/store', keywords: ['store', 'inventory', 'stock', 'warehouse'] },
          quality: { name: 'Quality Control', path: '/quality-control', keywords: ['quality', 'assessment', 'inspection'] },
          finance: { name: 'Finance Department', path: '/finance', keywords: ['finance', 'accounting', 'ledger', 'transaction'] },
          sales: { name: 'Sales & Marketing', path: '/sales-marketing', keywords: ['sales', 'marketing', 'customer', 'order'] },
        };

        // Check department matches
        Object.entries(departmentKeywords).forEach(([key, dept]) => {
          if (dept.keywords.some(keyword => keyword.includes(lowerSearch) || lowerSearch.includes(keyword))) {
            searchResults.push({
              id: `dept-${key}`,
              type: 'department',
              title: dept.name,
              subtitle: `Navigate to ${dept.name} module`,
              navigateTo: dept.path,
              module: dept.name
            });
          }
        });

        // Search Suppliers (visible to all)
        const { data: suppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(10);

        if (suppliersError) console.error('Suppliers search error:', suppliersError);

        if (suppliers) {
          suppliers.forEach(supplier => {
            searchResults.push({
              id: supplier.id,
              type: 'supplier',
              title: supplier.name,
              subtitle: `Code: ${supplier.code} | Origin: ${supplier.origin}`,
              navigateTo: `/suppliers?id=${supplier.id}`,
              department: 'Procurement',
              metadata: supplier
            });
          });
        }

        // Search Money/Expense Requests
        if (hasPermission('Finance Management') || employee?.permissions?.includes('*')) {
          const { data: expenseRequests } = await supabase
            .from('money_requests')
            .select('*')
            .or(`reason.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%,request_type.ilike.%${searchTerm}%`)
            .limit(10);

          if (expenseRequests) {
            expenseRequests.forEach(request => {
              searchResults.push({
                id: request.id,
                type: 'expense',
                title: `${request.request_type}: ${request.reason}`,
                subtitle: `${request.amount} UGX | Status: ${request.status}`,
                navigateTo: `/expenses`,
                department: 'Finance',
                module: 'Expense Requests',
                metadata: request
              });
            });
          }
        }

        // Search EUDR Documentation
        if (hasPermission('Store Management') || employee?.permissions?.includes('*')) {
          // Fuzzy match for EUDR
          if ('eudr'.includes(lowerSearch) || lowerSearch.includes('eud') || lowerSearch.includes('documentation')) {
            const { data: eudrDocs } = await supabase
              .from('eudr_documents')
              .select('*')
              .ilike('batch_number', `%${searchTerm}%`)
              .limit(5);

            if (eudrDocs) {
              eudrDocs.forEach(doc => {
                searchResults.push({
                  id: doc.id,
                  type: 'eudr',
                  title: `EUDR: ${doc.batch_number}`,
                  subtitle: `${doc.coffee_type} | ${doc.total_kilograms}kg | Status: ${doc.status}`,
                  navigateTo: `/eudr-documentation`,
                  department: 'Store',
                  module: 'EUDR Compliance',
                  metadata: doc
                });
              });
            }
          }
        }

        // Search Coffee Records by Batch Number - Check both Store Management permission and wildcard
        const canAccessStore = hasPermission('Store Management') || employee?.permissions?.includes('*');
        console.log('🔍 Can access store:', canAccessStore, 'Employee permissions:', employee?.permissions);
        
        if (canAccessStore) {
          const { data: coffeeRecords, error: coffeeError } = await supabase
            .from('coffee_records')
            .select('*')
            .or(`batch_number.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`)
            .limit(10);

          console.log('🔍 Coffee records search result:', coffeeRecords, 'Error:', coffeeError);

          if (coffeeError) console.error('Coffee records search error:', coffeeError);

          if (coffeeRecords) {
            coffeeRecords.forEach(record => {
              searchResults.push({
                id: record.id,
                type: 'batch',
                title: `Batch: ${record.batch_number}`,
                subtitle: `${record.supplier_name} | ${record.kilograms}kg | ${record.date}`,
                navigateTo: `/store?batch=${record.batch_number}`,
                department: 'Store',
                module: 'Coffee Records',
                metadata: record
              });
            });
          }
        }

        // Search Quality Assessments
        const canAccessQuality = hasPermission('Quality Control') || employee?.permissions?.includes('*');
        if (canAccessQuality) {
          const { data: qualityAssessments } = await supabase
            .from('quality_assessments')
            .select('*')
            .ilike('batch_number', `%${searchTerm}%`)
            .limit(10);

          if (qualityAssessments) {
            qualityAssessments.forEach(assessment => {
              searchResults.push({
                id: assessment.id,
                type: 'quality',
                title: `Quality: ${assessment.batch_number}`,
                subtitle: `Moisture: ${assessment.moisture}% | Status: ${assessment.status}`,
                navigateTo: `/quality-control?batch=${assessment.batch_number}`,
                department: 'Quality',
                module: 'Quality Assessment',
                metadata: assessment
              });
            });
          }
        }

        // Search Employees (HR permission)
        const canAccessHR = hasPermission('User Management') || hasPermission('HR Management') || employee?.permissions?.includes('*');
        if (canAccessHR) {
          const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
            .limit(10);

          if (employees) {
            employees.forEach(emp => {
              searchResults.push({
                id: emp.id,
                type: 'employee',
                title: emp.name,
                subtitle: `${emp.position} | ${emp.department}`,
                navigateTo: `/human-resources?employee=${emp.id}`,
                department: 'HR',
                module: 'Employee Management',
                metadata: emp
              });
            });
          }
        }

        // Search Payment Records (Finance permission)
        const canAccessFinance = hasPermission('Finance Management') || employee?.permissions?.includes('*');
        if (canAccessFinance) {
          const { data: payments } = await supabase
            .from('payment_records')
            .select('*')
            .or(`batch_number.ilike.%${searchTerm}%,supplier.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
            .limit(10);

          if (payments) {
            payments.forEach(payment => {
              searchResults.push({
                id: payment.id,
                type: 'payment',
                title: `Payment: ${payment.supplier}`,
                subtitle: `${payment.amount} UGX | ${payment.status} | ${payment.date}`,
                navigateTo: `/finance?payment=${payment.id}`,
                department: 'Finance',
                module: 'Payment Processing',
                metadata: payment
              });
            });
          }
        }

        // Search Sales Transactions
        const canAccessSales = hasPermission('Sales Management') || employee?.permissions?.includes('*');
        if (canAccessSales) {
          const { data: sales } = await supabase
            .from('sales_transactions')
            .select('*')
            .or(`customer.ilike.%${searchTerm}%,truck_details.ilike.%${searchTerm}%,coffee_type.ilike.%${searchTerm}%`)
            .limit(10);

          if (sales) {
            sales.forEach(sale => {
              searchResults.push({
                id: sale.id,
                type: 'transaction',
                title: `Sale: ${sale.customer}`,
                subtitle: `${sale.weight}kg | ${sale.total_amount} UGX | ${sale.date}`,
                navigateTo: `/sales-marketing?sale=${sale.id}`,
                department: 'Sales',
                module: 'Sales Transactions',
                metadata: sale
              });
            });
          }
        }

        console.log('🔍 Total search results found:', searchResults.length);
        setResults(searchResults);
      } catch (error) {
        console.error('Global search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, hasPermission]);

  return { results, loading };
};
