
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ADMIN_EMAIL = "admin@gmail.com";

export function AuthGuard({ children, adminOnly = false }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else if (adminOnly && user.email?.toLowerCase() !== ADMIN_EMAIL) {
        router.push("/home");
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, adminOnly]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
