/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import OpenAI from "openai";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({"maxInstances": 10});
// Define the OpenAI API key as a secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

export interface CaptionSuggestion {
  text: string;
  mood: "casual" | "professional" | "creative" | "humorous";
  length: "short" | "medium" | "long";
}

export interface GenerateCaptionRequest {
  imageBase64: string;
  filter?: string;
  userInterests?: string[];
}

export interface GenerateCaptionResponse {
  suggestions: CaptionSuggestion[];
  confidence: number;
  processingTime: number;
}

// Secure OpenAI caption generation function
export const generateCaption = onCall(
  {"secrets": [openaiApiKey]},
  async (request): Promise<GenerateCaptionResponse> => {
    const startTime = Date.now();

    try {
      // Validate request
      if (!request.data?.imageBase64) {
        throw new HttpsError("invalid-argument", "Image data is required");
      }

      const {
        imageBase64,
        filter,
        userInterests = [],
      } = request.data as GenerateCaptionRequest;

      // Initialize OpenAI with secret
      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      // Create context-aware prompt
      const filterContext = filter && filter !== "none" ?
        `The image has a "${filter}" filter applied, which affects ` +
        "its visual style. " :
        "";

      const interestContext = userInterests.length > 0 ?
        `The user is interested in: ${userInterests.join(", ")}. ` :
        "";

      const prompt = `${filterContext}${interestContext}Analyze this photo ` +
        "and create 3 engaging social media captions. " +
        "Make them diverse in style:\n\n" +
        "1. Casual/relatable (20-40 chars)\n" +
        "2. Creative/artistic (40-60 chars)\n" +
        "3. Fun/humorous with emoji (30-50 chars)\n\n" +
        "Consider the image content, mood, colors, and composition. " +
        "Make captions shareable and authentic.\n\n" +
        "Return ONLY a JSON array of objects like this:\n" +
        "[\n" +
        "  {\"text\": \"Living the moment ✨\", \"mood\": \"casual\", " +
        "\"length\": \"short\"},\n" +
        "  {\"text\": \"Colors that speak to the soul 🎨\", " +
        "\"mood\": \"creative\", \"length\": \"medium\"},\n" +
        "  {\"text\": \"Vibes are immaculate 😎🔥\", " +
        "\"mood\": \"humorous\", \"length\": \"short\"}\n" +
        "]";

      logger.info("Generating AI captions with OpenAI", {
        filter,
        userInterests,
        imageSize: imageBase64.length,
      });

      // Call OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {type: "text", text: prompt},
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "low", // Cost optimization
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new HttpsError("internal", "No response from OpenAI");
      }

      // Parse AI response
      let suggestions: CaptionSuggestion[];
      // Clean the content - remove markdown code blocks and fix common typos
      let cleanContent = content.trim();

      // Remove markdown code blocks if present
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Fix common OpenAI typos
      cleanContent = cleanContent.replace(/"leength":/g, "\"length\":");

      logger.info("Cleaned OpenAI response", {cleanContent});

      try {
        suggestions = JSON.parse(cleanContent);

        // Validate structure
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          throw new Error("Invalid response format");
        }

        // Ensure all suggestions have required fields
        suggestions = suggestions.map((s, index) => ({
          text: s.text || `Caption ${index + 1}`,
          mood: s.mood || "casual",
          length: s.length || "short",
        }));

        logger.info("Successfully parsed AI suggestions", {
          count: suggestions.length,
          suggestions: suggestions.map((s) => s.text),
        });
      } catch (parseError) {
        logger.warn("Failed to parse OpenAI response, using fallbacks", {
          content,
          cleanedAttempt: cleanContent,
          error: parseError,
        });
        suggestions = getFallbackSuggestions(filter);
      }

      const processingTime = Date.now() - startTime;
      const confidence = suggestions.length > 0 ? 0.85 : 0.3;

      logger.info("AI captions generated successfully", {
        suggestionsCount: suggestions.length,
        processingTime,
        confidence,
      });

      return {
        suggestions,
        confidence,
        processingTime,
      };
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        code?: string;
        status?: number;
      };
      logger.error("Error generating AI captions", {
        error: errorObj.message,
        code: errorObj.code,
        status: errorObj.status,
      });

      const processingTime = Date.now() - startTime;

      // Handle different error types
      if (errorObj.status === 429) {
        throw new HttpsError("resource-exhausted",
          "AI service is busy. Please try again in a moment.");
      } else if (errorObj.status === 401) {
        throw new HttpsError("internal", "AI service configuration error.");
      } else if (errorObj.code === "invalid-argument") {
        throw error; // Re-throw validation errors
      }

      // For other errors, return fallback suggestions
      logger.info("Returning fallback suggestions due to error");
      return {
        suggestions: getFallbackSuggestions(request.data?.filter),
        confidence: 0.2,
        processingTime,
      };
    }
  },
);

