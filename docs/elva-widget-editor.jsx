import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  ChevronLeft,
  Save,
  Code,
  Smartphone,
  Monitor,
  RefreshCw,
  Palette,
  MessageCircle,
  Zap,
  Check,
  Moon,
  Sun,
  Menu,
  X,
  Bot,
  Users,
  BarChart3,
  Search,
  Bell,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Eye,
  Send,
  XCircle,
  MoreVertical
} from 'lucide-react';

// --- Shared Components (Reused from Dashboard for consistency) ---

const SidebarItem = ({ icon: Icon, label, active, collapsed, isDarkMode }) => (
  <button className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${active
      ? 'bg-[#075ef0] text-white shadow-lg shadow-blue-900/20'
      : isDarkMode
        ? 'text-slate-400 hover:bg-[#1a1a1a] hover:text-slate-100'
        : 'text-slate-500 hover:bg-white hover:text-slate-900'
    }`}>
    <Icon size={20} />
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
  </button>
);

const AccordionItem = ({ title, icon: Icon, isOpen, onClick, children, isDarkMode }) => (
  <div className={`border-b last:border-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-opacity-50 transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
          <Icon size={18} />
        </div>
        <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{title}</span>
      </div>
      {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
    </button>

    {isOpen && (
      <div className={`p-4 pt-0 animate-in slide-in-from-top-2 duration-200`}>
        {children}
      </div>
    )}
  </div>
);

const ColorPicker = ({ label, value, onChange, isDarkMode }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
    <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-slate-400 uppercase">{value}</span>
      <div className="relative overflow-hidden w-8 h-8 rounded-full shadow-sm ring-1 ring-slate-200 cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
        />
      </div>
    </div>
  </div>
);

export default function ElvaWidgetEditor() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default collapsed for editor to give space
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'

  // Editor State
  const [openSection, setOpenSection] = useState('appearance');
  const [primaryColor, setPrimaryColor] = useState('#D92D20'); // Using the Red from your screenshot
  const [title, setTitle] = useState('DdD Retail Support');
  const [welcomeMsg, setWelcomeMsg] = useState('Hej! 🤩 Jeg hjælper dig med alt om DdD Retail in a Box POS. Stil dit spørgsmål, så finder jeg den hurtigste løsning.');
  const [placeholder, setPlaceholder] = useState('Skriv dit spørgsmål her...');

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-black text-slate-100' : 'bg-[#f3f5f7] text-slate-900'}`}>

      {/* Sidebar (Collapsed by default for Editor focus) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 border-r flex flex-col transition-all duration-300
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isDarkMode ? 'bg-[#050505] border-slate-800' : 'bg-[#f3f5f7] border-slate-200'}
      `}>
        <div className={`h-16 flex items-center px-6 border-b justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <img src="https://www.elva-agents.com/images/Elva%20Logo%20Icon%202.svg" alt="Elva" className="w-8 h-8" />
            {!sidebarCollapsed && <span className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Elva</span>}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block text-slate-400 hover:text-slate-600">
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={false} collapsed={sidebarCollapsed} isDarkMode={isDarkMode} />
          <SidebarItem icon={Bot} label="AI Agents" active={true} collapsed={sidebarCollapsed} isDarkMode={isDarkMode} />
          <SidebarItem icon={MessageSquare} label="Conversations" collapsed={sidebarCollapsed} isDarkMode={isDarkMode} />
          <SidebarItem icon={Settings} label="Settings" collapsed={sidebarCollapsed} isDarkMode={isDarkMode} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Editor Top Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 z-20 ${isDarkMode ? 'bg-[#050505] border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div className="flex items-center gap-4">
            <button className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                <span>Widgets</span>
                <ChevronRight size={12} />
                <span>DdD Retail Support</span>
              </div>
              <h1 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Widget Editor</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full mr-2 ${isDarkMode ? 'text-yellow-400 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:bg-slate-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${isDarkMode
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <Code size={16} />
              <span>Embed</span>
            </button>

            <button className="bg-[#075ef0] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-[#075ef0]/20">
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </header>

        {/* Editor Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT PANEL: Settings */}
          <div className={`w-[400px] border-r flex flex-col overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#111] border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="flex flex-col">
              <AccordionItem
                title="Appearance"
                icon={Palette}
                isOpen={openSection === 'appearance'}
                onClick={() => setOpenSection(openSection === 'appearance' ? '' : 'appearance')}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Widget Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-[#075ef0]/20 focus:outline-none ${isDarkMode
                          ? 'bg-[#1a1a1a] border-slate-700 text-white focus:border-[#075ef0]'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#075ef0]'
                        }`}
                    />
                  </div>

                  <div className={`h-px w-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>

                  <ColorPicker
                    label="Primary Brand Color"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                    isDarkMode={isDarkMode}
                  />

                  <div className={`p-3 rounded-lg flex items-center gap-3 ${isDarkMode ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                    <Zap size={16} />
                    <p className="text-xs">Your logo is automatically pulled from your Organization settings.</p>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                title="Messages & Texts"
                icon={MessageCircle}
                isOpen={openSection === 'messages'}
                onClick={() => setOpenSection(openSection === 'messages' ? '' : 'messages')}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Welcome Message
                    </label>
                    <textarea
                      rows={3}
                      value={welcomeMsg}
                      onChange={(e) => setWelcomeMsg(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-[#075ef0]/20 focus:outline-none resize-none ${isDarkMode
                          ? 'bg-[#1a1a1a] border-slate-700 text-white focus:border-[#075ef0]'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#075ef0]'
                        }`}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">This message appears when users first open the chat.</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Input Placeholder
                    </label>
                    <input
                      type="text"
                      value={placeholder}
                      onChange={(e) => setPlaceholder(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-[#075ef0]/20 focus:outline-none ${isDarkMode
                          ? 'bg-[#1a1a1a] border-slate-700 text-white focus:border-[#075ef0]'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#075ef0]'
                        }`}
                    />
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                title="Popup Behavior"
                icon={Eye}
                isOpen={openSection === 'behavior'}
                onClick={() => setOpenSection(openSection === 'behavior' ? '' : 'behavior')}
                isDarkMode={isDarkMode}
              >
                <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <div className="flex items-center justify-between py-2">
                    <span>Auto-open on desktop</span>
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer ${isDarkMode ? 'bg-[#075ef0]' : 'bg-[#075ef0]'}`}>
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Show typing indicator</span>
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </AccordionItem>
            </div>
          </div>

          {/* RIGHT PANEL: Live Preview Area */}
          <div className={`flex-1 flex flex-col relative ${isDarkMode ? 'bg-[#000]' : 'bg-[#f0f2f5]'}`}>

            {/* Preview Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm p-1 rounded-full flex gap-1 z-10">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded-full transition-all ${previewMode === 'desktop' ? 'bg-slate-100 text-[#075ef0]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Monitor size={18} />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded-full transition-all ${previewMode === 'mobile' ? 'bg-slate-100 text-[#075ef0]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Smartphone size={18} />
              </button>
              <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
              <button className="p-2 text-slate-400 hover:text-[#075ef0] rounded-full hover:bg-slate-50 transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>

            {/* The Actual Preview Canvas */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              <div
                className={`relative transition-all duration-500 ease-in-out shadow-2xl ${previewMode === 'mobile'
                    ? 'w-[375px] h-[700px] rounded-[3rem] border-8 border-slate-900 bg-white overflow-hidden'
                    : 'w-full max-w-4xl h-[600px] rounded-xl border border-slate-200 bg-white overflow-hidden'
                  }`}
              >
                {/* Fake Browser Header (Desktop only) */}
                {previewMode === 'desktop' && (
                  <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="flex-1 mx-4 h-5 bg-white border border-slate-200 rounded text-[10px] flex items-center px-2 text-slate-400">
                      example-shop.com
                    </div>
                  </div>
                )}

                {/* Fake Website Content Background */}
                <div className="absolute inset-0 top-8 bg-slate-50 overflow-y-auto">
                  {/* Abstract website skeleton content */}
                  <div className="w-full h-64 bg-slate-200/50 mb-8 flex items-center justify-center text-slate-300">
                    Hero Banner Placeholder
                  </div>
                  <div className="max-w-2xl mx-auto space-y-4 px-8">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      <div className="h-32 bg-slate-200 rounded"></div>
                      <div className="h-32 bg-slate-200 rounded"></div>
                      <div className="h-32 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* --- THE WIDGET ITSELF --- */}
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4 font-sans">

                  {/* Chat Window */}
                  <div className="w-[360px] h-[500px] bg-white rounded-xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500">

                    {/* Header - Dynamic Color */}
                    <div style={{ backgroundColor: primaryColor }} className="p-4 text-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <span className="font-bold text-sm">DR</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm leading-tight">{title}</h3>
                          <div className="flex items-center gap-1.5 opacity-90">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                            <span className="text-[10px]">Tilgængelig nu</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 text-white/80">
                        <MoreVertical size={18} />
                        <X size={18} />
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-slate-50 p-4 overflow-y-auto">
                      <p className="text-[10px] text-center text-slate-400 mb-4">DdD Retail står ikke til ansvar for svar, der kun er vejledende</p>

                      {/* AI Message */}
                      <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          DdD
                        </div>
                        <div className="max-w-[80%]">
                          <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm text-sm text-slate-700 leading-relaxed">
                            {welcomeMsg}
                          </div>
                          <span className="text-[10px] text-slate-400 ml-1 mt-1 block">14:19</span>
                        </div>
                      </div>

                      {/* Suggestion Chips */}
                      <div className="flex flex-wrap justify-end gap-2 mt-8">
                        {['Hvordan opretter jeg en ny bruger?', 'Hvordan laver jeg en dagsafslutning?', 'Returvarer?'].map(chip => (
                          <button key={chip} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors">
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={placeholder}
                          className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-full text-sm border-0 focus:ring-1 focus:ring-slate-200 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
                        />
                        <button
                          style={{ backgroundColor: primaryColor }}
                          className="absolute right-1.5 top-1.5 p-1.5 rounded-full text-white hover:opacity-90 transition-opacity"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-[10px] text-slate-300">Drevet af elva-solutions.com</span>
                      </div>
                    </div>
                  </div>

                  {/* Trigger Button - Dynamic Color */}
                  <button
                    style={{ backgroundColor: primaryColor }}
                    className="w-14 h-14 rounded-full text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                  >
                    <MessageSquare size={26} strokeWidth={2.5} />
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}