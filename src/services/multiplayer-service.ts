
'use server';

import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateQuizQuestions } from "@/ai/flows/generate-quiz-questions";

interface Topic {
    name: string;
    startYear?: number;
}

interface CreateSessionOptions {
    topics: Topic[];
    delivery: "topic-wise" | "mixed";
    difficulty: "Easy" | "Medium" | "Hard";
    questionCount: number;
    questionTimer: number;
    isHostControlled: boolean;
    isHostPlaying?: boolean;
    hostName?: string;
}

// Function to generate a unique 6-digit alphanumeric code
const generateSessionCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export async function createSession(options: CreateSessionOptions): Promise<{ sessionCode: string, hostPlayerId?: string }> {
    const { topics, delivery, difficulty, questionCount, questionTimer, isHostControlled, isHostPlaying, hostName } = options;

    let sessionCode: string;
    let sessionDoc;
    const sessionsCollection = db.collection("sessions");
    
    // Ensure the generated code is unique
    do {
        sessionCode = generateSessionCode();
        try {
            sessionDoc = await sessionsCollection.doc(sessionCode).get();
        } catch (error) {
            console.error("Firestore get() failed:", error);
            throw new Error("Failed to check for existing session in Firestore. The database may be offline or misconfigured.");
        }
    } while (sessionDoc.exists);

    const sessionData: { [key: string]: any } = {
        topics,
        delivery,
        difficulty,
        questionCount,
        questionTimer,
        isHostControlled,
        questions: [], // Questions will be generated when the game starts
        createdAt: FieldValue.serverTimestamp(),
        state: 'waiting', // States: waiting, active, leaderboard, finished
        currentQuestionIndex: -1,
        questionStartTime: null,
        hostPlayerId: null,
    };

    await sessionsCollection.doc(sessionCode).set(sessionData);

    let hostPlayerId: string | undefined = undefined;
    if (isHostPlaying && hostName) {
        const playerDocRef = await db.collection(`sessions/${sessionCode}/players`).add({
            name: hostName,
            score: 0,
            isHost: true,
            joinedAt: FieldValue.serverTimestamp(),
        });
        hostPlayerId = playerDocRef.id;
        await sessionsCollection.doc(sessionCode).update({ hostPlayerId });
    }

    return { sessionCode, hostPlayerId };
}

export async function joinSession(sessionCode: string, playerName: string): Promise<{ playerId: string }> {
    const sessionRef = db.collection("sessions").doc(sessionCode);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new Error("Session not found.");
    }
    
    const sessionData = sessionDoc.data();
    if (sessionData?.state !== 'waiting') {
        throw new Error("This game has already started and cannot be joined.");
    }

    const playersCollection = db.collection(`sessions/${sessionCode}/players`);
    const playerDocRef = await playersCollection.add({
        name: playerName,
        score: 0,
        isHost: false,
        joinedAt: FieldValue.serverTimestamp(),
    });

    return { playerId: playerDocRef.id };
}

export async function startGame(sessionCode: string) {
    const sessionRef = db.collection("sessions").doc(sessionCode);
    
    // Update the state to 'active' immediately, so clients know the game has started
    // and can show the "Generating Questions" screen.
    await sessionRef.update({
        state: 'active',
    });

    // Await question generation. The client already shows a loading screen
    // while state is 'active' and questions are empty.
    // NOTE: This must be awaited because Next.js server actions terminate
    // background work when the response is sent, causing ECONNRESET errors.
    await generateAndSetQuestions(sessionCode);
}

async function generateAndSetQuestions(sessionCode: string) {
     const sessionRef = db.collection("sessions").doc(sessionCode);
     try {
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) throw new Error("Session not found during question generation.");
        const sessionData = sessionDoc.data();
        if (!sessionData) throw new Error("Session data not found during question generation.");

        // Retry logic for AI model 503 errors (high demand)
        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const questionsPayload = await generateQuizQuestions({
                    topics: sessionData.topics,
                    delivery: sessionData.delivery,
                    difficulty: sessionData.difficulty,
                    count: sessionData.questionCount,
                });

                // Once questions are generated, update the document.
                // This will trigger the listener on the clients to display the first question.
                await sessionRef.update({
                    questions: questionsPayload.questions,
                    currentQuestionIndex: 0,
                    questionStartTime: FieldValue.serverTimestamp(),
                });
                return; // Success — exit the function
            } catch (genError) {
                lastError = genError instanceof Error ? genError : new Error(String(genError));
                const errorMessage = lastError.message || '';
                const isRetryable = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand') || errorMessage.includes('RESOURCE_EXHAUSTED');
                
                if (isRetryable && attempt < MAX_RETRIES - 1) {
                    const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
                    console.warn(`AI model unavailable (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw lastError; // Non-retryable error or last attempt — propagate
                }
            }
        }
     } catch(error) {
        console.error("Failed to generate and set questions:", error);
        // Set the session to an error state so the host can see what happened
        // instead of abruptly deleting the session.
        try {
            await sessionRef.update({
                state: 'error',
                errorMessage: `Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        } catch (updateError) {
            console.error("Failed to update session with error state:", updateError);
        }
     }
}



