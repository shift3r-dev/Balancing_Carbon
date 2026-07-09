import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, User, Sparkles, HelpCircle, AlertCircle, 
  ArrowRight, ShieldCheck, RefreshCw, Layers 
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export default function AIAssistantModule() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Balancing Carbon Intelligent ESG & Decarbonization Assistant. I have indexed your organization's manufacturing plants (Mohali, Pune, Chennai), fuel ledger sheets, and compliance documents.\n\nHow can I help you compile evidence, answer questionnaires, or strategize carbon reduction models today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const samplePrompts = [
    "Draft reduction strategies for Chakan, Pune plant.",
    "Verify Tata Motors environmental policy alignment.",
    "Compare grid emission factors of Punjab and Tamil Nadu.",
    "Draft answer for OEM questionnaire about child labor."
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = 'user-' + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: textToSend }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });
      
      let data: any = {};
      if (response.ok) {
        try {
          const text = await response.text();
          if (text && text.trim() !== '' && text.trim() !== 'undefined') {
            data = JSON.parse(text);
          }
        } catch (parseErr) {
          console.error("Error parsing AI assistant response:", parseErr);
        }
      }

      setMessages(prev => [
        ...prev, 
        { 
          id: 'ai-' + Date.now(), 
          sender: 'assistant', 
          text: data.text || data.reply || "I encountered an issue processing your query in the secure context. Please check that GEMINI_API_KEY is configured in the AI Studio Secrets panel." 
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { 
          id: 'err-' + Date.now(), 
          sender: 'assistant', 
          text: "Communication error with secure tenant proxy. Ensure the Express server is online." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-brand-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Carbon AI Assistant</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Real-time, context-aware advice leveraging active facility parameters and compliance folders.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-50 text-brand-forest border border-emerald-100 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Calculations Guarded by Hardened Multi-Tenant Contexts</span>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Chat Thread */}
        <div className="bg-white border border-brand-border rounded-xl lg:col-span-3 flex flex-col h-[520px] overflow-hidden">
          
          {/* Thread list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(msg => {
              const isAI = msg.sender === 'assistant';
              return (
                <div key={msg.id} className={`flex gap-3 max-w-4xl ${isAI ? '' : 'flex-row-reverse ml-auto'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isAI ? 'bg-brand-forest text-white' : 'bg-brand-charcoal text-brand-sage'
                  }`}>
                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Body text bubble */}
                  <div className={`p-4 rounded-xl text-xs leading-relaxed max-w-2xl border ${
                    isAI 
                      ? 'bg-brand-offwhite text-brand-charcoal border-brand-border/60' 
                      : 'bg-brand-charcoal text-white border-brand-charcoal'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                </div>
              );
            })}
            
            {/* Typing Loader Indicator */}
            {loading && (
              <div className="flex gap-3 max-w-xl">
                <div className="w-8 h-8 rounded-lg bg-brand-forest text-white flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-brand-offwhite text-gray-400 p-4 rounded-xl text-xs border border-brand-border/60 font-mono">
                  Synthesizing audit trails and cross-referencing facility energy balances...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Quick Sandbox Selector prompts */}
          <div className="px-5 py-2.5 bg-brand-offwhite border-t border-brand-border/60 flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
            {samplePrompts.map(pr => (
              <button
                key={pr}
                onClick={() => handleSend(pr)}
                disabled={loading}
                className="bg-white hover:bg-brand-sage/20 border border-brand-border/80 px-2.5 py-1 rounded-lg text-gray-600 transition-all cursor-pointer whitespace-nowrap"
              >
                {pr}
              </button>
            ))}
          </div>

          {/* Text Input area */}
          <div className="p-4 border-t border-brand-border flex gap-2 bg-white">
            <input
              type="text"
              placeholder="Ask anything about Scope emissions, Indian CEA Grid factors, or custom recommendations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              disabled={loading}
              className="flex-1 border border-brand-border rounded-lg text-xs px-4 py-3 bg-brand-offwhite focus:outline-none focus:ring-1 focus:ring-brand-forest disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              className="bg-brand-forest hover:bg-brand-green-sec text-white px-5 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Informational Guidelines Sidebar */}
        <div className="space-y-6">
          
          <div className="bg-brand-charcoal text-white p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold font-mono text-brand-sage uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-4 h-4 text-brand-forest" /> Secure Retrieval Context
            </h4>
            <p className="text-xs text-gray-400 leading-normal">
              Balancing Carbon's Assistant is wired to only see details associated with Apex Precision Components. Under the hood, any query you type is bound to a backend retrieval chain injecting active facility capacities, compliance checklists, and file listings.
            </p>
          </div>

          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-3 text-xs text-gray-500">
            <h4 className="font-bold text-xs uppercase font-mono text-brand-charcoal">Example Queries to Try</h4>
            <ul className="space-y-2 list-disc pl-4 leading-relaxed">
              <li>"Summarize my Environmental Policy gaps and recommended actions."</li>
              <li>"Calculate carbon reduction if I double renewable solar offset in Pune plant."</li>
              <li>"What CEA grid emissions factor is currently running?"</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
