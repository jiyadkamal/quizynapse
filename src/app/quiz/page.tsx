import React, { Suspense } from 'react';
import QuizClientPage from './_components/quiz-client-page';
import QuizLoading from './_components/quiz-loading';

export default function QuizPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <Suspense fallback={<QuizLoading />}>
        <QuizClientPage />
      </Suspense>
    </main>
  );
}
