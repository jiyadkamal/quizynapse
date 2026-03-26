"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { joinSession } from "@/services/multiplayer-service";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  sessionCode: z.string().length(6, {
    message: "Session code must be 6 characters.",
  }).regex(/^[a-zA-Z0-9]+$/, { message: "Code must be alphanumeric." }).transform(v => v.toUpperCase()),
  playerName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(20, { message: "Name must be 20 characters or less."}),
});


export function JoinMultiplayerForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionCode: "",
      playerName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const { playerId } = await joinSession(values.sessionCode, values.playerName);

        // Store player ID and name
        localStorage.setItem(`player-${values.sessionCode}`, playerId);
        localStorage.setItem(`playerName-${values.sessionCode}`, values.playerName);
      
        router.push(`/multiplayer/${values.sessionCode}/play`);

    } catch (error) {
        console.error("Failed to join session:", error);
        toast({
            title: "Error",
            description: (error as Error).message || "Failed to join the session. Please check the code and try again.",
            variant: "destructive",
        });
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <FormField
          control={form.control}
          name="sessionCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Code</FormLabel>
              <FormControl>
                <Input placeholder="ABCDEF" {...field} maxLength={6}  />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="playerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="QuizMaster" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Join Game'}
        </Button>
      </form>
    </Form>
  );
}
