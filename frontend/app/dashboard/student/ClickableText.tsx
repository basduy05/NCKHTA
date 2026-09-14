"use client";
import React from "react";

interface ClickableTextProps {
  content: string;
  onWordClick: (word: string, event: React.MouseEvent<HTMLSpanElement>) => void;
  className?: string;
}

export default function ClickableText({ content, onWordClick, className = "" }: ClickableTextProps) {
  // Split content while keeping spaces and punctuation intact
  const tokens = content.split(/(\s+|[.,!?;:"'()\[\]{}]+)/);

  return (
    <div className={`leading-relaxed text-gray-800 dark:text-gray-200 select-text ${className}`}>
      {tokens.map((token, idx) => {
        // Clean token to check if it's an English word
        const clean = token.replace(/[^a-zA-Z'-]/g, "").trim();
        const isWord = clean.length >= 2 && !/^\d+$/.test(clean);

        if (!isWord) {
          return <span key={idx}>{token}</span>;
        }

        return (
          <span
            key={idx}
            onClick={(e) => onWordClick(clean.toLowerCase(), e)}
            className="cursor-pointer rounded px-0.5 transition-colors duration-150 hover:bg-amber-200/70 dark:hover:bg-amber-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline underline-offset-2"
            title={`Tra từ: "${clean}"`}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
}
