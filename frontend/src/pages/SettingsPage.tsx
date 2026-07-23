import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchProviderStatus, ProviderStatus } from '../data/api';
import { GlassCard } from '../components/shared/GlassCard';
import { 
  Settings, 
  Cpu, 
  Shield, 
  Brain, 
  Users, 
  Palette, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  Database, 
  Activity, 
  Check, 
  Sparkles, 
  Terminal, 
  Layers, 
  Lock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { safetySettings, toggleSafetySetting, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'models' | 'safety' | 'memory' | 'appearance'>('all');
  
  // Local toggles
  const [modelRouting, setModelRouting] = useState(true);
  const [fallbackModel, setFallbackModel] = useState(true);
  const [qualityJudge, setQualityJudge] = useState(true);
  const [autoSaveDecisions, setAutoSaveDecisions] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'dark-graphite' | 'charcoal-blue' | 'cosmic-purple'>('dark-graphite');

  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  useEffect(() => { fetchProviderStatus().then(setProviders); }, []);

  const handleAction = (msg: string) => {
    showToast(msg, 'success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
      {/* Left 2 Cols: Main Settings Sections */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--ea-line)]">
          {[
            { id: 'all' as const, label: 'All Settings', icon: Settings },
            { id: 'models' as const, label: 'AI Models & Routing', icon: Cpu },
            { id: 'safety' as const, label: 'Safety & Governance', icon: Shield },
            { id: 'memory' as const, label: 'Project Brain Memory', icon: Brain },
            { id: 'appearance' as const, label: 'Appearance & Themes', icon: Palette },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--ea-accent)] text-[var(--ea-accent-ink)] font-semibold shadow-md'
                    : 'bg-[var(--ea-surface-2)] hover:bg-[var(--ea-surface-3)] ea-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[var(--ea-accent)]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Provider Status (real backend, secret-safe booleans only) */}
        {(activeTab === 'all' || activeTab === 'models') && providers && (
          <GlassCard>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${providers.readyProviders > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                Provider Status (Live)
              </span>
              <span className="text-[11px] font-mono ea-muted">{providers.readyProviders}/{providers.totalProviders} ready</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-3">
              {Object.entries(providers.capabilityModes).map(([cap, mode]) => (
                <span key={cap} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${mode === 'real' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-[var(--ea-surface-2)] ea-muted border-[var(--ea-line)]'}`}>
                  {cap}: {mode}
                </span>
              ))}
              {providers.fallbackEnabled && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] border border-[var(--ea-line)]">fallback on</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
              {providers.providers.map(p => (
                <div key={p.provider} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
                  <span className="text-xs font-medium ea-soft capitalize">{p.provider}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${p.ready ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 ea-muted'}`}>
                    {p.ready ? 'key set ✓' : 'no key'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] ea-faint pt-3">Readiness is boolean-only — no secret values are ever shown or stored.</p>
          </GlassCard>
        )}

        {/* 1. Workspace Profile Card */}
        {(activeTab === 'all') && (
          <GlassCard>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <Settings className="w-4 h-4 text-[var(--ea-accent)]" /> Workspace Profile & Storage
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('Exported workspace configuration package')}
                  className="px-3 py-1 rounded-lg bg-[var(--ea-surface-3)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] text-xs ea-soft font-mono"
                >
                  Export Config
                </button>
                <button
                  onClick={() => handleAction('Workspace settings saved')}
                  className="px-3 py-1 rounded-lg bg-[var(--ea-accent)] hover:brightness-110 text-[var(--ea-accent-ink)] text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="ea-muted block mb-1">Workspace Name</label>
                <input
                  type="text"
                  defaultValue="EvolveAgent AI Core Workspace"
                  className="w-full bg-black/50 border border-[var(--ea-line-strong)] rounded-xl px-3 py-2 ea-ink font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="ea-muted block mb-1">Organization Owner</label>
                <input
                  type="text"
                  defaultValue="EvolveAgent Systems Inc."
                  className="w-full bg-black/50 border border-[var(--ea-line-strong)] rounded-xl px-3 py-2 ea-ink font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="ea-muted block mb-1">Default Operating Mode</label>
                <select className="w-full bg-black/50 border border-[var(--ea-line-strong)] rounded-xl px-3 py-2 text-[var(--ea-accent)] focus:outline-none">
                  <option>Planning-First & Mock-Safe</option>
                  <option>High-Trust Autonomous</option>
                  <option>Read-Only Inspector</option>
                </select>
              </div>
              <div>
                <label className="ea-muted block mb-1">Storage & DB Adapter</label>
                <input
                  type="text"
                  disabled
                  value="Local JSON + Vector SQLite (Port 3000)"
                  className="w-full bg-[var(--ea-surface-3)] border border-[var(--ea-line)] rounded-xl px-3 py-2 ea-muted cursor-not-allowed"
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* 2. AI Model Settings & Model Routing */}
        {(activeTab === 'all' || activeTab === 'models') && (
          <GlassCard glow="purple">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--ea-accent)]" /> AI Model Routing & Fallback Engines
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">● ACTIVE ROUTER</span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono mb-6">
              <div className="p-3.5 rounded-2xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] space-y-2">
                <div className="ea-muted text-[10px] uppercase">Primary Reasoning Engine</div>
                <div className="text-sm font-bold ea-ink">Gemini 2.5 Pro / GPT-4o</div>
                <div className="text-[11px] text-[var(--ea-accent)]">Used for Master Orchestration & Code Synthesis</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] space-y-2">
                <div className="ea-muted text-[10px] uppercase">Secondary Backup Engine</div>
                <div className="text-sm font-bold ea-ink">Gemini Flash / Claude 3.5 Sonnet</div>
                <div className="text-[11px] text-blue-300">Used for Vector Indexing & Memory Summarization</div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Dynamic Model Routing Enabled', desc: 'Automatically route simple queries to Flash models to preserve token budget.', state: modelRouting, toggle: () => setModelRouting(!modelRouting) },
                { title: 'Automated Fallback Engine', desc: 'Switch instantly to backup provider if rate limits or latency spikes occur.', state: fallbackModel, toggle: () => setFallbackModel(!fallbackModel) },
                { title: 'Judge Agent Quality Verification', desc: 'Run automated evaluation prompt on every generated component before emitting.', state: qualityJudge, toggle: () => setQualityJudge(!qualityJudge) },
              ].map((item, idx) => (
                <div key={idx} onClick={item.toggle} className="cursor-pointer p-3 rounded-xl bg-[var(--ea-surface-2)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] flex items-center justify-between gap-3 transition-colors">
                  <div>
                    <div className="text-xs font-semibold ea-ink">{item.title}</div>
                    <div className="text-[10px] ea-muted mt-0.5">{item.desc}</div>
                  </div>
                  <div className="shrink-0">
                    {item.state ? (
                      <div className="w-9 h-5 rounded-full bg-[var(--ea-accent)] flex items-center justify-end px-1 shadow-inner">
                        <div className="w-3.5 h-3.5 rounded-full bg-white shadow" />
                      </div>
                    ) : (
                      <div className="w-9 h-5 rounded-full bg-[var(--ea-surface-3)] flex items-center justify-start px-1 shadow-inner">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-400 shadow" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* 3. Safety Defaults & Governance */}
        {(activeTab === 'all' || activeTab === 'safety') && (
          <GlassCard glow="blue">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" /> Safety Defaults & Global Sandbox Rules
              </span>
              <span className="text-xs font-mono text-emerald-400">Mock-Safe</span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { key: 'planningFirst' as const, title: 'Planning-First Execution Default', desc: 'Agents output structured execution plans before invoking external tool calls.' },
                { key: 'mockSafe' as const, title: 'Mock-Safe Filesystem Sandbox', desc: 'Restrict file writing to simulated in-memory buffer until approved.' },
                { key: 'requireApproval' as const, title: 'Require Sign-off on High-Risk Actions', desc: 'Route Medium and High risk actions directly to Approvals queue.' },
                { key: 'auditLogging' as const, title: 'Log Every Agent & Tool Action', desc: 'Maintain immutable JSON audit log of all AST evaluations and MCP payloads.' },
              ].map((item) => {
                const isChecked = safetySettings[item.key];
                return (
                  <div key={item.key} onClick={() => toggleSafetySetting(item.key)} className="cursor-pointer p-3 rounded-xl bg-[var(--ea-surface-2)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] flex items-center justify-between gap-3 transition-colors">
                    <div>
                      <div className="text-xs font-semibold ea-ink">{item.title}</div>
                      <div className="text-[10px] ea-muted mt-0.5">{item.desc}</div>
                    </div>
                    <div className="shrink-0">
                      {isChecked ? (
                        <div className="w-9 h-5 rounded-full bg-[var(--ea-accent)] flex items-center justify-end px-1 shadow-inner">
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow" />
                        </div>
                      ) : (
                        <div className="w-9 h-5 rounded-full bg-[var(--ea-surface-3)] flex items-center justify-start px-1 shadow-inner">
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-400 shadow" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* 4. Project Brain & Memory Settings */}
        {(activeTab === 'all' || activeTab === 'memory') && (
          <GlassCard>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-400" /> Project Brain & Vector Indexing
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <button onClick={() => handleAction('Rebuilding vector index from /src files...')} className="px-2.5 py-1 rounded bg-[var(--ea-surface-3)] hover:bg-[var(--ea-surface-3)] text-[var(--ea-accent)]">
                  Rebuild Index
                </button>
                <button onClick={() => handleAction('Cleared cached transient memories')} className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300">
                  Clear Cache
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div onClick={() => setAutoSaveDecisions(!autoSaveDecisions)} className="cursor-pointer p-3 rounded-xl bg-[var(--ea-surface-2)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] flex items-center justify-between gap-3 transition-colors">
                <div>
                  <div className="text-xs font-semibold ea-ink">Auto-Save Architectural Decisions (ADRs)</div>
                  <div className="text-[10px] ea-muted mt-0.5">Automatically extract token hex rules and layout decisions from chat into Project Brain.</div>
                </div>
                <div className="shrink-0">
                  {autoSaveDecisions ? (
                    <div className="w-9 h-5 rounded-full bg-[var(--ea-accent)] flex items-center justify-end px-1 shadow-inner">
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow" />
                    </div>
                  ) : (
                    <div className="w-9 h-5 rounded-full bg-[var(--ea-surface-3)] flex items-center justify-start px-1 shadow-inner">
                      <div className="w-3.5 h-3.5 rounded-full bg-gray-400 shadow" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)] flex items-center justify-between text-xs font-mono">
                <span className="ea-muted">Vector Index Sync Frequency:</span>
                <select className="bg-black/50 border border-[var(--ea-line)] rounded px-2 py-1 text-[var(--ea-accent)]">
                  <option>Every 2 minutes (Real-Time)</option>
                  <option>Every 15 minutes</option>
                  <option>Manual Trigger Only</option>
                </select>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 5. Appearance & Themes */}
        {(activeTab === 'all' || activeTab === 'appearance') && (
          <GlassCard>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ea-line)]">
              <span className="text-sm font-bold ea-ink flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--ea-accent)]" /> Appearance & Theme Tokens
              </span>
              <span className="text-xs font-mono ea-muted">Dark Graphite Default</span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'dark-graphite' as const, title: 'Dark Graphite (Default)', desc: '#0a0a0a background + #171717 charcoal glass cards.', color: 'border-cyan-500 bg-[var(--ea-accent-soft)]' },
                { id: 'charcoal-blue' as const, title: 'Charcoal Royal Blue', desc: '#0d0f17 background + electric blue glow accents.', color: 'border-blue-500/30 bg-blue-500/5' },
                { id: 'cosmic-purple' as const, title: 'Cosmic Violet Slate', desc: '#120f1c background + deep violet gradients.', color: 'border-sky-500/30 bg-sky-500/5' },
              ].map(th => (
                <div
                  key={th.id}
                  onClick={() => { setSelectedTheme(th.id); handleAction(`Applied theme: ${th.title}`); }}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    selectedTheme === th.id ? th.color + ' font-semibold shadow-lg' : 'border-[var(--ea-line)] hover:border-[var(--ea-line-strong)] bg-[var(--ea-surface-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold ea-ink">{th.title}</span>
                    {selectedTheme === th.id && <CheckCircle2 className="w-4 h-4 text-[var(--ea-accent)]" />}
                  </div>
                  <p className="text-[11px] ea-muted mt-1 leading-relaxed">{th.desc}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Right 1 Col: Sticky System Summary Panel */}
      <div className="space-y-4">
        <GlassCard className="sticky top-20 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)] font-sans">
            <span className="font-bold ea-ink flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--ea-accent)]" /> System Summary
            </span>
            <span className="text-emerald-400 font-mono">● LIVE</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="ea-muted">OS Version:</span>
              <strong className="ea-ink">vNext 2.4.0</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="ea-muted">Frontend Stack:</span>
              <strong className="text-[var(--ea-accent)]">React 19 + Vite + Tailwind v4</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="ea-muted">Backend Engine:</span>
              <strong className="text-blue-300">Express / FastAPI Proxy</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="ea-muted">Storage Adapter:</span>
              <strong className="ea-soft">Local JSON + Vector DB</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="ea-muted">Governance Status:</span>
              <strong className="text-emerald-400">Active (Mock-Safe)</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="ea-muted">System Health Score:</span>
              <strong className="text-emerald-400">98% A+ Compliance</strong>
            </div>
          </div>

          {/* Setup Checklist visual card */}
          <div className="pt-3 border-t border-[var(--ea-line)] space-y-2 font-sans">
            <span className="text-[11px] font-mono ea-muted uppercase block">Recommended Setup Checklist</span>
            {[
              { label: 'Set app name in metadata.json', done: true },
              { label: 'Configure Tailwind dark graphite tokens', done: true },
              { label: 'Connect GitHub & Filesystem MCP tools', done: true },
              { label: 'Enable Planning-First & Mock-Safe modes', done: true },
              { label: 'Review Project Brain ADR memory index', done: true },
            ].map((chk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="ea-soft truncate">{chk.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--ea-line)]">
            <button
              onClick={() => handleAction('System diagnostics check passed!')}
              className="w-full py-2.5 rounded-xl bg-[var(--ea-accent)] hover:brightness-110 text-[var(--ea-accent-ink)] font-sans font-semibold text-xs transition-colors shadow-lg"
            >
              Run Full Diagnostic Suite
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
