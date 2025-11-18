import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirebaseMigration } from "@/hooks/useFirebaseMigration";
import { AlertCircle, CheckCircle2, Database, Loader2 } from "lucide-react";

const FirebaseMigrationTool = () => {
  const { progress, isMigrating, migrateAllData, clearProgress } = useFirebaseMigration();

  const collections = [
    { name: 'store_reports', label: 'Store Reports' },
    { name: 'coffee_records', label: 'Coffee Records' },
    { name: 'payment_records', label: 'Payment Records' },
    { name: 'supplier_advances', label: 'Supplier Advances' },
    { name: 'daily_tasks', label: 'Daily Tasks' }
  ];

  const getProgressPercent = (collectionName: string) => {
    const p = progress[collectionName];
    if (!p || p.total === 0) return 0;
    return Math.round(((p.migrated + p.skipped) / p.total) * 100);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Firebase to Supabase Migration
        </CardTitle>
        <CardDescription>
          Migrate all data from Firebase Firestore to Supabase PostgreSQL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This will copy all Firebase data to Supabase. 
            Existing records will be skipped. Make sure you have a backup before proceeding.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {collections.map(({ name, label }) => {
            const p = progress[name];
            const percent = getProgressPercent(name);

            return (
              <div key={name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(p?.status)}
                    <span className="font-medium">{label}</span>
                  </div>
                  {p && (
                    <span className="text-sm text-muted-foreground">
                      {p.migrated} migrated / {p.skipped} skipped / {p.errors.length} errors
                    </span>
                  )}
                </div>
                
                {p && p.status === 'running' && (
                  <Progress value={percent} className="h-2" />
                )}

                {p && p.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <details>
                        <summary className="cursor-pointer font-medium">
                          {p.errors.length} error(s) occurred
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {p.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                          {p.errors.length > 5 && (
                            <li>... and {p.errors.length - 5} more</li>
                          )}
                        </ul>
                      </details>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={migrateAllData}
            disabled={isMigrating}
            className="flex-1"
          >
            {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isMigrating ? 'Migrating...' : 'Start Migration'}
          </Button>
          
          {Object.keys(progress).length > 0 && !isMigrating && (
            <Button
              onClick={clearProgress}
              variant="outline"
            >
              Clear
            </Button>
          )}
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>After migration:</strong> Update your application code to use Supabase instead of Firebase,
            then remove Firebase dependencies from package.json.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FirebaseMigrationTool;