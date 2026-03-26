
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Loader2, X, PlusCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { createSession } from "@/services/multiplayer-service";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

const topicSchema = z.object({
  name: z.string().min(1),
  startYear: z.coerce
    .number()
    .min(1900, { message: "Year must be 1900 or later." })
    .max(new Date().getFullYear(), { message: `Year cannot be in the future.` })
    .int().optional(),
});

const formSchema = z.object({
  topics: z.array(topicSchema).min(1, {
    message: "Please add at least one topic.",
  }),
  delivery: z.enum(["topic-wise", "mixed"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  questionCount: z.number().min(1).max(10),
  questionTimer: z.number().min(5).max(60),
  isHostControlled: z.boolean().default(true),
  isHostPlaying: z.boolean().default(false),
  hostName: z.string().optional(),
}).refine(data => {
    if (data.isHostPlaying) {
        return !!data.hostName && data.hostName.length >= 2 && data.hostName.length <= 20;
    }
    return true;
}, {
    message: "Host name must be between 2 and 20 characters.",
    path: ["hostName"],
});


export function CreateMultiplayerForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [currentStartYear, setCurrentStartYear] = useState<number | undefined>(2012);
  const [enableCurrentStartYear, setEnableCurrentStartYear] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topics: [],
      delivery: "mixed",
      difficulty: "Easy",
      questionCount: 5,
      questionTimer: 15,
      isHostControlled: true,
      isHostPlaying: false,
      hostName: "",
    },
  });

  const isHostPlaying = form.watch("isHostPlaying");
  const topics = form.watch("topics");

  function handleAddTopic() {
    if (currentTopic.trim()) {
      const newTopic: z.infer<typeof topicSchema> = {
        name: currentTopic.trim(),
      };
       if (enableCurrentStartYear && currentStartYear) {
        newTopic.startYear = currentStartYear;
      }
      if (!topics.some(t => t.name.toLowerCase() === newTopic.name.toLowerCase())) {
         form.setValue("topics", [...topics, newTopic]);
         setCurrentTopic("");
      }
    }
  }

  function handleRemoveTopic(topicToRemove: string) {
     form.setValue("topics", topics.filter(topic => topic.name !== topicToRemove));
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const { sessionCode, hostPlayerId } = await createSession({
            ...values,
            hostName: values.isHostPlaying ? values.hostName : undefined,
        });

        // Mark this browser as the host.
        sessionStorage.setItem(`host-${sessionCode}`, "true");

        if (hostPlayerId) {
            // If the host is playing, store their player ID.
            localStorage.setItem(`player-${sessionCode}`, hostPlayerId);
        }

        router.push(`/multiplayer/${sessionCode}/host`);
    } catch (error) {
        console.error("Failed to create session:", error);
        toast({
            title: "Error",
            description: "Failed to create the session. Please try again.",
            variant: "destructive",
        });
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-8">
        <FormField
          control={form.control}
          name="topics"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topics</FormLabel>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                        placeholder="e.g., Football" 
                        value={currentTopic}
                        onChange={(e) => setCurrentTopic(e.target.value)}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTopic();
                            }
                        }}
                    />
                     <div className="flex items-center gap-2">
                        <Switch id="enable-year" checked={enableCurrentStartYear} onCheckedChange={setEnableCurrentStartYear} />
                        <Label htmlFor="enable-year" className="whitespace-nowrap">Since Year:</Label>
                         <Input 
                            type="number"
                            placeholder="e.g., 2012"
                            value={currentStartYear || ''}
                            onChange={(e) => setCurrentStartYear(parseInt(e.target.value))}
                            disabled={!enableCurrentStartYear}
                            className="w-28"
                        />
                    </div>
                     <Button type="button" variant="outline" onClick={handleAddTopic} disabled={!currentTopic.trim()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
              <FormDescription>
                Add one or more topics. Each can have an optional start year.
              </FormDescription>
              <FormMessage />
              <div className="flex flex-wrap gap-2 pt-2">
                {topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2 text-sm py-1">
                        <span>{topic.name} {topic.startYear && `(${topic.startYear})`}</span>
                        <button type="button" onClick={() => handleRemoveTopic(topic.name)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
              </div>
            </FormItem>
          )}
        />
        {topics.length > 1 && (
            <FormField
            control={form.control}
            name="delivery"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Question Delivery</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="mixed" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Mixed
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="topic-wise" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Topic-wise
                        </FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
        control={form.control}
        name="difficulty"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Difficulty</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="Select a difficulty" />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )}
        />
         <FormField
            control={form.control}
            name="questionCount"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Number of Questions Per Topic</FormLabel>
                    <div className="flex items-center gap-4">
                        <FormControl>
                            <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                className="w-full"
                            />
                        </FormControl>
                        <span className="font-bold text-lg w-12 text-center">{field.value}</span>
                    </div>
                     <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="questionTimer"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Question Timer (seconds)</FormLabel>
                    <div className="flex items-center gap-4">
                        <FormControl>
                            <Slider
                                min={5}
                                max={60}
                                step={1}
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                className="w-full"
                            />
                        </FormControl>
                        <span className="font-bold text-lg w-12 text-center">{field.value}s</span>
                    </div>
                     <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="isHostControlled"
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">
                        Host Controlled Game
                    </FormLabel>
                    <FormDescription>
                        If enabled, the host must manually advance the game.
                    </FormDescription>
                </div>
                <FormControl>
                <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
                </FormControl>
            </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="isHostPlaying"
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">
                        Join as Player
                    </FormLabel>
                    <FormDescription>
                        Enable this if you want to participate in the quiz.
                    </FormDescription>
                </div>
                <FormControl>
                <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
                </FormControl>
            </FormItem>
            )}
        />
        {isHostPlaying && (
             <FormField
                control={form.control}
                name="hostName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter your player name" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Session'}
        </Button>
      </form>
    </Form>
  );
}
