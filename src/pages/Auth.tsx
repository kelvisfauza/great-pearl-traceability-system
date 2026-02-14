
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
import { NewYearTransition } from '@/components/NewYearTransition';
import { Heart } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showNewYearTransition, setShowNewYearTransition] = useState(false);
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
        // Regular user or preview environment - show New Year transition then system selection
        console.log('✅ Login complete, showing New Year transition...');
        // Only show New Year transition from Jan 1-5, 2026
        const now = new Date();
        const isNewYearPeriod = now >= new Date('2026-01-01') && now <= new Date('2026-01-05T23:59:59');
        if (isNewYearPeriod) {
          setShowNewYearTransition(true);
        } else {
          setShowSystemSelection(true);
        }
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
    setShowNewYearTransition(true);
  };

  const handleNewYearComplete = () => {
    setShowNewYearTransition(false);
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


  // Show New Year transition animation
  if (showNewYearTransition) {
    return <NewYearTransition onComplete={handleNewYearComplete} />;
  }

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
              <div className="p-4 bg-[#0d3d1f] rounded-2xl shadow-lg">
                <img 
                  src="/lovable-uploads/great-pearl-coffee-logo.png" 
                  alt="Great Pearl Coffee Factory" 
                  className="h-20 w-auto object-contain"
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


  // Valentine's Day check (Feb 14)
  const now = new Date();
  const isValentines = now.getMonth() === 1 && now.getDate() === 14;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      isValentines 
        ? 'bg-gradient-to-br from-rose-50 via-pink-50 to-red-50' 
        : 'bg-gradient-to-br from-green-50 to-amber-50'
    }`}>
      {/* Floating hearts background for Valentine's */}
      {isValentines && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall text-pink-300/40"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${6 + Math.random() * 8}s`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${14 + Math.random() * 24}px`,
              }}
            >
              {['❤️', '💕', '💖', '🌹', '💗'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          {isValentines && (
            <div className="mb-4 p-3 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl text-white animate-fade-in shadow-lg">
              <p className="text-lg font-bold flex items-center justify-center gap-2">
                💝 Happy Valentine's Day! 💝
              </p>
              <p className="text-sm opacity-90">Brewing love, one cup at a time ☕</p>
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className={`p-4 bg-[#0d3d1f] rounded-2xl shadow-lg relative ${isValentines ? 'ring-2 ring-pink-300/50 ring-offset-2 ring-offset-rose-50' : ''}`}>
              <img 
                src="/lovable-uploads/great-pearl-coffee-logo.png" 
                alt="Great Pearl Coffee Factory" 
                className="h-24 w-auto object-contain"
              />
              {isValentines && (
                <span className="absolute -top-3 -right-3 text-2xl animate-bounce">💖</span>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Great Pearl Coffee Factory
          </h1>
          <p className="text-muted-foreground">
            {isValentines ? '☕ Where Coffee Meets Love' : 'Coffee Management System'}
          </p>
        </div>

        <Card className={isValentines ? "relative overflow-visible border-2 border-pink-200 shadow-xl shadow-pink-100/50" : ""}>
          {isValentines && (
            <>
              <div className="absolute -top-5 -right-3 text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
                🌹
              </div>
              <div className="absolute -top-4 -left-3 text-2xl animate-pulse">
                💕
              </div>
            </>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              {isValentines && <Heart className="h-5 w-5 text-rose-500 fill-rose-500 animate-pulse" />}
              Sign In
              {isValentines && <Heart className="h-5 w-5 text-rose-500 fill-rose-500 animate-pulse" />}
            </CardTitle>
            <CardDescription>
              {isValentines 
                ? "💌 Enter your credentials with love 💌" 
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  {isValentines && <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />}
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isValentines ? "💌 Enter your email..." : "Enter your email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className={`pl-10 ${isValentines ? "border-pink-200 focus:border-rose-400 focus:ring-rose-200" : ""}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  {isValentines && <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />}
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isValentines ? "🔐 Your secret love code..." : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={`pl-10 ${isValentines ? "border-pink-200 focus:border-rose-400 focus:ring-rose-200" : ""}`}
                  />
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
                className={`w-full ${isValentines ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-pink-200/50' : ''}`}
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
