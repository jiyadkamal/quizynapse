import { Suspense } from 'react';
import HistoryClientPage from './_components/history-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const HistoryLoading = () => (
    <Card className="w-full max-w-4xl text-center">
        <CardHeader>
            <Skeleton className="h-10 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </CardContent>
    </Card>
);

export default function HistoryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
        <Suspense fallback={<HistoryLoading />}>
            <HistoryClientPage />
        </Suspense>
    </main>
  );
}
