"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { Socket } from "socket.io-client";

interface ChatMsg {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

interface TeamChatProps {
  socket: Socket;
  teamId: string;
  currentUserId: string;
}

export default function TeamChat({
  socket,
  teamId,
  currentUserId,
}: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHistory = (data: { chatHistory: ChatMsg[] }) => {
      if (data.chatHistory) {
        setMessages(data.chatHistory);
      }
    };

    const handleMessage = (msg: ChatMsg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("team-state", handleHistory);
    socket.on("team-chat-message", handleMessage);

    socket.emit("join-team", { teamId });

    return () => {
      socket.off("team-state", handleHistory);
      socket.off("team-chat-message", handleMessage);
    };
  }, [socket, teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit("team-chat", { text: input.trim() });
    setInput("");
  };

  return (
    <div className="glass-card flex flex-col h-80">
      <div className="px-4 py-2.5 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="section-title">Team Chat</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-8">
            No messages yet. Start the discussion!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id || `${msg.userId}-${msg.createdAt}`}
            className={`text-sm ${
              msg.userId === currentUserId ? "text-right" : ""
            }`}
          >
            <span className="text-xs text-gray-500">{msg.displayName}</span>
            <p
              className={`inline-block px-3 py-1.5 rounded-xl mt-0.5 max-w-[85%] ${
                msg.userId === currentUserId
                  ? "bg-indigo-600/25 text-indigo-200 ml-auto"
                  : "bg-gray-800/60 text-gray-200"
              }`}
            >
              {msg.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="px-3 py-2.5 border-t border-gray-800/60 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-xl px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          placeholder="Message your team..."
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3.5 py-1.5 rounded-xl transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
