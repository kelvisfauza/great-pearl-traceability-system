import React from 'react';
import Layout from '@/components/Layout';
import UserPermissionsList from '@/components/admin/UserPermissionsList';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const PermissionManagement = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout title="Permission Management" subtitle="Manage user roles and permissions">
      <div className="space-y-6">
        <UserPermissionsList />
      </div>
    </Layout>
  );
};

export default PermissionManagement;