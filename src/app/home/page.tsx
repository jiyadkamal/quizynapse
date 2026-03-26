"use client";

import { BrainCircuit, Play, History, Users, Lock, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.2] p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-xl shadow-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center gap-4 mb-4">
            <BrainCircuit className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl font-headline">
              Quizynapse
            </h1>
          </div>
          <CardTitle className="text-2xl font-headline">Test Your Knowledge</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            An AI-powered quiz app to challenge yourself on any topic, or compete with friends in multiplayer.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center mt-4">
                <Button asChild size="lg" className="text-lg py-6 px-12">
                    <Link href="/play">
                        <Play className="mr-2" /> Single Player
                    </Link>
                </Button>
                <Button asChild size="lg" className="text-lg py-6 px-12">
                    <Link href="/multiplayer">
                        <Users className="mr-2" /> Multiplayer
                    </Link>
                </Button>
            </div>
             <Button asChild size="lg" variant="link" className="text-lg py-6 px-12 mt-2">
                <Link href="/history">
                    <History className="mr-2" /> View History
                </Link>
            </Button>
            <div className="mt-4 pt-4 border-t flex justify-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  try {
                    const { auth } = await import('@/lib/firebase');
                    const { signOut } = await import('firebase/auth');
                    await signOut(auth);
                    window.location.href = '/';
                  } catch (err) {
                    console.error("Logout failed:", err);
                  }
                }}
              >
                <LogOut className="mr-2 h-3 w-3" /> Logout
              </Button>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}
