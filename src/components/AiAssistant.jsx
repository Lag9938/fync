import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, RefreshCw, Trash2 } from 'lucide-react';
import { askGemini } from '../utils/gemini';

const QUICK_QUESTIONS = [
  { emoji: '💸', text: 'Onde estou gastando mais?' },
  { emoji: '📊', text: 'Como está minha saúde financeira?' },
  { emoji: '🎯', text: 'Vou conseguir atingir minha meta?' },
  { emoji: '💡', text: 'Me dê dicas de economia' },
  { emoji: '📅', text: 'Minhas assinaturas estão pesadas?' },
  { emoji: '🏦', text: 'Como devo organizar meu dinheiro?' },
];

export default function AiAssistant({ financialContext }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: `Olá! 👋 Sou o **Fync AI**, seu assistente financeiro pessoal.\n\nTenho acesso aos seus dados financeiros e posso te ajudar a entender melhor seus gastos, metas e como otimizar suas finanças. O que você gostaria de saber?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getHistory = () =>
    messages
      .filter(m => m.id !== 1)
      .map(m => ({ role: m.role, text: m.text }));

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = getHistory();
      const response = await askGemini(text.trim(), financialContext, history);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: response,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: `❌ Erro ao conectar com a IA: ${err.message}. Verifique sua conexão e tente novamente.`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      role: 'assistant',
      text: `Conversa reiniciada! 🔄 Como posso te ajudar com suas finanças?`,
      timestamp: new Date()
    }]);
  };

  const formatText = (text) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>
              <Sparkles size={22} color="white" />
            </div>
            Fync AI
          </h1>
          <p className="dashboard-subtitle">Assistente financeiro com inteligência artificial personalizado para você</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={clearChat}
          style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
          title="Limpar conversa"
        >
          <Trash2 size={16} /> Limpar Chat
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', gap: '1.5rem', minHeight: 0 }}>
        {/* Messages */}
        <div className="glass-panel" style={{
          flex: 1,
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Messages List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: msg.role === 'user'
                    ? '0 0 12px rgba(16,185,129,0.3)'
                    : '0 0 12px rgba(99,102,241,0.3)'
                }}>
                  {msg.role === 'user'
                    ? <User size={18} color="white" />
                    : <Sparkles size={18} color="white" />
                  }
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    padding: '0.875rem 1.125rem',
                    borderRadius: msg.role === 'user' ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))'
                      : msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.08)',
                    border: msg.role === 'user'
                      ? '1px solid rgba(16,185,129,0.2)'
                      : msg.isError ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(99,102,241,0.15)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                  }}
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingInline: '0.25rem' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={18} color="white" />
                </div>
                <div style={{
                  padding: '0.875rem 1.25rem',
                  borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex', gap: '5px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--primary-color)',
                      animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(15,17,21,0.5)'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte sobre suas finanças..."
                className="input-field"
                style={{ flex: 1, borderRadius: 'var(--radius-full)', paddingBlock: '0.75rem' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none',
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, var(--primary-color), #818cf8)'
                    : 'rgba(99,102,241,0.2)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  boxShadow: input.trim() && !isLoading ? '0 4px 14px rgba(99,102,241,0.4)' : 'none'
                }}
              >
                {isLoading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>

        {/* Quick Questions Sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Perguntas Rápidas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q.text)}
                  disabled={isLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.12)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                >
                  <span style={{ fontSize: '1rem' }}>{q.emoji}</span>
                  <span>{q.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div className="glass-panel" style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Sparkles size={16} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)' }}>Fync AI</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Powered by Google Gemini 2.0 Flash. Eu analiso seus dados financeiros reais para dar conselhos personalizados.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
