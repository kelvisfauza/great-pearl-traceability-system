import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Database, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface FirebaseEmployee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  salary: number;
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  authUserId?: string;
}

const FirebaseToSupabaseMigration: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [firebaseUsers, setFirebaseUsers] = useState<FirebaseEmployee[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [migrationResults, setMigrationResults] = useState<{
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  }>({ success: 0, failed: 0, skipped: 0, errors: [] });
  const { toast } = useToast();

  const fetchFirebaseUsers = async () => {
    try {
      console.log('Fetching users from Firebase...');
      const employeesQuery = collection(db, 'employees');
      const querySnapshot = await getDocs(employeesQuery);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseEmployee[];
      
      setFirebaseUsers(users);
      toast({
        title: "Firebase Users Loaded",
        description: `Found ${users.length} users in Firebase`
      });
    } catch (error) {
      console.error('Error fetching Firebase users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Firebase users",
        variant: "destructive"
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const migrateToSupabase = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to migrate",
        variant: "destructive"
      });
      return;
    }

    setMigrating(true);
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const usersToMigrate = firebaseUsers.filter(user => selectedUsers.has(user.id));
      
      for (const firebaseUser of usersToMigrate) {
        try {
          // Check if user already exists in Supabase
          const { data: existingUser } = await supabase
            .from('employees')
            .select('email')
            .eq('email', firebaseUser.email)
            .single();

          if (existingUser) {
            console.log(`User ${firebaseUser.email} already exists in Supabase, skipping...`);
            skipped++;
            continue;
          }

          // Migrate user to Supabase
          const { error } = await supabase
            .from('employees')
            .insert([{
              name: firebaseUser.name,
              email: firebaseUser.email,
              phone: firebaseUser.phone || '',
              position: firebaseUser.position,
              department: firebaseUser.department,
              salary: firebaseUser.salary || 0,
              role: firebaseUser.role || 'User',
              permissions: firebaseUser.permissions || ['General Access'],
              status: firebaseUser.status || 'Active',
              join_date: firebaseUser.join_date || new Date().toISOString(),
              auth_user_id: firebaseUser.authUserId || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (error) {
            console.error(`Error migrating user ${firebaseUser.email}:`, error);
            errors.push(`${firebaseUser.name} (${firebaseUser.email}): ${error.message}`);
            failed++;
          } else {
            console.log(`Successfully migrated user ${firebaseUser.email}`);
            success++;
          }
        } catch (userError) {
          console.error(`Error processing user ${firebaseUser.email}:`, userError);
          errors.push(`${firebaseUser.name} (${firebaseUser.email}): ${userError.message}`);
          failed++;
        }
      }

      setMigrationResults({ success, failed, skipped, errors });

      if (success > 0) {
        toast({
          title: "Migration Completed",
          description: `Successfully migrated ${success} users. Failed: ${failed}, Skipped: ${skipped}`
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: "An error occurred during migration",
        variant: "destructive"
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Firebase to Supabase User Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool migrates users from Firebase to the unified Supabase system. 
            Run this if you have users created in Settings that aren't visible in HR/Admin sections.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchFirebaseUsers}
            disabled={migrating}
          >
            <Database className="h-4 w-4 mr-2" />
            Load Firebase Users ({firebaseUsers.length})
          </Button>
          
          <Button
            onClick={migrateToSupabase}
            disabled={migrating || selectedUsers.size === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            {migrating ? 'Migrating...' : `Migrate Selected (${selectedUsers.size})`}
          </Button>
        </div>

        {firebaseUsers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Select Users to Migrate:</h4>
            <div className="bg-muted p-3 rounded-lg space-y-2 max-h-60 overflow-y-auto">
              {firebaseUsers.map(user => (
                <div key={user.id} className="flex items-center space-x-3 p-2 rounded border">
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                  <label htmlFor={user.id} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{user.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {user.department} • {user.role}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            {firebaseUsers.length > 1 && (
              <div className="flex gap-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set(firebaseUsers.map(u => u.id)))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}

        {(migrationResults.success > 0 || migrationResults.failed > 0) && (
          <Alert className={migrationResults.failed > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>✅ Successfully migrated: {migrationResults.success}</div>
                <div>⏭️ Skipped (already exists): {migrationResults.skipped}</div>
                <div>❌ Failed: {migrationResults.failed}</div>
                {migrationResults.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Show Errors</summary>
                    <div className="mt-1 text-xs space-y-1">
                      {migrationResults.errors.map((error, index) => (
                        <div key={index} className="text-red-600">{error}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FirebaseToSupabaseMigration;