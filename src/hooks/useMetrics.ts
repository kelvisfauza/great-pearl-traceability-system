
import { useState, useEffect } from "react";

// Mock metrics data since we're using Firebase only
export const useMetrics = () => {
  const [data, setData] = useState([
    { id: '1', label: 'Total Production', value: '2,847 bags', change_percentage: 12.5, trend: 'up', icon: 'Package', color: 'text-blue-600', category: 'production' },
    { id: '2', label: 'Quality Score', value: '94.2%', change_percentage: 2.1, trend: 'up', icon: 'Award', color: 'text-green-600', category: 'quality' },
    { id: '3', label: 'Revenue', value: 'UGX 847M', change_percentage: 8.7, trend: 'up', icon: 'DollarSign', color: 'text-yellow-600', category: 'finance' },
    { id: '4', label: 'Active Suppliers', value: '156', change_percentage: 3.2, trend: 'up', icon: 'Users', color: 'text-purple-600', category: 'suppliers' }
  ]);

  return {
    data,
    error: null,
    isLoading: false
  };
};
