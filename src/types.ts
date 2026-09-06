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

export type MemoryCategory =
  | 'core_value'
  | 'goal'
  | 'habit'
  | 'preference'
  | 'relationship'
  | 'milestone'
  | 'insight';

export type MemoryProvenance = 'explicitly_stated' | 'ai_inferred';

export interface MemorySourceRef {
  entryId?: string;
  origin: 'journal_entry' | 'direct_input';
}

export interface UserMemory {
  id: string;
  text: string;
  category: MemoryCategory;
  sourceRef: MemorySourceRef;
  confidence: number;
  provenance: MemoryProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractMemoryRequest {
  entryId?: string;
  content: string;
}

export interface ExtractMemoryResponse {
  memory: UserMemory;
  modelUsed: string;
}

export interface AuthErrorInfo {
  code: 'popup-blocked' | 'unauthorized-domain' | 'configuration-not-found' | 'generic';
  message: string;
  domain?: string;
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

export interface AskJournalCitation {
  type: 'journal_entry' | 'memory';
  id: string;
  titleOrCategory: string;
  excerpt: string;
}

export interface AskJournalRequest {
  question: string;
  cachedEntries?: {
    id: string;
    title: string;
    createdAt: string;
    summary?: string;
    keyInsights?: string[];
    contentSnippet: string;
  }[];
  cachedMemories?: {
    id: string;
    text: string;
    category: string;
    confidence: number;
    createdAt: string;
  }[];
}

export interface AskJournalResponse {
  answer: string;
  hasSufficientEvidence: boolean;
  explicitFacts: string[];
  interpretations: string[];
  citations: AskJournalCitation[];
  modelUsed: string;
}

export interface AskJournalSessionTurn {
  id: string;
  question: string;
  answer: string;
  hasSufficientEvidence: boolean;
  explicitFacts: string[];
  interpretations: string[];
  citations: AskJournalCitation[];
  timestamp: string;
  modelUsed?: string;
}
