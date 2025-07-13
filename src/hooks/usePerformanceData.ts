
import { useState, useEffect } from "react";

// Mock performance data since we're using Firebase only
export const usePerformanceData = () => {
  const [data, setData] = useState([
    { id: '1', category: 'Production', value: 2847, target: 3000, percentage: 94.9, trend: 'up', change_percentage: '+5.2%', month: 'current' },
    { id: '2', category: 'Quality', value: 94.2, target: 95, percentage: 99.2, trend: 'up', change_percentage: '+1.8%', month: 'current' },
    { id: '3', category: 'Sales', value: 847, target: 900, percentage: 94.1, trend: 'up', change_percentage: '+8.3%', month: 'current' },
    { id: '4', category: 'Efficiency', value: 87.3, target: 90, percentage: 97.0, trend: 'down', change_percentage: '-2.1%', month: 'current' }
  ]);

  return {
    data,
    error: null,
    isLoading: false
  };
};
