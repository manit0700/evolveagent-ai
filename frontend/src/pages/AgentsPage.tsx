import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { 
  Users, 
  Bot, 
  ShieldCheck, 
  Brain, 
  Wrench, 
  Play, 
  Pause, 
  Settings, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Cpu, 
  Shield, 
  Layers,
  ArrowRight,
  Plus
} from 'lucide-react';
import { PermissionLevel } from '../types';

export const AgentsPage: React.FC = () => {
  const { agents, toggleAgentStatus, showToast } = useApp();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-ui');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const featuredAgent = agents.find(a => a.id === selectedAgentId) || agents[1] || agents[0];

  const filteredAgents = filterLevel === 'all' 
    ? agents 
    : agents.filter(a => a.permissionLevel === filterLevel);
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'running').length;
  const waitingCount = agents.filter(a => a.status === 'waiting').length;
  const blockedCount = agents.filter(a => a.status === 'blocked').length;
  const customAgentCount = Math.max(0, agents.length - 7);
  const avgQuality = agents.length
    ? Math.round(agents.reduce((total, agent) => total + (Number(agent.qualityScore) || 0), 0) / agents.length)
    : 0;

  const agentGuide = (name: string, role: string) => {
    const key = `${name} ${role}`.toLowerCase();
    if (key.includes('master') || key.includes('orchestrator')) {
      return {
        what: 'Reads your request, chooses the right agents, coordinates the workflow, and returns the final answer.',
        useFor: 'Big goals, multi-step tasks, app planning, automation planning, and deciding what should happen next.',
        safety: 'Can delegate work, but risky tool actions still go through governance and approvals.',
      };
    }
    if (key.includes('ui') || key.includes('design')) {
      return {
        what: 'Designs screens, layouts, components, visual polish, and user-friendly product flows.',
        useFor: 'Dashboard polish, buttons, forms, empty states, mobile layout, and making the app easier to understand.',
        safety: 'Plans UI changes first. Real code/file changes require the approved implementation path.',
      };
    }
    if (key.includes('memory') || key.includes('brain')) {
      return {
        what: 'Stores important facts, decisions, preferences, project notes, and searches them later.',
        useFor: 'Remembering product goals, user preferences, safety rules, project decisions, and useful context.',
        safety: 'Memory is scoped and searchable. Sensitive data should be reviewed before saving.',
      };
    }
    if (key.includes('governance') || key.includes('safety')) {
      return {
        what: 'Checks risk, permissions, secrets, policy rules, and whether an action needs approval.',
        useFor: 'External tools, file edits, shell commands, paid jobs, sensitive data, and audit logs.',
        safety: 'Blocks or pauses risky actions. It should never bypass approval rules.',
      };
    }
    if (key.includes('implementation') || key.includes('code')) {
      return {
        what: 'Turns approved plans into code changes, patches, tests, and build-ready implementation work.',
        useFor: 'Frontend fixes, backend changes, API wiring, bug fixes, and codebase automation.',
        safety: 'Must use safe file/change workflows. Destructive or risky edits require approval.',
      };
    }
    if (key.includes('research')) {
      return {
        what: 'Finds, compares, and summarizes information, then turns it into useful recommendations.',
        useFor: 'Docs research, source comparison, technical decisions, citations, and product research.',
        safety: 'Research output should cite evidence when possible and flag uncertainty.',
      };
    }
    if (key.includes('judge') || key.includes('quality')) {
      return {
        what: 'Reviews answers, code, UI, and plans for quality, mistakes, missing steps, and weak reasoning.',
        useFor: 'Final checks, test planning, accessibility review, risk review, and confidence scoring.',
        safety: 'It reviews and scores work. It should not execute risky actions by itself.',
      };
    }
    return {
      what: 'Handles a specialized part of the workflow and reports results back to the orchestrator.',
      useFor: 'Scoped tasks that match its role, tools, and permission profile.',
      safety: 'Permissions control what it can read, plan, or execute.',
    };
  };

  const permissionProfiles: { level: PermissionLevel; label: string; desc: string; color: string }[] = [
    { level: 'read-only', label: 'Read-Only', desc: 'Can only query Project Brain & read workspace files. No side effects.', color: 'border-blue-500/30 bg-blue-500/5 text-blue-300' },
    { level: 'planning-only', label: 'Planning-Only', desc: 'Can formulate code modifications and dry-run AST checks without writing.', color: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300' },
    { level: 'approval-gated', label: 'Approval-Gated', desc: 'High-risk operations (filesystem writes, shell CLI, API calls) enter Approvals queue.', color: 'border-amber-500/30 bg-amber-500/5 text-amber-300' },
    { level: 'high-trust', label: 'High-Trust', desc: 'Reserved for Master Orchestrator to delegate tasks across worker sandboxes.', color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' },
  ];
  const featuredGuide = agentGuide(featuredAgent.name, featuredAgent.role);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Overview Metrics (6 counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Agents', value: `${agents.length}`, sub: 'Loaded from registry', color: 'text-white' },
          { label: 'Active Now', value: `${activeCount}`, sub: 'Executing tasks', color: 'text-emerald-400' },
          { label: 'Waiting Approval', value: `${waitingCount}`, sub: 'Gating writes', color: 'text-amber-400' },
          { label: 'Custom Agents', value: `${customAgentCount}`, sub: 'Beyond core agents', color: 'text-cyan-400' },
          { label: 'Avg Quality Score', value: `${avgQuality}%`, sub: 'Registry average', color: 'text-sky-400' },
          { label: 'Blocked / Error', value: `${blockedCount}`, sub: blockedCount ? 'Needs review' : 'None blocked', color: blockedCount ? 'text-rose-400' : 'text-emerald-400' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-[#171717]/80 border border-white/[0.07] backdrop-blur-xl space-y-1">
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{item.label}</div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-gray-500 font-mono truncate">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* 2. Featured Active Agent Spotlight Card */}
      <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#1b1928] via-[#15151c] to-[#121217] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-cyan-500/30">
              {featuredAgent.avatar}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 uppercase font-semibold">
                  Featured Spotlight
                </span>
                <StatusBadge status={featuredAgent.status} size="sm" />
                <RiskBadge level={featuredAgent.riskLevel} size="sm" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{featuredAgent.name}</h2>
              <p className="text-xs sm:text-sm text-cyan-300 font-mono">{featuredAgent.role}</p>
              <p className="text-xs text-gray-300 leading-relaxed pt-1">{featuredAgent.description}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: 'What it does', value: featuredGuide.what },
                  { label: 'Use it for', value: featuredGuide.useFor },
                  { label: 'Safety boundary', value: featuredGuide.safety },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">{item.label}</div>
                    <p className="mt-1 text-[11px] text-gray-300 leading-relaxed">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Featured Agent Stats & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="space-y-2 text-xs font-mono border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Quality Score:</span>
                <span className="text-emerald-400 font-bold text-sm">{featuredAgent.qualityScore}%</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Memory Scope:</span>
                <span className="text-white font-semibold">{featuredAgent.memoryAccess}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Permission:</span>
                <span className="text-cyan-300 font-semibold capitalize">{featuredAgent.permissionLevel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => toggleAgentStatus(featuredAgent.id)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {featuredAgent.status === 'idle' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{featuredAgent.status === 'idle' ? 'Start Agent' : 'Pause Execution'}</span>
              </button>
              <button
                onClick={() => showToast(`Opening deep configuration for ${featuredAgent.name}...`, 'info')}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                <span>Configure Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Current task bar inside spotlight */}
        {featuredAgent.currentTask && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Current Task: <strong className="text-white">{featuredAgent.currentTask}</strong></span>
            </span>
            <span className="text-cyan-300">Tokens: {featuredAgent.tokensUsed} today</span>
          </div>
        )}
      </div>

      {/* 3. Filter Bar & Agent Grid (6 Cards) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Specialized Agent Squad ({filteredAgents.length})</h3>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs text-gray-400 font-mono mr-1">Filter Permission:</span>
            {['all', 'read-only', 'planning-only', 'approval-gated', 'high-trust'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                  filterLevel === lvl
                    ? 'bg-cyan-600 text-white font-semibold shadow-md'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-gray-400'
                }`}
              >
                {lvl.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            const guide = agentGuide(agent.name, agent.role);
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`cursor-pointer rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1e1e28]/90 border-cyan-500/50 shadow-[0_4px_25px_-5px_rgba(34,211,238,0.2)]'
                    : 'bg-[#171717]/80 border-white/[0.07] hover:bg-[#1a1a20]/90 hover:border-white/15'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                        {agent.avatar}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                        <p className="text-xs text-cyan-300 font-mono">{agent.role}</p>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} size="sm" />
                  </div>

                  <p className="mt-3 text-xs text-gray-400 line-clamp-2 leading-relaxed">{agent.description}</p>
                  <div className="mt-3 rounded-xl bg-black/25 border border-white/5 p-3 space-y-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-cyan-300">What it does</div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{guide.what}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-gray-400">Use it for</div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{guide.useFor}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Memory Access:</span>
                      <span className="text-white font-semibold">{agent.memoryAccess}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Permission Level:</span>
                      <span className="text-cyan-300 font-semibold capitalize">{agent.permissionLevel}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Quality Score:</span>
                      <span className="text-emerald-400 font-bold">{agent.qualityScore}%</span>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-gray-400">Safety:</span>
                      <p className="mt-1 text-[11px] text-gray-300 leading-relaxed font-sans">{guide.safety}</p>
                    </div>
                  </div>
                </div>

                {/* Connected tools badges inside card */}
                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5 items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {agent.connectedTools.map((t, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent.id); }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Toggle Agent Status"
                  >
                    {agent.status === 'idle' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Permission Profiles & Safety Rules Grid */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Global Permission Profiles & Sandboxing Rules</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {permissionProfiles.map((p, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${p.color} space-y-2`}>
              <div className="text-xs font-bold font-mono uppercase tracking-wider">{p.label}</div>
              <p className="text-xs text-gray-300 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
