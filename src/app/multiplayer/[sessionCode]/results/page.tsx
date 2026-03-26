
"use client";

import { MultiplayerLeaderboard } from "@/components/multiplayer/leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Trophy } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Player {
    id: string;
    name: string;
    score: number;
}

const ResultsLoading = () => (
    <Card className="w-full max-w-md text-center">
        <CardHeader>
            <Skeleton className="h-10 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-12 w-32 mx-auto" />
        </CardContent>
    </Card>
);


export default function MultiplayerResultsPage() {
    const router = useRouter();
    const params = useParams();
    const sessionCode = params.sessionCode as string;
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        if (!sessionCode) return;
        const playersQuery = query(collection(db, `sessions/${sessionCode}/players`), orderBy("score", "desc"));
        const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
            const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
            setPlayers(playersData);
            setLoading(false);
        });

        return () => {
            unsubscribePlayers();
        };
    }, [sessionCode]);

    if (loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <ResultsLoading />
            </main>
        )
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <Trophy className="h-16 w-16 mx-auto text-yellow-500"/>
                    <CardTitle className="text-4xl font-headline">Final Results</CardTitle>
                    <CardDescription>Congratulations to the winner!</CardDescription>
                </CardHeader>
                <CardContent>
                    <MultiplayerLeaderboard players={players} />
                    <Button onClick={() => router.push('/home')} className="w-full mt-6 text-lg py-6">
                        Play Again
                    </Button>
                </CardContent>
            </Card>
        </main>
    )
}