// Quick Reply Function
export const quickReply = onCall(
  {secrets: [openaiApiKey]},
  async (request): Promise<string> => {
    try {
      // Validate request
      if (!request.data?.caption) {
        throw new HttpsError("invalid-argument", "Caption is required");
      }

      const {caption} = request.data as {caption: string};

      // Initialize OpenAI with secret
      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      const prompt = "You are a college student. Reply in one fun/casual " +
        `line to this snap: "${caption}"`;

      logger.info("Generating quick reply with OpenAI", {caption});

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 30,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new HttpsError("internal", "No response from OpenAI");
      }

      const reply = content.trim();
      logger.info("Quick reply generated successfully", {reply});

      return reply;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        code?: string;
        status?: number;
      };
      logger.error("Error generating quick reply", {
        error: errorObj.message,
        code: errorObj.code,
        status: errorObj.status,
      });

      // Handle different error types
      if (errorObj.status === 429) {
        throw new HttpsError("resource-exhausted",
          "AI service is busy. Please try again in a moment.");
      } else if (errorObj.status === 401) {
        throw new HttpsError("internal", "AI service configuration error.");
      } else if (errorObj.code === "invalid-argument") {
        throw error; // Re-throw validation errors
      }

      // Return a fallback reply for other errors
      const fallbackReplies = [
        "Looks amazing! 😍",
        "Love this! ✨",
        "So cool! 🔥",
        "Great shot! 📸",
        "This is awesome! 👏",
      ];
      const randomIndex = Math.floor(Math.random() * fallbackReplies.length);
      const fallbackReply = fallbackReplies[randomIndex];
      logger.info("Returning fallback reply due to error", {fallbackReply});
      return fallbackReply;
    }
  },
);

/**
 * Fallback suggestions when AI fails
 * @param {string} filter - The filter type applied to the image
 * @return {CaptionSuggestion[]} Array of fallback caption suggestions
 */
function getFallbackSuggestions(filter?: string): CaptionSuggestion[] {
  const baseOptions = {
    none: [
      {
        text: "Capturing the moment ✨",
        mood: "casual" as const,
        length: "short" as const,
      },
      {
        text: "Life through my lens 📸",
        mood: "creative" as const,
        length: "short" as const,
      },
      {
        text: "Vibes on point today 😎",
        mood: "humorous" as const,
        length: "short" as const,
      },
    ],
    vintage: [
      {
        text: "Vintage vibes only ✨",
        mood: "casual" as const,
        length: "short" as const,
      },
      {
        text: "Old soul, timeless moments 📺",
        mood: "creative" as const,
        length: "medium" as const,
      },
      {
        text: "Retro mood activated 📸",
        mood: "humorous" as const,
        length: "short" as const,
      },
    ],
    noir: [
      {
        text: "Dramatic lighting ✨",
        mood: "casual" as const,
        length: "short" as const,
      },
      {
        text: "Life in black and white 🎬",
        mood: "creative" as const,
        length: "medium" as const,
      },
      {
        text: "Film noir protagonist energy 🕶️",
        mood: "humorous" as const,
        length: "medium" as const,
      },
    ],
    cyberpunk: [
      {
        text: "Neon dreams ⚡",
        mood: "casual" as const,
        length: "short" as const,
      },
      {
        text: "Future meets present 🌃",
        mood: "creative" as const,
        length: "medium" as const,
      },
      {
        text: "Cyberpunk main character 🤖✨",
        mood: "humorous" as const,
        length: "medium" as const,
      },
    ],
  };

  return baseOptions[filter as keyof typeof baseOptions] || baseOptions.none;
}

