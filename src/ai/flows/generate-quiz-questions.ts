'use server';

/**
 * @fileOverview Generates multiple-choice quiz questions based on user-specified topics, delivery mode, difficulty, and optional starting year.
 *
 * - generateQuizQuestions - A function that handles the quiz question generation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    GenerateQuizQuestionsInputSchema,
    type GenerateQuizQuestionsInput,
    GenerateQuizQuestionsOutputSchema,
    type GenerateQuizQuestionsOutput,
    type SingleQuestion,
} from '@/ai/schemas/quiz-schema';

export async function generateQuizQuestions(input: GenerateQuizQuestionsInput): Promise<GenerateQuizQuestionsOutput> {
  return generateQuizQuestionsFlow(input);
}

const generateSingleTopicPrompt = ai.definePrompt({
  name: 'generateSingleTopicPrompt',
  input: {schema: z.object({
    topic: z.string(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    count: z.number(),
    startYear: z.number().optional(),
    existingQuestions: z.array(z.string()).optional().describe('A list of already generated question texts to avoid duplicates.'),
  })},
  output: {schema: GenerateQuizQuestionsOutputSchema},
  prompt: `You are an expert quiz question generator. Your primary goal is to create high-quality, factually accurate, and distinct quiz questions.

Generate {{count}} completely unique multiple-choice quiz questions for the topic below.

Topic: {{{topic}}}
Difficulty: {{{difficulty}}}

Interpret the difficulty levels as follows:
- Easy: Questions that a casual enthusiast would likely know.
- Medium: Questions that require more detailed knowledge.
- Hard: Questions that are obscure, nuanced, and would challenge an expert. The options should be very similar to mislead the user.

{{#if startYear}}
The quiz questions must be factually accurate and relevant ONLY from the specified starting year of {{{startYear}}} onward. Do not generate questions about events or facts from before this year.
{{/if}}

{{#if existingQuestions}}
You must generate questions that are different from the following already created questions:
{{#each existingQuestions}}
- {{this}}
{{/each}}
{{/if}}

Please be extremely cautious and double-check all facts. Each question must be unique and have four logical multiple-choice options, with only one being the correct answer.
Crucially, the options provided must be logical. Do not include the answer in the question's options.

Return the questions, their options, and the correct answers in the specified JSON format.
`,
});

// Helper function to shuffle an array
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async (input) => {
    const { topics, difficulty, count: totalCount, delivery } = input;
    let allQuestions: SingleQuestion[] = [];

    // Calculate questions per topic
    const baseCount = Math.floor(totalCount / topics.length);
    const remainder = totalCount % topics.length;

    // Generate questions for each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      // Distribute the remainder across the first few topics
      const countForThisTopic = baseCount + (i < remainder ? 1 : 0);
      
      if (countForThisTopic === 0) continue;

      const existingQuestionTexts = allQuestions.map(q => q.question);
      const result = await generateSingleTopicPrompt({
        topic: topic.name,
        difficulty,
        count: countForThisTopic,
        startYear: topic.startYear,
        existingQuestions: existingQuestionTexts,
      });
      
      const newQuestions = result.output?.questions || [];
      // Add the topic to each question object
      const questionsWithTopic = newQuestions.map(q => ({ ...q, topic: topic.name }));
      // Truncate to exactly the requested count for this topic
      allQuestions.push(...questionsWithTopic.slice(0, countForThisTopic));
    }

    // If delivery is mixed, shuffle the questions
    if (delivery === 'mixed') {
      allQuestions = shuffle(allQuestions);
    }

    // Final safety: ensure total count is exactly totalCount
    if (allQuestions.length > totalCount) {
      allQuestions = allQuestions.slice(0, totalCount);
    }

    return { questions: allQuestions };
  }
);
