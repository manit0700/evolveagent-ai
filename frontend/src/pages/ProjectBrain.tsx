import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  addMemoryV2,
  fetchMemoryV2Summary,
  fetchRetrievalSummary,
  MemoryV2SearchResult,
  MemoryV2Summary,
  RetrievalSummary,
  searchMemoryV2,
} from '../data/api';
import { GlassCard } from '../components/shared/GlassCard';
import { 
  Brain, 
  Search, 
  Sparkles, 
  Filter, 
  Pin, 
  ExternalLink, 
  Plus, 
  Layers, 
  Database, 
  FileCode, 
  Clock, 
  CheckCircle2, 
  Share2, 
  Activity, 
  GitCommit, 
  Hash, 
  Tag, 
  X,
  Check
} from 'lucide-react';
import { MemoryItem } from '../types';

export const ProjectBrain: React.FC = () => {
  const { memories, togglePinMemory, addMemoryItem, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<MemoryV2SearchResult[] | null>(null);
  const [semanticMode, setSemanticMode] = useState<string>('keyword');
  const [semanticBusy, setSemanticBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [memorySummary, setMemorySummary] = useState<MemoryV2Summary | null>(null);
  const [retrievalSummary, setRetrievalSummary] = useState<RetrievalSummary | null>(null);

  // New memory form state
  const [newTitle, setNewTitle] = useState('');
  const [newSnippet, setNewSnippet] = useState('');
  const [newType, setNewType] = useState<MemoryItem['type']>('Decision');
  const [newTags, setNewTags] = useState('product, memory');

  const memoryExamples = [
    {
      label: 'Product Goal',
      title: 'EvolveAgent product goal',
      type: 'Goal' as MemoryItem['type'],
      snippet: 'EvolveAgent should coordinate agents, memory, tools, approvals, verification, and integrations to complete real work safely.',
      tags: 'product, vision, evolveagent',
    },
    {
      label: 'My Preference',
      title: 'User prefers direct answers',
      type: 'Memory' as MemoryItem['type'],
      snippet: 'User prefers short, clear, action-focused answers with commands, next steps, and less theory.',
      tags: 'preference, communication',
    },
    {
      label: 'Safety Rule',
      title: 'External actions require approval',
      type: 'Decision' as MemoryItem['type'],
      snippet: 'EvolveAgent must ask for approval before sending emails, pushing code, running paid jobs, or changing external tools.',
      tags: 'safety, governance, approvals',
    },
    {
      label: 'UI Direction',
      title: 'EvolveAgent UI style',
      type: 'Memory' as MemoryItem['type'],
      snippet: 'The UI should feel futuristic, premium, clean, dark, glass-style, trustworthy, and easy for nontechnical users.',
      tags: 'ui, design, product',
    },
  ];

  const filterChips = ['all', 'Decision', 'Memory', 'Chat Memory', 'File Index', 'Goal'];
  const decisionCount = memories.filter(m => m.type === 'Decision').length;
  const sourceCount = new Set(memories.map(m => m.source).filter(Boolean)).size;
  const pinnedCount = memories.filter(m => m.pinned).length;
  const avgRelevance = memories.length
    ? Math.round(memories.reduce((total, memory) => total + (Number(memory.relevance) || 0), 0) / memories.length)
    : 0;
  const activeMemoryMode = memorySummary?.mode || semanticMode || 'keyword';
  const liveMemoryConnected = Boolean(memorySummary?.available);

  const filteredMemories = memories.filter(m => {
    const matchesChip = activeChip === 'all' ? true : m.type.toLowerCase() === activeChip.toLowerCase();
    const matchesQuery = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesChip && matchesQuery;
  });

  useEffect(() => {
    fetchMemoryV2Summary().then(setMemorySummary);
    fetchRetrievalSummary().then(setRetrievalSummary);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSemanticResults(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSemanticBusy(true);
      const response = await searchMemoryV2(query, 8);
      if (!cancelled) {
        setSemanticBusy(false);
        if (response?.results?.length) {
          setSemanticResults(response.results);
          setSemanticMode(response.mode || response.results[0]?.mode || 'keyword');
        } else {
          setSemanticResults(null);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSnippet.trim()) return;
    const tagArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
    setAddBusy(true);
    const saved = await addMemoryV2(
      `${newTitle.trim()}\n\n${newSnippet.trim()}`,
      newType,
      'project_brain_ui',
      { title: newTitle.trim(), tags: tagArray },
    );
    setAddBusy(false);
    if (saved?.ok) {
      showToast(`Saved "${newTitle}" to Memory v2 (${saved.mode || 'live'}).`, 'success');
      const summary = await fetchMemoryV2Summary();
      if (summary) setMemorySummary(summary);
      if (searchQuery.trim()) {
        const response = await searchMemoryV2(searchQuery, 8);
        if (response?.results?.length) {
          setSemanticResults(response.results);
          setSemanticMode(response.mode || response.results[0]?.mode || 'keyword');
        }
      }
    } else {
      addMemoryItem(newTitle, newSnippet, newType, tagArray);
      showToast(`Backend unavailable. Saved "${newTitle}" to local Project Brain state.`, 'warning');
    }
    setNewTitle('');
    setNewSnippet('');
    setIsAddingModalOpen(false);
  };

  const fillMemoryExample = (example: typeof memoryExamples[number]) => {
    setNewTitle(example.title);
    setNewType(example.type);
    setNewSnippet(example.snippet);
    setNewTags(example.tags);
  };

  const semanticMemories: MemoryItem[] = (semanticResults || []).map(result => {
    const normalizedSimilarity = result.similarity <= 1 ? Math.round(result.similarity * 100) : Math.round(result.similarity);
    return {
      id: result.id,
      title: result.title || result.kind,
      snippet: result.text,
      type: 'Memory',
      relevance: Math.max(0, Math.min(100, normalizedSimilarity || 80)),
      tier: result.mode === 'pgvector' ? 'hot' : 'warm',
      source: result.source,
      timestamp: result.metadata?.created_at || 'Memory v2',
      tags: [result.kind, result.mode].filter(Boolean),
      pinned: false,
    };
  });
  const displayMemories = semanticResults?.length ? semanticMemories : filteredMemories;
  const graphHub = displayMemories[0] || memories[0];
  const graphNodes = (displayMemories.length ? displayMemories : memories).slice(0, 4);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Workspace Search Hero Card */}
      <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#1b1928] via-[#14141c] to-[#121216] p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-4">
            <Brain className="w-3.5 h-3.5" />
            <span>Workspace Vector Memory & Knowledge Graph</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Project Brain Knowledge Base
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-300 leading-relaxed">
            All architectural decisions, chat session logs, and file indexing vectors are embedded here. Agents automatically query Project Brain before planning code modifications.
          </p>

          {/* Search bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, ADRs, hex tokens, or goals (e.g. 'Dark graphite', 'ADR-12')..."
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-500 rounded-xl pl-10 pr-28 py-3 text-sm text-white placeholder-gray-500 focus:outline-none shadow-inner"
            />
            <button
              onClick={() => setIsAddingModalOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remember This</span>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-gray-400">
            <span className={`px-2 py-0.5 rounded-full border ${
              semanticResults?.length
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.04] text-gray-400 border-white/10'
            }`}>
              {semanticResults?.length
                ? `Memory v2: ${semanticMode}`
                : liveMemoryConnected
                  ? `Memory v2: ${activeMemoryMode}`
                  : 'Local fallback ready'}
            </span>
            {semanticBusy && <span className="text-cyan-300">Searching semantic memory…</span>}
          </div>

          {/* Filter Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 font-mono mr-1">Filter Type:</span>
            {filterChips.map((chip) => (
              <button
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                  activeChip === chip
                    ? 'bg-cyan-600 text-white font-semibold shadow-md'
                    : 'bg-white/[0.04] hover:bg-white/[0.09] text-gray-400'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Memory Health Metrics (6 counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Index Quality', value: `${avgRelevance}%`, sub: memories.length ? 'Avg relevance' : 'No memories yet', color: memories.length ? 'text-emerald-400' : 'text-gray-400' },
          { label: 'Indexed Sources', value: `${sourceCount}`, sub: 'Unique sources', color: 'text-cyan-400' },
          { label: 'Active Memories', value: `${memorySummary?.items ?? memories.length}`, sub: `Memory v2 · ${activeMemoryMode}`, color: 'text-white' },
          { label: 'Indexed Docs', value: `${retrievalSummary?.documentCount ?? 0}`, sub: `${retrievalSummary?.chunkCount ?? 0} chunks`, color: 'text-blue-400' },
          { label: 'Decisions Saved', value: `${decisionCount}`, sub: 'ADR records', color: 'text-amber-400' },
          { label: 'Pinned Context', value: `${pinnedCount}`, sub: liveMemoryConnected ? `${memorySummary?.embedder || 'local'} embedder` : 'Local state', color: liveMemoryConnected ? 'text-emerald-400' : 'text-gray-400' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-[#171717]/80 border border-white/[0.07] backdrop-blur-xl space-y-1">
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{item.label}</div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-gray-500 font-mono truncate">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* 3. Main Split Section: Relevant Findings (Left 2 cols) & Knowledge Graph Visualizer (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search Results & Findings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Relevant Findings ({displayMemories.length})</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {semanticResults?.length ? `Live Memory v2 · ${semanticMode}` : 'Sorted by Relevance Match'}
            </span>
          </div>

          <div className="space-y-3">
            {displayMemories.map((mem) => (
              <GlassCard key={mem.id} hover className="space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePinMemory(mem.id); }}
                      className={`p-2 rounded-xl transition-colors ${
                        mem.pinned ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-500 hover:text-white'
                      }`}
                      title={mem.pinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                          Type: {mem.type}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                          mem.tier === 'hot' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                          mem.tier === 'warm' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                          'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}>
                          {mem.tier} Tier
                        </span>
                        {semanticResults?.length && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${
                            semanticMode === 'pgvector'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          }`}>
                            {semanticMode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">{mem.title}</h4>
                    </div>
                  </div>

                  {/* Relevance Score Bar */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-cyan-300">{mem.relevance}%</div>
                    <div className="text-[10px] font-mono text-gray-500">Relevance Match</div>
                    <div className="mt-1 w-16 h-1 rounded-full bg-black/60 overflow-hidden ml-auto">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${mem.relevance}%` }} />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed font-mono bg-black/30 p-3 rounded-xl border border-white/5">
                  {mem.snippet}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-[11px] font-mono">
                  <div className="flex flex-wrap items-center gap-1.5 text-gray-400">
                    <span className="text-gray-500">Source:</span>
                    <strong className="text-white">{mem.source}</strong>
                    <span className="mx-1">•</span>
                    <span>{mem.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mem.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">
                        #{t}
                      </span>
                    ))}
                    <button
                      onClick={() => showToast(`Loaded "${mem.title}" directly into active agent context!`, 'success')}
                      className="ml-2 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-colors flex items-center gap-1"
                    >
                      <span>Use in Chat</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
            {!displayMemories.length && (
              <GlassCard className="text-center py-10">
                <p className="text-sm text-gray-300 font-semibold">No matching memories found.</p>
                <p className="text-xs text-gray-500 font-mono mt-1">Try a broader query or add a new Memory v2 item.</p>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Right 1 Col: Knowledge Graph Visualizer & Tier Toggles */}
        <div className="space-y-4">
          <GlassCard glow="blue">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" /> Knowledge Graph Visualizer
              </span>
              <span className={`text-[10px] font-mono ${liveMemoryConnected ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`}>
                ● {liveMemoryConnected ? 'LIVE' : 'LOCAL'}
              </span>
            </div>

            {/* Interactive Graph Simulation Area */}
            <div className="mt-4 h-64 rounded-2xl bg-[#0e0e12] border border-white/10 relative overflow-hidden flex items-center justify-center p-4">
              {/* Connecting grid lines */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Central Hub Node */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 border-2 border-white/20 animate-pulse">
                  <Brain className="w-7 h-7" />
                </div>
                <span className="mt-2 text-xs font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
                  {graphHub ? graphHub.title.slice(0, 24) : 'Project Brain'}{graphHub && graphHub.title.length > 24 ? '…' : ''}
                </span>

                {/* Satellite nodes */}
                <div className="absolute -top-16 -left-20 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-cyan-900/80 border border-cyan-400/50 flex items-center justify-center text-xs">🎨</div>
                  <span className="text-[9px] font-mono text-gray-400 mt-1">{graphNodes[0]?.type || 'Memory'}</span>
                </div>

                <div className="absolute -top-16 -right-20 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-900/80 border border-blue-400/50 flex items-center justify-center text-xs">🛡️</div>
                  <span className="text-[9px] font-mono text-gray-400 mt-1">{graphNodes[1]?.type || 'Decision'}</span>
                </div>

                <div className="absolute -bottom-16 -left-20 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-900/80 border border-emerald-400/50 flex items-center justify-center text-xs">⚡</div>
                  <span className="text-[9px] font-mono text-gray-400 mt-1">{graphNodes[2]?.type || 'File Index'}</span>
                </div>

                <div className="absolute -bottom-16 -right-20 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-900/80 border border-amber-400/50 flex items-center justify-center text-xs">🤖</div>
                  <span className="text-[9px] font-mono text-gray-400 mt-1">{graphNodes[3]?.type || 'Goal'}</span>
                </div>

                {/* SVG connecting lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-visible" style={{ width: '200px', height: '200px', top: '-70px', left: '-70px' }}>
                  <line x1="100" y1="100" x2="30" y2="30" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4" />
                  <line x1="100" y1="100" x2="170" y2="30" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" />
                  <line x1="100" y1="100" x2="30" y2="170" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />
                  <line x1="100" y1="100" x2="170" y2="170" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4" />
                </svg>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-gray-400 font-mono text-center">
              {memorySummary?.items ?? memories.length} memories · {retrievalSummary?.chunkCount ?? 0} retrieval chunks · {activeMemoryMode} mode.
            </p>
          </GlassCard>

          {/* Memory Tiers Panel */}
          <GlassCard>
            <h4 className="text-xs font-semibold text-white mb-3">Memory Tiers & Latency</h4>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-rose-300">Hot Memory</div>
                  <div className="text-[10px] text-gray-400">{memories.filter(m => m.tier === 'hot').length} high-priority items</div>
                </div>
                <span className="text-rose-400 font-semibold">&lt; 5ms</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-300">Warm Memory</div>
                  <div className="text-[10px] text-gray-400">{memories.filter(m => m.tier === 'warm').length} searchable context items</div>
                </div>
                <span className="text-amber-400 font-semibold">~35ms</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-300">Archived Memory</div>
                  <div className="text-[10px] text-gray-400">{memories.filter(m => m.tier === 'archived').length} lower-priority records</div>
                </div>
                <span className="text-blue-400 font-semibold">~120ms</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Memory Modal */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/40 bg-[#17171d] p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddingModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              aria-label="Close add memory"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Teach Project Brain Something</span>
            </h3>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              Add facts, preferences, decisions, safety rules, or project goals you want EvolveAgent to remember later.
            </p>

            <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <div className="text-xs font-semibold text-cyan-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Quick examples
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {memoryExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => fillMemoryExample(example)}
                    className="text-left rounded-xl border border-white/10 bg-black/25 hover:bg-white/[0.06] p-3 transition-colors"
                  >
                    <div className="text-xs font-bold text-white">{example.label}</div>
                    <div className="mt-1 text-[11px] text-gray-400 line-clamp-2">{example.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-semibold">What should EvolveAgent call this?</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Example: EvolveAgent product goal"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />
                <p className="mt-1 text-[11px] text-gray-500 font-sans">Use a short name you can search for later.</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">What kind of memory is it?</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Goal">Goal - something we are trying to achieve</option>
                  <option value="Decision">Decision - a rule or choice we made</option>
                  <option value="Memory">Memory - useful fact or preference</option>
                  <option value="Chat Memory">Chat Memory - something from a conversation</option>
                  <option value="File Index">File Index - note about a file or document</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">What should it remember?</label>
                <textarea
                  rows={5}
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  placeholder="Example: EvolveAgent should always ask before sending emails, pushing code, or running paid jobs."
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />
                <p className="mt-1 text-[11px] text-gray-500 font-sans">Write it like a clear note to your future AI assistant.</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Tags</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="product, safety, ui"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="mt-1 text-[11px] text-gray-500 font-sans">Separate tags with commas. Tags make it easier to search later.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-gray-400 font-sans leading-relaxed">
                Good memories are specific. Add: product goals, your preferences, important decisions, safety rules, project facts, UI direction, or repeated workflow rules.
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBusy}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-lg"
                >
                  {addBusy ? 'Saving…' : 'Save to Project Brain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
