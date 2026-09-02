"use client";

import { useMemo, useState } from "react";
import { BookOpen, MessageSquare, Sparkles, Search, Quote } from "lucide-react";
import type { LoreCharacterDetailViewModel } from "@/lib/teyvat/domain/lore";

interface CharacterLoreSectionProps {
  lore: LoreCharacterDetailViewModel | null;
  characterName: string;
}

type VoicelineCategory = "all" | "greeting" | "chat" | "about_us" | "about_character" | "combat";

function getVoicelineCategory(title: string): VoicelineCategory {
  const lower = title.toLowerCase();
  if (lower.startsWith("hello") || lower.startsWith("good ") || lower.includes("morning") || lower.includes("evening") || lower.includes("night")) {
    return "greeting";
  }
  if (lower.startsWith("chat:") || lower.startsWith("when it ") || lower.startsWith("after the ") || lower.startsWith("sunny") || lower.startsWith("rain") || lower.startsWith("thunder") || lower.startsWith("snow") || lower.startsWith("wind")) {
    return "chat";
  }
  if (lower.startsWith("about us:") || lower.startsWith("about the vision") || lower.startsWith("something to share") || lower.startsWith("interesting things")) {
    return "about_us";
  }
  if (lower.startsWith("about ") || lower.startsWith("more about ")) {
    return "about_character";
  }
  if (lower.startsWith("elemental skill") || lower.startsWith("elemental burst") || lower.startsWith("opening treasure") || lower.startsWith("low hp") || lower.startsWith("fallen") || lower.startsWith("light hit") || lower.startsWith("heavy hit") || lower.startsWith("joining party")) {
    return "combat";
  }
  return "all";
}

