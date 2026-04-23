"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateQuizQuestions } from "@/ai/flows/generate-quiz-questions";
import type { GenerateQuizQuestionsOutput, GenerateQuizQuestionsInput, SingleQuestion } from "@/ai/schemas/quiz-schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import QuizLoading from "./quiz-loading";
import { QuizQuestionCard } from "@/components/quiz-question-card";
import { Progress } from "@/components/ui/progress";
import { X, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const getTimerDuration = (difficulty: "Easy" | "Medium" | "Hard"): number => {
    switch (difficulty) {
        case 'Easy':
            return 20;
        case 'Medium':
            return 25;
        case 'Hard':
            return 30;
        default:
            return 20;
    }
};

interface Topic {
    name: string;
    startYear?: number;
}

export default function QuizClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<SingleQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"loading" | "active" | "reviewing">("loading");
  const [userAnswer, setUserAnswer] = useState<string | null>(null);

  const topics = useMemo(() => {
    const topicParams = searchParams.getAll("topic") || [];
    return topicParams.map(tp => {
      const parts = tp.split(':');
      return parts.length > 1 ? { name: parts[0], startYear: Number(parts[1]) } : { name: parts[0] };
    });
  }, [searchParams]);

  const delivery = (searchParams.get("delivery") as "topic-wise" | "mixed") || "mixed";
  const difficulty = (searchParams.get("difficulty") as "Easy" | "Medium" | "Hard") || "Easy";
  const questionCount = parseInt(searchParams.get("questionCount") || '5', 10);
  
  // Note: Total questions is based on actual generated questions length,
  // but we estimate it here for the progress bar initially.
  const [totalQuestions, setTotalQuestions] = useState(0);
  const questionTimerSeconds = getTimerDuration(difficulty);
  const [timer, setTimer] = useState(questionTimerSeconds);
  const loadingStartedRef = useRef(false);

  // Track the current "question round" — incremented on each new question.
  // This is the ONLY dependency for the timer effect, ensuring a clean restart.
  const [questionRound, setQuestionRound] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track whether the current question has already been timed out.
  // This prevents the timeout from firing more than once per question.
  const timedOutRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    if (topics.length === 0) return;
    setStatus("loading");
    try {
        const input: GenerateQuizQuestionsInput = { 
            topics,
            delivery,
            difficulty, 
            count: questionCount,
        };

      const result = await generateQuizQuestions(input);
      setQuestions(result.questions);
      setTotalQuestions(result.questions.length);
      setStatus("active");
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast({
        title: "Error",
        description: "Failed to generate the quiz. Please try again.",
        variant: "destructive",
      });
      router.push("/play");
    }
  }, [topics, delivery, difficulty, router, toast, questionCount]);

  useEffect(() => {
    if (topics.length > 0 && questions.length === 0 && status === "loading" && !loadingStartedRef.current) {
      loadingStartedRef.current = true;
      loadQuestions();
    }
  }, [topics.length, loadQuestions, questions.length, status]);

  // Use a ref for handleAnswerSubmit so the timeout effect doesn't
  // need it in its dependency array (which was causing cascading re-fires).
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const handleAnswerSubmit = useCallback((answer: string | null) => {
    if (statusRef.current !== 'active') return;
    clearTimer();
    setUserAnswer(answer);
    if (answer) {
      const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
      if (isCorrect) {
        setScore((prev) => prev + 1);
      }
    }
    setStatus("reviewing");
  }, [questions, currentQuestionIndex, clearTimer]);

  const handleAnswerSubmitRef = useRef(handleAnswerSubmit);
  useEffect(() => { handleAnswerSubmitRef.current = handleAnswerSubmit; }, [handleAnswerSubmit]);

  // Timer countdown effect — ONLY restarts when questionRound changes.
  // This avoids the cascade where status/handleAnswerSubmit changes
  // could cause the timer or timeout effects to re-fire.
  useEffect(() => {
    clearTimer();
    // Only start if we actually have questions loaded
    if (questions.length === 0) return;

    timedOutRef.current = false;
    setTimer(questionTimerSeconds);

    timerRef.current = setInterval(() => {
      setTimer(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionRound]);

  // Timer expiration effect — uses refs to avoid dependency on
  // handleAnswerSubmit or status, which would cause cascading re-fires.
  useEffect(() => {
    if (timer === 0 && statusRef.current === 'active' && !timedOutRef.current) {
      timedOutRef.current = true;
      handleAnswerSubmitRef.current(null);
    }
  }, [timer]);

  const handleNextQuestion = () => {
    if (status !== 'reviewing') return;
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      setCurrentQuestionIndex(nextIndex);
      setUserAnswer(null);
      setStatus("active");
      // Increment questionRound to trigger a clean timer restart via the effect
      setQuestionRound(prev => prev + 1);
    } else {
        const params = new URLSearchParams({
            score: score.toString(),
            total: totalQuestions.toString(),
            topic: topics.map(t => t.name).join(', '),
            difficulty,
        });
        const startYear = topics.find(t => t.startYear)?.startYear;
        if (startYear) {
             params.append('startYear', String(startYear));
        }
      router.push(`/quiz/results?${params.toString()}`);
    }
  };

  if (status === "loading" || questions.length === 0) {
    const topicNames = topics.map(t => t.name).join(', ');
    return <QuizLoading topic={topicNames} />;
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="w-full max-w-3xl flex flex-col items-center relative">
        <Button
            variant="outline"
            size="sm"
            className="absolute -top-12 right-0"
            onClick={() => router.push('/home')}
        >
            <X className="h-4 w-4 mr-2" />
            Quit Quiz
        </Button>
      <div className="w-full mb-8">
        <div className="flex justify-between items-center mb-2 font-headline">
            <div className="flex items-center gap-2 text-lg">
                <Timer className="h-5 w-5 text-primary"/>
                <span className={cn("font-bold", timer <= 3 && "text-destructive animate-pulse")}>{timer}s</span>
            </div>
          <p className="text-lg">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
          <p className="text-lg font-bold text-primary">Score: {score}</p>
        </div>
        <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-3" />
      </div>

      {currentQuestion && (
        <QuizQuestionCard
          key={`question-${currentQuestionIndex}-${currentQuestion.question}`}
          questionData={currentQuestion}
          onSubmit={handleAnswerSubmit}
          status={status}
          userAnswer={userAnswer}
        />
      )}

      {status === "reviewing" && (
        <Button onClick={handleNextQuestion} className="mt-8 text-lg py-6 px-12 shadow-lg animate-fade-in">
          {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "Finish Quiz"}
        </Button>
      )}
    </div>
  );
}
