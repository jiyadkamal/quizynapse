"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BrainCircuit, LogOut, Users, BarChart3, PieChart, Activity,
  TrendingUp, Loader2, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { AuthGuard } from "@/components/auth-guard";

const CHART_COLORS = [
  "hsl(197, 71%, 53%)",  // primary blue
  "hsl(173, 58%, 39%)",  // teal
  "hsl(47, 100%, 69%)",  // accent gold
  "hsl(12, 76%, 61%)",   // coral
  "hsl(280, 65%, 60%)",  // purple
  "hsl(340, 75%, 55%)",  // pink
  "hsl(160, 60%, 45%)",  // green
  "hsl(30, 80%, 55%)",   // orange
];

interface SessionData {
  topics: any;
  difficulty: string;
  questionCount: number;
  createdAt: any;
  state: string;
  delivery?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch session data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsQuery = query(
          collection(db, "sessions"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(sessionsQuery);
        const data = snapshot.docs.map(doc => doc.data() as SessionData);
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  // ── Derived Analytics Data ──

  // Topic popularity
  const topicCounts: Record<string, number> = {};
  sessions.forEach(s => {
    const topics = s.topics;
    if (Array.isArray(topics)) {
      topics.forEach((t: any) => {
        const name = typeof t === "object" ? t.name : t;
        if (name) topicCounts[name] = (topicCounts[name] || 0) + 1;
      });
    } else if (typeof topics === "string") {
      topicCounts[topics] = (topicCounts[topics] || 0) + 1;
    }
  });
  const topicData = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Difficulty distribution
  const difficultyCounts: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.difficulty) {
      difficultyCounts[s.difficulty] = (difficultyCounts[s.difficulty] || 0) + 1;
    }
  });
  const difficultyData = Object.entries(difficultyCounts).map(([name, value]) => ({ name, value }));
  const difficultyColors: Record<string, string> = {
    Easy: "hsl(160, 60%, 45%)",
    Medium: "hsl(47, 100%, 69%)",
    Hard: "hsl(12, 76%, 61%)",
  };

  // Sessions over time (last 7 days)
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const sessionsPerDay: Record<string, number> = {};
  last7Days.forEach(d => (sessionsPerDay[d] = 0));
  sessions.forEach(s => {
    if (s.createdAt?.toDate) {
      const dateStr = s.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (sessionsPerDay[dateStr] !== undefined) {
        sessionsPerDay[dateStr]++;
      }
    }
  });
  const activityData = last7Days.map(date => ({ date, sessions: sessionsPerDay[date] || 0 }));

  // Questions per session distribution
  const questionCountDist: Record<number, number> = {};
  sessions.forEach(s => {
    const count = s.questionCount || 5;
    questionCountDist[count] = (questionCountDist[count] || 0) + 1;
  });
  const questionCountData = Object.entries(questionCountDist)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([questions, count]) => ({ questions: `${questions}Q`, count }));

  // Session state distribution
  const stateCounts: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.state) {
      const label = s.state.charAt(0).toUpperCase() + s.state.slice(1);
      stateCounts[label] = (stateCounts[label] || 0) + 1;
    }
  });
  const stateData = Object.entries(stateCounts).map(([name, value]) => ({ name, value }));

  // Summary stats
  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, s) => sum + (s.questionCount || 0), 0);
  const uniqueTopics = Object.keys(topicCounts).length;
  const activeSessions = sessions.filter(s => s.state === "active" || s.state === "waiting").length;

  return (
    <AuthGuard adminOnly>
      <main className="min-h-screen bg-background relative overflow-hidden">
        {/* Decorative background effects */}
        <div className="absolute inset-0 bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.2] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 relative">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-bold font-headline tracking-tight">Quizynapse Admin</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
              </Button>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-4 md:p-6 space-y-6 relative z-10">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Sessions", value: totalSessions, icon: Activity, color: "text-primary" },
              { label: "Questions Generated", value: totalQuestions, icon: BarChart3, color: "text-blue-400" },
              { label: "Unique Topics", value: uniqueTopics, icon: PieChart, color: "text-indigo-400" },
              { label: "Active Now", value: activeSessions, icon: Users, color: "text-cyan-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className={`h-5 w-5 ${color}`} />
                </CardHeader>
                <CardContent>
                  {dataLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold font-headline">{value}</p>
                  )}
                </CardContent>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${color.replace('text-', 'via-')}/30 to-transparent`} />
              </Card>
            ))}
          </div>

          {/* Charts */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="topics" className="gap-2">
                <PieChart className="h-4 w-4" /> Topics
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Activity Over Time */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Quiz Activity</CardTitle>
                    <CardDescription>Sessions created in the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={activityData}>
                          <defs>
                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(197, 71%, 53%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(197, 71%, 53%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="sessions"
                            stroke="hsl(197, 71%, 53%)"
                            strokeWidth={2}
                            fill="url(#colorSessions)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Difficulty Distribution */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Difficulty Distribution</CardTitle>
                    <CardDescription>Breakdown by difficulty level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : difficultyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                          <Pie
                            data={difficultyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {difficultyData.map((entry) => (
                              <Cell key={entry.name} fill={difficultyColors[entry.name] || CHART_COLORS[0]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Topic Popularity Bar Chart */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Topic Popularity</CardTitle>
                    <CardDescription>Most played quiz topics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[350px] w-full" />
                    ) : topicData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={topicData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Sessions">
                            {topicData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        No topic data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Topic Pie Chart */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Topic Share</CardTitle>
                    <CardDescription>Distribution of topics across all sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[350px] w-full" />
                    ) : topicData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPie>
                          <Pie
                            data={topicData}
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {topicData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        No topic data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Questions Per Session */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Questions Per Session</CardTitle>
                    <CardDescription>How many questions users choose per quiz</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : questionCountData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={questionCountData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="questions" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} name="Sessions" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Session States */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline text-primary">Session Status</CardTitle>
                    <CardDescription>Current state of all sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : stateData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                          <Pie
                            data={stateData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {stateData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AuthGuard>
  );
}
