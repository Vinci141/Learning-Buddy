import { GoogleGenAI, Type } from "@google/genai";
import { StudyMaterials } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

// Fix: Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- FIX for "Maximum call stack size exceeded" error ---
// The original recursive schema definition created a circular object reference in JavaScript,
// which caused a stack overflow inside the Gemini SDK's internal processing.
// To fix this, we define the schema using a recursive function that builds a nested object
// with a limited depth. This avoids the circular reference while still allowing for a
// reasonably complex mind map structure (up to 5 levels deep).

const createMindMapSchema = (depth: number): any => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            topic: {
                type: Type.STRING,
                description: "The central idea or concept of this node.",
            },
        },
        required: ["topic"],
    };

    if (depth > 0) {
        (schema.properties as any).children = {
            type: Type.ARRAY,
            description: "An array of child nodes, representing sub-topics.",
            items: createMindMapSchema(depth - 1),
        };
    }

    return schema;
};

// Using a depth of 4 allows for 5 levels of nodes (root + 4 children levels)
const mindMapSchema = createMindMapSchema(4);

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
        mindMap: {
            ...mindMapSchema,
            description: "A hierarchical mind map of the topic, starting with a central root node. It should have a depth of at least 3 levels where appropriate.",
        }
    },
    required: ["summary", "flashcards", "quiz", "mindMap"],
};


export const generateStudyMaterials = async (topic: string): Promise<StudyMaterials> => {
    try {
        const prompt = `Generate a comprehensive set of study materials for the topic: "${topic}". Please provide a detailed summary, a list of flashcards, a multiple-choice quiz, and a hierarchical mind map.`;
        
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
        if (!parsedData.summary || !parsedData.flashcards || !parsedData.quiz || !parsedData.mindMap) {
            throw new Error("Received incomplete study materials from the API.");
        }

        return parsedData as StudyMaterials;

    } catch (error) {
        console.error("Error generating study materials:", error);
        // Fix: Propagate the original error for more specific feedback in the UI.
        throw error;
    }
};