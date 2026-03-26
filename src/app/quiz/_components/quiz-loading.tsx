import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function QuizLoading({ topic }: { topic?: string }) {
  return (
    <div className="w-full max-w-3xl flex flex-col items-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-3xl font-bold font-headline mb-2">Generating your quiz...</h2>
        <p className="text-muted-foreground text-lg">
            Our AI is crafting a question about <span className="text-primary font-semibold">{topic || "your topic"}</span>. Please wait a moment.
        </p>
        <Card className="w-full mt-8 animate-pulse">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
    </div>
  );
}
