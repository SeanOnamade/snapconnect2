import * as FileSystem from 'expo-file-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { Platform } from 'react-native';

export interface CaptionSuggestion {
  text: string;
  mood: 'casual' | 'professional' | 'creative' | 'humorous';
  length: 'short' | 'medium' | 'long';
}

export interface AIResponse {
  suggestions: CaptionSuggestion[];
  confidence: number;
  processingTime: number;
}

// Convert image to base64 format for Firebase Function (cross-platform)
const imageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      // Web platform: Handle blob URLs using fetch
      console.log('🌐 Converting web blob to base64...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
    } else {
      // Mobile platform: Use expo-file-system
      console.log('📱 Converting mobile file to base64...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
};

// Generate AI captions using secure Firebase Cloud Function
export const generateAICaptions = async (
  imageUri: string, 
  filter?: string, 
  userInterests?: string[]
): Promise<AIResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('🔐 Calling secure Firebase Function for AI captions...');
    console.log(`📋 Platform: ${Platform.OS}, Image URI: ${imageUri.substring(0, 50)}...`);
    
    // Convert image to base64 (platform-aware)
    const imageBase64 = await imageToBase64(imageUri);
    console.log(`✅ Image converted to base64 (${imageBase64.length} characters)`);
    
    // Get the callable function
    const generateCaption = httpsCallable(functions, 'generateCaption');
    
    // Call the secure Cloud Function
    const result = await generateCaption({
      imageBase64,
      filter,
      userInterests
    });
    
    const response = result.data as AIResponse;
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Secure AI captions generated in ${processingTime}ms`);
    console.log(`📊 Confidence: ${(response.confidence * 100).toFixed(0)}%`);
    console.log(`🎯 Generated ${response.suggestions.length} suggestions`);
    
    return {
      ...response,
      processingTime: processingTime // Override with total time including network
    };

  } catch (error: any) {
    console.error('🚨 Firebase Function call failed:', error);
    
    const processingTime = Date.now() - startTime;
    
    // Handle different Firebase Function error types
    if (error?.code === 'functions/resource-exhausted') {
      throw new Error('AI service is busy. Please try again in a moment.');
    } else if (error?.code === 'functions/internal') {
      throw new Error('AI service temporary issue. Please try again.');
    } else if (error?.code === 'functions/invalid-argument') {
      throw new Error('Invalid image data. Please try taking another photo.');
    } else if (error?.message?.includes('network') || !navigator.onLine) {
      throw new Error('Network connection issue. Please check your internet.');
    }
    
    // For any other error, return fallback suggestions
    console.log('📋 Using local fallback suggestions due to error');
    return {
      suggestions: getFallbackSuggestions(filter),
      confidence: 0.2,
      processingTime
    };
  }
};

// Local fallback suggestions when both AI and network fail
const getFallbackSuggestions = (filter?: string): CaptionSuggestion[] => {
  const baseOptions = {
    none: [
      { text: "Capturing the moment ✨", mood: "casual" as const, length: "short" as const },
      { text: "Life through my lens 📸", mood: "creative" as const, length: "short" as const },
      { text: "Sometimes you need to create your own sunshine", mood: "professional" as const, length: "long" as const },
      { text: "Vibes on point today 😎", mood: "humorous" as const, length: "short" as const }
    ],
    vintage: [
      { text: "Old soul, timeless moments 📺", mood: "creative" as const, length: "medium" as const },
      { text: "Vintage vibes only ✨", mood: "casual" as const, length: "short" as const },
      { text: "Some stories are better told in sepia", mood: "professional" as const, length: "long" as const },  
      { text: "Retro mood activated 📸", mood: "humorous" as const, length: "short" as const }
    ],
    noir: [
      { text: "Life in black and white 🎬", mood: "creative" as const, length: "medium" as const },
      { text: "Dramatic lighting ✨", mood: "casual" as const, length: "short" as const },
      { text: "Finding beauty in shadows and light", mood: "professional" as const, length: "long" as const },
      { text: "Film noir protagonist energy 🕶️", mood: "humorous" as const, length: "medium" as const }
    ],
    cyberpunk: [
      { text: "Future meets present 🌃", mood: "creative" as const, length: "medium" as const },
      { text: "Neon dreams ⚡", mood: "casual" as const, length: "short" as const },
      { text: "Living in a digital wonderland", mood: "professional" as const, length: "long" as const },
      { text: "Cyberpunk main character 🤖✨", mood: "humorous" as const, length: "medium" as const }
    ]
  };

  return baseOptions[filter as keyof typeof baseOptions] || baseOptions.none;
};

// Test Firebase Functions connection
export const testFirebaseFunctionConnection = async (): Promise<boolean> => {
  try {
    const testFunction = httpsCallable(functions, 'generateCaption');
    
    // Simple test call with minimal data
    const testResult = await testFunction({
      imageBase64: 'test',
      filter: 'none'
    });
    
    return !!testResult.data;
  } catch (error) {
    console.error('Firebase Function connection test failed:', error);
    return false;
  }
}; 