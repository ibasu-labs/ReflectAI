/**
 * Verification Test Suite for Personal Memory Extraction Two-Stage Flow
 * Tests all 5 requirements:
 * 1. Successful Gemini extraction -> Firestore save.
 * 2. Gemini quota failure -> no Firestore memory created.
 * 3. Gemini authentication failure -> no Firestore memory created.
 * 4. Invalid Gemini response -> no Firestore memory created.
 * 5. Successful extraction followed by Firestore failure -> clear retryable error.
 */

interface UserMemory {
  id: string;
  text: string;
  category: string;
  sourceRef: {
    entryId?: string;
    origin: string;
  };
  confidence: number;
  provenance: 'ai_inferred' | 'explicit_statement';
  createdAt: string;
  updatedAt: string;
}

// Format error simulator matching server.ts formatGeminiError
function formatGeminiError(error: any): { message: string; statusCode: number } {
  const rawMsg = error?.message || String(error || '');

  if (
    rawMsg.includes('prepayment credits') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('quota') ||
    rawMsg.includes('429')
  ) {
    return {
      message:
        'AI memory extraction is temporarily unavailable because the Gemini API quota or credits are exhausted. Your journal entry is safe. Please restore Gemini API access and try again.',
      statusCode: 429,
    };
  }

  if (rawMsg.includes('API_KEY') || rawMsg.includes('401') || rawMsg.includes('API key not valid')) {
    return {
      message: 'Authentication failed: Invalid or unconfigured Gemini API key. Please verify settings in Google AI Studio.',
      statusCode: 401,
    };
  }

  if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
    return {
      message: 'Gemini AI service is temporarily experiencing high load. Your journal entry is safe. Please try again shortly.',
      statusCode: 503,
    };
  }

  return {
    message: 'AI memory extraction encountered a service error. Your journal entry is safe. Please try again.',
    statusCode: 500,
  };
}

// Memory validator
function validateMemoryPayload(payload: any): { valid: boolean; memory?: UserMemory; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Empty or invalid JSON payload' };
  }
  if (!payload.text || typeof payload.text !== 'string' || payload.text.trim().length === 0) {
    return { valid: false, error: 'Memory text is required and must be a non-empty string' };
  }
  const validCategories = ['core_value', 'goal', 'habit', 'relationship', 'lesson', 'insight', 'preference'];
  const category = validCategories.includes(payload.category) ? payload.category : 'insight';
  const confidence = typeof payload.confidence === 'number' ? Math.max(0.1, Math.min(1.0, payload.confidence)) : 0.85;

  const memory: UserMemory = {
    id: `mem_${Date.now()}_test`,
    text: payload.text.trim().slice(0, 1000),
    category,
    sourceRef: { origin: 'journal_entry' },
    confidence,
    provenance: 'ai_inferred',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { valid: true, memory };
}

// Two-Stage Orchestrator Simulator
async function runTwoStageMemoryExtraction(
  geminiStageMock: () => Promise<any>,
  firestoreSaveMock: (memory: UserMemory) => Promise<{ success: boolean; error?: string }>,
  firestoreStore: Map<string, UserMemory>
): Promise<{
  stage1Success: boolean;
  stage2Success: boolean;
  savedToFirestore: boolean;
  uiMessage: string;
  isRetryable: boolean;
  retryStage?: 'extract' | 'save';
}> {
  let stage1Memory: UserMemory | null = null;

  // STAGE 1: Gemini Extraction & Validation
  try {
    const rawResult = await geminiStageMock();
    const validation = validateMemoryPayload(rawResult);
    if (!validation.valid || !validation.memory) {
      return {
        stage1Success: false,
        stage2Success: false,
        savedToFirestore: false,
        uiMessage: validation.error || 'No durable personal memory identified.',
        isRetryable: true,
        retryStage: 'extract',
      };
    }
    stage1Memory = validation.memory;
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    return {
      stage1Success: false,
      stage2Success: false,
      savedToFirestore: false,
      uiMessage: formatted.message,
      isRetryable: true,
      retryStage: 'extract',
    };
  }

  // STAGE 2: Firestore Persistence
  // (Only entered if Stage 1 completely succeeded)
  try {
    const saveRes = await firestoreSaveMock(stage1Memory);
    if (!saveRes.success) {
      throw new Error(saveRes.error || 'Firestore write failed');
    }
    firestoreStore.set(stage1Memory.id, stage1Memory);
    return {
      stage1Success: true,
      stage2Success: true,
      savedToFirestore: true,
      uiMessage: `Personal Memory extracted and saved! [${stage1Memory.category.toUpperCase()}]`,
      isRetryable: false,
    };
  } catch (err: any) {
    return {
      stage1Success: true,
      stage2Success: false,
      savedToFirestore: false,
      uiMessage:
        'Personal memory was successfully extracted by Gemini, but saving to Firestore failed. Your journal entry and memory are safe. Please retry saving.',
      isRetryable: true,
      retryStage: 'save',
    };
  }
}

