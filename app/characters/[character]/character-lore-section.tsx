"use client";

import { useState } from "react";
import { BookOpen, MessageSquare, Sparkles } from "lucide-react";
import type { LoreCharacterDetailViewModel } from "@/lib/teyvat/domain/lore";

interface CharacterLoreSectionProps {
  lore: LoreCharacterDetailViewModel | null;
  characterName: string;
}

export function CharacterLoreSection({ lore, characterName }: CharacterLoreSectionProps) {
  const [activeTab, setActiveTab] = useState<"stories" | "voicelines">("stories");
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState(0);

  if (!lore || (lore.stories.length === 0 && lore.voicelines.length === 0)) {
    return null;
  }

  const stories = lore.stories;
  const voicelines = lore.voicelines;
  const activeStory = stories[selectedStoryIndex] || stories[0];
  const activeQuote = voicelines[selectedQuoteIndex] || voicelines[0];

  return (
    <section className="mb-10">
      <header className="banner-section-heading mb-4">
        <div>
          <span className="flex items-center gap-1.5 text-[var(--gold)]">
            <Sparkles size={13} /> Canonical Chronicle & Dialogue Archive
          </span>
          <h2>Character Lore & Voice Transcripts</h2>
        </div>
        <p>
          Official {characterName} story chapters, Vision origin, and spoken dialogue archives
        </p>
      </header>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Tab Selector */}
        <div className="flex border-b border-[var(--line)] bg-[#090f0d] p-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("stories")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "stories"
                ? "bg-[rgba(98,213,163,0.15)] text-[var(--green)] border border-[rgba(98,213,163,0.4)] font-bold shadow-sm"
                : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] border border-transparent"
            }`}
          >
            <BookOpen size={14} />
            <span>Character Stories</span>
            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">
              {stories.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("voicelines")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "voicelines"
                ? "bg-[rgba(129,140,248,0.15)] text-indigo-400 border border-indigo-500/40 font-bold shadow-sm"
                : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] border border-transparent"
            }`}
          >
            <MessageSquare size={14} />
            <span>Spoken Voicelines</span>
            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">
              {voicelines.length}
            </span>
          </button>
        </div>

        {/* Stories Tab View */}
        {activeTab === "stories" && stories.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Story Navigation Sidebar */}
            <div className="lg:col-span-4 border-r border-[var(--line)] bg-[#090f0d]/60 p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[500px]">
              <span className="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider px-2 py-1">
                Story Chapters
              </span>
              {stories.map((story, idx) => (
                <button
                  type="button"
                  key={story.id}
                  onClick={() => setSelectedStoryIndex(idx)}
                  className={`text-left text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedStoryIndex === idx
                      ? "bg-[rgba(98,213,163,0.12)] text-[var(--green)] font-semibold border border-[rgba(98,213,163,0.3)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent"
                  }`}
                >
                  <span className="truncate">{story.title}</span>
                  <span className="text-[10px] font-mono opacity-60 shrink-0">
                    {Math.round(story.content.length / 5)} words
                  </span>
                </button>
              ))}
            </div>

            {/* Story Content Reader */}
            <div className="lg:col-span-8 p-6 md:p-8 flex flex-col gap-4 bg-[#0a110f] overflow-y-auto max-h-[500px]">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-[var(--gold)] font-bold uppercase tracking-wider">
                    {characterName} Archive
                  </span>
                  <h3 className="text-base font-bold text-[var(--text)] m-0 mt-0.5">
                    {activeStory.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-3)]">
                  Canonical Evidence
                </span>
              </div>
              <div className="whitespace-pre-line text-sm md:text-base text-[var(--text-2)] leading-relaxed font-serif pt-1">
                {activeStory.content.replace(/\\n/g, "\n\n").replace(/\\"/g, '"')}
              </div>
            </div>
          </div>
        )}

        {/* Voicelines Tab View */}
        {activeTab === "voicelines" && voicelines.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Voiceline Navigation Sidebar */}
            <div className="lg:col-span-4 border-r border-[var(--line)] bg-[#090f0d]/60 p-3 flex flex-col gap-1 overflow-y-auto max-h-[500px]">
              <span className="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider px-2 py-1">
                Dialogue Lines ({voicelines.length})
              </span>
              {voicelines.map((quote, idx) => (
                <button
                  type="button"
                  key={quote.id}
                  onClick={() => setSelectedQuoteIndex(idx)}
                  className={`text-left text-xs px-3 py-2 rounded-lg transition-all cursor-pointer truncate ${
                    selectedQuoteIndex === idx
                      ? "bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/30"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent"
                  }`}
                >
                  {quote.title}
                </button>
              ))}
            </div>

            {/* Voiceline Content Display */}
            <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-center gap-4 bg-[#0a110f]">
              <div className="border-l-2 border-indigo-500/60 pl-5 py-2 flex flex-col gap-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                  {activeQuote.title}
                </span>
                <blockquote className="whitespace-pre-line text-base md:text-lg text-[var(--text)] leading-relaxed italic m-0 font-sans">
                  &quot;{activeQuote.content.replace(/\\n/g, "\n").replace(/\\"/g, '"')}&quot;
                </blockquote>
                <span className="text-xs text-[var(--text-3)] font-mono mt-2">
                  Spoken by: {characterName}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
