export type DemoEvent = {
  id: string;
  type:
    | "geo"
    | "user_created"
    | "referral_linked"
    | "reward_credited"
    | "email_queued"
    | "integrity_node"
    | "profile_completed"
    | "fraud_blocked"
    | "stats"
    | "error";
  message: string;
  sql?: string;
  data?: Record<string, unknown>;
  ts: number;
};

type Listener = (event: DemoEvent) => void;

const globalStore = globalThis as unknown as {
  __demoListeners?: Set<Listener>;
  __demoEventBuffer?: DemoEvent[];
};

function listeners(): Set<Listener> {
  if (!globalStore.__demoListeners) {
    globalStore.__demoListeners = new Set();
  }
  return globalStore.__demoListeners;
}

function buffer(): DemoEvent[] {
  if (!globalStore.__demoEventBuffer) {
    globalStore.__demoEventBuffer = [];
  }
  return globalStore.__demoEventBuffer;
}

export function publishEvent(
  event: Omit<DemoEvent, "id" | "ts"> & { id?: string; ts?: number },
): DemoEvent {
  const full: DemoEvent = {
    id: event.id ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: event.ts ?? Date.now(),
    type: event.type,
    message: event.message,
    sql: event.sql,
    data: event.data,
  };

  const buf = buffer();
  buf.push(full);
  if (buf.length > 200) buf.shift();

  for (const listener of listeners()) {
    try {
      listener(full);
    } catch {
      // ignore broken listeners
    }
  }

  return full;
}

export function subscribe(listener: Listener): () => void {
  listeners().add(listener);
  return () => listeners().delete(listener);
}

export function recentEvents(limit = 50): DemoEvent[] {
  return buffer().slice(-limit);
}
