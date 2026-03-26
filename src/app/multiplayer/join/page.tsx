import { JoinMultiplayerForm } from "@/components/multiplayer/join-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinMultiplayerPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="absolute top-4 left-4">
                <Button asChild variant="outline">
                    <Link href="/multiplayer">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back
                    </Link>
                </Button>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Join a Quiz Session</CardTitle>
                    <CardDescription>
                        Enter the 6-digit code from your host to join the game.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <JoinMultiplayerForm />
                </CardContent>
            </Card>
        </main>
    )
}
