import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface TwoFactorVerificationProps {
  phone: string;
  userName?: string;
  onVerificationSuccess: () => void;
  onCancel: () => void;
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  phone,
  userName,
  onVerificationSuccess,
  onCancel
}) => {
  useEffect(() => {
    // Immediately proceed as if verified
    onVerificationSuccess();
  }, [onVerificationSuccess]);

  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Verification Skipped</CardTitle>
        <CardDescription>
          {userName ? `Hello ${userName},` : 'Hello,'} verification was skipped for {maskedPhone}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center text-sm text-gray-500">
          <p>Redirecting you now...</p>
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};

export default TwoFactorVerification;
;
