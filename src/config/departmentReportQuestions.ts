// Department-specific questions for daily reports

export interface ReportQuestion {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface DepartmentQuestions {
  department: string;
  questions: ReportQuestion[];
}

export const departmentQuestions: Record<string, ReportQuestion[]> = {
  'Quality Control': [
    { id: 'total_samples_received', label: 'Total Samples Received Today', type: 'number', required: true },
    { id: 'total_samples_analysed', label: 'Total Samples Analysed', type: 'number', required: true },
    { id: 'samples_approved', label: 'Samples Approved for Purchase', type: 'number', required: true },
    { id: 'samples_rejected', label: 'Samples Rejected', type: 'number', required: true },
    { id: 'coffee_priced_kg', label: 'Total Coffee Priced (KG)', type: 'number', required: true },
    { id: 'average_outturn', label: 'Average Outturn (%)', type: 'number', placeholder: 'e.g., 78.5' },
    { id: 'average_moisture', label: 'Average Moisture (%)', type: 'number', placeholder: 'e.g., 12.5' },
    { id: 'defect_distribution', label: 'Defect Distribution Summary', type: 'textarea', placeholder: 'e.g., FM: 2%, Husks: 1%, Pods: 0.5%' },
    { id: 'quality_issues', label: 'Quality Issues Encountered', type: 'textarea', placeholder: 'Describe any quality issues observed today' },
    { id: 'recommendations', label: 'Recommendations', type: 'textarea', placeholder: 'Any recommendations for tomorrow' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Store': [
    { id: 'total_coffee_received_kg', label: 'Total Coffee Received (KG)', type: 'number', required: true },
    { id: 'total_bags_received', label: 'Total Bags Received', type: 'number', required: true },
    { id: 'suppliers_served', label: 'Number of Suppliers Served', type: 'number', required: true },
    { id: 'coffee_dispatched_kg', label: 'Coffee Dispatched (KG)', type: 'number' },
    { id: 'bags_dispatched', label: 'Bags Dispatched', type: 'number' },
    { id: 'storage_location_updates', label: 'Storage Location Updates', type: 'textarea', placeholder: 'Any changes to storage locations' },
    { id: 'inventory_issues', label: 'Inventory Issues', type: 'textarea', placeholder: 'Any discrepancies or issues' },
    { id: 'equipment_status', label: 'Equipment Status', type: 'select', options: ['All Operational', 'Minor Issues', 'Major Issues', 'Needs Maintenance'] },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Finance': [
    { id: 'payments_processed', label: 'Number of Payments Processed', type: 'number', required: true },
    { id: 'total_amount_paid', label: 'Total Amount Paid (UGX)', type: 'number', required: true },
    { id: 'supplier_payments', label: 'Supplier Payments Made', type: 'number' },
    { id: 'expense_approvals', label: 'Expense Approvals Processed', type: 'number' },
    { id: 'cash_balance_status', label: 'Cash Balance Status', type: 'select', options: ['Adequate', 'Low', 'Critical', 'Needs Top-up'] },
    { id: 'pending_approvals', label: 'Pending Approvals Count', type: 'number' },
    { id: 'reconciliation_done', label: 'Daily Reconciliation Completed?', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { id: 'discrepancies', label: 'Discrepancies Found', type: 'textarea', placeholder: 'Any financial discrepancies' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Sales': [
    { id: 'customers_contacted', label: 'Customers Contacted', type: 'number', required: true },
    { id: 'new_inquiries', label: 'New Inquiries Received', type: 'number' },
    { id: 'sales_made', label: 'Number of Sales Made', type: 'number', required: true },
    { id: 'total_kg_sold', label: 'Total KG Sold', type: 'number' },
    { id: 'total_sales_value', label: 'Total Sales Value (UGX)', type: 'number' },
    { id: 'quotations_sent', label: 'Quotations Sent', type: 'number' },
    { id: 'follow_ups_done', label: 'Follow-ups Completed', type: 'number' },
    { id: 'customer_feedback', label: 'Customer Feedback', type: 'textarea', placeholder: 'Any feedback from customers' },
    { id: 'market_insights', label: 'Market Insights', type: 'textarea', placeholder: 'Any market observations' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Human Resources': [
    { id: 'attendance_marked', label: 'Attendance Records Marked', type: 'number', required: true },
    { id: 'leave_requests_processed', label: 'Leave Requests Processed', type: 'number' },
    { id: 'new_employees_onboarded', label: 'New Employees Onboarded', type: 'number' },
    { id: 'employee_issues_resolved', label: 'Employee Issues Resolved', type: 'number' },
    { id: 'training_sessions', label: 'Training Sessions Conducted', type: 'number' },
    { id: 'payroll_activities', label: 'Payroll Activities', type: 'textarea', placeholder: 'Any payroll-related activities' },
    { id: 'hr_concerns', label: 'HR Concerns', type: 'textarea', placeholder: 'Any concerns or escalations' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Administration': [
    { id: 'meetings_coordinated', label: 'Meetings Coordinated', type: 'number' },
    { id: 'approvals_processed', label: 'Approvals Processed', type: 'number', required: true },
    { id: 'documents_reviewed', label: 'Documents Reviewed', type: 'number' },
    { id: 'visitors_handled', label: 'Visitors Handled', type: 'number' },
    { id: 'communications_sent', label: 'Official Communications Sent', type: 'number' },
    { id: 'facility_issues', label: 'Facility Issues', type: 'textarea', placeholder: 'Any facility-related issues' },
    { id: 'pending_tasks', label: 'Pending Administrative Tasks', type: 'textarea' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Data Analysis': [
    { id: 'prices_updated', label: 'Prices Updated Today?', type: 'select', options: ['Yes', 'No'], required: true },
    { id: 'reports_generated', label: 'Reports Generated', type: 'number', required: true },
    { id: 'data_entries_made', label: 'Data Entries Made', type: 'number' },
    { id: 'market_analysis_done', label: 'Market Analysis Completed?', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { id: 'price_trends_observed', label: 'Price Trends Observed', type: 'textarea', placeholder: 'Any significant price movements' },
    { id: 'data_quality_issues', label: 'Data Quality Issues', type: 'textarea', placeholder: 'Any data inconsistencies found' },
    { id: 'insights_shared', label: 'Insights Shared with Team', type: 'textarea' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Field Operations': [
    { id: 'areas_visited', label: 'Areas/Regions Visited', type: 'text', required: true },
    { id: 'farmers_contacted', label: 'Farmers Contacted', type: 'number', required: true },
    { id: 'coffee_mobilized_kg', label: 'Coffee Mobilized (KG)', type: 'number' },
    { id: 'new_suppliers_registered', label: 'New Suppliers Registered', type: 'number' },
    { id: 'advances_given', label: 'Advances Given', type: 'number' },
    { id: 'total_advance_amount', label: 'Total Advance Amount (UGX)', type: 'number' },
    { id: 'field_challenges', label: 'Field Challenges', type: 'textarea', placeholder: 'Any challenges encountered' },
    { id: 'competitor_activity', label: 'Competitor Activity Observed', type: 'textarea' },
    { id: 'farmer_feedback', label: 'Farmer Feedback', type: 'textarea' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  'Operations': [
    { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', required: true },
    { id: 'deliveries_coordinated', label: 'Deliveries Coordinated', type: 'number' },
    { id: 'vehicles_dispatched', label: 'Vehicles Dispatched', type: 'number' },
    { id: 'equipment_maintenance', label: 'Equipment Maintenance Done?', type: 'select', options: ['Yes', 'No', 'Not Required'] },
    { id: 'operational_issues', label: 'Operational Issues', type: 'textarea', placeholder: 'Any operational challenges' },
    { id: 'resource_requirements', label: 'Resource Requirements', type: 'textarea', placeholder: 'Any resources needed' },
    { id: 'safety_incidents', label: 'Safety Incidents', type: 'textarea', placeholder: 'Any safety concerns or incidents' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  
  // Default questions for any department not specifically defined
  'Default': [
    { id: 'tasks_completed', label: 'Tasks Completed Today', type: 'number', required: true },
    { id: 'main_activities', label: 'Main Activities', type: 'textarea', required: true, placeholder: 'Describe your main activities today' },
    { id: 'challenges_faced', label: 'Challenges Faced', type: 'textarea', placeholder: 'Any challenges encountered' },
    { id: 'achievements', label: 'Key Achievements', type: 'textarea', placeholder: 'Notable achievements for the day' },
    { id: 'pending_work', label: 'Pending Work', type: 'textarea', placeholder: 'Work to be continued tomorrow' },
    { id: 'support_needed', label: 'Support Needed', type: 'textarea', placeholder: 'Any support or resources needed' },
    { id: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
};

export const getQuestionsForDepartment = (department: string): ReportQuestion[] => {
  // Check for exact match first
  if (departmentQuestions[department]) {
    return departmentQuestions[department];
  }
  
  // Check for partial matches
  const normalizedDept = department.toLowerCase();
  for (const [key, questions] of Object.entries(departmentQuestions)) {
    if (normalizedDept.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedDept)) {
      return questions;
    }
  }
  
  // Return default questions if no match found
  return departmentQuestions['Default'];
};
