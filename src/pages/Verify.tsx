import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Search, Shield, Clock, User, Building, FileText, Loader2 } from 'lucide-react';

interface Verification {
  id: string;
  code: string;
  type: string;
  subtype: string;
  status: string;
  issued_to_name: string;
  employee_no?: string;
  position?: string;
  department?: string;
  workstation?: string;
  issued_at: string;
  valid_until?: string;
  reference_no?: string;
  meta?: Record<string, unknown>;
}

const Verify = () => {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState(urlCode || '');
  const [verification, setVerification] = useState<Verification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlCode) {
      handleVerify(urlCode);
    }
  }, [urlCode]);

  const handleVerify = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
      // Fetch the verification
      const { data, error: fetchError } = await supabase
        .from('verifications')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (fetchError || !data) {
        setVerification(null);
        setError('No document found with this verification code');
        return;
      }

      setVerification(data as Verification);
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred while verifying the document');
      setVerification(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/verify/${searchCode.trim().toUpperCase()}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-500 text-white text-lg px-4 py-2">
            <CheckCircle className="h-5 w-5 mr-2" />
            VERIFIED
          </Badge>
        );
      case 'revoked':
        return (
          <Badge className="bg-red-500 text-white text-lg px-4 py-2">
            <XCircle className="h-5 w-5 mr-2" />
            REVOKED
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-orange-500 text-white text-lg px-4 py-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            EXPIRED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white text-lg px-4 py-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            {status.toUpperCase()}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
            <img 
              src="/lovable-uploads/great-pearl-coffee-logo.png" 
              alt="Great Pearl Coffee Factory Logo" 
              className="h-16 w-auto mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Document Verification
          </h1>
          <p className="text-green-100">
            Great Pearl Coffee Factory - Official Document Verification Portal
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Verify Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Enter verification code (e.g., GPCF-DOC-2026-XXXXXX)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Verify</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">Verifying document...</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && searched && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-700 mb-2">Verification Failed</h2>
              <p className="text-red-600">{error}</p>
              <p className="text-sm text-gray-500 mt-4">
                Please check the verification code and try again. If you believe this is an error, 
                please contact Great Pearl Coffee Factory.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && verification && (
          <Card className={`border-2 ${verification.status === 'verified' ? 'border-green-500' : 'border-red-500'}`}>
            <CardHeader className={`${verification.status === 'verified' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-center">
                {getStatusBadge(verification.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Document Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Document Type</p>
                      <p className="font-medium capitalize">{verification.type.replace('_', ' ')}</p>
                      {verification.subtype && (
                        <p className="text-sm text-gray-600">{verification.subtype}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Issued Date</p>
                      <p className="font-medium">{formatDate(verification.issued_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Person Info */}
                <div className="border-t pt-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Issued To</p>
                      <p className="font-bold text-lg">{verification.issued_to_name}</p>
                      {verification.employee_no && (
                        <p className="text-sm text-gray-600">Employee No: {verification.employee_no}</p>
                      )}
                      {verification.position && (
                        <p className="text-sm text-gray-600">{verification.position}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department */}
                {verification.department && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{verification.department}</p>
                      {verification.workstation && (
                        <p className="text-sm text-gray-600">Workstation: {verification.workstation}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reference Number */}
                {verification.reference_no && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">Reference Number</p>
                    <p className="font-mono text-sm">{verification.reference_no}</p>
                  </div>
                )}

                {/* Verification Code */}
                <div className="border-t pt-4 bg-gray-50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
                  <p className="text-sm text-gray-500 mb-1">Verification Code</p>
                  <p className="font-mono text-lg font-bold text-green-700">{verification.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-green-100 text-sm">
          <p>Great Pearl Coffee Factory</p>
          <p>+256781121639 / +256778536681</p>
          <p className="mt-2">www.greatpearlcoffee.com</p>
        </div>
      </div>
    </div>
  );
};

export default Verify;