export async function submitAnswer(sessionCode: string, playerId: string, questionIndex: number, answer: string, responseTimeMs: number) {
    const sessionRef = db.collection("sessions").doc(sessionCode);
    const playerRef = db.collection(`sessions/${sessionCode}/players`).doc(playerId);
    // Use playerId as the answer document ID to naturally prevent duplicate submissions
    const answerDocRef = db.collection(`sessions/${sessionCode}/questions/${questionIndex}/answers`).doc(playerId);

    console.log(`[submitAnswer] Player ${playerId} answering Q${questionIndex} in session ${sessionCode}. Answer: "${answer}", responseTimeMs: ${responseTimeMs}`);

    // Check if already answered (using the deterministic doc ID)
    const existingAnswer = await answerDocRef.get();
    if (existingAnswer.exists) {
        console.log(`[submitAnswer] Player ${playerId} already answered Q${questionIndex}. Skipping.`);
        return;
    }

    // Read session data to check the correct answer
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
        throw new Error("Session not found.");
    }

    const sessionData = sessionDoc.data();
    if (!sessionData) {
        throw new Error("Session data not found.");
    }

    const question = sessionData.questions[questionIndex];
    const isCorrect = question.correctAnswer === answer;

    let points = 0;
    if (isCorrect) {
        // Points are based on correctness and speed. Max 100 points for speed.
        const timePenalty = Math.floor(responseTimeMs / (sessionData.questionTimer * 10));
        points = 100 + Math.max(0, 100 - timePenalty);
    }

    console.log(`[submitAnswer] Player ${playerId}: isCorrect=${isCorrect}, points=${points}, correctAnswer="${question.correctAnswer}"`);

    // Write the answer document (keyed by playerId, so it's idempotent)
    await answerDocRef.set({
        playerId,
        answer,
        isCorrect,
        points,
        responseTimeMs,
    });

    // Update player's total score if they got it right
    if (points > 0) {
        await playerRef.update({ score: FieldValue.increment(points) });
        console.log(`[submitAnswer] Player ${playerId}: score incremented by ${points}`);
    }
}

export async function nextQuestion(sessionCode: string) {
    const sessionRef = db.collection("sessions").doc(sessionCode);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) throw new Error("Session not found");

    const session = sessionDoc.data();
    if (!session) throw new Error("Session data not found");

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
        // All questions are done, finish the game
        await sessionRef.update({ state: 'finished' });
    } else {
        // Move to the next question
        await sessionRef.update({
            state: 'active',
            currentQuestionIndex: nextIndex,
            questionStartTime: FieldValue.serverTimestamp(),
        });
    }
}

export async function showLeaderboard(sessionCode: string) {
     const sessionRef = db.collection("sessions").doc(sessionCode);
     await sessionRef.update({
        state: 'leaderboard'
     });
}

export async function terminateSession(sessionCode: string): Promise<void> {
    try {
        const sessionRef = db.collection("sessions").doc(sessionCode);
        
        // Firestore does not support deleting subcollections from a server-side SDK directly.
        // For a production app, a Cloud Function triggered on document deletion would be
        // needed to clean up the 'players' and 'questions' subcollections.
        // For this project, we will just delete the main session document.
        // Players will be kicked out because their listeners will fail.

        await sessionRef.delete();
        console.log(`Session ${sessionCode} terminated.`);
    } catch (error) {
        console.error(`Failed to terminate session ${sessionCode}:`, error);
        // We don't throw here to avoid a client-side error for a best-effort cleanup task.
    }
}
