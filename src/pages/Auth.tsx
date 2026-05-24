
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, Phone, Mail, MessageCircle, Lock, KeyRound, Eye, EyeOff, ScanFace, X } from 'lucide-react';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import { UnifiedVerification } from '@/components/auth/UnifiedVerification';
import { supabase } from '@/integrations/supabase/client';
import { smsService } from '@/services/smsService';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { useHolidayTheme } from '@/hooks/useHolidayTheme';
import { FaceCapture } from '@/components/auth/FaceCapture';


const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState('');
  
  const [showSystemSelection, setShowSystemSelection] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // Face-ID sign-in
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceLoginEmail, setFaceLoginEmail] = useState('');
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceError, setFaceError] = useState('');
  
  const { signIn, user, employee, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: holiday } = useHolidayTheme();
  const isHoliday = !!holiday;
  const splashTimeoutRef = useRef<number | null>(null);
  const postAuthHandoffStartedRef = useRef(false);
  const [postAuthSource, setPostAuthSource] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    const handleAuthCallback = async () => {
      const url = new URL(window.location.href);
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const callbackSource = url.searchParams.get('post_auth') || hashParams.get('post_auth');
      const callbackType = hashParams.get('type') || url.searchParams.get('type');
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash') || hashParams.get('token_hash');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      const isMagicLinkCallback = Boolean(
        code ||
        (accessToken && refreshToken) ||
        (tokenHash && callbackType === 'magiclink') ||
        callbackSource ||
        callbackType === 'magiclink'
      );

      if (!isMagicLinkCallback) return;

      setPostAuthSource(callbackSource || 'magiclink');
      setLoading(true);
      // Show the welcome splash immediately so face-ID users see the logo
      // while we exchange the token in the background.
      if (callbackSource === 'face' || callbackSource === 'auto' || tokenHash || code) {
        setShowWelcomeSplash(true);
      }
      setError('');

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (tokenHash && callbackType === 'magiclink') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash: tokenHash,
          } as any);
          if (verifyError) throw verifyError;
        }

        if (!cancelled) {
          window.history.replaceState({}, document.title, `${window.location.pathname}?post_auth=${callbackSource || 'magiclink'}`);
        }
      } catch (callbackError: any) {
        console.error('Auth callback handling failed:', callbackError);
        if (!cancelled) {
          setError(callbackError?.message || 'Face sign-in could not be completed. Please try again.');
          setPostAuthSource(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    handleAuthCallback();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (splashTimeoutRef.current) {
        window.clearTimeout(splashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user || !employee || postAuthHandoffStartedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postAuth = urlParams.get('post_auth');
    const type = urlParams.get('type');
    const code = urlParams.get('code');
    const tokenHash = urlParams.get('token_hash');
    const isMagicLinkReturn = !!postAuthSource || postAuth === 'face' || postAuth === 'auto' || type === 'magiclink' || !!tokenHash || !!code;

    if (!isMagicLinkReturn) return;

    postAuthHandoffStartedRef.current = true;
    setShowFaceLogin(false);
    setShowEmailVerification(false);
    setShowSystemSelection(false);
    setFaceError('');
    setError('');
    setPendingLoginEmail(employee.email || user.email || '');
    setWelcomeName(
      employee.name ||
      String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User')
    );
    setShowWelcomeSplash(true);

    window.history.replaceState({}, document.title, window.location.pathname);

    splashTimeoutRef.current = window.setTimeout(() => {
      setShowWelcomeSplash(false);
      navigate('/', { replace: true });
    }, 3200);
  }, [authLoading, user, employee, navigate, postAuthSource]);

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

    // Resolve a display name for the welcome splash
    let displayName = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const metaName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
      if (metaName) {
        displayName = metaName;
      } else if (pendingLoginEmail) {
        const { data: emp } = await supabase
          .from('employees')
          .select('name')
          .ilike('email', pendingLoginEmail)
          .maybeSingle();
        if (emp?.name) displayName = emp.name;
      }
    } catch (e) {
      console.warn('Could not resolve welcome name:', e);
    }
    if (!displayName) {
      displayName = (pendingLoginEmail || email).split('@')[0].replace(/[._-]+/g, ' ');
    }
    setWelcomeName(displayName);
    setShowWelcomeSplash(true);
    setTimeout(() => {
      setShowWelcomeSplash(false);
      setShowSystemSelection(true);
    }, 2800);
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

  const openFaceLogin = () => {
    setFaceError('');
    setShowFaceLogin(true);
  };

  const handleFaceCapture = async (descriptor: number[]) => {
    setFaceBusy(true);
    setFaceError('');
    try {
      // Auto-identify: server searches all enrolled faces, no email needed.
      const { data, error } = await supabase.functions.invoke('face-login', {
        body: { descriptor },
      });
      if (error) throw error;
      if (!data?.ok) {
        setFaceError(data?.error || "We couldn't recognize you. Try again, or sign in with your password.");
        return;
      }
      toast({
        title: 'Face recognized',
        description: `Welcome back, ${data.name || ''}. Signing you in…`,
      });

      if (data?.token_hash) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('post_auth', 'face');
        nextUrl.searchParams.set('type', data.verification_type || 'magiclink');
        nextUrl.searchParams.set('token_hash', data.token_hash);
        window.location.href = nextUrl.toString();
        return;
      }

      // Fallback for older responses.
      window.location.href = data.auth_url;
    } catch (err: any) {
      console.error('Face login failed:', err);
      setFaceError(err?.message || 'Face sign-in failed. Please try again.');
    } finally {
      setFaceBusy(false);
    }
  };


  // Show unified verification screen (email → biometric → DOB fallbacks)
  if (showEmailVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
        <UnifiedVerification
          email={pendingLoginEmail}
          onVerificationComplete={handleEmailVerificationComplete}
          onCancel={handleEmailVerificationCancel}
        />
      </div>
    );
  }

  // Welcome splash — shown after successful verification, before system selection
  if (showWelcomeSplash) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
        style={{
          background:
            'radial-gradient(900px 600px at 50% 30%, rgba(201,168,76,0.18) 0%, transparent 60%), linear-gradient(160deg, #022911 0%, #03361b 55%, #021a0c 100%)',
          fontFamily: "'Work Sans', sans-serif",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(201,168,76,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-6 splash-fade-in">
          <div
            className="p-6 rounded-3xl shadow-2xl mb-8 splash-logo-pop"
            style={{ background: '#022911', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <img
              src="/lovable-uploads/great-agro-coffee-logo.png"
              alt="Great Agro Coffee"
              className="h-28 w-auto object-contain"
            />
          </div>
          <p
            className="text-xs uppercase tracking-[0.4em] mb-3"
            style={{ color: 'rgba(201,168,76,0.9)' }}
          >
            Welcome to
          </p>
          <h1
            className="text-5xl md:text-6xl mb-6"
            style={{
              fontFamily: "'Instrument Serif', serif",
              color: '#f5f0e0',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Great Agro <em style={{ color: '#c9a84c', fontStyle: 'italic' }}>Coffee</em>
          </h1>
          <div
            className="h-px w-32 mb-6"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)' }}
          />
          <p
            className="text-2xl md:text-3xl capitalize"
            style={{ fontFamily: "'Instrument Serif', serif", color: 'rgba(245,240,224,0.92)' }}
          >
            Hello, {welcomeName}
          </p>
          <div className="mt-10 flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: 'rgba(245,240,224,0.5)' }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Preparing your workspace
          </div>
        </div>

        <style>{`
          @keyframes splashFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes splashLogoPop {
            0% { opacity: 0; transform: scale(0.85); }
            60% { opacity: 1; transform: scale(1.04); }
            100% { opacity: 1; transform: scale(1); }
          }
          .splash-fade-in { animation: splashFadeIn 700ms ease-out both; }
          .splash-logo-pop { animation: splashLogoPop 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        `}</style>
      </div>
    );
  }

  // Show system selection screen after successful login
  if (showSystemSelection) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#03361b', fontFamily: "'Work Sans', sans-serif" }}
      >
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="p-4 rounded-2xl shadow-xl" style={{ background: '#022911', border: '1px solid rgba(201,168,76,0.25)' }}>
                <img src="/lovable-uploads/great-agro-coffee-logo.png" alt="Great Agro Coffee" className="h-16 w-auto object-contain" />
              </div>
            </div>
            <h1
              className="text-4xl mb-2"
              style={{ fontFamily: "'Instrument Serif', serif", color: '#f5f0e0', letterSpacing: '-0.01em' }}
            >
              Welcome back
            </h1>
            <p style={{ color: 'rgba(245,240,224,0.7)' }}>Choose which workspace to enter</p>
          </div>

          <div
            className="rounded-2xl p-6 space-y-3 shadow-2xl"
            style={{ background: '#022911', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <button
              onClick={() => handleSystemSelection('v1')}
              className="w-full h-20 rounded-xl text-lg font-medium transition-all hover:opacity-95 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #b08e2e 100%)', color: '#03361b', fontFamily: "'Work Sans', sans-serif" }}
            >
              Enter V1 System
            </button>
            <button
              onClick={() => handleSystemSelection('v2')}
              className="w-full h-20 rounded-xl text-lg font-medium transition-all hover:bg-[rgba(201,168,76,0.08)]"
              style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#f5f0e0', background: 'transparent', fontFamily: "'Work Sans', sans-serif" }}
            >
              Enter V2 System
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full grid lg:grid-cols-2 relative overflow-hidden"
      style={{ background: '#022911', fontFamily: "'Work Sans', sans-serif" }}
    >
      {/* LEFT — Brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden"
        style={{
          background:
            'radial-gradient(1100px 700px at -10% -10%, rgba(201,168,76,0.18) 0%, transparent 60%), radial-gradient(800px 600px at 110% 110%, rgba(10,90,48,0.45) 0%, transparent 55%), linear-gradient(160deg, #022911 0%, #03361b 55%, #021a0c 100%)',
        }}
      >
        {/* subtle gold grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(201,168,76,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        {/* gold orb */}
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 w-[480px] h-[480px] rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #c9a84c 0%, transparent 70%)' }}
        />

        {/* Logo cover — large watermark filling the green panel */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/lovable-uploads/great-agro-coffee-logo.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain',
            opacity: 0.18,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(245,240,224,0.06)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <img src="/lovable-uploads/great-agro-coffee-logo.png" alt="Great Agro Coffee" className="h-10 w-auto object-contain" />
          </div>
          <span className="text-sm tracking-widest uppercase" style={{ color: 'rgba(245,240,224,0.7)' }}>
            Great Agro Coffee
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2
            className="text-6xl xl:text-7xl leading-[1.05] mb-6"
            style={{ fontFamily: "'Instrument Serif', serif", color: '#f5f0e0', letterSpacing: '-0.02em' }}
          >
            From farm to <em style={{ color: '#c9a84c', fontStyle: 'italic' }}>export</em>, <br />
            every step traced.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(245,240,224,0.7)' }}>
            The internal operations workspace for procurement, quality, finance and field teams — built around precision, accountability and craft.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-widest" style={{ color: 'rgba(245,240,224,0.5)' }}>
          <span>EUDR Ready</span>
          <span className="h-px flex-1 mx-4" style={{ background: 'rgba(201,168,76,0.3)' }} />
          <span>Est. Uganda</span>
        </div>
      </div>

      {/* RIGHT — Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative" style={{ background: '#f5f0e0' }}>
        {isHoliday && holiday && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall opacity-30"
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
          {/* Mobile-only brand header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl mb-3" style={{ background: '#03361b' }}>
              <img src="/lovable-uploads/great-agro-coffee-logo.png" alt="Great Agro Coffee" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-3xl" style={{ fontFamily: "'Instrument Serif', serif", color: '#03361b' }}>
              Great Agro Coffee
            </h1>
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: '#0a5a30' }}>
              Sign in
            </p>
            <h1
              className="text-5xl mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", color: '#03361b', letterSpacing: '-0.02em', lineHeight: 1.05 }}
            >
              Welcome back.
            </h1>
            <p style={{ color: 'rgba(6,78,59,0.65)' }}>Enter your credentials to access your workspace.</p>
          </div>

          {isHoliday && holiday && (
            <div className="mb-6 p-3 rounded-xl text-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#03361b' }}>
              <p className="text-sm font-medium">{holiday.emoji} {holiday.greeting_title}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase tracking-wider font-medium" style={{ color: '#03361b' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#0a5a30' }} />
                <input
                  id="email"
                  type="email"
                  placeholder="you@greatagrocoffee.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 pl-11 pr-4 rounded-xl outline-none transition-all focus:ring-2"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(6,78,59,0.15)',
                    color: '#03361b',
                    fontFamily: "'Work Sans', sans-serif",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs uppercase tracking-wider font-medium" style={{ color: '#03361b' }}>
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#0a5a30' }}
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#0a5a30' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 pl-11 pr-11 rounded-xl outline-none transition-all focus:ring-2"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(6,78,59,0.15)',
                    color: '#03361b',
                    fontFamily: "'Work Sans', sans-serif",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#0a5a30' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#991b1b' }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && !error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(10,90,48,0.08)', border: '1px solid rgba(10,90,48,0.25)', color: '#03361b' }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {window.location.search.includes('login_token') ? 'Processing automatic login…' : 'Signing you in…'}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #03361b 0%, #0a5a30 100%)',
                color: '#f5f0e0',
                fontFamily: "'Work Sans', sans-serif",
                boxShadow: '0 10px 30px -10px rgba(6,78,59,0.5)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(6,78,59,0.15)' }} />
              <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'rgba(6,78,59,0.5)' }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(6,78,59,0.15)' }} />
            </div>

            {/* Face ID sign-in */}
            <button
              type="button"
              onClick={openFaceLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: '#ffffff',
                color: '#03361b',
                border: '1px solid rgba(6,78,59,0.2)',
                fontFamily: "'Work Sans', sans-serif",
              }}
            >
              <ScanFace className="h-5 w-5" style={{ color: '#0a5a30' }} />
              Sign in with Face ID
            </button>
            <p className="text-[11px] text-center" style={{ color: 'rgba(6,78,59,0.55)' }}>
              Register your face once in Settings, then sign in instantly without a password.
            </p>
          </form>

          {/* IT support — minimal footer */}
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid rgba(6,78,59,0.12)' }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(6,78,59,0.5)' }}>
              Need help?
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm" style={{ color: 'rgba(6,78,59,0.75)' }}>
              <a href="tel:+256393001626" className="flex items-center gap-2 hover:underline">
                <Phone className="h-3.5 w-3.5" style={{ color: '#c9a84c' }} />
                +256 393 001 626
              </a>
              <span className="hidden sm:inline" style={{ color: 'rgba(6,78,59,0.25)' }}>·</span>
              <a href="mailto:it.support@greatagrocoffee.com" className="flex items-center gap-2 hover:underline">
                <Mail className="h-3.5 w-3.5" style={{ color: '#c9a84c' }} />
                it.support@greatagrocoffee.com
              </a>
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgba(6,78,59,0.45)' }}>
              New employees: accounts are created by your administrator.
            </p>
          </div>
        </div>
      </div>

      <PasswordChangeModal
        open={showPasswordChange}
        onPasswordChanged={handlePasswordChangeComplete}
      />

      {/* Face ID Sign-in Dialog */}
      {showFaceLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md relative">
            <button
              type="button"
              onClick={() => { if (!faceBusy) setShowFaceLogin(false); }}
              className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-muted transition-colors"
              aria-label="Close"
              disabled={faceBusy}
            >
              <X className="h-4 w-4" />
            </button>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="h-5 w-5" style={{ color: '#0a5a30' }} />
                Sign in with Face ID
              </CardTitle>
              <CardDescription>
                Just look at the camera. We'll automatically recognize you and sign you in —
                no email or password needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faceError && (
                <div
                  className="flex items-start gap-2 p-3 rounded-md text-xs"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#991b1b' }}
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{faceError}</span>
                </div>
              )}

              <FaceCapture
                onCapture={handleFaceCapture}
                actionLabel="Scan my face & sign me in"
                busy={faceBusy}
                autoScan
              />

              <p className="text-[11px] text-muted-foreground text-center">
                Haven't registered your face yet? Sign in with your password once and set it up
                under <strong>Settings → Profile</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your email and we'll send you a temporary password. You'll be required to set a new password right after logging in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {forgotSent ? (
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Mail className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A temporary password has been sent to <strong>{forgotEmail}</strong>. Check your inbox (and spam folder), then sign in — you'll be asked to set a new password right away. If a phone number is on file, you'll also get an SMS telling you to check your email.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }}>
                    Back to Login
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email Address</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowForgotPassword(false); setForgotEmail(''); }}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={forgotLoading || !forgotEmail}
                      onClick={async () => {
                        setForgotLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('forgot-password-temp', {
                            body: { email: forgotEmail.trim().toLowerCase() }
                          });
                          if (error || (data && data.ok === false)) {
                            const msg = (data && data.error) || error?.message || 'Failed to send reset email';
                            toast({ title: "Error", description: msg, variant: "destructive" });
                          } else {
                            setForgotSent(true);
                          }
                        } catch (e: any) {
                          toast({ title: "Error", description: e?.message || "Failed to send reset email", variant: "destructive" });
                        } finally {
                          setForgotLoading(false);
                        }
                      }}
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Temporary Password'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;
