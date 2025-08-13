import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { createTrainingAccount } from "@/utils/createTrainingAccount";
import { toast } from "sonner";

interface TrainingCredentials {
  email: string;
  password: string;
}

export default function CreateTrainingAccountButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] = useState<TrainingCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const result = await createTrainingAccount();
      
      if (result.error) {
        setError(result.error);
        toast.error("Failed to create training account");
      } else {
        setCredentials(result.data.credentials);
        toast.success("Training account created successfully!");
      }
    } catch (err) {
      setError("Unexpected error occurred");
      toast.error("Failed to create training account");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Training Account Setup
        </CardTitle>
        <CardDescription>
          Create a demo account for staff training with sample data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!credentials && !error && (
          <Button 
            onClick={handleCreateAccount}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Training Account"}
          </Button>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {credentials && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Account Created Successfully!</span>
            </div>
            
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.email)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {credentials.email}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Password:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.password)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {credentials.password}
                </Badge>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Share these credentials with new staff for training purposes. 
              They'll see a guided tour when they log in.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}