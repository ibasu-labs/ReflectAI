export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
}

export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_plan' | 'gratitude';

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  category?: string;
  tags: string[];
  mode: ReflectionMode;
  messages: Message[];
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  mood?: 'energized' | 'calm' | 'thoughtful' | 'challenging' | 'grateful';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface GeminiConverseRequest {
  interactionId?: string;
  mode: ReflectionMode;
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  userPrompt: string;
  title?: string;
  userContext?: {
    mood?: string;
    category?: string;
  };
}

export interface GeminiConverseResponse {
  reply: string;
  suggestedTitle?: string;
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  modelUsed: string;
}

export interface GeminiSummarizeRequest {
  entries: {
    title: string;
    content: string;
    createdAt: string;
  }[];
}

export interface GeminiSummarizeResponse {
  summary: string;
  themes: string[];
  trends: string;
  growthAreas: string[];
  modelUsed: string;
}
