import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// 4 test users — all investors in the same org
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-a000-000000000001";

const USERS = {
  alice: {
    id: "00000000-0000-4000-a000-00000000000a",
    app_metadata: { role: "investor" },
    user_metadata: {},
  },
  bob: {
    id: "00000000-0000-4000-a000-00000000000b",
    app_metadata: { role: "investor" },
    user_metadata: {},
  },
  carol: {
    id: "00000000-0000-4000-a000-00000000000c",
    app_metadata: { role: "investor" },
    user_metadata: {},
  },
  dave: {
    id: "00000000-0000-4000-a000-00000000000d",
    app_metadata: { role: "investor" },
    user_metadata: {},
  },
} as const;

// Founder user (should be blocked from chat)
const FOUNDER_USER = {
  id: "00000000-0000-4000-a000-00000000000f",
  app_metadata: { role: "founder" },
  user_metadata: {},
};

// ---------------------------------------------------------------------------
// In-memory DB for mocking Supabase
// ---------------------------------------------------------------------------

interface DbConversation {
  id: string;
  organization_id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DbParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  cleared_at: string | null;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

interface DbReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface DbReadReceipt {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

interface DbOrgMember {
  user_id: string;
  organization_id: string;
}

interface DbUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

let db: {
  conversations: DbConversation[];
  participants: DbParticipant[];
  messages: DbMessage[];
  reactions: DbReaction[];
  read_receipts: DbReadReceipt[];
  org_members: DbOrgMember[];
  users: DbUser[];
};

let timeCounter: number;

function nextTimestamp() {
  timeCounter += 1000;
  return new Date(timeCounter).toISOString();
}

function resetDb() {
  // Use a past base time so messages have timestamps before any real new Date() calls
  // in route handlers (e.g. markRead sets last_read_at to real current time)
  timeCounter = Date.now() - 600_000;

  db = {
    conversations: [],
    participants: [],
    messages: [],
    reactions: [],
    read_receipts: [],
    org_members: [
      { user_id: USERS.alice.id, organization_id: ORG_ID },
      { user_id: USERS.bob.id, organization_id: ORG_ID },
      { user_id: USERS.carol.id, organization_id: ORG_ID },
      { user_id: USERS.dave.id, organization_id: ORG_ID },
    ],
    users: [
      { id: USERS.alice.id, full_name: "Alice A", email: "alice@test.com", avatar_url: null },
      { id: USERS.bob.id, full_name: "Bob B", email: "bob@test.com", avatar_url: null },
      { id: USERS.carol.id, full_name: "Carol C", email: "carol@test.com", avatar_url: null },
      { id: USERS.dave.id, full_name: "Dave D", email: "dave@test.com", avatar_url: null },
    ],
  };
}

// ---------------------------------------------------------------------------
// Supabase mock builder — models chained query builder API
// ---------------------------------------------------------------------------

type FilterOp = {
  type: "eq" | "neq" | "in" | "is" | "gt" | "lt";
  col: string;
  val: unknown;
};

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: FilterOp[]): T[] {
  let result = [...rows];
  for (const f of filters) {
    result = result.filter((row) => {
      const v = row[f.col];
      switch (f.type) {
        case "eq":
          return v === f.val;
        case "neq":
          return v !== f.val;
        case "in":
          return (f.val as unknown[]).includes(v);
        case "is":
          return f.val === null ? v === null || v === undefined : v === f.val;
        case "gt":
          return typeof v === "string" && typeof f.val === "string" ? v > f.val : false;
        case "lt":
          return typeof v === "string" && typeof f.val === "string" ? v < f.val : false;
        default:
          return true;
      }
    });
  }
  return result;
}

function makeQueryBuilder(tableName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getTableRows(): any[] {
    switch (tableName) {
      case "conversations":
        return db.conversations;
      case "conversation_participants":
        return db.participants;
      case "messages":
        return db.messages;
      case "message_reactions":
        return db.reactions;
      case "read_receipts":
        return db.read_receipts;
      case "organization_members":
        return db.org_members;
      case "users":
        return db.users;
      default:
        return [];
    }
  }

  // Builder state
  let filters: FilterOp[] = [];
  let selectFields: string | null = null;
  let countMode: { exact: boolean; head: boolean } | null = null;
  let limitVal: number | null = null;
  let orderCol: string | null = null;
  let orderAsc = true;
  let isSingle = false;
  let isMaybeSingle = false;
  let insertData: Record<string, unknown>[] | null = null;
  let updateData: Record<string, unknown> | null = null;
  let deleteMode = false;
  let upsertConflict: string | null = null;

  function execute() {
    // --- INSERT ---
    if (insertData && !upsertConflict) {
      const rows = insertData.map((row) => ({
        id: randomUUID(),
        created_at: nextTimestamp(),
        ...row,
      }));
      switch (tableName) {
        case "conversations":
          for (const r of rows) {
            db.conversations.push({
              id: r.id as string,
              organization_id: r.organization_id as string,
              title: (r.title as string) ?? null,
              is_group: r.is_group as boolean,
              created_by: r.created_by as string,
              created_at: r.created_at as string,
              updated_at: r.created_at as string,
            });
          }
          break;
        case "conversation_participants":
          for (const r of rows) {
            db.participants.push({
              id: r.id as string,
              conversation_id: r.conversation_id as string,
              user_id: r.user_id as string,
              joined_at: r.created_at as string,
              left_at: null,
              cleared_at: null,
            });
          }
          break;
        case "messages":
          for (const r of rows) {
            db.messages.push({
              id: r.id as string,
              conversation_id: r.conversation_id as string,
              sender_id: r.sender_id as string,
              content: r.content as string,
              message_type: (r.message_type as string) ?? "text",
              file_url: (r.file_url as string) ?? null,
              file_name: (r.file_name as string) ?? null,
              file_size: (r.file_size as number) ?? null,
              created_at: r.created_at as string,
              edited_at: null,
              deleted_at: null,
            });
          }
          break;
        case "message_reactions":
          for (const r of rows) {
            db.reactions.push({
              id: r.id as string,
              message_id: r.message_id as string,
              user_id: r.user_id as string,
              emoji: r.emoji as string,
            });
          }
          break;
      }

      // If .select().single() was chained after insert
      if (isSingle || selectFields) {
        const lastRow = rows[rows.length - 1];
        return { data: lastRow, error: null };
      }
      return { data: rows, error: null };
    }

    // --- UPSERT ---
    if (insertData && upsertConflict) {
      const conflictCols = upsertConflict.split(",");
      for (const row of insertData) {
        if (tableName === "read_receipts") {
          const existing = db.read_receipts.find((r) =>
            conflictCols.every((col) => (r as Record<string, unknown>)[col] === row[col]),
          );
          if (existing) {
            Object.assign(existing, row);
          } else {
            db.read_receipts.push({
              id: randomUUID(),
              conversation_id: row.conversation_id as string,
              user_id: row.user_id as string,
              last_read_message_id: (row.last_read_message_id as string) ?? null,
              last_read_at: row.last_read_at as string,
            });
          }
        } else if (tableName === "message_reactions") {
          const existing = db.reactions.find((r) =>
            conflictCols.every((col) => (r as Record<string, unknown>)[col] === row[col]),
          );
          if (!existing) {
            db.reactions.push({
              id: randomUUID(),
              message_id: row.message_id as string,
              user_id: row.user_id as string,
              emoji: row.emoji as string,
            });
          }
        }
      }
      return { data: null, error: null };
    }

    // --- DELETE ---
    if (deleteMode) {
      if (tableName === "message_reactions") {
        const before = db.reactions.length;
        db.reactions = db.reactions.filter(
          (r) => !applyFilters([r] as Record<string, unknown>[], filters).length,
        );
        return { data: null, error: null, count: before - db.reactions.length };
      }
      return { data: null, error: null };
    }

    // --- UPDATE ---
    if (updateData) {
      const rows = getTableRows();
      const matched = applyFilters(rows as Record<string, unknown>[], filters);
      for (const row of matched) {
        Object.assign(row, updateData);
      }
      if (isSingle) {
        return { data: matched[0] ?? null, error: null };
      }
      return { data: matched, error: null };
    }

    // --- SELECT ---
    let rows = getTableRows();

    // Handle organization_members join for the conversations route
    if (tableName === "organization_members" && selectFields?.includes("organizations")) {
      rows = db.org_members.map((m) => ({
        ...m,
        organizations: { id: m.organization_id, org_type: "investor" },
      }));
    }

    let filtered = applyFilters(rows as Record<string, unknown>[], filters);

    if (orderCol) {
      filtered.sort((a, b) => {
        const va = a[orderCol!] as string;
        const vb = b[orderCol!] as string;
        return orderAsc ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
      });
    }

    if (limitVal !== null) {
      filtered = filtered.slice(0, limitVal);
    }

    // Count mode
    if (countMode?.exact) {
      return { data: null, count: filtered.length, error: null };
    }

    if (isSingle) {
      return { data: filtered[0] ?? null, error: filtered.length === 0 ? { message: "not found" } : null };
    }

    if (isMaybeSingle) {
      return { data: filtered[0] ?? null, error: null };
    }

    return { data: filtered, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select(fields?: string, opts?: { count?: string; head?: boolean }) {
      selectFields = fields ?? "*";
      if (opts?.count === "exact") {
        countMode = { exact: true, head: opts.head ?? false };
      }
      return builder;
    },
    insert(data: Record<string, unknown> | Record<string, unknown>[]) {
      insertData = Array.isArray(data) ? data : [data];
      return builder;
    },
    update(data: Record<string, unknown>) {
      updateData = data;
      return builder;
    },
    upsert(data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) {
      insertData = Array.isArray(data) ? data : [data];
      upsertConflict = opts?.onConflict ?? null;
      return builder;
    },
    delete() {
      deleteMode = true;
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push({ type: "eq", col, val });
      return builder;
    },
    neq(col: string, val: unknown) {
      filters.push({ type: "neq", col, val });
      return builder;
    },
    in(col: string, vals: unknown[]) {
      filters.push({ type: "in", col, val: vals });
      return builder;
    },
    is(col: string, val: unknown) {
      filters.push({ type: "is", col, val });
      return builder;
    },
    gt(col: string, val: unknown) {
      filters.push({ type: "gt", col, val });
      return builder;
    },
    lt(col: string, val: unknown) {
      filters.push({ type: "lt", col, val });
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderCol = col;
      orderAsc = opts?.ascending ?? true;
      return builder;
    },
    limit(n: number) {
      limitVal = n;
      return builder;
    },
    single() {
      isSingle = true;
      return execute();
    },
    maybeSingle() {
      isMaybeSingle = true;
      return execute();
    },
    then(resolve: (val: unknown) => void, reject?: (err: unknown) => void) {
      try {
        resolve(execute());
      } catch (e) {
        if (reject) reject(e);
      }
    },
  };

  return builder;
}

// ---------------------------------------------------------------------------
// Mock current user state
// ---------------------------------------------------------------------------

let currentAuthUser: { id: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } | null = null;

function setCurrentUser(user: typeof USERS.alice | typeof FOUNDER_USER | null) {
  currentAuthUser = user;
}

function createMockSupabase() {
  return {
    from: (table: string) => makeQueryBuilder(table),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: currentAuthUser },
        error: null,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => createMockSupabase()),
}));

