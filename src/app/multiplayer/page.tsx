import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Gamepad, Users } from "lucide-react";
import Link from "next/link";

export default function MultiplayerPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
             <div className="absolute top-4 left-4">
                <Button asChild variant="outline">
                    <Link href="/home">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back to Home
                    </Link>
                </Button>
            </div>
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Multiplayer</CardTitle>
                    <CardDescription>
                        Create a session and challenge your friends, or join an existing one.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button asChild size="lg" className="w-full text-lg py-8">
                        <Link href="/multiplayer/create">
                            <Gamepad className="mr-2"/>
                            Create Session
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary" className="w-full text-lg py-8">
                         <Link href="/multiplayer/join">
                            <Users className="mr-2"/>
                            Join Session
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    )
}
