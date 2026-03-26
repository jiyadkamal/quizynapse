"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, Loader2, LogIn, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Account created!", description: "Welcome to Quizynapse!" });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Redirecting..." });
      }

      const user = userCredential.user;
      if (user.email === "admin@gmail.com") {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
      } else if (error.code === "auth/email-already-in-use") {
        message = "An account with this email already exists.";
      } else if (error.code === "auth/weak-password") {
        message = "Password must be at least 6 characters.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.2] p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Decorative background blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-card/95 border-border/50 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BrainCircuit className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-headline tracking-tight">Quizynapse</CardTitle>
            <CardDescription className="text-base mt-2">
              {isSignUp ? "Create an account to start playing." : "Sign in to start playing quizzes."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-background/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold mt-2 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="mr-2 h-5 w-5" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
