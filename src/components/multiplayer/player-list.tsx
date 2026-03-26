
"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Player {
    id: string;
    name: string;
    avatar?: string;
}

export function PlayerList({ sessionCode }: { sessionCode: string }) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionCode) {
            setLoading(false);
            return;
        };

        const playersCollection = collection(db, `sessions/${sessionCode}/players`);
        const unsubscribe = onSnapshot(playersCollection, (snapshot) => {
            const playersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Player));
            setPlayers(playersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sessionCode]);

    if (loading) {
        return (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        )
    }

    if (players.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No players have joined yet.</p>
                <p>Waiting for the first player...</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {players.map(player => (
                <div key={player.id} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary">
                    <Avatar>
                        <AvatarImage src={player.avatar} />
                        <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate w-full text-center">{player.name}</span>
                </div>
            ))}
        </div>
    )
}
