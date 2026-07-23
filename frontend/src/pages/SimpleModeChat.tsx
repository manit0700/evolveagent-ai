import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { LiveWorkingCard } from '../components/shared/LiveWorkingCard';
import {
  Send,
  Paperclip,
  Mic,
  Bot,
  User,
  Brain,
  CheckSquare,
  FileCode,
  Wrench,
} from 'lucide-react';

export const SimpleModeChat: React.FC = () => {
  const { chatMessages, sendMessage, mission, agents, connectors, memories, setActivePage, showToast } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedDb, setSelectedDb] = useState('Workspace Memory + Postgres');
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'running');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;
    sendMessage(inputText, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setAttachments([]);
  };

  const handleAttachMock = () => {
    const mockFiles = [
      { name: 'App.tsx', size: '12 KB', type: 'TypeScript Component' },
      { name: 'tailwind.config.ts', size: '4 KB', type: 'Config' },
      { name: 'ADR-12-design-tokens.md', size: '18 KB', type: 'Markdown Memory' },
    ];
    const nextFile = mockFiles[attachments.length % mockFiles.length];
    setAttachments((prev) => [...prev, nextFile]);
    showToast(`Attached ${nextFile.name} (${nextFile.size})`, 'info');
  };

  const toggleMic = () => {
    if (!isRecording) {
      setIsRecording(true);
      showToast('Listening…', 'info');
      setTimeout(() => {
        setIsRecording(false);
        setInputText((prev) => prev + (prev ? ' ' : '') + 'Tighten spacing and raise contrast on agent cards.');
        showToast('Voice transcribed', 'success');
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-8.5rem)] pb-2">
      <div className="lg:col-span-3 flex flex-col h-full ea-card overflow-hidden">
        <div className="p-4 border-b border-[var(--ea-line)] ea-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[var(--ea-radius-sm)] bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold ea-ink">Assistant</h3>
                <span className="ea-chip ea-chip--accent">Mock-safe</span>
              </div>
              <p className="text-[11px] ea-muted truncate">
                Routing across {activeAgents.length} active agents · planning-first
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePage('dev-console')}
            className="ea-btn text-xs py-1.5 hidden sm:inline-flex"
          >
            Trace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[var(--ea-radius-sm)] flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-[var(--ea-ink)] text-[var(--ea-surface)]'
                      : 'ea-surface-3 border border-[var(--ea-line)]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : msg.avatar || '🤖'}
                </div>

                <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end text-right' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 px-1 ${isUser ? 'justify-end' : ''}`}>
                    <span className="text-xs font-semibold ea-soft">{isUser ? 'You' : msg.agentName || 'Assistant'}</span>
                    <span className="text-[10px] ea-faint">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[var(--ea-ink)] text-[var(--ea-surface)] rounded-tr-md'
                        : 'ea-surface-2 border border-[var(--ea-line)] ea-ink rounded-tl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`mt-3 pt-3 flex flex-wrap gap-2 ${isUser ? 'border-t border-[var(--ea-line-strong)]' : 'border-t border-[var(--ea-line)]'}`}>
                        {msg.attachments.map((file, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs ${
                              isUser ? 'bg-[var(--ea-surface-3)]' : 'ea-surface-3 ea-soft'
                            }`}
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>{file.name}</span>
                            <span className="opacity-70">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.isWorkingCard && <LiveWorkingCard />}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[var(--ea-line)] ea-surface-2 space-y-3">
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] ea-muted">Attached:</span>
              {attachments.map((file, i) => (
                <div key={i} className="ea-chip ea-chip--accent">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="ml-0.5">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center ea-surface rounded-[var(--ea-radius)] border border-[var(--ea-line-strong)] focus-within:border-[var(--ea-accent)] focus-within:shadow-[0_0_0_3px_var(--ea-accent-soft)] transition-all px-2 py-1.5">
              <button
                type="button"
                onClick={handleAttachMock}
                className="p-2 rounded-lg ea-muted hover:ea-ink hover:bg-[var(--ea-surface-3)]"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <div className="relative hidden sm:block border-r border-[var(--ea-line)] pr-2 mr-1">
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="bg-transparent text-xs text-[var(--ea-accent)] focus:outline-none cursor-pointer max-w-[10rem]"
                >
                  <option>Workspace Memory + Postgres</option>
                  <option>Project Brain (Vector Index)</option>
                  <option>Local Filesystem (/src)</option>
                  <option>GitHub Repo Metadata</option>
                </select>
              </div>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask a question or describe the next step…"
                className="flex-1 bg-transparent text-sm ea-ink placeholder:text-[var(--ea-faint)] focus:outline-none px-2 py-1.5"
              />

              <button
                type="button"
                onClick={toggleMic}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-[var(--ea-danger-soft)] text-[var(--ea-danger)]'
                    : 'ea-muted hover:ea-ink hover:bg-[var(--ea-surface-3)]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() && attachments.length === 0}
              className="ea-btn ea-btn--primary p-3.5 disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <span className="ea-faint shrink-0">Try:</span>
            {[
              'Run a safety check on connected tools',
              'Summarize ADR #12 from Project Brain',
              'Draft a container deploy plan',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInputText(prompt)}
                className="shrink-0 ea-btn text-[11px] py-1"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 flex flex-col h-full overflow-y-auto">
        <GlassCard padding="sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ea-line)]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[var(--ea-accent)]" />
              <h4 className="text-xs font-semibold ea-ink">Mission</h4>
            </div>
            <button onClick={() => setActivePage('mission-control')} className="text-[11px] text-[var(--ea-accent)]">
              View
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-semibold ea-ink">{mission.title}</div>
            <div className="flex items-center justify-between text-[11px] ea-muted">
              <span>Progress</span>
              <span className="font-semibold text-[var(--ea-accent)]">{mission.progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full ea-surface-3 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--ea-accent)]" style={{ width: `${mission.progress}%` }} />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ea-line)]">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--ea-accent)]" />
              <h4 className="text-xs font-semibold ea-ink">Brain</h4>
            </div>
            <button onClick={() => setActivePage('project-brain')} className="text-[11px] text-[var(--ea-accent)]">
              {memories.length}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {memories.slice(0, 3).map((mem) => (
              <div key={mem.id} className="p-2.5 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold ea-ink truncate">{mem.title}</span>
                  <span className="text-[10px] font-medium text-[var(--ea-accent)]">{mem.relevance}%</span>
                </div>
                <p className="text-[10px] ea-muted line-clamp-2">{mem.snippet}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="sm" className="flex-1">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ea-line)]">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[var(--ea-success)]" />
              <h4 className="text-xs font-semibold ea-ink">Tools</h4>
            </div>
            <span className="ea-chip">Safe</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {connectors
              .filter((c) => c.status === 'connected' || c.status === 'approval-gated')
              .slice(0, 4)
              .map((tool) => (
                <div key={tool.id} className="flex items-center justify-between p-2 rounded-lg ea-surface-2 text-xs">
                  <span className="ea-soft truncate">{tool.name}</span>
                  <span className="ea-faint">{tool.callsToday}x</span>
                </div>
              ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
