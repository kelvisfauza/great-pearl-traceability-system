
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, Phone, Mail, MessageCircle } from 'lucide-react';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import BiometricVerification from '@/components/BiometricVerification';
import { NetworkDetector } from '@/components/NetworkDetector';
import { supabase } from '@/integrations/supabase/client';
import { smsService } from '@/services/smsService';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Check for auto-login token
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginToken = urlParams.get('login_token');
    
    // Handle direct auto-login via token
    if (loginToken) {
      handleAutoLogin(loginToken);
      return;
    }
  }, []);

  const handleAutoLogin = async (token: string) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔐 Attempting auto-login with token...');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Call the auto-login edge function
      const { data, error } = await supabase.functions.invoke('auto-login', {
        body: { token }
      });

      if (error) {
        console.error('Auto-login error:', error);
        setError('Auto-login failed. Please try logging in manually.');
        setLoading(false);
        return;
      }

      if (data.success && data.auth_url) {
        console.log('✅ Auto-login successful, redirecting...');
        // Use the magic link to authenticate
        window.location.href = data.auth_url;
      } else {
        console.error('Auto-login failed:', data.message);
        setError(data.message || 'Auto-login failed. Please try logging in manually.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Auto-login error:', err);
      setError('An error occurred during auto-login. Please try logging in manually.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, check network access
      console.log('🌐 Checking network access for:', email);
      const { data: networkCheck, error: networkError } = await supabase.functions.invoke('check-network-access', {
        body: { email }
      });

      if (networkError) {
        console.error('Network check error:', networkError);
        setError('Failed to verify network access. Please try again.');
        setLoading(false);
        return;
      }

      if (!networkCheck.allowed) {
        console.log('❌ Network access denied:', networkCheck.reason);
        setError(networkCheck.reason || 'Access denied. You must be connected to the factory network.');
        setLoading(false);
        return;
      }

      console.log('✅ Network access granted:', networkCheck.reason);

      // Proceed with authentication
      console.log('🔐 Attempting login for:', email);
      const result = await signIn(email, password);
      console.log('✅ Login successful:', result);
      
      // Check if user has temporary password or requires password change
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User data retrieved:', user?.email);
      const requiresPasswordChange = result.requiresPasswordChange || 
                                    user?.user_metadata?.requires_password_change === true;
      
      if (requiresPasswordChange) {
        console.log('🔐 User requires password change');
        setShowPasswordChange(true);
        setLoading(false);
        return;
      }

      // Check if user is admin - only admins need biometric verification
      console.log('🔍 Checking employee role...');
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('role, email')
        .eq('email', email)
        .maybeSingle();

      if (employeeError) {
        console.error('❌ Error fetching employee data:', employeeError);
      }
      console.log('👔 Employee data:', employee);

      // Bypass biometric in preview/development environments
      const isPreviewOrDev = window.location.hostname.includes('lovable') || 
                              window.location.hostname === 'localhost';

      if (employee?.role === 'Administrator' && !isPreviewOrDev) {
        // Admin user in production - require biometric verification
        console.log('🔒 Admin detected, requiring biometric verification');
        setShowBiometric(true);
        setLoading(false);
      } else {
        // Regular user or preview environment - no biometric verification
        console.log('✅ Login complete, redirecting to home...');
        navigate('/');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the verification link before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handlePasswordChangeComplete = () => {
    setShowPasswordChange(false);
    navigate('/');
  };

  const handleBiometricComplete = () => {
    setShowBiometric(false);
    navigate('/');
  };

  const handleBiometricCancel = () => {
    setShowBiometric(false);
    setLoading(false);
  };

  // Show biometric verification screen for admins
  if (showBiometric) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
        <BiometricVerification
          email={email}
          onVerificationComplete={handleBiometricComplete}
          onCancel={handleBiometricCancel}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <img 
                src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
                alt="Great Pearl Coffee Factory" 
                className="h-16 w-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Great Pearl Coffee Factory
          </h1>
          <p className="text-gray-600">
            Coffee Management System
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {loading && !error && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    {window.location.search.includes('login_token') 
                      ? 'Processing automatic login...' 
                      : 'Signing you in...'}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {window.location.search.includes('login_token') ? 'Auto-logging in...' : 'Signing in...'}
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* IT Support Contact */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Having Login Issues?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Contact IT Department for technical support:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>IT Support: +256773318456</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-blue-600" />
                <span>it.support@greatpearlcoffee.com</span>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                New employees: Contact HR for account creation. Existing users with login issues: Contact IT Support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Network Detection */}
        <div className="mt-4">
          <NetworkDetector />
        </div>
      </div>

      <PasswordChangeModal
        open={showPasswordChange}
        onPasswordChanged={handlePasswordChangeComplete}
      />
    </div>
  );
};

export default Auth;
