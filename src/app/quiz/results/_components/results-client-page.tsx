"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PartyPopper, Meh, Frown, History } from 'lucide-react';
import { useMemo, useEffect, useRef } from 'react';

interface QuizHistory {
  topic: string;
  difficulty: string;
  startYear?: number;
  score: number;
  total: number;
  date: string;
}

export default function ResultsClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasSaved = useRef(false);
  
  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '5', 10);
  const topics = searchParams.getAll("topic") || [""];
  const difficulty = searchParams.get("difficulty") || "Easy";
  const startYearParam = searchParams.get("startYear");
  
  const topicDisplay = topics.map(t => t.split(':')[0]).join(', ');

  useEffect(() => {
    if (hasSaved.current) return;

    const newHistoryEntry: QuizHistory = {
      topic: topicDisplay,
      difficulty,
      score,
      total,
      date: new Date().toISOString(),
    };
    if (startYearParam) {
      newHistoryEntry.startYear = Number(startYearParam);
    }
    const storedHistory = localStorage.getItem('quizHistory');
    const history = storedHistory ? JSON.parse(storedHistory) : [];
    history.unshift(newHistoryEntry);
    localStorage.setItem('quizHistory', JSON.stringify(history));
    hasSaved.current = true;
  }, [score, total, topicDisplay, difficulty, startYearParam]);


  const { icon, title, description, colorClass } = useMemo(() => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) {
      return {
        icon: <PartyPopper className="h-16 w-16 text-green-500" />,
        title: "Excellent!",
        description: "You're a true expert!",
        colorClass: "text-green-500",
      };
    }
    if (percentage >= 40) {
      return {
        icon: <Meh className="h-16 w-16 text-yellow-500" />,
        title: "Good Job!",
        description: "A solid performance. Keep learning!",
        colorClass: "text-yellow-500",
      };
    }
    return {
      icon: <Frown className="h-16 w-16 text-red-500" />,
      title: "Keep Trying!",
      description: "Every master was once a beginner.",
      colorClass: "text-red-500",
    };
  }, [score, total]);


  return (
    <Card className="w-full max-w-md text-center shadow-lg animate-fade-in">
        <CardHeader className="items-center">
            {icon}
            <CardTitle className="text-4xl font-headline mt-4">{title}</CardTitle>
            <CardDescription className="text-lg pt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-xl">Your Final Score on <span className="font-bold text-primary">{topicDisplay}</span></p>
            <p className={`text-7xl font-bold font-headline ${colorClass}`}>
                {score} <span className="text-4xl text-muted-foreground">/ {total}</span>
            </p>
        </CardContent>
      <CardFooter className="flex-col sm:flex-row gap-2">
        <Button onClick={() => router.push('/play')} className="w-full text-lg py-6">
          Play Again
        </Button>
        <Button onClick={() => router.push('/history')} variant="secondary" className="w-full text-lg py-6">
          <History className="mr-2"/> View History
        </Button>
      </CardFooter>
    </Card>
  );
}