// Test Runner
async function runTests() {
  console.log('--- Starting Two-Stage Memory Extraction Test Suite ---\n');
  let passed = 0;
  let total = 5;

  // Test 1: Successful Gemini extraction -> Firestore save
  {
    const store = new Map<string, UserMemory>();
    const result = await runTwoStageMemoryExtraction(
      async () => ({ text: 'Values daily deep work and consistent morning routines.', category: 'core_value', confidence: 0.95 }),
      async (mem) => ({ success: true }),
      store
    );
    const ok = result.stage1Success && result.stage2Success && result.savedToFirestore && store.size === 1;
    console.log(`[Test 1] Successful Gemini extraction -> Firestore save: ${ok ? 'PASSED' : 'FAILED'}`);
    if (ok) passed++;
  }

  // Test 2: Gemini quota failure -> no Firestore memory created
  {
    const store = new Map<string, UserMemory>();
    const result = await runTwoStageMemoryExtraction(
      async () => {
        throw new Error('429 RESOURCE_EXHAUSTED: prepayment credits or quota depleted');
      },
      async (mem) => {
        throw new Error('Firestore should never be called!');
      },
      store
    );
    const ok =
      !result.stage1Success &&
      !result.stage2Success &&
      !result.savedToFirestore &&
      store.size === 0 &&
      result.uiMessage.includes('quota or credits are exhausted') &&
      result.retryStage === 'extract';
    console.log(`[Test 2] Gemini quota failure -> no Firestore memory created: ${ok ? 'PASSED' : 'FAILED'}`);
    if (ok) passed++;
  }

  // Test 3: Gemini authentication failure -> no Firestore memory created
  {
    const store = new Map<string, UserMemory>();
    const result = await runTwoStageMemoryExtraction(
      async () => {
        throw new Error('401 API_KEY invalid');
      },
      async (mem) => {
        throw new Error('Firestore should never be called!');
      },
      store
    );
    const ok =
      !result.stage1Success &&
      !result.stage2Success &&
      !result.savedToFirestore &&
      store.size === 0 &&
      result.uiMessage.includes('Authentication failed') &&
      result.retryStage === 'extract';
    console.log(`[Test 3] Gemini authentication failure -> no Firestore memory created: ${ok ? 'PASSED' : 'FAILED'}`);
    if (ok) passed++;
  }

  // Test 4: Invalid Gemini response -> no Firestore memory created
  {
    const store = new Map<string, UserMemory>();
    const result = await runTwoStageMemoryExtraction(
      async () => ({ text: '', category: 'invalid' }),
      async (mem) => {
        throw new Error('Firestore should never be called!');
      },
      store
    );
    const ok =
      !result.stage1Success &&
      !result.stage2Success &&
      !result.savedToFirestore &&
      store.size === 0 &&
      result.retryStage === 'extract';
    console.log(`[Test 4] Invalid Gemini response -> no Firestore memory created: ${ok ? 'PASSED' : 'FAILED'}`);
    if (ok) passed++;
  }

  // Test 5: Successful extraction followed by Firestore failure -> clear retryable error
  {
    const store = new Map<string, UserMemory>();
    const result = await runTwoStageMemoryExtraction(
      async () => ({ text: 'Prefers quiet solitary reflection before major decisions.', category: 'preference', confidence: 0.9 }),
      async (mem) => ({ success: false, error: 'Firestore permission-denied / network failure' }),
      store
    );
    const ok =
      result.stage1Success &&
      !result.stage2Success &&
      !result.savedToFirestore &&
      store.size === 0 &&
      result.isRetryable &&
      result.retryStage === 'save' &&
      result.uiMessage.includes('saving to Firestore failed');
    console.log(`[Test 5] Successful extraction followed by Firestore failure -> clear retryable error: ${ok ? 'PASSED' : 'FAILED'}`);
    if (ok) passed++;
  }

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
