
"use client";

import { Award, Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Player {
    id: string;
    name: string;
    score: number;
}

const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="text-yellow-500 w-6 h-6" />;
    if (rank === 1) return <Medal className="text-gray-400 w-6 h-6" />;
    if (rank === 2) return <Award className="text-yellow-700 w-6 h-6" />;
    return <span className="text-muted-foreground w-6 text-center">{rank + 1}</span>;
}

const getRowClass = (rank: number) => {
    if (rank === 0) return "bg-yellow-500/10";
    if (rank === 1) return "bg-gray-500/10";
    if (rank === 2) return "bg-yellow-700/10";
    return "";
}

export function MultiplayerLeaderboard({ players }: { players: Player[] }) {
    return (
        <Card className="w-full animate-fade-in">
            <CardHeader>
                <CardTitle className="text-3xl font-headline text-center">Leaderboard</CardTitle>
                <CardDescription className="text-center">Scores are updated in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
                 {players.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">Rank</TableHead>
                                <TableHead>Player</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player, index) => (
                                <TableRow key={player.id} className={cn(getRowClass(index))}>
                                    <TableCell className="font-bold flex justify-center items-center h-full">{getRankIcon(index)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{player.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">{player.score}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No scores yet. The first points are on the board!</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
