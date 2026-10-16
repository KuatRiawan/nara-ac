import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

function formatBotText(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function ChatbotWidget({ 
  isOpen: externalIsOpen, 
  onClose, 
  hideFloatingButton = false 
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) onClose();
    if (!isControlled) setInternalIsOpen(false);
  };

  const handleToggle = () => {
    if (isControlled) {
      if (isOpen && onClose) onClose();
    } else {
      setInternalIsOpen(prev => !prev);
    }
  };

  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Halo! Ada yang bisa saya bantu terkait layanan Nara AC hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e, quickReplyText = null) => {
    e?.preventDefault();
    
    // Handle quick reply selection
    let userText = input.trim();
    if (quickReplyText) {
      userText = quickReplyText;
      setInput('');
    } else if (!userText) {
      return;
    }
    
    if (!userText) return;

    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);
    setQuickReplies([]);
    setSuggestions([]);

    try {
      const res = await api.post('/ai/answer', { text: userText }, { timeout: 35000 });
      const data = res.data || res;
      
      const botText = data?.jawaban || data?.pesan || data?.jawaban || data?.pesan || 'Maaf, saya tidak mengerti.';
      const rute = data?.rute || data?.route || null;
      const actions = data?.aksi || [];
      const newQuickReplies = data?.quick_replies || [];
      const saran = data?.saran || [];
      const intent = data?.intent || null;
      const fallback = data?.fallback || false;
      
      // Set quick replies and suggestions
      if (newQuickReplies && newQuickReplies.length > 0) {
        setQuickReplies(newQuickReplies);
      }
      if (saran && saran.length > 0) {
        setSuggestions(saran);
      }
      
      // Map actions to action buttons
      let action = null;
      if (actions && actions.length > 0) {
        action = actions[0]; // Take first action
      } else if (rute === 'booking_flow' || (rute && rute.includes('booking'))) {
        action = { text: 'Pesan Sekarang', link: '/booking' };
      } else if (rute?.includes('status')) {
        action = { text: 'Cek Status', link: '/status' };
      }

      // If this is a fallback, show suggestions
      if (fallback && saran && saran.length > 0 && quickReplies.length === 0) {
        setQuickReplies(saran);
      }

      const botMessage = { 
        role: 'bot', 
        text: botText,
        action,
        intent,
        fallback,
        quickReplies: newQuickReplies
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Auto-hide quick replies after they're used
      if (quickReplyText) {
        setTimeout(() => setQuickReplies([]), 100);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMsg = error.response?.data?.jawaban || 
                     error.response?.data?.pesan ||
                     error.response?.data?.error?.message ||
                     error.response?.data?.message ||
                     'Maaf, sistem AI kami sedang gangguan. Silakan coba lagi nanti.';
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (replyText) => {
    setQuickReplies([]);
    setInput(replyText);
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend(null, replyText);
    }, 100);
  };

  return (
    <>
      {/* Floating Button - Offset on mobile to avoid colliding with Bottom Navigation */}
      {!hideFloatingButton && (
        <button 
          onClick={handleToggle}
          className={cn(
            "fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-40 cursor-pointer",
            isOpen ? "bg-slate-800 hover:bg-slate-900 scale-90" : "bg-primary-600 hover:bg-primary-700 hover:scale-105 shadow-blue-500/25"
          )}
          aria-label={isOpen ? "Tutup chat asisten" : "Buka chat asisten"}
        >
          {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-sm h-[32rem] max-h-[calc(100dvh-7rem)] bg-white rounded-3xl shadow-2xl border border-sky-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-600 text-white p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Asisten Nara AC</h3>
                <p className="text-xs text-sky-100 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online & Siap Membantu
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors p-1.5 cursor-pointer"
              aria-label="Tutup chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Chat Area dengan aria-live untuk aksesibilitas */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                    <Bot className="w-4 h-4 text-blue-700" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%] p-3.5 text-sm shadow-sm",
                  m.role === 'user' 
                    ? "bg-blue-600 text-white rounded-2xl rounded-br-sm break-words whitespace-pre-wrap" 
                    : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-sm leading-relaxed break-words whitespace-pre-line"
                )}>
                  <div>{formatBotText(m.text)}</div>
                  
                  {m.action && (
                    <Link 
                      to={m.action.link} 
                      onClick={handleClose}
                      className="inline-block mt-3 text-center bg-blue-50 text-blue-700 font-bold py-2 px-4 rounded-xl hover:bg-blue-100 transition-colors w-full border border-blue-100 shadow-sm"
                    >
                      {m.action.text}
                    </Link>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <Bot className="w-4 h-4 text-primary-700" />
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            
            {/* Quick Replies */}
            {(quickReplies.length > 0 || (messages.length > 0 && messages[messages.length - 1]?.quickReplies?.length > 0)) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {(quickReplies.length > 0 ? quickReplies : messages.length > 0 ? messages[messages.length - 1]?.quickReplies || [] : []).map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply)}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors shadow-sm border border-primary-100"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya tentang service AC..."
                aria-label="Ketik pesan untuk asisten"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Kirim pesan"
                className="absolute right-1.5 w-9 h-9 bg-primary-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 hover:bg-primary-700 transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
