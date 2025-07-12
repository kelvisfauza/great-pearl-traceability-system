
import React from 'react';
import Layout from '@/components/Layout';
import DataAnalystDashboard from '@/components/DataAnalystDashboard';

const DataAnalyst = () => {
  return (
    <Layout 
      title="Data Analyst" 
      subtitle="Market analysis, pricing advisory, and business intelligence"
    >
      <DataAnalystDashboard />
    </Layout>
  );
};

export default DataAnalyst;
