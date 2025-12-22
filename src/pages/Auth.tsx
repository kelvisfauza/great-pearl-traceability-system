
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, Phone, Mail, MessageCircle, Lock } from 'lucide-react';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import BiometricVerification from '@/components/BiometricVerification';
import { supabase } from '@/integrations/supabase/client';
import { smsService } from '@/services/smsService';
import { useToast } from '@/hooks/use-toast';
import { ChristmasOverlay } from '@/components/ChristmasOverlay';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showSystemSelection, setShowSystemSelection] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Check network access (optional - allow login even if check fails for email migration)
      console.log('🌐 Checking network access for:', email);
      const { data: networkCheck, error: networkError } = await supabase.functions.invoke('check-network-access', {
        body: { email }
      });

      // Only block if explicitly denied (not if user not found)
      if (networkCheck && !networkCheck.allowed && networkCheck.reason !== 'User not found') {
        console.log('❌ Network access denied:', networkCheck.reason);
        setError(networkCheck.reason || 'Access denied. You must be connected to the factory network.');
        setLoading(false);
        return;
      }

      if (networkCheck?.allowed) {
        console.log('✅ Network access granted:', networkCheck.reason);
      } else {
        console.log('⚠️ Network check skipped or inconclusive, proceeding with login');
      }

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
        // Regular user or preview environment - show system selection
        console.log('✅ Login complete, showing system selection...');
        setShowSystemSelection(true);
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
    setShowSystemSelection(true);
  };

  const handleBiometricComplete = () => {
    setShowBiometric(false);
    setShowSystemSelection(true);
  };

  const handleSystemSelection = (version: 'v1' | 'v2') => {
    console.log(`✅ User selected ${version.toUpperCase()} system`);
    if (version === 'v2') {
      navigate('/v2');
    } else {
      navigate('/');
    }
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

  // Show system selection screen after successful login
  if (showSystemSelection) {
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
              Welcome to Great Pearl Coffee Factory
            </h1>
            <p className="text-gray-600">
              Please select your system version
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                Choose System Version
              </CardTitle>
              <CardDescription>
                Select which version of the system you want to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => handleSystemSelection('v1')}
                className="w-full h-20 text-lg"
                variant="default"
              >
                Use V1 System
              </Button>
              <Button
                onClick={() => handleSystemSelection('v2')}
                className="w-full h-20 text-lg"
                variant="outline"
              >
                Use V2 System
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  // Check if Christmas period (until Jan 1, 2026)
  const isChristmasPeriod = new Date() < new Date('2026-01-01');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {isChristmasPeriod && <ChristmasOverlay />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          {isChristmasPeriod && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-500 to-green-600 rounded-lg text-white animate-fade-in">
              <p className="text-lg font-bold flex items-center justify-center gap-2">
                🎄 Merry Christmas & Happy New Year! 🎅
              </p>
              <p className="text-sm opacity-90">Wishing you joy & prosperity</p>
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-full shadow-lg relative">
              <img 
                src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
                alt="Great Pearl Coffee Factory" 
                className="h-16 w-16 object-contain"
              />
              {isChristmasPeriod && (
                <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎁</span>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Great Pearl Coffee Factory
          </h1>
          <p className="text-gray-600">
            Coffee Management System
          </p>
        </div>

        <Card className={isChristmasPeriod ? "relative overflow-visible border-2 border-red-200 shadow-lg" : ""}>
          {isChristmasPeriod && (
            <>
              {/* Santa on top right of card */}
              <div className="absolute -top-6 -right-4 text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
                🎅
              </div>
              {/* Holly on top left */}
              <div className="absolute -top-3 -left-3 text-2xl">
                🎄
              </div>
              {/* Candy canes decoration */}
              <div className="absolute top-1/2 -left-4 text-xl transform -translate-y-1/2">
                🍬
              </div>
              <div className="absolute top-1/2 -right-4 text-xl transform -translate-y-1/2">
                🍭
              </div>
            </>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              {isChristmasPeriod && <span>🔔</span>}
              Sign In
              {isChristmasPeriod && <span>🔔</span>}
            </CardTitle>
            <CardDescription>
              {isChristmasPeriod 
                ? "🎁 Ho Ho Ho! Enter your credentials 🎁" 
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  {isChristmasPeriod && <span>⭐</span>}
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isChristmasPeriod ? "🎄 Enter your email..." : "Enter your email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className={`pl-10 ${isChristmasPeriod ? "border-green-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                  />
                  {isChristmasPeriod && (
                    <span className="absolute right-3 top-2.5 text-lg">🎅</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  {isChristmasPeriod && <span>🎁</span>}
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isChristmasPeriod ? "🔐 Your secret gift code..." : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={`pl-10 ${isChristmasPeriod ? "border-red-300 focus:border-green-400 focus:ring-green-200" : ""}`}
                  />
                  {isChristmasPeriod && (
                    <span className="absolute right-3 top-2.5 text-lg">🎄</span>
                  )}
                </div>
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
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
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
                New employees: Your account will be created by the administrator. Contact IT Support for login issues.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <PasswordChangeModal
        open={showPasswordChange}
        onPasswordChanged={handlePasswordChangeComplete}
      />
    </div>
  );
};

export default Auth;
