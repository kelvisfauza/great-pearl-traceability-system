import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import ModernDashboard from '@/components/ModernDashboard';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';

const Index = () => {
  const { employee } = useAuth();
  const roleData = useRoleBasedData();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <div className="animate-scale-in">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title, subtitle, gradient }: { 
    icon: any, 
    title: string, 
    subtitle: string, 
    gradient: string 
  }) => (
    <div className="flex items-center gap-4 mb-6 md:mb-8 animate-slide-up">
      <div className={`p-3 rounded-2xl bg-gradient-to-r ${gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient.replace('to-', 'to-').replace('from-', 'from-')} bg-clip-text text-transparent`}>
          {title}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <ModernDashboard />
    </Layout>
  );
};

export default Index;