'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, RefreshCw, CheckCircle, AlertCircle, Sparkles, CornerDownLeft, Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface CommandOutput {
  id: string;
  command: string;
  timestamp: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  loading?: boolean;
}

export function AdminTerminalTab() {
  const { user } = useAuth();
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmdToRun?: string) => {
    const targetCmd = (cmdToRun !== undefined ? cmdToRun : commandInput).trim();
    if (!targetCmd || isRunning) return;

    const id = Math.random().toString(36).slice(2);
    const timestamp = new Date().toLocaleTimeString();

    const newOutputItem: CommandOutput = {
      id,
      command: targetCmd,
      timestamp,
      stdout: '',
      stderr: '',
      exitCode: 0,
      loading: true,
    };

    setHistory((prev) => [...prev, newOutputItem]);
    setCmdHistory((prev) => [...prev.filter((c) => c !== targetCmd), targetCmd]);
    setHistoryIdx(-1);
    if (!cmdToRun) setCommandInput('');
    setIsRunning(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command: targetCmd }),
      });

      const data = await res.json();

      setHistory((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                loading: false,
                stdout: data.stdout || '',
                stderr: data.stderr || (res.ok ? '' : data.error || 'Execution failed'),
                exitCode: data.exitCode ?? (res.ok ? 0 : 1),
              }
            : item
        )
      );
    } catch (err: any) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                loading: false,
                stderr: err.message || 'Network request error',
                exitCode: 1,
              }
            : item
        )
      );
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setCommandInput(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setCommandInput(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setCommandInput('');
      }
    }
  };

  const clearTerminal = () => {
    setHistory([]);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header & Quick Action Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
            <TerminalIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2 text-zinc-100">
              Docker & Web Shell Terminal
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                ACTIVE
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Execute terminal & Docker commands directly in-browser</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => executeCommand('npm run create-user')}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            👤 Create User
          </button>
          <button
            onClick={() => executeCommand('npm run wizard')}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900/80 border border-blue-800 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            🧙 CLI Wizard
          </button>
          <button
            onClick={() => executeCommand('npm test')}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg bg-amber-950 hover:bg-amber-900/80 border border-amber-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            🧪 Run Tests
          </button>
          <button
            onClick={() => executeCommand('git status')}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900/80 border border-purple-800 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            📊 Git Status
          </button>
          <button
            onClick={clearTerminal}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-xs font-semibold flex items-center gap-1 transition"
            title="Clear screen"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Screen Window */}
      <div className="rounded-2xl bg-black border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Title Bar */}
        <div className="px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs text-zinc-400 ml-2 font-mono">admin@docker-container: /app</span>
          </div>
          <span className="text-[11px] text-zinc-500">sh / bash terminal</span>
        </div>

        {/* Terminal Output Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs text-zinc-200">
          <div className="text-zinc-500 border-b border-zinc-900 pb-3">
            🎓 IMAMU Helper Web Shell v1.0.0 (Linux x86_64 Container)
            <br />
            Type any command (e.g. <span className="text-emerald-400">npm run create-user</span>, <span className="text-emerald-400">npm test</span>, <span className="text-emerald-400">ls -la</span>) and press Enter.
          </div>

          {history.map((item) => (
            <div key={item.id} className="space-y-1.5">
              {/* Command Prompt Line */}
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="text-zinc-500">[{item.timestamp}]</span>
                <span className="text-blue-400">admin@docker</span>:<span className="text-emerald-400">/app$</span>
                <span className="text-zinc-100">{item.command}</span>
                {item.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 ml-auto" />}
              </div>

              {/* Stdout Output */}
              {item.stdout && (
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {item.stdout}
                </pre>
              )}

              {/* Stderr / Error Output */}
              {item.stderr && (
                <pre className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {item.stderr}
                </pre>
              )}

              {!item.loading && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 pt-1">
                  {item.exitCode === 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Exit Code 0 (Success)
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Exit Code {item.exitCode}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={outputEndRef} />
        </div>

        {/* Command Input Prompt Bar */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-xs shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Executing command...' : 'Type command here (e.g. npm run create-user) ...'}
            disabled={isRunning}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono"
          />
          <button
            onClick={() => executeCommand()}
            disabled={isRunning || !commandInput.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition shrink-0"
            title="Run Command (Enter)"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
