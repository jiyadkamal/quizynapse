
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { onSnapshot, doc, collection, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { QuizQuestionCard } from "@/components/quiz-question-card";
import { submitAnswer, showLeaderboard, nextQuestion, terminateSession } from "@/services/multiplayer-service";
import { MultiplayerLeaderboard } from "./leaderboard";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import QuizLoading from "@/app/quiz/_components/quiz-loading";

interface Session {
    id: string;
    topics: string[];
    state: 'waiting' | 'active' | 'leaderboard' | 'finished';
    currentQuestionIndex: number;
    questions: any[];
    questionTimer: number;
    isHostControlled: boolean;
    questionStartTime: Timestamp | null;
    [key: string]: any;
}

interface Player {
    id: string;
    name: string;
    score: number;
}

const AUTO_MODE_LEADERBOARD_DELAY = 3000; // 3 seconds
const AUTO_MODE_NEXT_QUESTION_DELAY = 5000; // 5 seconds

export function GameView({ sessionCode }: { sessionCode: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [session, setSession] = useState<Session | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [quizStatus, setQuizStatus] = useState<'active' | 'reviewing'>('active');
    
    const [timer, setTimer] = useState(0);
    const timerRef =  useRef<NodeJS.Timeout | null>(null);
    const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [answeredPlayerCount, setAnsweredPlayerCount] = useState(0);

    const isPlaying = !!playerId;

    // Refs to avoid stale closures and prevent unnecessary effect re-runs
    const sessionDataRef = useRef<Session | null>(null);
    const quizStatusRef = useRef<'active' | 'reviewing'>('active');
    const prevQuestionIndexRef = useRef<number>(-1);
    const prevStateRef = useRef<string>('');
    const handleAnswerSubmitRef = useRef<(answer: string | null) => void>(() => {});

    // Keep refs in sync with state
    useEffect(() => { sessionDataRef.current = session; }, [session]);
    useEffect(() => { quizStatusRef.current = quizStatus; }, [quizStatus]);

    useEffect(() => {
        const hostCode = sessionStorage.getItem(`host-${sessionCode}`);
        setIsHost(hostCode === "true");

        const storedPlayerId = localStorage.getItem(`player-${sessionCode}`);
        setPlayerId(storedPlayerId);

    }, [sessionCode]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (autoAdvanceTimeoutRef.current) {
            clearTimeout(autoAdvanceTimeoutRef.current);
            autoAdvanceTimeoutRef.current = null;
        }
    }, []);

    const handleAnswerSubmit = useCallback(async (answer: string | null) => {
        const currentSession = sessionDataRef.current;
        if (!currentSession || !playerId || quizStatusRef.current === 'reviewing' || !isPlaying) return;

        clearTimer();
        setQuizStatus('reviewing');
        setUserAnswer(answer);
        
        const questionStartTime = currentSession.questionStartTime ? currentSession.questionStartTime.toMillis() : Date.now();
        const responseTimeMs = Date.now() - questionStartTime;

        try {
            if (answer) {
                 await submitAnswer(sessionCode, playerId, currentSession.currentQuestionIndex, answer, responseTimeMs);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not submit answer.", variant: "destructive" });
        }
    }, [playerId, sessionCode, toast, clearTimer, isPlaying]);

    // Keep ref in sync
    useEffect(() => { handleAnswerSubmitRef.current = handleAnswerSubmit; }, [handleAnswerSubmit]);


    // Subscribe to Firestore ONCE — use refs for previous value tracking
    useEffect(() => {
        const sessionRef = doc(db, 'sessions', sessionCode);
        const unsubscribeSession = onSnapshot(sessionRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const sessionData = { id: docSnapshot.id, ...docSnapshot.data() } as Session;
                
                const previousState = prevStateRef.current;
                const previousQuestionIndex = prevQuestionIndexRef.current;

                // Update refs before setting state
                prevStateRef.current = sessionData.state;
                prevQuestionIndexRef.current = sessionData.currentQuestionIndex;

                setSession(sessionData);
                
                if (sessionData.state === 'active' && previousQuestionIndex !== sessionData.currentQuestionIndex) {
                    setUserAnswer(null);
                    setQuizStatus('active');
                    setAnsweredPlayerCount(0);
                    clearTimer();
                }
                
                if (sessionData.state === 'finished' && previousState !== 'finished') {
                    router.push(`/multiplayer/${sessionCode}/results`);
                }
                
                setLoading(false);

            } else {
                setError("Session not found or terminated by host.");
                toast({ title: "Session ended", description: "This session does not exist or was ended by the host.", variant: "destructive" });
                router.push('/multiplayer');
            }
        }, (err) => {
             console.error("Session listener error:", err);
             setError("Could not connect to the session.");
             setLoading(false);
        });

        const playersQuery = query(collection(db, `sessions/${sessionCode}/players`), orderBy("score", "desc"));
        const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
            const playersData = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Player));
            setPlayers(playersData);
        }, (err) => {
             console.error("Players listener error:", err);
             toast({ title: "Error", description: "Could not load player data.", variant: "destructive" });
        });

        return () => {
            unsubscribeSession();
            unsubscribePlayers();
            clearTimer();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionCode]);
    
    // Timer effect — only re-run when the actual question changes or quiz status changes,
    // NOT on every Firestore update (which would reset the countdown)
    useEffect(() => {
        clearTimer();
        if (session && session.state === 'active' && quizStatus === 'active') {
            setTimer(session.questionTimer); 
            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearTimer();
                        if (isPlaying) {
                            handleAnswerSubmitRef.current(null);
                        } else {
                            setQuizStatus('reviewing');
                        }
                        return 0;
                    }
                    return prev - 1
                });
            }, 1000);
        }
        return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.state, session?.currentQuestionIndex, session?.questionTimer, quizStatus, clearTimer, isPlaying]);

    // Track number of players who answered — only re-subscribe when question changes
    useEffect(() => {
        if (!session || session.state !== 'active' || session.currentQuestionIndex < 0) {
            return;
        }
        const answersRef = collection(db, `sessions/${sessionCode}/questions/${session.currentQuestionIndex}/answers`);
        const unsubscribe = onSnapshot(answersRef, (snapshot) => {
            setAnsweredPlayerCount(snapshot.size);
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionCode, session?.state, session?.currentQuestionIndex]);

     // Effect for automatic game flow — use specific session fields to avoid re-triggering
    useEffect(() => {
        if (!session || session.isHostControlled || !isHost) {
            return;
        }

        // Transition from active question to leaderboard
        if (session.state === 'active' && quizStatus === 'reviewing') {
            autoAdvanceTimeoutRef.current = setTimeout(() => {
                showLeaderboard(sessionCode);
            }, AUTO_MODE_LEADERBOARD_DELAY);
        }

        // Transition from leaderboard to next question
        if (session.state === 'leaderboard') {
             autoAdvanceTimeoutRef.current = setTimeout(() => {
                nextQuestion(sessionCode);
            }, AUTO_MODE_NEXT_QUESTION_DELAY);
        }

        return () => {
            if (autoAdvanceTimeoutRef.current) {
                clearTimeout(autoAdvanceTimeoutRef.current);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.state, session?.isHostControlled, quizStatus, isHost, sessionCode]);
    
    const handleNext = async () => {
        if (!session || !isHost) return;

        try {
            if (session.state === 'leaderboard') {
                await nextQuestion(sessionCode);
            } else if (session.state === 'active' && quizStatus === 'reviewing') {
                await showLeaderboard(sessionCode);
            }
        } catch(e) {
            console.error("Failed to advance game state", e);
            toast({ title: "Error", description: "Could not proceed to the next step.", variant: "destructive" });
        }
    }

    const handleExit = async () => {
        if (isHost) {
            await terminateSession(sessionCode);
        } else {
            router.push('/home');
        }
    }

    if (loading || !session) {
        return <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Preparing your game...</div>;
    }

    if (error) {
        return <div className="text-destructive text-center">{error}</div>;
    }
    
    if (session.state === 'waiting') {
        return (
             <div className="text-center space-y-4">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary"/>
                <h1 className="text-3xl font-headline">Waiting for the host to start the game...</h1>
                <p className="text-muted-foreground">You are in the lobby for session: <span className="font-bold text-primary">{sessionCode}</span></p>
            </div>
        )
    }

    if (session.state === 'active' && (!session.questions || session.questions.length === 0)) {
        return (
           <QuizLoading topic={session.topics.map((t: any) => t.name || t).join(', ')} />
       )
    }

    const ExitButton = () => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="absolute -top-12 right-0">
                    <LogOut className="h-4 w-4 mr-2"/>
                    {isHost ? "End Session" : "Quit Game"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isHost ? 
                            "This will end the game for all players." :
                            "You will leave the game. Your score will be saved, but you won't be able to rejoin."
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExit} className={cn(isHost && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}>
                        {isHost ? "End Session" : "Quit"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    if (session.state === 'leaderboard') {
        return (
            <div className="w-full max-w-2xl relative">
                <ExitButton />
                <MultiplayerLeaderboard players={players} />
                {isHost && session.isHostControlled && (
                    <Button onClick={handleNext} className="w-full mt-4 text-lg py-6">
                        {session.currentQuestionIndex >= session.questions.length - 1 ? 'Show Final Results' : 'Next Question'}
                    </Button>
                )}
                 {!isHost && session.isHostControlled && (
                    <div className="text-center mt-4 text-muted-foreground animate-pulse">
                        Waiting for host to continue...
                    </div>
                )}
                 {!session.isHostControlled && (
                    <div className="text-center mt-4 text-muted-foreground animate-pulse">
                        Next question coming up...
                    </div>
                 )}
            </div>
        )
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
        return <div className="text-destructive text-center">Error: Current question not found. Waiting for host...</div>;
    }
    
    const totalPlayers = players.length;
    const canShowLeaderboard = timer === 0 || answeredPlayerCount === totalPlayers;

    return (
        <div className="w-full max-w-3xl relative">
            <ExitButton />
             <div className="w-full mb-8">
                <div className="flex justify-between items-center mb-2 font-headline">
                    <div className="flex items-center gap-2 text-lg">
                        <Timer className="h-5 w-5 text-primary"/>
                        <span className={cn("font-bold", timer <= 5 && "text-destructive animate-pulse")}>{timer}s</span>
                    </div>
                    <p className="text-lg">Question {session.currentQuestionIndex + 1} of {session.questions.length}</p>
                    {session.delivery === 'topic-wise' && <p className="text-lg font-bold text-primary">{typeof currentQuestion.topic === 'object' ? (currentQuestion.topic as any)?.name || 'Unknown' : currentQuestion.topic}</p>}
                </div>
                <Progress value={((session.currentQuestionIndex + 1) / session.questions.length) * 100} className="h-3" />
            </div>
            
            {isPlaying ? (
                <QuizQuestionCard
                    questionData={currentQuestion}
                    onSubmit={handleAnswerSubmit}
                    status={quizStatus}
                    userAnswer={userAnswer}
                />
            ) : (
                 <Card className="w-full shadow-lg animate-fade-in text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline leading-tight">{currentQuestion.question}</CardTitle>
                        <CardDescription>Players are answering... ({answeredPlayerCount}/{totalPlayers})</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </CardContent>
                </Card>
            )}


            {quizStatus === 'reviewing' && (
                <div className="mt-8 text-center">
                    {isHost && session.isHostControlled ? (
                        <Button 
                            onClick={handleNext} 
                            className="w-1/2 text-lg py-6 animate-fade-in"
                            disabled={!canShowLeaderboard}
                        >
                            {canShowLeaderboard ? 'Show Leaderboard' : `Waiting for players... (${answeredPlayerCount}/${totalPlayers})`}
                        </Button>
                    ) : (
                        <div className="text-muted-foreground animate-pulse text-lg">
                            {session.isHostControlled ? 'Waiting for host to show leaderboard...' : 'Revealing leaderboard...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

    
