// Department-specific questions for daily reports

export interface ReportQuestion {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select' | 'checkbox' | 'multiselect';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface DepartmentQuestions {
  department: string;
  questions: ReportQuestion[];
}

// Common questions that apply to all departments
export const commonQuestions: ReportQuestion[] = [
  { id: 'work_hours', label: 'Hours Worked Today', type: 'number', required: true, placeholder: 'e.g., 8' },
  { id: 'arrived_on_time', label: 'Did you arrive on time?', type: 'select', options: ['Yes', 'No', 'Slightly Late (< 15 mins)'], required: true },
  { id: 'main_tasks_summary', label: 'Summary of Main Tasks Completed', type: 'textarea', required: true, placeholder: 'Briefly describe the main tasks you completed today' },
  { 
    id: 'work_challenges', 
    label: 'Challenges Faced at Work (Select all that apply)', 
    type: 'multiselect', 
    options: [
      'Heavy workload',
      'Lack of resources/tools',
      'Communication issues',
      'Technical difficulties',
      'Time constraints',
      'Unclear instructions',
      'Team coordination issues',
      'Customer/supplier issues',
      'System downtime',
      'Transportation issues',
      'Personal matters',
      'No challenges'
    ]
  },
  { id: 'challenges_description', label: 'Describe Challenges in Detail (if any)', type: 'textarea', placeholder: 'Provide more details about challenges faced' },
  { 
    id: 'support_needed', 
    label: 'Support/Resources Needed (Select all that apply)', 
    type: 'multiselect', 
    options: [
      'Additional training',
      'More staff support',
      'Better equipment',
      'Clearer guidelines',
      'Management guidance',
      'IT support',
      'Budget allocation',
      'Transportation',
      'No support needed'
    ]
  },
  { id: 'support_details', label: 'Details on Support Needed', type: 'textarea', placeholder: 'Explain what support would help you' },
  { 
    id: 'mood_rating', 
    label: 'How would you rate your workday?', 
    type: 'select', 
    options: ['Excellent', 'Good', 'Average', 'Challenging', 'Difficult'],
    required: true
  },
  { id: 'recommendations', label: 'Recommendations for Improvement', type: 'textarea', placeholder: 'Any suggestions to improve work processes, efficiency, or team performance' },
  { id: 'tomorrow_priorities', label: 'Planned Priorities for Tomorrow', type: 'textarea', placeholder: 'What are your key tasks for tomorrow?' },
];

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
    { 
      id: 'quality_issues_checklist', 
      label: 'Quality Issues Observed (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'High moisture content',
        'Excessive defects',
        'Foreign matter',
        'Inconsistent quality',
        'Poor sorting',
        'Mold/fungus',
        'Insect damage',
        'Mixed coffee types',
        'No issues observed'
      ]
    },
    { id: 'quality_issues_details', label: 'Quality Issues Details', type: 'textarea', placeholder: 'Describe any quality issues observed today' },
    { id: 'equipment_calibration', label: 'Equipment Calibrated Today?', type: 'select', options: ['Yes', 'No', 'Not Required'] },
    ...commonQuestions,
  ],
  
  'Store': [
    { id: 'total_coffee_received_kg', label: 'Total Coffee Received (KG)', type: 'number', required: true },
    { id: 'total_bags_received', label: 'Total Bags Received', type: 'number', required: true },
    { id: 'suppliers_served', label: 'Number of Suppliers Served', type: 'number', required: true },
    { id: 'coffee_dispatched_kg', label: 'Coffee Dispatched (KG)', type: 'number' },
    { id: 'bags_dispatched', label: 'Bags Dispatched', type: 'number' },
    { id: 'storage_location_updates', label: 'Storage Location Updates', type: 'textarea', placeholder: 'Any changes to storage locations' },
    { 
      id: 'store_issues_checklist', 
      label: 'Store Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Storage space shortage',
        'Inventory discrepancy',
        'Damaged bags',
        'Pest issues',
        'Equipment breakdown',
        'Documentation errors',
        'Delays in receiving',
        'Security concerns',
        'No issues'
      ]
    },
    { id: 'inventory_issues_details', label: 'Inventory Issues Details', type: 'textarea', placeholder: 'Any discrepancies or issues' },
    { id: 'equipment_status', label: 'Equipment Status', type: 'select', options: ['All Operational', 'Minor Issues', 'Major Issues', 'Needs Maintenance'] },
    { id: 'stock_count_done', label: 'Stock Count Completed?', type: 'select', options: ['Yes - Full Count', 'Yes - Partial Count', 'No'] },
    ...commonQuestions,
  ],
  
  'Finance': [
    { id: 'payments_processed', label: 'Number of Payments Processed', type: 'number', required: true },
    { id: 'total_amount_paid', label: 'Total Amount Paid (UGX)', type: 'number', required: true },
    { id: 'supplier_payments', label: 'Supplier Payments Made', type: 'number' },
    { id: 'expense_approvals', label: 'Expense Approvals Processed', type: 'number' },
    { id: 'cash_balance_status', label: 'Cash Balance Status', type: 'select', options: ['Adequate', 'Low', 'Critical', 'Needs Top-up'] },
    { id: 'pending_approvals', label: 'Pending Approvals Count', type: 'number' },
    { id: 'reconciliation_done', label: 'Daily Reconciliation Completed?', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { 
      id: 'finance_issues_checklist', 
      label: 'Finance Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Cash shortage',
        'Discrepancies in records',
        'Delayed payments',
        'Missing documentation',
        'System issues',
        'Bank delays',
        'Supplier complaints',
        'Budget overruns',
        'No issues'
      ]
    },
    { id: 'discrepancies', label: 'Discrepancies Found Details', type: 'textarea', placeholder: 'Any financial discrepancies' },
    { id: 'urgent_payments_pending', label: 'Urgent Payments Pending', type: 'textarea', placeholder: 'List any urgent payments needed' },
    ...commonQuestions,
  ],
  
  'Sales': [
    { id: 'customers_contacted', label: 'Customers Contacted', type: 'number', required: true },
    { id: 'new_inquiries', label: 'New Inquiries Received', type: 'number' },
    { id: 'sales_made', label: 'Number of Sales Made', type: 'number', required: true },
    { id: 'total_kg_sold', label: 'Total KG Sold', type: 'number' },
    { id: 'total_sales_value', label: 'Total Sales Value (UGX)', type: 'number' },
    { id: 'quotations_sent', label: 'Quotations Sent', type: 'number' },
    { id: 'follow_ups_done', label: 'Follow-ups Completed', type: 'number' },
    { 
      id: 'sales_activities_checklist', 
      label: 'Sales Activities Done (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Cold calls',
        'Follow-up calls',
        'Customer meetings',
        'Sample dispatches',
        'Contract negotiations',
        'Price discussions',
        'Quality presentations',
        'Documentation',
        'Market research'
      ]
    },
    { 
      id: 'sales_challenges_checklist', 
      label: 'Sales Challenges (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Price objections',
        'Competition pressure',
        'Stock availability',
        'Quality concerns from buyers',
        'Payment term disputes',
        'Logistics issues',
        'Customer unavailability',
        'No challenges'
      ]
    },
    { id: 'customer_feedback', label: 'Customer Feedback', type: 'textarea', placeholder: 'Any feedback from customers' },
    { id: 'market_insights', label: 'Market Insights', type: 'textarea', placeholder: 'Any market observations' },
    { id: 'hot_leads', label: 'Hot Leads / Promising Opportunities', type: 'textarea', placeholder: 'List any promising sales opportunities' },
    ...commonQuestions,
  ],
  
  'Human Resources': [
    { id: 'attendance_marked', label: 'Attendance Records Marked', type: 'number', required: true },
    { id: 'leave_requests_processed', label: 'Leave Requests Processed', type: 'number' },
    { id: 'new_employees_onboarded', label: 'New Employees Onboarded', type: 'number' },
    { id: 'employee_issues_resolved', label: 'Employee Issues Resolved', type: 'number' },
    { id: 'training_sessions', label: 'Training Sessions Conducted', type: 'number' },
    { 
      id: 'hr_activities_checklist', 
      label: 'HR Activities Done (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Attendance management',
        'Leave processing',
        'Employee counseling',
        'Performance reviews',
        'Recruitment activities',
        'Policy updates',
        'Payroll processing',
        'Training coordination',
        'Documentation'
      ]
    },
    { 
      id: 'hr_issues_checklist', 
      label: 'HR Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Attendance issues',
        'Employee conflicts',
        'Policy violations',
        'Compensation disputes',
        'Training gaps',
        'Staffing shortages',
        'Performance issues',
        'No issues'
      ]
    },
    { id: 'payroll_activities', label: 'Payroll Activities', type: 'textarea', placeholder: 'Any payroll-related activities' },
    { id: 'hr_concerns', label: 'HR Concerns Details', type: 'textarea', placeholder: 'Any concerns or escalations' },
    ...commonQuestions,
  ],
  
  'Administration': [
    { id: 'meetings_coordinated', label: 'Meetings Coordinated', type: 'number' },
    { id: 'approvals_processed', label: 'Approvals Processed', type: 'number', required: true },
    { id: 'documents_reviewed', label: 'Documents Reviewed', type: 'number' },
    { id: 'visitors_handled', label: 'Visitors Handled', type: 'number' },
    { id: 'communications_sent', label: 'Official Communications Sent', type: 'number' },
    { 
      id: 'admin_activities_checklist', 
      label: 'Administrative Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Meeting coordination',
        'Document management',
        'Visitor reception',
        'Communication handling',
        'Office supplies management',
        'Facility coordination',
        'Travel arrangements',
        'Event planning',
        'Filing and archiving'
      ]
    },
    { 
      id: 'admin_issues_checklist', 
      label: 'Administrative Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Office supply shortage',
        'Facility maintenance needed',
        'Communication delays',
        'Scheduling conflicts',
        'Document backlogs',
        'Visitor management issues',
        'No issues'
      ]
    },
    { id: 'facility_issues', label: 'Facility Issues Details', type: 'textarea', placeholder: 'Any facility-related issues' },
    { id: 'pending_tasks', label: 'Pending Administrative Tasks', type: 'textarea' },
    ...commonQuestions,
  ],
  
  'Data Analysis': [
    { id: 'prices_updated', label: 'Prices Updated Today?', type: 'select', options: ['Yes', 'No'], required: true },
    { id: 'reports_generated', label: 'Reports Generated', type: 'number', required: true },
    { id: 'data_entries_made', label: 'Data Entries Made', type: 'number' },
    { id: 'market_analysis_done', label: 'Market Analysis Completed?', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { 
      id: 'analysis_activities_checklist', 
      label: 'Analysis Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Price updates',
        'Market report creation',
        'Data entry',
        'Trend analysis',
        'Competitor analysis',
        'Performance metrics',
        'Dashboard updates',
        'Data validation',
        'System maintenance'
      ]
    },
    { id: 'price_trends_observed', label: 'Price Trends Observed', type: 'textarea', placeholder: 'Any significant price movements' },
    { id: 'market_summary', label: 'Market Summary', type: 'textarea', placeholder: 'Brief summary of market conditions today' },
    { 
      id: 'data_issues_checklist', 
      label: 'Data Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Data inconsistencies',
        'Missing data',
        'System errors',
        'Delayed updates',
        'Source reliability issues',
        'Calculation errors',
        'No issues'
      ]
    },
    { id: 'data_quality_issues', label: 'Data Quality Issues Details', type: 'textarea', placeholder: 'Any data inconsistencies found' },
    { id: 'insights_shared', label: 'Key Insights Shared with Team', type: 'textarea' },
    ...commonQuestions,
  ],
  
  'Field Operations': [
    { id: 'areas_visited', label: 'Areas/Regions Visited', type: 'text', required: true },
    { id: 'farmers_contacted', label: 'Farmers Contacted', type: 'number', required: true },
    { id: 'coffee_mobilized_kg', label: 'Coffee Mobilized (KG)', type: 'number' },
    { id: 'new_suppliers_registered', label: 'New Suppliers Registered', type: 'number' },
    { id: 'advances_given', label: 'Number of Advances Given', type: 'number' },
    { id: 'total_advance_amount', label: 'Total Advance Amount (UGX)', type: 'number' },
    { 
      id: 'field_activities_checklist', 
      label: 'Field Activities Done (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Farmer visits',
        'Coffee collection',
        'Price negotiations',
        'Supplier registration',
        'Advance disbursement',
        'Quality checks',
        'Market scouting',
        'Competitor monitoring',
        'Relationship building',
        'Documentation'
      ]
    },
    { 
      id: 'field_challenges_checklist', 
      label: 'Field Challenges (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Poor road conditions',
        'Fuel shortage',
        'Vehicle breakdown',
        'Competition from other buyers',
        'Low coffee availability',
        'High farmer price expectations',
        'Quality issues',
        'Weather conditions',
        'Security concerns',
        'No challenges'
      ]
    },
    { id: 'field_challenges_details', label: 'Field Challenges Details', type: 'textarea', placeholder: 'Any challenges encountered' },
    { id: 'competitor_activity', label: 'Competitor Activity Observed', type: 'textarea' },
    { id: 'farmer_feedback', label: 'Farmer Feedback', type: 'textarea' },
    { id: 'coffee_quality_assessment', label: 'General Coffee Quality in Field', type: 'select', options: ['Excellent', 'Good', 'Average', 'Below Average', 'Poor'] },
    ...commonQuestions,
  ],
  
  'Operations': [
    { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', required: true },
    { id: 'deliveries_coordinated', label: 'Deliveries Coordinated', type: 'number' },
    { id: 'vehicles_dispatched', label: 'Vehicles Dispatched', type: 'number' },
    { id: 'equipment_maintenance', label: 'Equipment Maintenance Done?', type: 'select', options: ['Yes', 'No', 'Not Required'] },
    { 
      id: 'operations_activities_checklist', 
      label: 'Operations Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Vehicle dispatch',
        'Delivery coordination',
        'Equipment maintenance',
        'Staff coordination',
        'Safety checks',
        'Inventory movement',
        'Loading/unloading',
        'Route planning',
        'Documentation'
      ]
    },
    { 
      id: 'operations_issues_checklist', 
      label: 'Operations Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Vehicle breakdown',
        'Fuel shortage',
        'Staff shortage',
        'Equipment failure',
        'Delivery delays',
        'Safety incidents',
        'Coordination problems',
        'No issues'
      ]
    },
    { id: 'operational_issues_details', label: 'Operational Issues Details', type: 'textarea', placeholder: 'Any operational challenges' },
    { id: 'resource_requirements', label: 'Resource Requirements', type: 'textarea', placeholder: 'Any resources needed' },
    { id: 'safety_incidents', label: 'Safety Incidents', type: 'textarea', placeholder: 'Any safety concerns or incidents' },
    ...commonQuestions,
  ],
  
  'EUDR Documentation': [
    { id: 'documents_processed', label: 'Documents Processed Today', type: 'number', required: true },
    { id: 'batches_documented', label: 'Batches Documented', type: 'number', required: true },
    { id: 'receipts_collected', label: 'Receipts Collected', type: 'number' },
    { id: 'farmers_documented', label: 'Farmers Documented', type: 'number' },
    { id: 'gps_coordinates_captured', label: 'GPS Coordinates Captured', type: 'number' },
    { id: 'compliance_checks_done', label: 'Compliance Checks Completed', type: 'number' },
    { id: 'traceability_updates', label: 'Traceability Records Updated', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { 
      id: 'eudr_activities_checklist', 
      label: 'EUDR Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Batch documentation',
        'Receipt collection',
        'Farmer registration',
        'GPS capture',
        'Compliance verification',
        'Traceability updates',
        'Field verification',
        'Data entry',
        'Report generation'
      ]
    },
    { 
      id: 'eudr_issues_checklist', 
      label: 'Documentation Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Missing farmer data',
        'GPS accuracy issues',
        'Incomplete receipts',
        'Verification failures',
        'System errors',
        'Data inconsistencies',
        'Backlog buildup',
        'No issues'
      ]
    },
    { id: 'documentation_issues_details', label: 'Documentation Issues Details', type: 'textarea', placeholder: 'Any issues with documentation or compliance' },
    { id: 'pending_documentation', label: 'Pending Documentation', type: 'textarea', placeholder: 'Documents pending completion' },
    { id: 'farmer_verification', label: 'Farmer Verifications Done', type: 'number' },
    { id: 'field_visits', label: 'Field Visits for Documentation', type: 'number' },
    ...commonQuestions,
  ],
  
  'Support Staff': [
    { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', required: true },
    { 
      id: 'support_activities_checklist', 
      label: 'Support Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Office cleaning',
        'Compound maintenance',
        'Errand running',
        'Supply management',
        'Visitor assistance',
        'Tea/refreshment service',
        'Document delivery',
        'Equipment setup',
        'General assistance'
      ]
    },
    { id: 'office_maintenance', label: 'Office Maintenance Tasks', type: 'textarea', placeholder: 'Cleaning, organization, etc.' },
    { id: 'errands_run', label: 'Errands Completed', type: 'number' },
    { id: 'supplies_managed', label: 'Supplies/Materials Managed', type: 'textarea' },
    { id: 'visitors_assisted', label: 'Visitors Assisted', type: 'number' },
    { 
      id: 'support_issues_checklist', 
      label: 'Issues Encountered (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Cleaning supplies shortage',
        'Equipment not working',
        'Heavy workload',
        'Unclear instructions',
        'Safety hazards',
        'No issues'
      ]
    },
    { id: 'issues_reported', label: 'Issues Reported Details', type: 'textarea', placeholder: 'Any facility or equipment issues' },
    ...commonQuestions,
  ],
  
  'IT': [
    { id: 'issues_resolved', label: 'IT Issues Resolved', type: 'number', required: true },
    { id: 'tickets_handled', label: 'Support Tickets Handled', type: 'number' },
    { id: 'system_maintenance', label: 'System Maintenance Done?', type: 'select', options: ['Yes', 'No', 'Not Required'] },
    { id: 'backups_completed', label: 'Backups Completed?', type: 'select', options: ['Yes', 'No', 'Not Required'] },
    { id: 'software_updates', label: 'Software Updates Applied', type: 'number' },
    { 
      id: 'it_activities_checklist', 
      label: 'IT Activities (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'User support',
        'System maintenance',
        'Software updates',
        'Network monitoring',
        'Backup management',
        'Security checks',
        'Hardware repairs',
        'New installations',
        'Documentation',
        'Training users'
      ]
    },
    { 
      id: 'it_issues_checklist', 
      label: 'IT Issues (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Network problems',
        'Server issues',
        'Software bugs',
        'Hardware failures',
        'Security threats',
        'User access issues',
        'Data issues',
        'Performance problems',
        'No issues'
      ]
    },
    { id: 'network_issues', label: 'Network Issues Details', type: 'textarea', placeholder: 'Any network or connectivity issues' },
    { id: 'security_checks', label: 'Security Checks Done?', type: 'select', options: ['Yes', 'No', 'Partially'] },
    { id: 'user_support', label: 'Users Supported', type: 'number' },
    { id: 'pending_issues', label: 'Pending IT Issues', type: 'textarea', placeholder: 'Issues to be resolved tomorrow' },
    { id: 'system_improvements', label: 'System Improvement Suggestions', type: 'textarea', placeholder: 'Any suggestions for system improvements' },
    ...commonQuestions,
  ],
  
  // Default questions for any department not specifically defined
  'Default': [
    { id: 'tasks_completed', label: 'Tasks Completed Today', type: 'number', required: true },
    { id: 'main_activities', label: 'Main Activities', type: 'textarea', required: true, placeholder: 'Describe your main activities today' },
    { 
      id: 'activities_checklist', 
      label: 'Activities Done (Select all that apply)', 
      type: 'multiselect', 
      options: [
        'Routine tasks',
        'Special assignments',
        'Meetings attended',
        'Documentation',
        'Customer/supplier interaction',
        'Team collaboration',
        'Learning/training',
        'Problem solving'
      ]
    },
    ...commonQuestions,
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

// Monthly report questions (end of month summary)
export const monthlyReportQuestions: ReportQuestion[] = [
  { 
    id: 'monthly_overall_performance', 
    label: 'How would you rate your overall performance this month?', 
    type: 'select', 
    options: ['Excellent', 'Good', 'Average', 'Below Average', 'Needs Improvement'],
    required: true 
  },
  { 
    id: 'monthly_goals_achieved', 
    label: 'Goals/Targets Achieved This Month', 
    type: 'textarea', 
    required: true,
    placeholder: 'List the main goals or targets you achieved this month'
  },
  { 
    id: 'monthly_goals_missed', 
    label: 'Goals/Targets Not Achieved & Reasons', 
    type: 'textarea', 
    placeholder: 'List any goals you did not achieve and explain why'
  },
  { 
    id: 'monthly_key_accomplishments', 
    label: 'Key Accomplishments This Month', 
    type: 'textarea', 
    required: true,
    placeholder: 'What are you most proud of this month?'
  },
  { 
    id: 'monthly_challenges', 
    label: 'Major Challenges Faced This Month (Select all that apply)', 
    type: 'multiselect', 
    options: [
      'Heavy workload',
      'Resource constraints',
      'Team coordination issues',
      'Technical problems',
      'External factors (suppliers/customers)',
      'Process inefficiencies',
      'Training gaps',
      'Communication barriers',
      'Time management',
      'Personal challenges',
      'No major challenges'
    ]
  },
  { 
    id: 'monthly_challenges_details', 
    label: 'Details on Monthly Challenges', 
    type: 'textarea', 
    placeholder: 'Provide more details about the challenges you faced'
  },
  { 
    id: 'monthly_lessons_learned', 
    label: 'Key Lessons Learned This Month', 
    type: 'textarea', 
    placeholder: 'What important lessons did you learn?'
  },
  { 
    id: 'monthly_skills_developed', 
    label: 'Skills Developed or Improved', 
    type: 'textarea', 
    placeholder: 'What new skills did you gain or improve?'
  },
  { 
    id: 'monthly_collaboration', 
    label: 'Team Collaboration Rating', 
    type: 'select', 
    options: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
    required: true
  },
  { 
    id: 'monthly_support_received', 
    label: 'Was the support from management adequate?', 
    type: 'select', 
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied', 'Very Unsatisfied'],
    required: true
  },
  { 
    id: 'monthly_recommendations', 
    label: 'Recommendations for Next Month', 
    type: 'textarea', 
    placeholder: 'Suggestions to improve processes, efficiency, or team performance'
  },
  { 
    id: 'monthly_next_goals', 
    label: 'Goals/Priorities for Next Month', 
    type: 'textarea', 
    required: true,
    placeholder: 'What are your main goals for the coming month?'
  },
  { 
    id: 'monthly_training_needs', 
    label: 'Training or Development Needs', 
    type: 'textarea', 
    placeholder: 'Any training or development you need for next month?'
  },
  { 
    id: 'monthly_overall_satisfaction', 
    label: 'Overall Job Satisfaction This Month', 
    type: 'select', 
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied', 'Very Unsatisfied'],
    required: true
  },
  { 
    id: 'monthly_additional_comments', 
    label: 'Additional Comments or Feedback', 
    type: 'textarea', 
    placeholder: 'Any other feedback you would like to share'
  },
];
