import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, Building2, Briefcase, Phone, Mail, Calendar, ShieldCheck, Loader2,
  KeyRound, ArrowLeft, Copy, Check,
} from 'lucide-react';

type View = 'menu' | 'identity' | 'code';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('menu');
  const [codeData, setCodeData] = useState<any>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) {
        setError('No employee ID provided');
        setLoading(false);
        return;
      }

      try {
        // Public RPC — works without authentication (QR scan destination).
        const { data, error: err } = await supabase
          .rpc('get_public_employee_profile' as any, { _lookup: id });

        if (err) throw err;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setError('Employee not found');
        } else {
          setEmployee({
            name: row.emp_name,
            position: row.emp_position,
            department: row.emp_department,
            employee_id: row.emp_employee_id,
            phone: row.emp_phone,
            email: row.emp_email,
            join_date: row.emp_join_date,
            status: row.emp_status,
            avatar_url: row.emp_avatar_url,
          });
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const fetchLatestCode = async () => {
    if (!id) return;
    setCodeLoading(true);
    setCodeError(null);
    setCodeData(null);
    try {
      const { data, error: err } = await supabase
        .rpc('get_latest_login_code' as any, { _lookup: id });
      if (err) throw err;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setCodeError('No active login code found. Trigger a new login from this device or check your email inbox.');
      } else {
        setCodeData(row);
      }
    } catch (e: any) {
      setCodeError(e.message || 'Failed to fetch login code');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!codeData?.code) return;
    try {
      await navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Employee Not Found</h2>
            <p className="text-gray-500">{error || 'The scanned QR code does not match any employee record.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ MENU VIEW (landing after QR scan) ============
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-6 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg overflow-hidden">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-green-600" />
              )}
            </div>
            <h1 className="text-xl font-bold">{employee.name}</h1>
            <p className="text-green-100 text-xs mt-1">{employee.position}</p>
          </div>
          <CardContent className="p-6 space-y-3">
            <p className="text-center text-sm text-gray-500 mb-2">What would you like to do?</p>
            <Button
              onClick={() => setView('identity')}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-base"
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Verify Identity
            </Button>
            <Button
              onClick={() => { setView('code'); fetchLatestCode(); }}
              variant="outline"
              className="w-full h-14 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-base"
            >
              <KeyRound className="w-5 h-5 mr-2" />
              Login Code
            </Button>
            <p className="text-[10px] text-gray-300 text-center pt-2">
              Great Pearl Coffee Factory Ltd
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ CODE VIEW ============
  if (view === 'code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white">
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-1 text-emerald-100 hover:text-white text-sm mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <KeyRound className="w-8 h-8" />
              <div>
                <h1 className="text-lg font-bold">Latest Login Code</h1>
                <p className="text-emerald-100 text-xs">{employee.name}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {codeLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            )}

            {!codeLoading && codeError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-800">{codeError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLatestCode}
                  className="mt-3"
                >
                  Try again
                </Button>
              </div>
            )}

            {!codeLoading && codeData && (
              <>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                  <p className="text-xs uppercase tracking-widest text-emerald-700 mb-2">Your Code</p>
                  <p className="text-5xl font-bold font-mono text-emerald-900 tracking-[0.3em]">
                    {codeData.code}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-3">
                    Sent to {codeData.recipient_email}
                  </p>
                </div>

                <Button
                  onClick={handleCopy}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy Code</>
                  )}
                </Button>

                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                  <p>Issued: {new Date(codeData.created_at).toLocaleString()}</p>
                  <p>Expires: {new Date(codeData.expires_at).toLocaleString()}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ IDENTITY VIEW (full profile card) ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-6 text-white text-center relative">
          <button
            onClick={() => setView('menu')}
            className="absolute top-3 left-3 flex items-center gap-1 text-green-100 hover:text-white text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="absolute top-3 right-3">
            <ShieldCheck className="w-6 h-6 text-green-200" />
          </div>
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg overflow-hidden">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-green-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-green-100 text-sm mt-1">{employee.position}</p>
          <Badge className={`mt-2 ${employee.status === 'Active' ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
            {employee.status || 'Active'}
          </Badge>
        </div>

        {/* Details */}
        <CardContent className="p-6 space-y-4">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Great Pearl Coffee Factory Ltd</p>
            <p className="text-xs text-gray-400">Verified Employee</p>
          </div>

          <div className="space-y-3">
            {employee.employee_id && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Employee ID</p>
                  <p className="font-semibold text-gray-800">{employee.employee_id}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Department</p>
                <p className="font-semibold text-gray-800">{employee.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Position</p>
                <p className="font-semibold text-gray-800">{employee.position}</p>
              </div>
            </div>

            {employee.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-800">{employee.phone}</p>
                </div>
              </div>
            )}

            {employee.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-semibold text-gray-800">{employee.email}</p>
                </div>
              </div>
            )}

            {employee.join_date && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Member Since</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(employee.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-[10px] text-gray-300">
              This profile was verified via QR scan. For any inquiries contact HR.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfile;
