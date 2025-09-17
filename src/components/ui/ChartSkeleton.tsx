import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  title?: string;
  height?: string;
}

export const ChartSkeleton = ({ title, height = "h-80" }: ChartSkeletonProps) => {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className={`${height} flex items-end justify-center gap-2 px-4`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton 
                className={`w-full rounded-t-sm`} 
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};