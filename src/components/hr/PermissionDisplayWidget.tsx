import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, CheckCircle, AlertCircle, Zap } from 'lucide-react';

export const PermissionDisplayWidget = () => {
  const { employee } = useAuth();

  if (!employee) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrator':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'Manager':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'Supervisor':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Supervisor':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissionColor = (permission: string) => {
    const colors = [
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-cyan-100 text-cyan-800',
      'bg-teal-100 text-teal-800',
      'bg-emerald-100 text-emerald-800',
      'bg-yellow-100 text-yellow-800',
      'bg-orange-100 text-orange-800',
      'bg-rose-100 text-rose-800'
    ];
    return colors[Math.abs(permission.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-yellow-500" />
          Your Access Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Display */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Current Role</label>
          <Badge 
            variant="outline" 
            className={`px-3 py-1.5 ${getRoleColor(employee.role)} flex items-center gap-2 w-fit`}
          >
            {getRoleIcon(employee.role)}
            {employee.role}
          </Badge>
        </div>

        {/* Permissions Display */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Active Permissions ({employee.permissions?.length || 0})
          </label>
          <div className="flex flex-wrap gap-2">
            {employee.permissions?.map((permission) => (
              <Badge 
                key={permission}
                variant="outline"
                className={`text-xs px-2 py-1 ${getPermissionColor(permission)}`}
              >
                {permission === '*' ? 'Full Access' : permission}
              </Badge>
            )) || (
              <Badge variant="outline" className="text-gray-500">
                No permissions assigned
              </Badge>
            )}
          </div>
        </div>

        {/* Department & Position */}
        <div className="pt-2 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Department:</span>
              <p className="text-gray-600">{employee.department}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Position:</span>
              <p className="text-gray-600">{employee.position}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};