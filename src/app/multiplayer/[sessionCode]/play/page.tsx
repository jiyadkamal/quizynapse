import { GameView } from "@/components/multiplayer/game-view";
import { Suspense, use } from "react";
import { AuthGuard } from "@/components/auth-guard";

export default function MultiplayerGamePage({ params }: { params: Promise<{ sessionCode: string }> }) {
    const { sessionCode } = use(params);

    return (
        <AuthGuard>
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Suspense fallback={<div>Loading game...</div>}>
                    <GameView sessionCode={sessionCode} />
                </Suspense>
            </main>
        </AuthGuard>
    )
}
