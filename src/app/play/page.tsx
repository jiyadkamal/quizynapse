import { BrainCircuit } from 'lucide-react';
import { QuizForm } from '@/components/quiz-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PlayPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.2] p-4 relative">
        <div className="absolute top-4 left-4">
            <Button asChild variant="outline">
                <Link href="/home">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Home
                </Link>
            </Button>
        </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-4 mb-4">
            <BrainCircuit className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl font-headline">
              Quizynapse
            </h1>
          </div>
          <CardTitle className="text-2xl font-headline">Test Your Knowledge</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Select a topic, difficulty, and an optional starting year to generate a unique quiz just for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizForm />
        </CardContent>
      </Card>
    </main>
  );
}