// Initialize Firebase Admin
initializeApp();

// Migration function to fix existing data - make all interests lowercase
export const migrateInterestsToLowercase = onCall(
  async (): Promise<{
    message: string;
    updated: {users: number; snaps: number};
  }> => {
    try {
      logger.info("Starting migration: consolidate and lowercase interests");

      const db = getFirestore();
      let usersUpdated = 0;
      let snapsUpdated = 0;

      // Migrate user documents
      const usersSnapshot = await db.collection("users").get();
      const userBatch = db.batch();

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        let needsUpdate = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {};

        // Consolidate interests and favorites into single field
        const existingInterests = data.interests || [];
        const existingFavorites = data.favorites || [];

        // Merge interests and favorites, with favorites taking priority
        // Remove duplicates and convert to lowercase
        const allInterests = [...existingFavorites, ...existingInterests];
        const uniqueInterests = Array.from(new Set(
          allInterests.map((interest: string) =>
            typeof interest === "string" ? interest.toLowerCase() : interest,
          ),
        )).slice(0, 5); // Limit to 5 interests

        // Check if we need to update
        const currentInterestsStr = JSON.stringify(data.interests || []);
        const newInterestsStr = JSON.stringify(uniqueInterests);
        const hasFavorites = data.favorites && data.favorites.length > 0;

        if (newInterestsStr !== currentInterestsStr || hasFavorites) {
          updates.interests = uniqueInterests;
          // Remove the favorites field
          updates.favorites = FieldValue.delete();
          needsUpdate = true;
        }

        if (needsUpdate) {
          userBatch.update(doc.ref, updates);
          usersUpdated++;
        }
      });

      // Commit user updates
      if (usersUpdated > 0) {
        await userBatch.commit();
        logger.info(`Updated ${usersUpdated} user documents`);
      }

      // Migrate snap documents
      const snapsSnapshot = await db.collection("snaps").get();
      const snapBatch = db.batch();

      snapsSnapshot.forEach((doc) => {
        const data = doc.data();
        let needsUpdate = false;

        // Check and update interests
        if (data.interests && Array.isArray(data.interests)) {
          const lowercaseInterests = data.interests.map((interest: string) =>
            typeof interest === "string" ? interest.toLowerCase() : interest,
          );
          // Only update if there's a change
          const currentStr = JSON.stringify(data.interests);
          const newStr = JSON.stringify(lowercaseInterests);
          if (newStr !== currentStr) {
            snapBatch.update(doc.ref, {interests: lowercaseInterests});
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          snapsUpdated++;
        }
      });

      // Commit snap updates
      if (snapsUpdated > 0) {
        await snapBatch.commit();
        logger.info(`Updated ${snapsUpdated} snap documents`);
      }

      const message = "Migration completed! Consolidated favorites into " +
        `interests and converted to lowercase. ` +
        `Updated ${usersUpdated} users and ${snapsUpdated} snaps.`;
      const result = {
        message,
        updated: {users: usersUpdated, snaps: snapsUpdated},
      };

      logger.info("Migration completed", result);
      return result;
    } catch (error: unknown) {
      const errorObj = error as {message?: string};
      logger.error("Migration failed", {error: errorObj.message});
      throw new HttpsError("internal", "Migration failed: " + errorObj.message);
    }
  },
);
