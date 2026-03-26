/**
 * @fileOverview Defines the data schemas and types for generating quiz questions.
 *
 * - GenerateQuizQuestionsInputSchema - Zod schema for the input to the quiz generation flow.
 * - GenerateQuizQuestionsInput - TypeScript type for the input.
 * - GenerateQuizQuestionsOutputSchema - Zod schema for the output of the quiz generation flow.
 * - GenerateQuizQuestionsOutput - TypeScript type for the output.
 */

import {z} from 'genkit';

const TopicSchema = z.object({
  name: z.string().describe('The name of the topic.'),
  startYear: z.number().optional().describe('The optional starting year for questions for this specific topic.'),
});

export const GenerateQuizQuestionsInputSchema = z.object({
  topics: z.array(TopicSchema).min(1).describe('The topics of the quiz questions, each with an optional start year.'),
  delivery: z.enum(['topic-wise', 'mixed']).describe('The question delivery mode.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('The difficulty level of the quiz questions.'),
  count: z.number().int().positive().describe('The number of questions to generate per topic.'),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const SingleQuestionSchema = z.object({
  topic: z.string().describe('The topic of this specific question.'),
  question: z.string().describe('The quiz question.'),
  options: z.array(z.string()).length(4).describe('The four multiple-choice options.'),
  correctAnswer: z.string().describe('The correct answer to the quiz question.'),
});
export type SingleQuestion = z.infer<typeof SingleQuestionSchema>;


export const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(SingleQuestionSchema).describe('The array of generated quiz questions.'),
});
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;
