"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

interface RoomMessageEntry {
  id: string;
  type: "broadcast" | "hint_request";
  text: string;
  userId: string;
  senderName?: string;
  displayName?: string;
  status: "active" | "blocked" | "answered" | "declined";
  blockedBy?: string | null;
  blockerName?: string | null;
  response?: string | null;
  createdAt: string;
}

interface RoomChatProps {
  socket: Socket;
  isQuizmaster: boolean;
  currentUserId: string;
}

export default function RoomChat({ socket, isQuizmaster, currentUserId }: RoomChatProps) {
  const [messages, setMessages] = useState<RoomMessageEntry[]>([]);
  const [broadcastText, setBroadcastText] = useState("");
  const [hintText, setHintText] = useState("");
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      socket.emit("get-room-messages");
      hasLoaded.current = true;
    }

    const onRoomMessages = (data: { messages: RoomMessageEntry[] }) => {
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    };

    const onRoomMessage = (msg: RoomMessageEntry) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollToBottom, 100);
    };

    const onHintRequested = (msg: RoomMessageEntry) => {
      setMessages(prev => [...prev, { ...msg, type: "hint_request" }]);
      setTimeout(scrollToBottom, 100);
    };

    const onHintBlocked = (data: { id: string; blockedBy: string; blockerName: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.id ? { ...m, status: "blocked" as const, blockedBy: data.blockedBy, blockerName: data.blockerName } : m
      ));
    };

    const onHintAnswered = (data: { id: string; response: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.id ? { ...m, status: "answered" as const, response: data.response } : m
      ));
    };

    const onHintDeclined = (data: { id: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.id ? { ...m, status: "declined" as const } : m
      ));
    };

    socket.on("room-messages", onRoomMessages);
    socket.on("room-message", onRoomMessage);
    socket.on("hint-requested", onHintRequested);
    socket.on("hint-blocked", onHintBlocked);
    socket.on("hint-answered", onHintAnswered);
    socket.on("hint-declined", onHintDeclined);

    return () => {
      socket.off("room-messages", onRoomMessages);
      socket.off("room-message", onRoomMessage);
      socket.off("hint-requested", onHintRequested);
      socket.off("hint-blocked", onHintBlocked);
      socket.off("hint-answered", onHintAnswered);
      socket.off("hint-declined", onHintDeclined);
    };
  }, [socket, scrollToBottom]);

  const handleBroadcast = () => {
    const trimmed = broadcastText.trim();
    if (!trimmed) return;
    socket.emit("qm-broadcast", { text: trimmed });
    setBroadcastText("");
  };

  const handleHintRequest = () => {
    const trimmed = hintText.trim();
    if (!trimmed) return;
    socket.emit("request-hint", { text: trimmed });
    setHintText("");
  };

  const handleBlock = (messageId: string) => {
    socket.emit("block-hint", { messageId });
  };

  const handleAnswerHint = (messageId: string) => {
    const response = answerTexts[messageId]?.trim();
    if (!response) return;
    socket.emit("answer-hint", { messageId, response });
    setAnswerTexts(prev => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  };

  const handleDeclineHint = (messageId: string) => {
    socket.emit("decline-hint", { messageId });
  };

  const broadcasts = messages.filter(m => m.type === "broadcast");
  const hintRequests = messages.filter(m => m.type === "hint_request");

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-white">Announcements & Hints</h3>
      </div>

      {isQuizmaster && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBroadcast()}
            className="input-field text-sm flex-1"
            placeholder="Broadcast to all participants..."
            maxLength={500}
          />
          <button
            onClick={handleBroadcast}
            disabled={!broadcastText.trim()}
            className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 text-sm hover:bg-purple-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      )}

      {!isQuizmaster && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHintRequest()}
            className="input-field text-sm flex-1"
            placeholder="Ask for a hint or clarification..."
            maxLength={500}
          />
          <button
            onClick={handleHintRequest}
            disabled={!hintText.trim()}
            className="px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 text-sm hover:bg-amber-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-2">
        {broadcasts.length > 0 && (
          <div className="space-y-1.5">
            {broadcasts.map((msg) => (
              <div key={msg.id} className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">QM Announcement</span>
                </div>
                <p className="text-sm text-gray-200">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {hintRequests.length > 0 && (
          <div className="space-y-1.5">
            {hintRequests.map((msg) => (
              <div
                key={msg.id}
                className={`px-3 py-2 rounded-lg border ${
                  msg.status === "blocked"
                    ? "bg-red-500/5 border-red-500/20"
                    : msg.status === "answered"
                    ? "bg-green-500/5 border-green-500/20"
                    : msg.status === "declined"
                    ? "bg-gray-500/5 border-gray-500/20"
                    : "bg-amber-500/5 border-amber-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                      Hint Request
                    </span>
                    <span className="text-[10px] text-gray-500">
                      from {msg.senderName ?? msg.displayName}
                    </span>
                  </div>
                  {msg.status === "blocked" && (
                    <span className="text-[10px] text-red-400 font-medium">Blocked{msg.blockerName ? ` by ${msg.blockerName}` : ""}</span>
                  )}
                  {msg.status === "answered" && (
                    <span className="text-[10px] text-green-400 font-medium">Answered</span>
                  )}
                  {msg.status === "declined" && (
                    <span className="text-[10px] text-gray-400 font-medium">Declined</span>
                  )}
                </div>

                <p className="text-sm text-gray-300 mb-1">{msg.text}</p>

                {msg.status === "answered" && msg.response && (
                  <div className="mt-1.5 px-2 py-1.5 bg-green-500/10 rounded text-sm text-green-300">
                    <span className="text-[10px] text-green-400 font-medium mr-1">QM:</span>
                    {msg.response}
                  </div>
                )}

                {msg.status === "active" && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {!isQuizmaster && msg.userId !== currentUserId && (
                      <button
                        onClick={() => handleBlock(msg.id)}
                        className="text-[11px] px-2 py-0.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      >
                        Block
                      </button>
                    )}
                    {isQuizmaster && (
                      <>
                        <input
                          type="text"
                          value={answerTexts[msg.id] ?? ""}
                          onChange={(e) => setAnswerTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAnswerHint(msg.id)}
                          className="input-field text-xs flex-1 py-1"
                          placeholder="Answer..."
                          maxLength={500}
                        />
                        <button
                          onClick={() => handleAnswerHint(msg.id)}
                          disabled={!answerTexts[msg.id]?.trim()}
                          className="text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-40"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => handleDeclineHint(msg.id)}
                          className="text-[11px] px-2 py-0.5 rounded bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            {isQuizmaster
              ? "Broadcast messages or respond to hint requests here."
              : "Ask for hints or see announcements here."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
