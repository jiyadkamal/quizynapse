"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { SingleQuestion } from '@/ai/schemas/quiz-schema';
import { Badge } from './ui/badge';

type QuizQuestionCardProps = {
  questionData: SingleQuestion;
  onSubmit: (answer: string) => void;
  status: 'active' | 'reviewing';
  userAnswer: string | null;
};

export function QuizQuestionCard({ questionData, onSubmit, status, userAnswer }: QuizQuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption);
    }
  };

  const getOptionStyle = (option: string) => {
    if (status !== 'reviewing') return 'border-border hover:bg-accent/50';

    const isCorrectAnswer = option === questionData.correctAnswer;
    const isSelectedAnswer = option === userAnswer;

    if (isCorrectAnswer) return 'border-green-500 bg-green-500/10 text-green-700 font-semibold';
    if (isSelectedAnswer) return 'border-destructive bg-destructive/10 text-destructive font-semibold';
    return 'border-border opacity-60';
  };

  const getOptionIcon = (option: string) => {
    if (status !== 'reviewing') return null;
    const isCorrectAnswer = option === questionData.correctAnswer;
    const isSelectedAnswer = option === userAnswer;
    if (isCorrectAnswer) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isSelectedAnswer) return <XCircle className="h-5 w-5 text-destructive" />;
    return null;
  }

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <Badge variant="outline">Topic: {typeof questionData.topic === 'object' ? (questionData.topic as any)?.name || 'Unknown' : questionData.topic}</Badge>
            <CardDescription>Select the correct answer below.</CardDescription>
        </div>
        <CardTitle className="text-2xl font-headline leading-tight pt-2">{questionData.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedOption || ''}
          onValueChange={setSelectedOption}
          disabled={status === 'reviewing'}
          className="space-y-4"
        >
          {questionData.options.map((option, index) => (
            <Label
              key={index}
              htmlFor={`option-${index}`}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4 text-base transition-all cursor-pointer",
                getOptionStyle(option),
                selectedOption === option && status === 'active' && 'border-primary ring-2 ring-primary'
              )}
            >
              <span className="flex-1">{option}</span>
              {getOptionIcon(option)}
              <RadioGroupItem value={option} id={`option-${index}`} className="sr-only" />
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        {status === 'active' && (
          <Button onClick={handleSubmit} disabled={!selectedOption} className="w-full text-lg py-6">
            Submit Answer
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}