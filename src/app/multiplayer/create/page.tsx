import { CreateMultiplayerForm } from "@/components/multiplayer/create-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateMultiplayerPage() {
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
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Create a Multiplayer Quiz</CardTitle>
                    <CardDescription>
                        Customize your quiz and invite your friends to play.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateMultiplayerForm />
                </CardContent>
            </Card>
        </main>
    )
}
