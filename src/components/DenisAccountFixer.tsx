import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fixDenisAccountFinal } from '@/utils/fixDenisAccountFinal';

export const DenisAccountFixer = () => {
  const [isFixing, setIsFixing] = useState(false);

  const handleFixAccount = async () => {
    setIsFixing(true);
    try {
      await fixDenisAccountFinal();
    } catch (error) {
      console.error('Failed to fix Denis account:', error);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin: Fix Denis Account</CardTitle>
        <CardDescription>
          Click to fix Denis's authentication issue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleFixAccount}
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? 'Fixing Account...' : 'Fix Denis Account'}
        </Button>
      </CardContent>
    </Card>
  );
};