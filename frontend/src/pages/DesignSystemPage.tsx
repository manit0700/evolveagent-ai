import React from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { LiveWorkingCard } from '../components/shared/LiveWorkingCard';
import { 
  Palette, 
  Layers, 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Bot, 
  Search, 
  Terminal, 
  LayoutDashboard, 
  MessageSquare, 
  Compass, 
  Users, 
  Brain, 
  Wrench, 
  Shield, 
  Settings, 
  ArrowRight,
  FolderGit2,
  FileCode
} from 'lucide-react';
import { PageId } from '../types';

export const DesignSystemPage: React.FC = () => {
  const { setActivePage, showToast } = useApp();

  const colorTokens = [
    { name: 'Canvas (Web)', hex: '#f4f6f9 → #e8eef5', tailwind: 'bg-[var(--ea-bg)]', border: 'border-[var(--ea-line)]' },
    { name: 'Surface / Card', hex: 'var(--ea-surface)', tailwind: 'ea-surface', border: 'border-[var(--ea-line)]' },
    { name: 'Secondary surface', hex: 'var(--ea-surface-2)', tailwind: 'ea-surface-2', border: 'border-[var(--ea-line)]' },
    { name: 'Accent (teal / sky)', hex: 'web #0e7490 · desktop #38bdf8', tailwind: 'bg-[var(--ea-accent)]', border: 'border-transparent' },
    { name: 'Ink / muted text', hex: 'var(--ea-ink) / var(--ea-muted)', tailwind: 'ea-ink · ea-muted', border: 'border-[var(--ea-line)]' },
    { name: 'Status soft fills', hex: 'success / warn / danger soft', tailwind: 'bg-[var(--ea-success-soft)]', border: 'border-transparent' },
  ];

  const typographyTokens = [
    { name: 'Display Headings', font: 'Plus Jakarta Sans', style: 'text-xl sm:text-2xl font-semibold tracking-tight ea-ink', sample: 'What should we work on?' },
    { name: 'UI Base Text', font: 'Plus Jakarta Sans', style: 'text-sm ea-muted leading-relaxed', sample: 'EvolveAgent routes intents across agents and keeps risky actions behind approvals.' },
    { name: 'Technical / Monospace', font: 'IBM Plex Mono', style: 'text-xs font-mono text-[var(--ea-accent)]', sample: 'component_generator --target=AgentsGrid --tokens=ADR12' },
  ];

  const radiusTokens = [
    { name: 'Small Tag / Badge (8px)', style: 'rounded-lg bg-[var(--ea-surface-3)] p-3 text-center text-xs' },
    { name: 'Standard Card / Input (12px)', style: 'rounded-xl bg-[var(--ea-surface-3)] p-4 text-center text-xs' },
    { name: 'Glass Panel Container (16px)', style: 'rounded-2xl bg-[var(--ea-surface-3)] p-5 text-center text-xs' },
    { name: 'Hero Spotlight Card (24px)', style: 'rounded-3xl bg-[var(--ea-surface-3)] p-6 text-center text-xs font-bold' },
  ];

  const layoutThumbnails: { id: PageId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'home', label: 'Home Dashboard', icon: LayoutDashboard, desc: 'Hero AI command bar + 5 metrics + timeline & approval queue split' },
    { id: 'chat', label: 'Simple Mode Chat', icon: MessageSquare, desc: 'ChatGPT-style messaging + working cards + right context drawer' },
    { id: 'dev-console', label: 'Dev Mode Console', icon: Terminal, desc: 'Step-by-step trace inspector + raw JSON + tool call table' },
    { id: 'mission-control', label: 'Mission Control', icon: Compass, desc: 'Radial mission progress + next best action + 4-column task graph' },
    { id: 'agents', label: 'Agents Overview', icon: Users, desc: 'Featured agent spotlight + 3-column squad grid + permission profiles' },
    { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck, desc: 'Batch approval banner + priority sign-off + check/close table' },
    { id: 'project-brain', label: 'Project Brain', icon: Brain, desc: 'Vector search hero + relevance percentage bars + graph visualizer' },
    { id: 'tools', label: 'Tools / MCP Hub', icon: Wrench, desc: 'Installed connector grid + category filter + safety modes' },
    { id: 'governance', label: 'Governance & Safety', icon: Shield, desc: 'Global policy matrix table + sandbox toggle switches' },
    { id: 'settings', label: 'Workspace Settings', icon: Settings, desc: 'Model routing controls + auto-save ADRs + theme selector' },
  ];

  const interactionRules = [
    { title: '1. Persistence Principle', desc: 'All user chat commands and architectural decisions must be embedded into Project Brain vectors for long-term recall across sessions.' },
    { title: '2. Draft-First Communication', desc: 'External MCP connectors (Slack, Linear, GitHub issues) must formulate draft payloads by default instead of immediately publishing to third-party APIs.' },
    { title: '3. Context Attribution', desc: 'Every component update or synthesized code block must cite its source ADR or memory rule in the UI to maintain transparency.' },
    { title: '4. Safe-Mode Sandboxing Default', desc: 'Destructive shell commands (rm -rf, drop table) are blocked at the AST level. High-risk filesystem writes always enter the Approvals queue.' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="ea-hero">
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ea-accent-soft)] border border-[var(--ea-line)] text-[var(--ea-accent)] text-xs font-mono mb-3">
            <Palette className="w-3.5 h-3.5" />
            <span>ADR #12 Design System Manifest</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold ea-ink tracking-tight">
            EvolveAgent AI Brand & UI Tokens
          </h1>
          <p className="mt-2 text-xs sm:text-sm ea-soft leading-relaxed">
            Standardized color swatches, typography scales, glassmorphism containers, live orchestration patterns, and 10 wireframe layout blueprints.
          </p>
        </div>
      </div>

      {/* 1. Brand Tokens: Color Palette Swatches */}
      <GlassCard>
        <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>1. Brand Color Palette Swatches</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {colorTokens.map((col, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-3">
              <div className={`h-16 w-full rounded-xl border ${col.border} ${col.tailwind} flex items-center justify-center shadow-[var(--ea-shadow-sm)]`}>
                <span className="font-bold ea-ink drop-shadow">{col.name.split('(')[0]}</span>
              </div>
              <div>
                <div className="font-bold ea-ink">{col.name}</div>
                <div className="ea-muted text-[11px] mt-0.5">Hex / Rule: <span className="text-[var(--ea-accent)]">{col.hex}</span></div>
                <div className="ea-faint text-[10px] mt-0.5 truncate">Class: <code>{col.tailwind}</code></div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 2. Typography & Corner Radius Scales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[var(--ea-accent)]" />
            <span>2. Typography Scale & Fonts</span>
          </h3>
          <div className="space-y-4">
            {typographyTokens.map((typ, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] space-y-1">
                <div className="flex items-center justify-between text-xs font-mono ea-muted">
                  <span className="font-bold ea-ink">{typ.name}</span>
                  <span className="text-[var(--ea-accent)]">{typ.font}</span>
                </div>
                <div className={`${typ.style} pt-1`}>{typ.sample}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>3. Corner Radius & Depth Elevation</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {radiusTokens.map((rad, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] flex flex-col items-center justify-center space-y-2">
                <span className="text-xs font-mono font-bold ea-soft">{rad.name.split('(')[0]}</span>
                <div className={`w-full border border-white/20 ${rad.style} ea-soft`}>
                  {rad.name.split('(')[1]?.replace(')', '')} radius
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 3. Core Component Library Previews */}
      <GlassCard>
        <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>4. Core Component Library Previews</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Component 1: Status & Risk Badges */}
          <div className="p-4 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-3">
            <span className="text-xs font-mono uppercase ea-muted block border-b border-[var(--ea-line)] pb-2">Status & Risk Tags</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="running" />
              <StatusBadge status="waiting_approval" />
              <StatusBadge status="completed" />
              <StatusBadge status="blocked" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--ea-line)]">
              <RiskBadge level="low" />
              <RiskBadge level="medium" />
              <RiskBadge level="high" />
            </div>
          </div>

          {/* Component 2: Nav Items & Command Input */}
          <div className="p-4 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-3">
            <span className="text-xs font-mono uppercase ea-muted block border-b border-[var(--ea-line)] pb-2">Command & Nav Elements</span>
            <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/10 border border-[var(--ea-line)] flex items-center justify-between text-xs ea-ink font-semibold">
              <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-[var(--ea-accent)]" /> Active Nav Item</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--ea-accent-soft)] text-[var(--ea-accent)]">Live</span>
            </div>
            <div className="p-2 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] flex items-center justify-between text-xs ea-muted">
              <span className="flex items-center gap-2"><Search className="w-4 h-4 ea-faint" /> Search input trigger</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--ea-surface-3)]">⌘K</kbd>
            </div>
          </div>

          {/* Component 3: Mini Agent Card */}
          <div className="p-4 rounded-2xl bg-[#1e1e28]/90 border border-[var(--ea-line-strong)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[var(--ea-accent)]">Agent Spotlight Preview</span>
              <StatusBadge status="running" size="sm" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-2xl">🎨</span>
              <div>
                <div className="text-xs font-bold ea-ink">UI Design Agent</div>
                <div className="text-[10px] font-mono text-[var(--ea-accent)]">Frontend Architect</div>
              </div>
            </div>
            <div className="text-[11px] ea-soft font-mono bg-[var(--ea-surface-3)] p-2 rounded-lg border border-[var(--ea-line)]">
              Task: Generating responsive grid for Agents Overview
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 4. Live Orchestration Pattern Preview */}
      <GlassCard glow="purple">
        <h3 className="text-sm font-bold ea-ink mb-2 flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>5. Live Orchestration Card Pattern ("EvolveAgent is working...")</span>
        </h3>
        <p className="text-xs ea-muted mb-4">
          This card embeds directly into Simple Mode Chat whenever an agent initiates a multi-step task delegation. Notice the real-time agent status rows, progress bar, and safety sign-off banner.
        </p>
        <LiveWorkingCard />
      </GlassCard>

      {/* 5. Page Layout Patterns (10 Wireframe Thumbnails) */}
      <GlassCard>
        <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>6. Page Layout Patterns & Navigation Blueprints (Click to Jump)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {layoutThumbnails.map((thm) => {
            const Icon = thm.icon;
            return (
              <div
                key={thm.id}
                onClick={() => { setActivePage(thm.id); showToast(`Jumped to ${thm.label}`, 'info'); }}
                className="cursor-pointer p-4 rounded-2xl bg-[var(--ea-surface-2)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] hover:border-[var(--ea-line-strong)] transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--ea-line)] mb-2">
                    <Icon className="w-4 h-4 text-[var(--ea-accent)] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono ea-faint group-hover:text-[var(--ea-accent)] uppercase">Screen</span>
                  </div>
                  <h4 className="text-xs font-bold ea-ink group-hover:text-[var(--ea-accent)] transition-colors">{thm.label}</h4>
                  <p className="text-[11px] ea-muted mt-1 leading-relaxed">{thm.desc}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ea-accent)] pt-2 border-t border-[var(--ea-line)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open Screen</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 6. Interaction Rules & Governance Safety Manifesto */}
      <GlassCard glow="blue">
        <h3 className="text-sm font-bold ea-ink mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>7. Core Interaction Rules & Governance Manifesto</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {interactionRules.map((rule, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[var(--ea-surface-3)] border border-blue-500/20 space-y-2">
              <div className="text-xs font-bold font-mono text-blue-300">{rule.title}</div>
              <p className="text-xs ea-soft leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
