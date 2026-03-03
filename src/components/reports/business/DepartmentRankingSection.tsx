import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Trophy, Medal, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const gradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "text-green-600";
  if (grade.startsWith("B")) return "text-blue-600";
  if (grade.startsWith("C")) return "text-yellow-600";
  if (grade.startsWith("D")) return "text-orange-600";
  return "text-red-600";
};

const progressColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
};

const rankIcon = (index: number) => {
  if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
  if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{index + 1}</span>;
};

const DepartmentRankingSection = ({ data }: { data: WholeBusinessData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Department Rankings (Best to Worst)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.departmentScores.map((dept, i) => (
            <div key={dept.department} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="flex-shrink-0 mt-1">{rankIcon(i)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{dept.department}</h4>
                  <span className={`text-lg font-bold ${gradeColor(dept.grade)}`}>
                    {dept.grade} ({dept.score}%)
                  </span>
                </div>
                <div className="mb-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor(dept.score)}`}
                      style={{ width: `${dept.score}%` }}
                    />
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {dept.highlights.map((h, j) => (
                    <li key={j}>• {h}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentRankingSection;
