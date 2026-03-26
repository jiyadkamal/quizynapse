"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, ArrowLeft, Trash2 } from 'lucide-react';

interface QuizHistory {
  topic: string;
  difficulty: string;
  startYear?: number;
  score: number;
  total: number;
  date: string;
}

export default function HistoryClientPage() {
  const router = useRouter();
  const [history, setHistory] = useState<QuizHistory[]>([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('quizHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('quizHistory');
    setHistory([]);
  };

  return (
    <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={() => router.push('/home')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Button>
            {history.length > 0 && (
                <Button variant="destructive" onClick={clearHistory}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear History
                </Button>
            )}
        </div>
        <Card className="w-full shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <History className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-3xl font-headline">Quiz History</CardTitle>
                        <CardDescription>A record of your past quizzes.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {history.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Topic</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Year Filter</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {history.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.topic}</TableCell>
                                <TableCell>{item.difficulty}</TableCell>
                                <TableCell>{item.startYear || 'Any'}</TableCell>
                                <TableCell>{item.score} / {item.total}</TableCell>
                                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-lg">No quiz history yet.</p>
                        <p>Go play a game to see your results here!</p>
                        <Button className="mt-4" onClick={() => router.push('/play')}>Play Now</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
