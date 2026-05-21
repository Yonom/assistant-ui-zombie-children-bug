import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useEffect, useMemo, useRef, useState } from "react";

const TICK_RATE_HZ = 50;
const SUBAGENT_DEPTH = 6;

const SESSION_SHAPES: Record<string, { msgCount: number; partsPerMsg: number }> = {
  alpha: { msgCount: 8, partsPerMsg: SUBAGENT_DEPTH },
  beta: { msgCount: 3, partsPerMsg: 2 },
};

function buildMessages(sessionId: string, tick: number): ThreadMessageLike[] {
  const shape = SESSION_SHAPES[sessionId];
  if (!shape) return [];
  const msgs: ThreadMessageLike[] = [];
  msgs.push({
    id: `${sessionId}-msg-0`,
    role: "user",
    content: [{ type: "text", text: `prompt for ${sessionId}` }],
  });
  // Vary message count and per-message part count per tick.
  const effectiveMsgCount = 2 + (tick % (shape.msgCount - 1));
  for (let i = 1; i < effectiveMsgCount; i++) {
    const effectivePartCount = 1 + ((tick + i) % shape.partsPerMsg);
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown; result?: unknown }
    > = [];
    for (let j = 0; j < effectivePartCount; j++) {
      const partIsTool = sessionId === "alpha" ? j % 2 === 1 : j === effectivePartCount - 1;
      if (partIsTool) {
        parts.push({
          type: "tool-call",
          toolCallId: `${sessionId}-tc-${i}-${j}`,
          toolName: "Bash",
          args: { command: `echo s=${sessionId} m=${i} p=${j} t=${tick}` },
          result: `output line for tick ${tick}`,
        });
      } else {
        parts.push({
          type: "text",
          text: `Session ${sessionId}, message ${i}, part ${j} (tick ${tick})`,
        });
      }
    }
    msgs.push({ id: `${sessionId}-msg-${i}`, role: "assistant", content: parts });
  }
  return msgs;
}

export function App() {
  const [sessionId, setSessionId] = useState<keyof typeof SESSION_SHAPES>("alpha");
  const [tick, setTick] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!streaming) {
      if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
      return;
    }
    const ms = Math.max(1, Math.floor(1000 / TICK_RATE_HZ));
    tickIntervalRef.current = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => {
      if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current);
    };
  }, [streaming]);

  const messages = useMemo(
    () => buildMessages(sessionId, tick),
    [sessionId, tick],
  );

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning: streaming,
    convertMessage: (m) => m,
    onNew: async () => {},
  });

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <button onClick={() => setStreaming((s) => !s)}>
        {streaming ? "Stop stream" : "Start stream"}
      </button>
      <button onClick={() => setSessionId((s) => (s === "alpha" ? "beta" : "alpha"))}>
        Switch session (current: {sessionId})
      </button>
      <span> tick {tick} </span>

      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root style={{ border: "1px solid #ccc", padding: 12 }}>
          <ThreadPrimitive.Viewport>
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root>
                    <strong>USER:</strong>
                    <MessagePrimitive.Parts components={{ Text: TextPart }} />
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root>
                    <strong>ASSISTANT:</strong>
                    <MessagePrimitive.Parts
                      components={{
                        Text: TextPart,
                        tools: { Fallback: ToolCallPart },
                      }}
                    />
                  </MessagePrimitive.Root>
                ),
              }}
            />
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root>
            <ComposerPrimitive.Input placeholder="(unused)" />
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </div>
  );
}

function TextPart() {
  return (
    <MarkdownTextPrimitive
      components={{ p: ({ children }) => <p style={{ margin: 0 }}>{children}</p> }}
    />
  );
}

function ToolCallPart({
  toolName,
  args,
  result,
}: {
  toolName: string;
  args: unknown;
  result?: unknown;
}) {
  return (
    <div style={{ background: "#f4f4f8", padding: 6, fontFamily: "monospace", fontSize: 12 }}>
      <div>tool: {toolName}</div>
      <div>args: {JSON.stringify(args).slice(0, 80)}</div>
      {result !== undefined ? <div>result: {String(result).slice(0, 80)}</div> : null}
    </div>
  );
}
