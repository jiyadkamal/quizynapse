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
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

const topicSchema = z.object({
  name: z.string().min(1),
  startYear: z.coerce
    .number()
    .min(1900, { message: "Year must be 1900 or later." })
    .max(new Date().getFullYear(), { message: `Year cannot be in the future.` })
    .int().optional(),
  enableStartYear: z.boolean().optional(),
}).refine(data => {
    if (data.enableStartYear) {
        return data.startYear !== undefined;
    }
    return true;
}, {
    message: "Start year is required when the toggle is on.",
    path: ["startYear"],
});

const formSchema = z.object({
  topics: z.array(topicSchema).min(1, {
    message: "Please add at least one topic.",
  }),
  delivery: z.enum(["topic-wise", "mixed"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  questionCount: z.number().min(1).max(10),
});

export function QuizForm() {
  const router = useRouter();
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
    },
  });

  const topics = form.watch("topics");

  function handleAddTopic() {
    if (currentTopic.trim()) {
      const newTopic: z.infer<typeof topicSchema> = {
        name: currentTopic.trim(),
      };
      if (enableCurrentStartYear && currentStartYear) {
        newTopic.startYear = currentStartYear;
      }
      // Check for duplicates
      if (!topics.some(t => t.name.toLowerCase() === newTopic.name.toLowerCase())) {
         form.setValue("topics", [...topics, newTopic]);
         setCurrentTopic("");
      }
    }
  }

  function handleRemoveTopic(topicToRemove: string) {
     form.setValue("topics", topics.filter(topic => topic.name !== topicToRemove));
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const params = new URLSearchParams();
    values.topics.forEach(topic => {
        const topicValue = topic.startYear ? `${topic.name}:${topic.startYear}` : topic.name;
        params.append("topic", topicValue)
    });
    params.append("delivery", values.delivery);
    params.append("difficulty", values.difficulty);
    params.append("questionCount", values.questionCount.toString());
    
    router.push(`/quiz?${params.toString()}`);
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
                Add one or more topics for your quiz. Each can have an optional start year.
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
                        Mixed (Randomized questions from all topics)
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="topic-wise" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Topic-wise (Grouped questions by topic)
                        </FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
        </div>
        <FormField
            control={form.control}
            name="questionCount"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Number of Questions</FormLabel>
                    <div className="flex items-center gap-4">
                        <FormControl>
                            <Slider
                                min={1}
                                max={20}
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
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Start Quiz'}
        </Button>
      </form>
    </Form>
  );
}
