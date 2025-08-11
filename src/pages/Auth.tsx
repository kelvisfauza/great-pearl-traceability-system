
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Coffee, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PasswordChangeModal from '@/components/PasswordChangeModal';
import SignUpForm from '@/components/SignUpForm';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createEmail, setCreateEmail] = useState('keizyeda@gmail.com');
  const [createPassword, setCreatePassword] = useState('Kusa2019');
  const [createName, setCreateName] = useState('Keizyeda User');
  const [creating, setCreating] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('=== STARTING LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    // Firebase Auth debugging will be done in signIn function

    try {
      console.log('Calling signIn function...');
      const result = await signIn(email, password);
      console.log('SignIn result:', result);
      
      if (result.requiresPasswordChange) {
        console.log('Password change required, showing modal');
        setShowPasswordChange(true);
      } else {
        console.log('Login successful, navigating to home');
        navigate('/');
      }
    } catch (error: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // More specific error handling
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Contact your administrator.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('=== LOGIN ATTEMPT COMPLETE ===');
    }
  };

  const handlePasswordChangeComplete = () => {
    setShowPasswordChange(false);
    navigate('/');
  };

  const createAccount = async () => {
    setCreating(true);
    setError('');
    
    try {
      console.log('Creating Firebase Auth account...');
      console.log('Email:', createEmail);
      console.log('Password:', createPassword);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, createEmail, createPassword);
      console.log('Firebase Auth user created:', userCredential.user.uid);
      
      // Create employee record with normalized email
      const normalizedEmail = createEmail.toLowerCase().trim();
      const employeeData = {
        name: createName,
        email: normalizedEmail,
        phone: '+256 700 000 000',
        position: 'Staff',
        department: 'Operations',
        salary: 500000,
        role: 'User',
        permissions: ['Operations', 'General Access', 'Store Management'],
        status: 'Active',
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        authUserId: userCredential.user.uid,
        isOneTimePassword: false,
        mustChangePassword: false
      };
      
      console.log('Creating employee record...');
      const docRef = await addDoc(collection(db, 'employees'), employeeData);
      console.log('Employee record created with ID:', docRef.id);
      
      toast({
        title: "Account Created Successfully!",
        description: `Account for ${createEmail} has been created. You can now log in.`,
      });
      
      setShowCreateAccount(false);
      
      // Auto-fill login form
      setEmail(createEmail);
      setPassword(createPassword);
      
    } catch (error: any) {
      console.error('Account creation error:', error);
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use. Try logging in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      setError(errorMessage);
      toast({
        title: "Account Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };


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

        {/* Account Creation Modal */}
        {showCreateAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Account</CardTitle>
                <CardDescription>
                  This will create both Firebase Auth and Employee records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="createEmail">Email</Label>
                  <Input
                    id="createEmail"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div>
                  <Label htmlFor="createPassword">Password</Label>
                  <Input
                    id="createPassword"
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div>
                  <Label htmlFor="createName">Full Name</Label>
                  <Input
                    id="createName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={createAccount} 
                    disabled={creating}
                    className="flex-1"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowCreateAccount(false)} 
                    variant="outline"
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Request Access</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Sign In</CardTitle>
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <SignUpForm />
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Having trouble? Contact your administrator for assistance.
          </p>
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
