import { GoogleGenAI, Type } from "@google/genai";
import { StudyMaterials } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

// Fix: Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const studyMaterialsSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, well-structured summary of the topic, formatted with paragraphs. Should be at least 3 paragraphs long.",
        },
        flashcards: {
            type: Type.ARRAY,
            description: "A set of 10-15 flashcards.",
            items: {
                type: Type.OBJECT,
                properties: {
                    term: {
                        type: Type.STRING,
                        description: "The key term, concept, or question for the front of the flashcard.",
                    },
                    definition: {
                        type: Type.STRING,
                        description: "The detailed definition or answer for the back of the flashcard.",
                    },
                },
                required: ["term", "definition"],
            },
        },
        quiz: {
            type: Type.ARRAY,
            description: "A multiple-choice quiz with 5-10 questions to test understanding.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "The quiz question.",
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "An array of 4 strings representing the possible answers.",
                        items: {
                            type: Type.STRING,
                        },
                    },
                    correctAnswer: {
                        type: Type.STRING,
                        description: "The correct answer, which must be one of the strings from the 'options' array.",
                    },
                },
                required: ["question", "options", "correctAnswer"],
            },
        },
    },
    required: ["summary", "flashcards", "quiz"],
};


export const generateStudyMaterials = async (topic: string): Promise<StudyMaterials> => {
    try {
        const prompt = `Generate a comprehensive set of study materials for the topic: "${topic}". Please provide a detailed summary, a list of flashcards, and a multiple-choice quiz.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: studyMaterialsSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        
        // Basic validation
        if (!parsedData.summary || !parsedData.flashcards || !parsedData.quiz) {
            throw new Error("Received incomplete study materials from the API.");
        }

        return parsedData as StudyMaterials;

    } catch (error) {
        console.error("Error generating study materials:", error);
        // Fix: Propagate the original error for more specific feedback in the UI.
        throw error;
    }
};
