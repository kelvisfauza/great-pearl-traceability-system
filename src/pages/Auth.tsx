import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Coffee } from 'lucide-react';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import PasswordChangeModal from '@/components/PasswordChangeModal';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const { signIn, signUp, user, employee } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && employee && !employee.mustChangePassword) {
      navigate('/');
    }
  }, [user, employee, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (result.requiresPasswordChange) {
          setShowPasswordChange(true);
        } else {
          // For now, we'll skip 2FA and go directly to dashboard
          navigate('/');
        }
      } else {
        await signUp(email, password, {});
        toast({
          title: "Success",
          description: "Account created successfully!"
        });
        navigate('/');
      }
    } catch (error: any) {
      // Error is already handled in signIn/signUp functions
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSuccess = () => {
    setShowTwoFactor(false);
    navigate('/');
  };

  const handlePasswordChangeComplete = () => {
    setShowPasswordChange(false);
    navigate('/');
  };

  if (showTwoFactor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <TwoFactorVerification
          phone={employee?.phone || ''}
          userName={employee?.name}
          onVerificationSuccess={handleTwoFactorSuccess}
          onCancel={() => setShowTwoFactor(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <Coffee className="h-12 w-12 text-green-600" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Great Pearl Coffee Factory
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PasswordChangeModal
        open={showPasswordChange}
        onClose={handlePasswordChangeComplete}
      />
    </div>
  );
};

export default Auth;
