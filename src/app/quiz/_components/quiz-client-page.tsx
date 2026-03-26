"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const topicParams = searchParams.getAll("topic") || [];
  const topics: Topic[] = topicParams.map(tp => {
    const parts = tp.split(':');
    return parts.length > 1 ? { name: parts[0], startYear: Number(parts[1]) } : { name: parts[0] };
  });
  const delivery = (searchParams.get("delivery") as "topic-wise" | "mixed") || "mixed";
  const difficulty = (searchParams.get("difficulty") as "Easy" | "Medium" | "Hard") || "Easy";
  const questionCountPerTopic = parseInt(searchParams.get("questionCount") || '5', 10);
  
  const totalQuestions = topics.length * questionCountPerTopic;
  const questionTimerSeconds = getTimerDuration(difficulty);
  const [timer, setTimer] = useState(questionTimerSeconds);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const loadQuestions = useCallback(async () => {
    setStatus("loading");
    try {
        const input: GenerateQuizQuestionsInput = { 
            topics,
            delivery,
            difficulty, 
            count: questionCountPerTopic,
        };

      const result = await generateQuizQuestions(input);
      setQuestions(result.questions);
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
  }, [topics, delivery, difficulty, router, toast, questionCountPerTopic]);

  useEffect(() => {
    if (topics.length > 0 && questions.length === 0) {
      loadQuestions();
    }
  }, [topics, loadQuestions, questions.length]);

  const handleAnswerSubmit = useCallback((answer: string | null) => {
    clearTimer();
    setUserAnswer(answer);
    if (answer) {
      const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
      if (isCorrect) {
        setScore((prev) => prev + 1);
      }
    }
    setStatus("reviewing");
  }, [questions, currentQuestionIndex]);

  useEffect(() => {
    if (status === 'active') {
      setTimer(questionTimerSeconds);
      timerRef.current = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);

      return () => clearTimer();
    }
  }, [status, currentQuestionIndex, questionTimerSeconds]);

  useEffect(() => {
    if (timer === 0 && status === 'active') {
      handleAnswerSubmit(null); // Timeout
    }
  }, [timer, status, handleAnswerSubmit]);

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      setCurrentQuestionIndex(nextIndex);
      setStatus("active");
      setUserAnswer(null);
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
          key={currentQuestion.question}
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
