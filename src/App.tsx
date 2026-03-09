import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Server, Palette, Globe, Cpu, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Script {
  id: string;
  name: string;
  description: string;
  type: 'panel' | 'node' | 'util';
}

interface Theme {
  id: string;
  name: string;
  url: string;
  image: string;
}

export default function App() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [customThemeUrl, setCustomThemeUrl] = useState<string>('');
  const [bgImageUrl, setBgImageUrl] = useState<string>('');
  const [themeUrlError, setThemeUrlError] = useState<string | null>(null);
  const [bgUrlError, setBgUrlError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState<string>('');

  useEffect(() => {
    // Fetch scripts from our API
    fetch('/api/scripts')
      .then(res => res.json())
      .then(data => {
        setScripts(data.scripts);
        if (data.appUrl) setAppUrl(data.appUrl);
        if (data.scripts.length > 0) setSelectedScript(data.scripts[0]);
      });

    // Fetch themes
    fetch('/api/themes')
      .then(res => res.json())
      .then(data => {
        setThemes(data);
      });
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const validateUrl = (url: string, type: 'theme' | 'bg') => {
    if (!url) {
      if (type === 'theme') setThemeUrlError(null);
      else setBgUrlError(null);
      return true;
    }
    
    try {
      new URL(url);
      if (type === 'theme') setThemeUrlError(null);
      else setBgUrlError(null);
      return true;
    } catch (e) {
      if (type === 'theme') setThemeUrlError('Please enter a valid URL (e.g., https://example.com/theme.zip)');
      else setBgUrlError('Please enter a valid image URL (e.g., https://example.com/image.jpg)');
      return false;
    }
  };

  const getCurlCommand = (id: string) => {
    const themeUrl = selectedTheme ? selectedTheme.url : customThemeUrl;
    const bgUrl = bgImageUrl;
    
    let command = `bash <(curl -s ${appUrl}/s/${id})`;
    
    // Only 'install' script supports theme and background arguments
    if (id === 'install') {
      if (themeUrl || bgUrl) {
        command += ` "${themeUrl || ''}"`;
      }
      
      if (bgUrl) {
        command += ` "${bgUrl}"`;
      }
    }
    
    return command;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="scanline" />
      
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Terminal className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">PteroScript Manager</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Automated deployment scripts for Pterodactyl Panel. Support for VPS, GitHub Codespaces, and custom theme installation.
          </p>
          
          {appUrl.includes('-dev-') && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <div className="p-1 bg-amber-500/20 rounded mt-0.5">
                <Cpu className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Dev Environment Detected</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  The current URL is a protected Dev URL. <strong>Curl commands will fail</strong> with a "302 Found" error. 
                  Please use the <strong>Shared App URL</strong> (ais-pre-...) to run these commands in your terminal.
                </p>
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4 px-2">Available Scripts</h2>
            {scripts.map((script) => (
              <button
                key={script.id}
                onClick={() => setSelectedScript(script)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedScript?.id === script.id
                    ? 'bg-zinc-900 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${selectedScript?.id === script.id ? 'text-blue-400' : 'text-zinc-200'}`}>
                    {script.name}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedScript?.id === script.id ? 'translate-x-1 text-blue-400' : 'text-zinc-600'}`} />
                </div>
                <p className="text-sm text-zinc-500 line-clamp-1">{script.description}</p>
              </button>
            ))}

            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> System Requirements
              </h3>
              <ul className="text-xs text-zinc-500 space-y-2">
                <li>• Ubuntu 20.04 / 22.04 / 24.04</li>
                <li>• Minimum 2GB RAM (Panel)</li>
                <li>• Root access or Sudo privileges</li>
                <li>• Docker Desktop (for Codespaces)</li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {selectedScript && (
                <motion.div
                  key={selectedScript.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                      <div className="p-8 rounded-2xl glass">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                selectedScript.type === 'panel' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                selectedScript.type === 'node' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                              }`}>
                                {selectedScript.type}
                              </span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{selectedScript.name}</h2>
                            <p className="text-zinc-400">{selectedScript.description}</p>
                          </div>
                          {selectedScript.type === 'panel' ? (
                            <Server className="w-8 h-8 text-blue-400 opacity-50" />
                          ) : selectedScript.type === 'node' ? (
                            <Cpu className="w-8 h-8 text-purple-400 opacity-50" />
                          ) : (
                            <Terminal className="w-8 h-8 text-zinc-400 opacity-50" />
                          )}
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Installation Command</label>
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                            <div className="relative flex items-center gap-4 p-4 bg-black rounded-xl border border-zinc-800 font-mono text-sm overflow-hidden">
                              <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
                                <span className="text-zinc-500">$</span>{' '}
                                <span className="text-blue-400">bash</span>{' '}
                                <span className="text-zinc-300">&lt;(</span>
                                <span className="text-blue-400">curl</span>{' '}
                                <span className="text-zinc-400">-s</span>{' '}
                                <span className="text-emerald-400">{appUrl}/s/{selectedScript.id}</span>
                                <span className="text-zinc-300">)</span>
                                {selectedScript.id === 'install' && (
                                  <>
                                    {(selectedTheme || customThemeUrl) && (
                                      <span className="text-purple-400 ml-2">
                                        "{selectedTheme ? selectedTheme.url : customThemeUrl}"
                                      </span>
                                    )}
                                    {bgImageUrl && (
                                      <span className="text-pink-400 ml-2">
                                        "{bgImageUrl}"
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <button
                                onClick={() => copyToClipboard(getCurlCommand(selectedScript.id), 'main')}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white shrink-0"
                              >
                                {copied === 'main' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {selectedScript.id === 'install' && (
                          <div className="mt-10 space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-400" /> Theme Selection
                              </h3>
                              <button 
                                onClick={() => { 
                                  setSelectedTheme(null); 
                                  setCustomThemeUrl(''); 
                                  setBgImageUrl(''); 
                                }}
                                className="text-xs text-blue-400 hover:underline"
                              >
                                Clear Selection
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {themes.map((theme) => (
                                <button
                                  key={theme.id}
                                  onClick={() => { setSelectedTheme(theme); setCustomThemeUrl(''); }}
                                  className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                                    selectedTheme?.id === theme.id ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  <img src={theme.image} alt={theme.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                    <span className="text-[10px] font-bold text-white truncate">{theme.name}</span>
                                  </div>
                                  {selectedTheme?.id === theme.id && (
                                    <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-zinc-500">Or enter custom GitHub ZIP or .sh URL</label>
                              <input
                                type="text"
                                value={customThemeUrl}
                                onChange={(e) => { 
                                  const val = e.target.value;
                                  setCustomThemeUrl(val); 
                                  setSelectedTheme(null);
                                  validateUrl(val, 'theme');
                                }}
                                placeholder="https://github.com/user/repo/archive/refs/heads/main.zip"
                                className={`w-full bg-zinc-900 border rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors ${
                                  themeUrlError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-blue-500'
                                }`}
                              />
                              {themeUrlError && (
                                <p className="text-[10px] text-red-400 mt-1">{themeUrlError}</p>
                              )}
                            </div>

                            <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                              <label className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                                <Palette className="w-3 h-3 text-pink-400" /> Custom Background Image URL
                              </label>
                              <input
                                type="text"
                                value={bgImageUrl}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBgImageUrl(val);
                                  validateUrl(val, 'bg');
                                }}
                                placeholder="https://example.com/background.jpg"
                                className={`w-full bg-zinc-900 border rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors ${
                                  bgUrlError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-pink-500'
                                }`}
                              />
                              {bgUrlError && (
                                <p className="text-[10px] text-red-400 mt-1">{bgUrlError}</p>
                              )}
                              <p className="text-[10px] text-zinc-600 italic">This will inject custom CSS to set the panel background.</p>
                            </div>
                          </div>
                        )}

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <span className="text-xs font-medium text-zinc-500 block mb-1">Environment Support</span>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 uppercase">VPS</span>
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20 uppercase">Codespaces</span>
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 uppercase">Local</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <span className="text-xs font-medium text-zinc-500 block mb-1">Status</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm text-zinc-300">Operational</span>
                        </div>
                      </div>
                    </div>
                  </div>

                    {/* Documentation / Info */}
                    <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-zinc-400" /> Usage Instructions
                      </h3>
                      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                        <p>1. Connect to your server via SSH or open your terminal.</p>
                        <p>2. Copy and paste the command above to start the process.</p>
                        {selectedScript.id === 'install' && (
                          <p>3. If a theme or background image is selected, it will be automatically applied after the panel setup.</p>
                        )}
                        <p>{selectedScript.id === 'install' ? '4.' : '3.'} The script will handle dependencies and configuration automatically.</p>
                        <p>{selectedScript.id === 'install' ? '5.' : '4.'} Follow any on-screen prompts to complete the setup.</p>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 italic">Last updated: March 2026</span>
                        <a href="#" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          View Source <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
