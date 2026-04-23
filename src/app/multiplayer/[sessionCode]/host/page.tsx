
"use client";

import { PlayerList } from "@/components/multiplayer/player-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startGame, terminateSession } from "@/services/multiplayer-service";
import { Share2, Loader2, LogOut } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
} from "@/components/ui/alert-dialog"
import { AuthGuard } from "@/components/auth-guard";

export default function HostPage() {
    const router = useRouter();
    const params = useParams();
    const sessionCode = params.sessionCode as string;
    const { toast } = useToast();
    const [isStarting, setIsStarting] = useState(false);
    const [isTerminating, setIsTerminating] = useState(false);
    const [playerCount, setPlayerCount] = useState(0);

    const handleBeforeUnload = useCallback(async (event: BeforeUnloadEvent) => {
        if (sessionCode) {
            await terminateSession(sessionCode);
        }
        event.preventDefault();
        event.returnValue = '';
    }, [sessionCode]);

    useEffect(() => {
        if (!sessionCode) return;
        const sessionRef = doc(db, 'sessions', sessionCode);
        const unsubscribeSession = onSnapshot(sessionRef, (doc) => {
            if (!doc.exists()) {
                toast({
                    title: "Session Expired",
                    description: "This quiz session has been terminated.",
                    variant: "destructive",
                });
                router.push('/multiplayer');
            } else {
                const sessionData = doc.data();
                if (sessionData.state === 'active' || sessionData.state === 'leaderboard' || sessionData.state === 'finished' || sessionData.state === 'error') {
                    router.push(`/multiplayer/${sessionCode}/play`);
                }
            }
        }, (error) => {
            console.error("Session listener error:", error);
            toast({
                title: "Connection Error",
                description: "Could not connect to the session. Please check your Firestore security rules allow read access to the 'sessions' collection.",
                variant: "destructive",
            });
        });

        const playersCollection = collection(db, `sessions/${sessionCode}/players`);
        const unsubscribePlayers = onSnapshot(playersCollection, (snapshot) => {
            setPlayerCount(snapshot.size);
        }, (error) => {
            console.error("Players listener error:", error);
        });
        
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribeSession();
            unsubscribePlayers();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [sessionCode, router, toast, handleBeforeUnload]);

    const handleStartGame = async () => {
        const isHostPlaying = !!sessionStorage.getItem(`player-${sessionCode}`);
        if (isHostPlaying && playerCount < 1) {
             toast({
                title: "Cannot start game",
                description: `You are the only player. Wait for others to join.`,
                variant: "destructive",
            })
            return;
        }
        if (!isHostPlaying && playerCount < 1) {
             toast({
                title: "Cannot start game",
                description: `You need at least one player to start the game.`,
                variant: "destructive",
            })
            return;
        }

        setIsStarting(true);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        try {
            // Don't await - startGame now awaits question generation server-side.
            // The onSnapshot listener above will detect state='active' and navigate
            // to the play page automatically. We just need to kick it off.
            startGame(sessionCode).catch((error) => {
                console.error("Failed to start game:", error);
                toast({
                    title: "Error",
                    description: "Failed to start the game. Please try again.",
                    variant: "destructive",
                });
                setIsStarting(false);
                window.addEventListener('beforeunload', handleBeforeUnload);
            });
        } catch (error) {
            console.error("Failed to start game:", error);
            toast({
                title: "Error",
                description: "Failed to start the game. Please try again.",
                variant: "destructive",
            });
            setIsStarting(false);
            window.addEventListener('beforeunload', handleBeforeUnload);
        }
    };

    const handleTerminateSession = async () => {
        setIsTerminating(true);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        try {
            await terminateSession(sessionCode);
            toast({
                title: "Session Terminated",
                description: "You have ended the session for all players."
            });
            router.push('/multiplayer');
        } catch (error) {
            console.error("Failed to terminate session:", error);
            toast({
                title: "Error",
                description: "Failed to terminate the session. Please try again.",
                variant: "destructive",
            });
            setIsTerminating(false);
             window.addEventListener('beforeunload', handleBeforeUnload);
        }
    }
    
    const handleShare = () => {
        const joinUrl = `${window.location.origin}/multiplayer/join?code=${sessionCode}`;
        navigator.clipboard.writeText(joinUrl);
        toast({
            title: "Copied to clipboard!",
            description: "The join link has been copied to your clipboard."
        })
    }

    return (
        <AuthGuard>
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="text-4xl font-headline">Waiting for Players</CardTitle>
                        <CardDescription>Share this code or link with your friends to join.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-center gap-4">
                            <div className="text-5xl font-bold tracking-widest p-4 border-2 border-dashed rounded-lg bg-muted">
                                {sessionCode}
                            </div>
                            <Button variant="outline" size="icon" onClick={handleShare}>
                                <Share2 className="h-5 w-5"/>
                            </Button>
                        </div>
                        <PlayerList sessionCode={sessionCode} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="lg" className="text-lg py-6" disabled={isTerminating || isStarting}>
                                         {isTerminating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut />}
                                        End Session
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently end the session
                                        for all players.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleTerminateSession}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button size="lg" className="w-full text-lg py-6" onClick={handleStartGame} disabled={isStarting || isTerminating}>
                                {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Start Game (${playerCount} players)`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AuthGuard>
    )
}