// Import route handlers AFTER mocks
import { GET as getConversations, POST as createConversation } from "./conversations/route";
import { GET as getConversationDetail, PATCH as updateConversation, DELETE as leaveConversation } from "./conversations/[id]/route";
import { GET as getMessages, POST as sendMessage } from "./conversations/[id]/messages/route";
import { PUT as markRead } from "./conversations/[id]/read/route";
import { POST as addParticipant, DELETE as removeParticipant } from "./conversations/[id]/participants/route";
import { POST as addReaction, DELETE as removeReaction } from "./conversations/[id]/messages/[msgId]/reactions/route";
import { GET as getUnreadCount } from "./unread-count/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(url: string, method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest(`http://localhost:3001${url}`, opts);
}

function makeParams<T extends Record<string, string>>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Chat system — 4 users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  // =========================================================================
  // Auth & Role checks
  // =========================================================================

  describe("Auth & role checks", () => {
    it("returns 401 when not authenticated", async () => {
      setCurrentUser(null);
      const res = await getConversations();
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is a founder (not investor)", async () => {
      setCurrentUser(FOUNDER_USER);
      const res = await getConversations();
      expect(res.status).toBe(403);
    });

    it("returns 403 for founder trying to send messages", async () => {
      setCurrentUser(FOUNDER_USER);
      const res = await sendMessage(
        makeReq("/api/chat/conversations/any/messages", "POST", { content: "hi" }),
        { params: makeParams({ id: "any" }) },
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 1:1 conversations
  // =========================================================================

  describe("1:1 conversations", () => {
    it("Alice creates a DM with Bob", async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.id).toBeDefined();

      // Verify DB state
      expect(db.conversations).toHaveLength(1);
      expect(db.conversations[0].is_group).toBe(false);
      expect(db.participants).toHaveLength(2);
      const participantIds = db.participants.map((p) => p.user_id).sort();
      expect(participantIds).toEqual([USERS.alice.id, USERS.bob.id].sort());
    });

    it("re-creating a 1:1 with Bob returns the existing conversation", async () => {
      setCurrentUser(USERS.alice);

      // First create
      const res1 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: firstId } = await res1.json();

      // Second create — should return same ID
      const res2 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const body2 = await res2.json();
      expect(body2.id).toBe(firstId);

      // Still only 1 conversation in DB
      expect(db.conversations).toHaveLength(1);
    });

    it("Alice and Carol have separate 1:1 conversations", async () => {
      setCurrentUser(USERS.alice);

      const res1 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: aliceBob } = await res1.json();

      const res2 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.carol.id],
        }),
      );
      const { id: aliceCarol } = await res2.json();

      expect(aliceBob).not.toBe(aliceCarol);
      expect(db.conversations).toHaveLength(2);
    });
  });

  // =========================================================================
  // Group conversations
  // =========================================================================

  describe("Group conversations", () => {
    it("Alice creates a group with Bob, Carol, and Dave", async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id, USERS.dave.id],
          title: "Team Chat",
          isGroup: true,
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);

      const convo = db.conversations[0];
      expect(convo.is_group).toBe(true);
      expect(convo.title).toBe("Team Chat");

      // 4 participants (Alice + 3)
      expect(db.participants).toHaveLength(4);
    });

    it("auto-detects group when >1 participant even without isGroup flag", async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id],
        }),
      );
      expect(res.status).toBe(201);
      expect(db.conversations[0].is_group).toBe(true);
    });

    it("rejects participants outside the organization", async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: ["00000000-0000-4000-a000-999999999999"],
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/not members/i);
    });
  });

  // =========================================================================
  // Sending & receiving messages
  // =========================================================================

  describe("Sending and receiving messages", () => {
    let convoId: string;

    beforeEach(async () => {
      // Create a group with all 4 users
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id, USERS.dave.id],
          title: "All Hands",
          isGroup: true,
        }),
      );
      const body = await res.json();
      convoId = body.id;
    });

    it("Alice sends a message", async () => {
      setCurrentUser(USERS.alice);
      const res = await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Hello team!",
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.id).toBeDefined();

      expect(db.messages).toHaveLength(1);
      expect(db.messages[0].content).toBe("Hello team!");
      expect(db.messages[0].sender_id).toBe(USERS.alice.id);
    });

    it("Bob sees Alice's message in the conversation", async () => {
      // Alice sends
      setCurrentUser(USERS.alice);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Hello from Alice",
        }),
        { params: makeParams({ id: convoId }) },
      );

      // Bob reads conversation
      setCurrentUser(USERS.bob);
      const res = await getConversationDetail(
        makeReq(`/api/chat/conversations/${convoId}`, "GET"),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe("Hello from Alice");
      expect(body.messages[0].senderInfo.fullName).toBe("Alice A");
    });

    it("all 4 users exchange messages in sequence", async () => {
      const contents = [
        { user: USERS.alice, msg: "Alice here" },
        { user: USERS.bob, msg: "Bob checking in" },
        { user: USERS.carol, msg: "Carol present" },
        { user: USERS.dave, msg: "Dave reporting" },
      ];

      for (const { user, msg } of contents) {
        setCurrentUser(user);
        const res = await sendMessage(
          makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
            content: msg,
          }),
          { params: makeParams({ id: convoId }) },
        );
        expect(res.status).toBe(201);
      }

      expect(db.messages).toHaveLength(4);

      // Carol fetches messages — should see all 4
      setCurrentUser(USERS.carol);
      const res = await getMessages(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "GET"),
        { params: makeParams({ id: convoId }) },
      );
      const body = await res.json();
      expect(body.messages).toHaveLength(4);
      expect(body.hasMore).toBe(false);
    });

    it("rejects messages from non-participants", async () => {
      // Remove Dave from DB participants to simulate non-membership
      db.participants = db.participants.filter((p) => p.user_id !== USERS.dave.id);

      setCurrentUser(USERS.dave);
      const res = await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Trying to send",
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(403);
    });

    it("rejects empty messages", async () => {
      setCurrentUser(USERS.alice);
      const res = await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "",
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(400);
    });

    it("rejects messages exceeding 4000 characters", async () => {
      setCurrentUser(USERS.alice);
      const res = await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "x".repeat(4001),
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Cross-conversation isolation
  // =========================================================================

  describe("Cross-conversation isolation", () => {
    it("messages in one conversation don't appear in another", async () => {
      // Alice-Bob 1:1
      setCurrentUser(USERS.alice);
      const r1 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: convo1 } = await r1.json();

      // Alice-Carol 1:1
      const r2 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.carol.id],
        }),
      );
      const { id: convo2 } = await r2.json();

      // Alice sends in convo1
      await sendMessage(
        makeReq(`/api/chat/conversations/${convo1}/messages`, "POST", {
          content: "Private to Bob",
        }),
        { params: makeParams({ id: convo1 }) },
      );

      // Alice sends in convo2
      await sendMessage(
        makeReq(`/api/chat/conversations/${convo2}/messages`, "POST", {
          content: "Private to Carol",
        }),
        { params: makeParams({ id: convo2 }) },
      );

      // Bob reads convo1 — should see only "Private to Bob"
      setCurrentUser(USERS.bob);
      const bobRes = await getConversationDetail(
        makeReq(`/api/chat/conversations/${convo1}`, "GET"),
        { params: makeParams({ id: convo1 }) },
      );
      const bobBody = await bobRes.json();
      expect(bobBody.messages).toHaveLength(1);
      expect(bobBody.messages[0].content).toBe("Private to Bob");

      // Carol reads convo2 — should see only "Private to Carol"
      setCurrentUser(USERS.carol);
      const carolRes = await getConversationDetail(
        makeReq(`/api/chat/conversations/${convo2}`, "GET"),
        { params: makeParams({ id: convo2 }) },
      );
      const carolBody = await carolRes.json();
      expect(carolBody.messages).toHaveLength(1);
      expect(carolBody.messages[0].content).toBe("Private to Carol");
    });

    it("Carol cannot access Alice-Bob 1:1", async () => {
      setCurrentUser(USERS.alice);
      const r1 = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: convoId } = await r1.json();

      // Carol tries to read it
      setCurrentUser(USERS.carol);
      const res = await getConversationDetail(
        makeReq(`/api/chat/conversations/${convoId}`, "GET"),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // Unread counts & read receipts
  // =========================================================================

  describe("Unread counts & read receipts", () => {
    let convoId: string;

    beforeEach(async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id, USERS.dave.id],
          title: "Unread Test",
          isGroup: true,
        }),
      );
      convoId = (await res.json()).id;
    });

    it("Bob has unread messages after Alice and Carol send", async () => {
      // Alice sends
      setCurrentUser(USERS.alice);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Message 1",
        }),
        { params: makeParams({ id: convoId }) },
      );

      // Carol sends
      setCurrentUser(USERS.carol);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Message 2",
        }),
        { params: makeParams({ id: convoId }) },
      );

      // Bob checks unread
      setCurrentUser(USERS.bob);
      const res = await getUnreadCount();
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBe(2); // Both messages are unread for Bob
    });

    it("own messages don't count as unread", async () => {
      // Alice sends 3 messages
      setCurrentUser(USERS.alice);
      for (let i = 0; i < 3; i++) {
        await sendMessage(
          makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
            content: `Alice msg ${i}`,
          }),
          { params: makeParams({ id: convoId }) },
        );
      }

      // Alice's unread count should be 0
      const res = await getUnreadCount();
      const body = await res.json();
      expect(body.count).toBe(0);
    });

    it("marking as read reduces unread count", async () => {
      // Alice sends 2 messages
      setCurrentUser(USERS.alice);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "First",
        }),
        { params: makeParams({ id: convoId }) },
      );
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "Second",
        }),
        { params: makeParams({ id: convoId }) },
      );

      const lastMsgId = db.messages[db.messages.length - 1].id;

      // Bob marks as read
      setCurrentUser(USERS.bob);
      const readRes = await markRead(
        makeReq(`/api/chat/conversations/${convoId}/read`, "PUT", {
          lastReadMessageId: lastMsgId,
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(readRes.status).toBe(200);

      // Bob's unread count should now be 0
      const countRes = await getUnreadCount();
      const countBody = await countRes.json();
      expect(countBody.count).toBe(0);
    });

    it("new messages after read receipt increment unread again", async () => {
      // Alice sends msg 1
      setCurrentUser(USERS.alice);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "First",
        }),
        { params: makeParams({ id: convoId }) },
      );

      const msg1Id = db.messages[db.messages.length - 1].id;

      // Bob reads up to msg 1
      setCurrentUser(USERS.bob);
      await markRead(
        makeReq(`/api/chat/conversations/${convoId}/read`, "PUT", {
          lastReadMessageId: msg1Id,
        }),
        { params: makeParams({ id: convoId }) },
      );

      // Carol sends msg 2 after Bob's read — advance mock clock past the
      // real Date.now() used by markRead's last_read_at so this message's
      // created_at is newer than the read receipt timestamp.
      timeCounter = Date.now() + 60_000;
      setCurrentUser(USERS.carol);
      await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "New message from Carol",
        }),
        { params: makeParams({ id: convoId }) },
      );

      // Bob should have 1 unread
      setCurrentUser(USERS.bob);
      const res = await getUnreadCount();
      const body = await res.json();
      expect(body.count).toBe(1);
    });
  });

  // =========================================================================
  // Participant management
  // =========================================================================

  describe("Participant management", () => {
    let groupId: string;

    beforeEach(async () => {
      // Start with Alice, Bob, Carol in a group
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id],
          title: "Project Group",
          isGroup: true,
        }),
      );
      groupId = (await res.json()).id;
    });

    it("adds Dave to the group", async () => {
      setCurrentUser(USERS.alice);
      const res = await addParticipant(
        makeReq(`/api/chat/conversations/${groupId}/participants`, "POST", {
          userIds: [USERS.dave.id],
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(201);

      const activeParticipants = db.participants.filter(
        (p) => p.conversation_id === groupId && p.left_at === null,
      );
      expect(activeParticipants).toHaveLength(4);
    });

    it("adding an existing participant is a no-op (idempotent)", async () => {
      setCurrentUser(USERS.alice);
      const res = await addParticipant(
        makeReq(`/api/chat/conversations/${groupId}/participants`, "POST", {
          userIds: [USERS.bob.id],
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(201);

      // Still only 3 participants, no duplicates
      const activeParticipants = db.participants.filter(
        (p) => p.conversation_id === groupId && p.left_at === null,
      );
      expect(activeParticipants).toHaveLength(3);
    });

    it("Bob leaves the group", async () => {
      setCurrentUser(USERS.bob);
      const res = await leaveConversation(
        makeReq(`/api/chat/conversations/${groupId}`, "DELETE"),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(200);

      // Bob's participant row should have left_at set
      const bobRow = db.participants.find(
        (p) => p.conversation_id === groupId && p.user_id === USERS.bob.id,
      );
      expect(bobRow?.left_at).not.toBeNull();
    });

    it("after leaving, Bob cannot send messages", async () => {
      // Bob leaves
      setCurrentUser(USERS.bob);
      await leaveConversation(
        makeReq(`/api/chat/conversations/${groupId}`, "DELETE"),
        { params: makeParams({ id: groupId }) },
      );

      // Bob tries to send — should be 403
      const res = await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "Ghost message",
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(403);
    });

    it("Alice removes Carol from the group", async () => {
      setCurrentUser(USERS.alice);
      const res = await removeParticipant(
        makeReq(
          `/api/chat/conversations/${groupId}/participants?userId=${USERS.carol.id}`,
          "DELETE",
        ),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(200);

      const carolRow = db.participants.find(
        (p) => p.conversation_id === groupId && p.user_id === USERS.carol.id,
      );
      expect(carolRow?.left_at).not.toBeNull();
    });

    it("cannot add participants to a 1:1 conversation", async () => {
      setCurrentUser(USERS.alice);
      const dmRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: dmId } = await dmRes.json();

      const res = await addParticipant(
        makeReq(`/api/chat/conversations/${dmId}/participants`, "POST", {
          userIds: [USERS.carol.id],
        }),
        { params: makeParams({ id: dmId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/1:1/i);
    });
  });

  // =========================================================================
  // Conversation title updates
  // =========================================================================

  describe("Conversation title updates", () => {
    it("updates title on a group conversation", async () => {
      setCurrentUser(USERS.alice);
      const createRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id],
          title: "Old Title",
          isGroup: true,
        }),
      );
      const { id: groupId } = await createRes.json();

      const patchRes = await updateConversation(
        makeReq(`/api/chat/conversations/${groupId}`, "PATCH", {
          title: "New Title",
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(patchRes.status).toBe(200);
      const body = await patchRes.json();
      expect(body.conversation.title).toBe("New Title");
    });

    it("rejects title update on a 1:1 conversation", async () => {
      setCurrentUser(USERS.alice);
      const dmRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: dmId } = await dmRes.json();

      const patchRes = await updateConversation(
        makeReq(`/api/chat/conversations/${dmId}`, "PATCH", {
          title: "Shouldn't Work",
        }),
        { params: makeParams({ id: dmId }) },
      );
      expect(patchRes.status).toBe(400);
    });
  });

  // =========================================================================
  // Reactions
  // =========================================================================

  describe("Reactions", () => {
    let convoId: string;
    let messageId: string;

    beforeEach(async () => {
      setCurrentUser(USERS.alice);
      const convoRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id, USERS.dave.id],
          title: "Reactions Test",
          isGroup: true,
        }),
      );
      convoId = (await convoRes.json()).id;

      // Alice sends a message
      const msgRes = await sendMessage(
        makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
          content: "React to this!",
        }),
        { params: makeParams({ id: convoId }) },
      );
      messageId = (await msgRes.json()).id;
    });

    it("all 4 users react to the same message", async () => {
      for (const user of [USERS.alice, USERS.bob, USERS.carol, USERS.dave]) {
        setCurrentUser(user);
        const res = await addReaction(
          makeReq(
            `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
            "POST",
            { emoji: "👍" },
          ),
          { params: makeParams({ id: convoId, msgId: messageId }) },
        );
        expect(res.status).toBe(201);
      }

      // Should have 4 reactions for the same emoji
      const thumbsUp = db.reactions.filter(
        (r) => r.message_id === messageId && r.emoji === "👍",
      );
      expect(thumbsUp).toHaveLength(4);
    });

    it("duplicate reaction is a no-op", async () => {
      setCurrentUser(USERS.alice);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "❤️" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );

      // Add same reaction again
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "❤️" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );

      const hearts = db.reactions.filter(
        (r) => r.message_id === messageId && r.user_id === USERS.alice.id && r.emoji === "❤️",
      );
      expect(hearts).toHaveLength(1);
    });

    it("Bob removes his reaction", async () => {
      // Add reaction first
      setCurrentUser(USERS.bob);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "🎉" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );
      expect(db.reactions.filter((r) => r.emoji === "🎉")).toHaveLength(1);

      // Remove it
      const res = await removeReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions?emoji=🎉`,
          "DELETE",
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );
      expect(res.status).toBe(200);
      expect(db.reactions.filter((r) => r.emoji === "🎉")).toHaveLength(0);
    });

    it("reactions show in conversation detail with correct counts", async () => {
      // Alice and Bob react 👍, Carol reacts ❤️
      setCurrentUser(USERS.alice);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "👍" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );

      setCurrentUser(USERS.bob);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "👍" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );

      setCurrentUser(USERS.carol);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/${messageId}/reactions`,
          "POST",
          { emoji: "❤️" },
        ),
        { params: makeParams({ id: convoId, msgId: messageId }) },
      );

      // Dave reads conversation
      setCurrentUser(USERS.dave);
      const res = await getConversationDetail(
        makeReq(`/api/chat/conversations/${convoId}`, "GET"),
        { params: makeParams({ id: convoId }) },
      );
      const body = await res.json();
      const msg = body.messages.find((m: { content: string }) => m.content === "React to this!");
      expect(msg).toBeDefined();

      const thumbs = msg.reactions.find((r: { emoji: string }) => r.emoji === "👍");
      expect(thumbs.count).toBe(2);
      expect(thumbs.userIds).toContain(USERS.alice.id);
      expect(thumbs.userIds).toContain(USERS.bob.id);

      const heart = msg.reactions.find((r: { emoji: string }) => r.emoji === "❤️");
      expect(heart.count).toBe(1);
      expect(heart.userIds).toContain(USERS.carol.id);
    });
  });

  // =========================================================================
  // Listing conversations
  // =========================================================================

  describe("Listing conversations", () => {
    it("each user only sees conversations they're part of", async () => {
      // Alice-Bob DM
      setCurrentUser(USERS.alice);
      await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );

      // Alice-Carol DM
      await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.carol.id],
        }),
      );

      // Bob-Dave DM
      setCurrentUser(USERS.bob);
      await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.dave.id],
        }),
      );

      // Alice: should see 2 conversations
      setCurrentUser(USERS.alice);
      const aliceRes = await getConversations();
      const aliceBody = await aliceRes.json();
      expect(aliceBody.conversations).toHaveLength(2);

      // Bob: should see 2 conversations
      setCurrentUser(USERS.bob);
      const bobRes = await getConversations();
      const bobBody = await bobRes.json();
      expect(bobBody.conversations).toHaveLength(2);

      // Carol: should see 1 conversation
      setCurrentUser(USERS.carol);
      const carolRes = await getConversations();
      const carolBody = await carolRes.json();
      expect(carolBody.conversations).toHaveLength(1);

      // Dave: should see 1 conversation
      setCurrentUser(USERS.dave);
      const daveRes = await getConversations();
      const daveBody = await daveRes.json();
      expect(daveBody.conversations).toHaveLength(1);
    });
  });

  // =========================================================================
  // Full 4-user scenario (integration-like)
  // =========================================================================

  describe("Full 4-user messaging scenario", () => {
    it("simulates a realistic multi-user chat flow", async () => {
      // 1. Alice creates a group with everyone
      setCurrentUser(USERS.alice);
      const groupRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id, USERS.dave.id],
          title: "Q1 Planning",
          isGroup: true,
        }),
      );
      const { id: groupId } = await groupRes.json();

      // 2. Alice also DMs Bob separately
      const dmRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: dmId } = await dmRes.json();

      // 3. Alice sends in group
      await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "Let's plan Q1 goals",
        }),
        { params: makeParams({ id: groupId }) },
      );

      // 4. Alice sends private message to Bob
      await sendMessage(
        makeReq(`/api/chat/conversations/${dmId}/messages`, "POST", {
          content: "Hey Bob, thoughts on the budget?",
        }),
        { params: makeParams({ id: dmId }) },
      );

      // 5. Bob replies in both
      setCurrentUser(USERS.bob);
      await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "Great idea! I have some suggestions.",
        }),
        { params: makeParams({ id: groupId }) },
      );
      await sendMessage(
        makeReq(`/api/chat/conversations/${dmId}/messages`, "POST", {
          content: "Thinking $500k for marketing",
        }),
        { params: makeParams({ id: dmId }) },
      );

      // 6. Carol and Dave reply in group
      setCurrentUser(USERS.carol);
      await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "I'll prepare the metrics report",
        }),
        { params: makeParams({ id: groupId }) },
      );

      setCurrentUser(USERS.dave);
      await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "I can handle the investor outreach",
        }),
        { params: makeParams({ id: groupId }) },
      );

      // 7. Verify message counts
      const groupMessages = db.messages.filter((m) => m.conversation_id === groupId);
      const dmMessages = db.messages.filter((m) => m.conversation_id === dmId);
      expect(groupMessages).toHaveLength(4);
      expect(dmMessages).toHaveLength(2);

      // 8. Carol checks unread (she hasn't read anything)
      setCurrentUser(USERS.carol);
      const carolUnread = await getUnreadCount();
      const carolUnreadBody = await carolUnread.json();
      // Carol has unread in group: Alice's msg + Bob's msg + Dave's msg = 3 (excludes her own)
      expect(carolUnreadBody.count).toBe(3);

      // 9. Carol reads up to the latest group message
      const latestGroupMsg = groupMessages[groupMessages.length - 1];
      await markRead(
        makeReq(`/api/chat/conversations/${groupId}/read`, "PUT", {
          lastReadMessageId: latestGroupMsg.id,
        }),
        { params: makeParams({ id: groupId }) },
      );

      // 10. Carol's unread should be 0 now
      const carolUnread2 = await getUnreadCount();
      expect((await carolUnread2.json()).count).toBe(0);

      // 11. Carol can't read Alice-Bob DM
      const sneakRes = await getConversationDetail(
        makeReq(`/api/chat/conversations/${dmId}`, "GET"),
        { params: makeParams({ id: dmId }) },
      );
      expect(sneakRes.status).toBe(403);

      // 12. Dave reacts to Alice's group message
      const aliceGroupMsg = groupMessages[0];
      setCurrentUser(USERS.dave);
      await addReaction(
        makeReq(
          `/api/chat/conversations/${groupId}/messages/${aliceGroupMsg.id}/reactions`,
          "POST",
          { emoji: "🚀" },
        ),
        { params: makeParams({ id: groupId, msgId: aliceGroupMsg.id }) },
      );

      // 13. Dave leaves the group
      await leaveConversation(
        makeReq(`/api/chat/conversations/${groupId}`, "DELETE"),
        { params: makeParams({ id: groupId }) },
      );

      // 14. Dave can no longer send to the group
      const davePost = await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "Should fail",
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(davePost.status).toBe(403);

      // 15. Remaining participants can still chat
      setCurrentUser(USERS.alice);
      const alicePost = await sendMessage(
        makeReq(`/api/chat/conversations/${groupId}/messages`, "POST", {
          content: "Dave left, but we continue!",
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(alicePost.status).toBe(201);

      // 16. Alice updates group title
      const titleRes = await updateConversation(
        makeReq(`/api/chat/conversations/${groupId}`, "PATCH", {
          title: "Q1 Planning (Updated)",
        }),
        { params: makeParams({ id: groupId }) },
      );
      expect(titleRes.status).toBe(200);
      expect(db.conversations.find((c) => c.id === groupId)?.title).toBe(
        "Q1 Planning (Updated)",
      );
    });
  });

  // =========================================================================
  // Message pagination
  // =========================================================================

  describe("Message pagination", () => {
    let convoId: string;

    beforeEach(async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      convoId = (await res.json()).id;
    });

    it("respects limit parameter", async () => {
      // Send 5 messages
      setCurrentUser(USERS.alice);
      for (let i = 0; i < 5; i++) {
        await sendMessage(
          makeReq(`/api/chat/conversations/${convoId}/messages`, "POST", {
            content: `Message ${i + 1}`,
          }),
          { params: makeParams({ id: convoId }) },
        );
      }

      // Fetch with limit=3
      const res = await getMessages(
        makeReq(`/api/chat/conversations/${convoId}/messages?limit=3`, "GET"),
        { params: makeParams({ id: convoId }) },
      );
      const body = await res.json();
      expect(body.messages).toHaveLength(3);
      expect(body.hasMore).toBe(true);
    });
  });

  // =========================================================================
  // Input validation
  // =========================================================================

  describe("Input validation", () => {
    it("rejects invalid JSON body for conversation creation", async () => {
      setCurrentUser(USERS.alice);
      const req = new NextRequest("http://localhost:3001/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await createConversation(req);
      expect(res.status).toBe(400);
    });

    it("rejects conversation with no participants", async () => {
      setCurrentUser(USERS.alice);
      const res = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [],
        }),
      );
      expect(res.status).toBe(400);
    });

    it("rejects mark-read with invalid message ID format", async () => {
      setCurrentUser(USERS.alice);
      const convoRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: convoId } = await convoRes.json();

      const res = await markRead(
        makeReq(`/api/chat/conversations/${convoId}/read`, "PUT", {
          lastReadMessageId: "not-a-uuid",
        }),
        { params: makeParams({ id: convoId }) },
      );
      expect(res.status).toBe(400);
    });

    it("rejects reaction without emoji parameter on delete", async () => {
      setCurrentUser(USERS.alice);
      const convoRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id],
        }),
      );
      const { id: convoId } = await convoRes.json();

      const res = await removeReaction(
        makeReq(
          `/api/chat/conversations/${convoId}/messages/any-msg/reactions`,
          "DELETE",
        ),
        { params: makeParams({ id: convoId, msgId: "any-msg" }) },
      );
      expect(res.status).toBe(400);
    });

    it("rejects remove-participant without userId query param", async () => {
      setCurrentUser(USERS.alice);
      const convoRes = await createConversation(
        makeReq("/api/chat/conversations", "POST", {
          participantIds: [USERS.bob.id, USERS.carol.id],
          isGroup: true,
        }),
      );
      const { id: groupId } = await convoRes.json();

      const res = await removeParticipant(
        makeReq(`/api/chat/conversations/${groupId}/participants`, "DELETE"),
        { params: makeParams({ id: groupId }) },
      );
      expect(res.status).toBe(400);
    });
  });
});
