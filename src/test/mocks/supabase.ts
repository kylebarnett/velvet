import { vi } from "vitest";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

/**
 * Creates a mock Supabase client with chainable query builder.
 * Set the return value with mockResolvedData or mockResolvedError.
 */
export function createMockSupabaseClient(
  resolvedData: { data: unknown; error: null } | { data: null; error: { message: string } } = {
    data: null,
    error: null,
  },
) {
  const chain: MockChain = {} as MockChain;

  // Each method returns the chain itself for chaining
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in",
    "order", "limit", "range",
    "single", "maybeSingle",
  ] as const;

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // `then` resolves the chain (for await)
  chain.then = vi.fn((resolve) => resolve(resolvedData));

  const from = vi.fn().mockReturnValue(chain);
  const rpc = vi.fn().mockReturnValue(chain);
  const storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/test" } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  return {
    from,
    rpc,
    storage,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    _chain: chain,
    _setResolvedData(data: unknown) {
      chain.then = vi.fn((resolve) => resolve({ data, error: null }));
    },
    _setResolvedError(message: string) {
      chain.then = vi.fn((resolve) => resolve({ data: null, error: { message } }));
    },
  };
}

/**
 * Helper to set up an authenticated user mock.
 */
export function mockAuthenticatedUser(overrides: {
  id?: string;
  email?: string;
  role?: "investor" | "founder";
} = {}) {
  const user = {
    id: overrides.id ?? "test-user-id",
    email: overrides.email ?? "test@example.com",
    user_metadata: {
      role: overrides.role ?? "investor",
    },
  };

  return { user };
}
