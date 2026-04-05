
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
import { UnifiedVerification } from '@/components/auth/UnifiedVerification';
import { supabase } from '@/integrations/supabase/client';
import { smsService } from '@/services/smsService';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { useHolidayTheme } from '@/hooks/useHolidayTheme';


const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState('');
  
  const [showSystemSelection, setShowSystemSelection] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: holiday } = useHolidayTheme();
  const isHoliday = !!holiday;

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

      // After successful password auth, require email verification
      console.log('📧 Requiring email verification for:', email);
      setPendingLoginEmail(email.toLowerCase().trim());
      setShowEmailVerification(true);
      setLoading(false);

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

  const handleEmailVerificationComplete = async () => {
    setShowEmailVerification(false);
    console.log('✅ Verification complete, proceeding...');
    setShowSystemSelection(true);
  };

  const handleEmailVerificationCancel = async () => {
    await supabase.auth.signOut();
    setShowEmailVerification(false);
    setPendingLoginEmail('');
    toast({
      title: "Verification Cancelled",
      description: "You must verify your identity to sign in.",
      variant: "destructive"
    });
  };

  const handlePasswordChangeComplete = () => {
    setShowPasswordChange(false);
    setPendingLoginEmail(email.toLowerCase().trim());
    setShowEmailVerification(true);
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

  // Show email verification screen
  if (showEmailVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
        <EmailVerification
          email={pendingLoginEmail}
          onVerificationComplete={handleEmailVerificationComplete}
          onCancel={handleEmailVerificationCancel}
        />
      </div>
    );
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
                  src="/lovable-uploads/great-agro-coffee-logo.png" 
                  alt="Great Agro Coffee" 
                  className="h-20 w-auto object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Great Agro Coffee
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

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      isHoliday 
        ? `bg-gradient-to-br from-${holiday.bg_gradient_from} via-background to-${holiday.bg_gradient_to}` 
        : 'bg-gradient-to-br from-green-50 to-amber-50'
    }`}>
      {/* Floating emoji background for holidays */}
      {isHoliday && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall opacity-40"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${6 + Math.random() * 8}s`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${16 + Math.random() * 20}px`,
              }}
            >
              {holiday.emoji}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          {isHoliday && (
            <div className={`mb-4 p-3 bg-gradient-to-r from-${holiday.gradient_from} to-${holiday.gradient_to} rounded-xl text-white animate-fade-in shadow-lg`}>
              <p className="text-lg font-bold flex items-center justify-center gap-2">
                {holiday.greeting_title}
              </p>
              <p className="text-sm opacity-90">{holiday.greeting_message}</p>
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-[#0d3d1f] rounded-2xl shadow-lg relative">
              <img 
                src="/lovable-uploads/great-agro-coffee-logo.png" 
                alt="Great Agro Coffee" 
                className="h-24 w-auto object-contain"
              />
              {isHoliday && (
                <span className="absolute -top-3 -right-3 text-2xl animate-bounce">{holiday.emoji}</span>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Great Agro Coffee
          </h1>
          <p className="text-muted-foreground">
            {isHoliday ? `${holiday.emoji} ${holiday.name}` : 'Coffee Management System'}
          </p>
        </div>

        <Card className={isHoliday ? `relative overflow-visible border-2 border-${holiday.gradient_from.replace('500','200')} shadow-xl` : ""}>
          {isHoliday && (
            <>
              <div className="absolute -top-5 -right-3 text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
                {holiday.emoji}
              </div>
              <div className="absolute -top-4 -left-3 text-2xl animate-pulse">
                {holiday.emoji}
              </div>
            </>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              {isHoliday && <span>{holiday.emoji}</span>}
              Sign In
              {isHoliday && <span>{holiday.emoji}</span>}
            </CardTitle>
            <CardDescription>
              {isHoliday 
                ? `${holiday.emoji} Enter your credentials ${holiday.emoji}` 
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  {isHoliday && <span className="text-sm">{holiday.emoji}</span>}
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  {isHoliday && <span className="text-sm">{holiday.emoji}</span>}
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
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
                className={`w-full ${isHoliday ? `bg-gradient-to-r from-${holiday.gradient_from} to-${holiday.gradient_to} hover:opacity-90 shadow-lg` : ''}`}
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
                <span>it.support@greatagrocoffee.com</span>
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
