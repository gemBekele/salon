import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Loader2, X, RefreshCw } from 'lucide-react';
import { Company, Branch } from '../types';
import { apiFetch } from '../lib/api';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompany: Company;
  selectedBranch: Branch;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedCompany,
  selectedBranch,
}) => {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content: `Greetings! I am your Gemini-powered Salon & Spa ERP AI Assistant for ${selectedCompany.name} (${selectedBranch.name}). How can I assist with revenue insights, staff commission optimization, inventory reorders, or promotional SMS marketing campaigns?`,
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    "Analyze today's revenue & staff commission trends for Bole Flagship",
    'Generate an Ethiopian New Year promotional SMS campaign for VIP customers',
    'Which inventory items need urgent reordering based on visit consumption?',
    'Suggest optimal staff shift roster for weekend peak hours (2 PM - 7 PM)',
  ];

  const handleSendMessage = async (promptToSend?: string) => {
    const prompt = promptToSend || inputPrompt;
    if (!prompt.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    if (!promptToSend) setInputPrompt('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          systemInstruction: `You are a Senior Salon & Spa ERP Business Analyst and AI Assistant for "${selectedCompany.name}", operating branch "${selectedBranch.name}" in Ethiopia. Provide clear, professional, actionable ERP insights, numerical calculations, or SMS marketing text in ETB currency.`,
        }),
      });

      const data = await response.json();

      if (data.text) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.text },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I could not generate an answer at this moment.',
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while connecting to the Gemini AI API.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#18181b]/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-card border border-[#efe8d9] rounded-3xl max-w-2xl w-full h-[80vh] max-h-[600px] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#18181b] p-4 text-white border-b border-[#111114] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f6f3ec]/20 border border-[#f6f3ec]/30 flex items-center justify-center text-[#f6f3ec]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#f6f3ec]">Gemini ERP Smart Assistant</h3>
              <p className="text-[10px] text-[#f6f3ec]/80">
                {selectedCompany.name} • {selectedBranch.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#f6f3ec]/80 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-[#f6f3ec] border-b border-[#efe8d9] flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider shrink-0">Quick AI Prompts:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="bg-card hover:bg-[#efe8d9]/60 text-[#18181b] text-[11px] px-3 py-1 rounded-full border border-[#efe8d9] shrink-0 whitespace-nowrap cursor-pointer transition-colors shadow-2xs font-medium"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat Message History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start space-x-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#18181b]/15 border border-[#18181b]/30 flex items-center justify-center text-[#18181b] shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#18181b] text-white rounded-tr-none'
                    : 'bg-[#f6f3ec] border border-[#efe8d9] text-[#18181b] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#18181b] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-[#71717a] text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#18181b]" />
              <span>Analyzing ERP data with Gemini AI...</span>
            </div>
          )}
        </div>

        {/* Prompt Input Footer */}
        <div className="p-3 bg-[#f6f3ec] border-t border-[#efe8d9]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask AI about sales, staff commissions, stock reorders, or marketing..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 bg-card border border-[#efe8d9] text-[#18181b] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#18181b]"
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-5 py-2.5 bg-[#18181b] hover:bg-[#111114] text-white font-bold rounded-full text-xs disabled:opacity-50 transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