export function CharacterLoreSection({ lore, characterName }: CharacterLoreSectionProps) {
  const [activeTab, setActiveTab] = useState<"stories" | "voicelines">("stories");
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [quoteFilter, setQuoteFilter] = useState<VoicelineCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stories = useMemo(() => lore?.stories ?? [], [lore]);
  const voicelines = useMemo(() => lore?.voicelines ?? [], [lore]);

  // Filtered Voicelines
  const filteredVoicelines = useMemo(() => {
    return voicelines.filter((q) => {
      const matchesCategory = quoteFilter === "all" || getVoicelineCategory(q.title) === quoteFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [voicelines, quoteFilter, searchQuery]);

  // Active Quote selection
  const activeQuote = useMemo(() => {
    if (selectedQuoteId) {
      const found = voicelines.find((q) => q.id === selectedQuoteId);
      if (found) return found;
    }
    return filteredVoicelines[0] || voicelines[0];
  }, [voicelines, filteredVoicelines, selectedQuoteId]);

  const activeStory = stories[selectedStoryIndex] || stories[0];

  if (!lore || (stories.length === 0 && voicelines.length === 0)) {
    return null;
  }

  return (
    <section className="mb-10">
      <header className="banner-section-heading mb-4">
        <div>
          <span className="flex items-center gap-1.5 text-[var(--gold)]">
            <Sparkles size={13} /> 03 / Canonical Chronicle & Voice Archive
          </span>
          <h2>Character Lore & Transcripts</h2>
        </div>
        <p>
          Official {characterName} story chapters, Vision origin, and spoken dialogue archives
        </p>
      </header>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Main Tab Selector */}
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--line)] bg-[#090f0d] p-3 gap-3">
          <div className="flex gap-2">
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
              <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-[var(--text-3)]">
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
              <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-[var(--text-3)]">
                {voicelines.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-[var(--text-3)] px-2">
            {activeTab === "stories" ? `${stories.length} Canonical Chapters` : `${voicelines.length} Spoken Audio Transcripts`}
          </div>
        </div>

        {/* Stories Tab View */}
        {activeTab === "stories" && stories.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Story Navigation Sidebar */}
            <div className="lg:col-span-4 border-r border-[var(--line)] bg-[#090f0d]/70 p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[520px]">
              <span className="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider px-2 py-1">
                Chapters Index
              </span>
              {stories.map((story, idx) => (
                <button
                  type="button"
                  key={story.id}
                  onClick={() => setSelectedStoryIndex(idx)}
                  className={`text-left text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedStoryIndex === idx
                      ? "bg-[rgba(98,213,163,0.14)] text-[var(--green)] font-semibold border border-[rgba(98,213,163,0.35)] shadow-xs"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent"
                  }`}
                >
                  <span className="truncate">{story.title}</span>
                  <span className="text-[10px] font-mono text-[var(--text-3)] shrink-0">
                    {Math.round(story.content.length / 5)}w
                  </span>
                </button>
              ))}
            </div>

            {/* Story Content Reader */}
            <div className="lg:col-span-8 p-6 md:p-8 flex flex-col gap-5 bg-[#0a110f] overflow-y-auto max-h-[520px]">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-[var(--gold)] font-bold uppercase tracking-wider">
                    {characterName} • Canonical Narrative
                  </span>
                  <h3 className="text-base md:text-lg font-bold text-[var(--text)] m-0 mt-0.5">
                    {activeStory.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-3)] bg-[var(--surface-2)] px-2 py-1 rounded-md border border-[var(--line)]">
                  Chapter {selectedStoryIndex + 1} of {stories.length}
                </span>
              </div>
              <div className="whitespace-pre-line text-sm md:text-base text-[var(--text-2)] leading-relaxed font-serif tracking-normal pt-1">
                {activeStory.content.replace(/\\n/g, "\n\n").replace(/\\"/g, '"')}
              </div>
            </div>
          </div>
        )}

        {/* Voicelines Tab View */}
        {activeTab === "voicelines" && voicelines.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Voiceline Sidebar with Search & Filter */}
            <div className="lg:col-span-5 border-r border-[var(--line)] bg-[#090f0d]/70 p-3 flex flex-col gap-2.5 overflow-hidden">
              {/* Search Box */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="text"
                  placeholder="Search voicelines by title or phrase..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Subcategory Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "greeting", label: "Greetings" },
                    { id: "chat", label: "Chat & Weather" },
                    { id: "about_character", label: "About Characters" },
                    { id: "about_us", label: "About Us" },
                    { id: "combat", label: "Combat & Skills" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setQuoteFilter(cat.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-mono whitespace-nowrap transition-all cursor-pointer ${
                      quoteFilter === cat.id
                        ? "bg-indigo-500/25 text-indigo-300 font-bold border border-indigo-500/40"
                        : "bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] border border-transparent"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Voicelines List */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[400px] pr-1">
                {filteredVoicelines.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-3)] font-mono">
                    No voicelines match &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredVoicelines.map((quote) => (
                    <button
                      type="button"
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={`text-left text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 ${
                        activeQuote?.id === quote.id
                          ? "bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/35 shadow-xs"
                          : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-[var(--text)]">{quote.title}</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-3)] truncate italic font-sans">
                        &quot;{quote.content.replace(/\\n/g, " ").replace(/\\"/g, '"')}&quot;
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Voiceline Content Display */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center gap-6 bg-[#0a110f]">
              {activeQuote ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold">
                        Spoken Dialogue
                      </span>
                      <span className="text-xs text-[var(--text-3)] font-mono">
                        {characterName}
                      </span>
                    </div>
                  </div>

                  <div className="border-l-2 border-indigo-500/60 pl-5 py-2 flex flex-col gap-3 my-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
                      {activeQuote.title}
                    </span>
                    <blockquote className="whitespace-pre-line text-base md:text-lg text-[var(--text)] leading-relaxed italic m-0 font-sans">
                      &quot;{activeQuote.content.replace(/\\n/g, "\n").replace(/\\"/g, '"')}&quot;
                    </blockquote>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-[11px] font-mono text-[var(--text-3)]">
                    <div className="flex items-center gap-1.5">
                      <Quote size={12} className="text-indigo-400" />
                      <span>In-Game Audio Voiceline Transcript</span>
                    </div>
                    <span>ID: {activeQuote.id}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-[var(--text-3)]">
                  Select a voiceline from the list to read the transcript.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
