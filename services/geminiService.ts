import { GoogleGenAI, Type } from "@google/genai";
import { StudyMaterials } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const correctSpelling = async (topic: string): Promise<string> => {
    try {
        const prompt = `Correct any spelling or grammatical mistakes in the following topic and return only the corrected phrase, with no extra text or explanation. If it's already correct, return it as is. Topic: "${topic}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                // Disable thinking for a faster, more direct response
                thinkingConfig: { thinkingBudget: 0 },
                // Set a small token limit as we expect a short answer
                maxOutputTokens: 50,
            },
        });
        
        // Clean up response text, removing potential quotes
        const correctedTopic = response.text.trim().replace(/^"|"$/g, '');
        return correctedTopic || topic; // Fallback to original topic if response is empty
    } catch (error) {
        console.error("Spelling correction failed:", error);
        return topic; // On failure, proceed with the user's original topic
    }
};

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

const mindMapSchema = createMindMapSchema(4);

const studyMaterialsSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, well-structured summary of the topic, formatted in Markdown. Use headings (e.g., '### Key Concepts'), bold text for important terms (e.g., '**photosynthesis**'), and bulleted or numbered lists for key points. The summary should be comprehensive and at least 3 paragraphs long.",
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
        
        if (!parsedData.summary || !parsedData.flashcards || !parsedData.quiz || !parsedData.mindMap) {
            throw new Error("Received incomplete study materials from the API.");
        }

        return parsedData as StudyMaterials;

    } catch (error) {
        console.error("Error generating study materials:", error);
        throw error;
    }
};