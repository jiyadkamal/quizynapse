import { Suspense } from 'react';
import ResultsClientPage from './_components/results-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ResultsLoading = () => (
    <Card className="w-full max-w-md text-center">
        <CardHeader>
            <Skeleton className="h-10 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-12 w-32 mx-auto" />
        </CardContent>
    </Card>
);

export default function ResultsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Suspense fallback={<ResultsLoading />}>
        <ResultsClientPage />
      </Suspense>
    </main>
  );
}
