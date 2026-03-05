"use client";

import { useEffect, useRef } from "react";
import { ActivityEntry } from "@/app/room/[code]/page";

interface QuestionActivityLogProps {
  entries: ActivityEntry[];
}

function formatEntry(entry: ActivityEntry): { text: string; color: string } {
  switch (entry.type) {
    case "question_started":
      return { text: `Question directed at ${entry.teamName}`, color: "text-blue-300" };
    case "pounce_open":
      return { text: "Pounce window open", color: "text-purple-300" };
    case "pounce_closed":
      return { text: "Pounce window closed", color: "text-purple-400" };
    case "team_pounced":
      return { text: `${entry.teamName} pounced`, color: "text-purple-300" };
    case "team_answering":
      return { text: `${entry.teamName} is answering...`, color: "text-indigo-300" };
    case "answer_submitted":
      return {
        text: `${entry.teamName} submitted: "${entry.answerText}"`,
        color: "text-white",
      };
    case "answer_correct":
      return {
        text: `${entry.teamName}'s answer marked CORRECT (+${entry.points} pts)`,
        color: "text-emerald-400",
      };
    case "answer_wrong":
      return { text: `${entry.teamName}'s answer marked WRONG (no penalty)`, color: "text-red-400" };
    case "team_passed":
      return { text: `${entry.teamName} passed`, color: "text-gray-400" };
    case "timed_out":
      return { text: `${entry.teamName} timed out`, color: "text-gray-500" };
    case "question_exhausted":
      return { text: "All teams exhausted -- no correct answer", color: "text-amber-400" };
    case "pounce_marking":
      return { text: "Pounce marking in progress...", color: "text-purple-300" };
    case "pounce_correct":
      return {
        text: `${entry.teamName}'s pounce marked CORRECT (+${entry.points} pts)`,
        color: "text-emerald-400",
      };
    case "pounce_wrong":
      return {
        text: `${entry.teamName}'s pounce marked WRONG (${entry.points} pts)`,
        color: "text-red-400",
      };
    default:
      return { text: entry.type, color: "text-gray-400" };
  }
}

export default function QuestionActivityLog({ entries }: QuestionActivityLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div className="glass-card p-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="section-title">Activity Log</h3>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
        {entries.map((entry, idx) => {
          const { text, color } = formatEntry(entry);
          const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-gray-600 shrink-0 tabular-nums">{time}</span>
              <span className={color}>{text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
