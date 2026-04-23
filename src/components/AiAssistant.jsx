import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { askGemini } from '../utils/gemini';

const QUICK_QUESTIONS = [
  { emoji: '💸', text: 'Onde estou gastando mais este mês?' },
  { emoji: '📊', text: 'Como está minha saúde financeira?' },
  { emoji: '🎯', text: 'Vou conseguir atingir minha meta?' },
  { emoji: '💡', text: 'Me dê dicas para economizar' },
];

export default function AiAssistant({ financialContext, compactMode = false, onExecuteCommand }) {
  const STORAGE_KEY = 'fync_finn_chat_history';

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar histórico do Finn:', e);
      }
    }
    return [
      {
        id: 1,
        role: 'assistant',
        text: `Olá! 👋 Sou o **Finn**, seu assistente de IA do Fync.\n\nAnaliso todas as suas contas, categorizo seus gastos e descubro onde você pode economizar. Como posso te ajudar hoje?`,
        timestamp: new Date()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Salvar no localStorage sempre que as mensagens mudarem
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const getHistory = () =>
    messages
      .filter(m => m.id !== 1)
      .map(m => ({ role: m.role, text: m.text }));

  const detectCommand = (text) => {
    const t = text.toLowerCase();
    
    // Command patterns
    const patterns = [
      {
        type: 'categorize',
        regex: /(?:categorize|coloque|ajuste|mude)\s+(?:todas\s+as\s+)?transações\s+(?:com\s+o\s+nome\s+)?["']?(.*?)["']?\s+(?:como|na\s+categoria)\s+["']?(.*?)["']?/i
      },
      {
        type: 'categorize_simple',
        regex: /(?:categorize|coloque)\s+["']?(.*?)["']?\s+em\s+["']?(.*?)["']?/i
      },
      {
        type: 'delete',
        regex: /(?:apague|delete|exclua|remova)\s+(?:todas\s+as\s+)?transações\s+(?:com\s+o\s+nome\s+)?["']?(.*?)["']?/i
      },
      {
        type: 'hide',
        regex: /(?:oculte|esconda)\s+(?:todas\s+as\s+)?transações\s+(?:com\s+o\s+nome\s+)?["']?(.*?)["']?/i
      }
    ];

    for (const p of patterns) {
      const match = t.match(p.regex);
      if (match) {
        if (p.type === 'categorize' || p.type === 'categorize_simple') {
          return { type: 'categorize', filter: match[1].trim(), value: match[2].trim() };
        }
        if (p.type === 'delete') {
          return { type: 'delete', filter: match[1].trim() };
        }
        if (p.type === 'hide') {
          return { type: 'hide', filter: match[1].trim() };
        }
      }
    }
    return null;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Check for command
    const command = detectCommand(text);
    if (command) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: `Entendido! Você quer executar uma ação em lote.`,
        command,
        timestamp: new Date()
      }]);
      return;
    }

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
    if (window.confirm('Tem certeza que deseja limpar todo o histórico da conversa?')) {
      const initialMsg = [
        {
          id: 1,
          role: 'assistant',
          text: `Olá! 👋 Sou o **Finn**, seu assistente de IA do Fync.\n\nAnaliso todas as suas contas, categorizo seus gastos e descubro onde você pode economizar. Como posso te ajudar hoje?`,
          timestamp: new Date()
        }
      ];
      setMessages(initialMsg);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const formatText = (text) => {
    // Simple markdown-like formatting for bold/italic and lists
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: compactMode ? '0.5rem' : '1.25rem' }}>
      {/* Header and Quick Actions Row */}
      {!compactMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
           <button
            className="btn btn-secondary"
            onClick={clearChat}
            style={{ gap: '0.5rem', display: 'flex', alignItems: 'center', fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
            title="Limpar conversa"
          >
            <Trash2 size={14} /> Limpar histórico
          </button>
        </div>
      )}

      <div className="ai-layout-container" style={{ gap: compactMode ? '0' : '1.5rem' }}>
        {/* Main Chat Area */}
        <div style={{
          flex: 1,
          background: 'rgba(10, 10, 18, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
          
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <img 
              src="/finn-icon.png" 
              alt="Finn Avatar" 
              style={{
                width: 44, height: 44, 
                borderRadius: '12px',
                objectFit: 'cover',
                boxShadow: '0 0 16px rgba(99,102,241,0.3)'
              }} 
            />
            <div>
              <div style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: '1.05rem', 
                fontWeight: 700, 
                color: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                Finn 
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                  Ativo agora
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                Assistente IA · Fync
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {messages.map((msg, idx) => {
               const isContinuous = idx > 0 && messages[idx-1].role === msg.role;
               return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    width: '100%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    animation: 'fadeIn 0.3s ease-out',
                    marginTop: isContinuous ? '-0.75rem' : '0'
                  }}
                >
                  {/* Finn mini avatar */}
                  {msg.role === 'assistant' && (
                    <img 
                      src="/finn-icon.png" 
                      alt="" 
                      style={{
                        width: 28, height: 28, 
                        borderRadius: '8px', 
                        objectFit: 'cover',
                        flexShrink: 0,
                        opacity: isContinuous && idx !== messages.length - 1 && (messages[idx+1]?.role === 'assistant') ? 0 : 1
                      }} 
                    />
                  )}

                  {/* Bubble */}
                    <div style={{ 
                      maxWidth: '85%', 
                      minWidth: 0,
                      width: 'fit-content',
                      padding: '0.75rem 1rem',
                      borderRadius: msg.role === 'user' 
                        ? '16px 16px 4px 16px' 
                        : '16px 16px 16px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #6366f1, #818cf8)' // User bubble matches mockup
                        : msg.isError 
                          ? 'rgba(239,68,68,0.1)' 
                          : 'rgba(255,255,255,0.06)', // Finn bubble matches mockup
                      border: msg.role === 'user'
                        ? 'none'
                        : msg.isError 
                          ? '1px solid rgba(239,68,68,0.2)' 
                          : '1px solid rgba(255,255,255,0.08)',
                      color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.85)',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                      
                      {msg.command && (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '1rem', 
                          background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#fff' }}>
                            {msg.command.type === 'categorize' && `Confirmar categorização de "${msg.command.filter}" como "${msg.command.value}"?`}
                            {msg.command.type === 'delete' && `Confirmar exclusão de todas as transações com "${msg.command.filter}"?`}
                            {msg.command.type === 'hide' && `Confirmar ocultação de todas as transações com "${msg.command.filter}"?`}
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                              onClick={() => {
                                onExecuteCommand?.(msg.command);
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                                setMessages(prev => [...prev, {
                                  id: Date.now(),
                                  role: 'assistant',
                                  text: `Comando executado com sucesso! ✅`,
                                  timestamp: new Date()
                                }]);
                              }}
                            >
                              Confirmar
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                              onClick={() => {
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                                setMessages(prev => [...prev, {
                                  id: Date.now(),
                                  role: 'assistant',
                                  text: `Operação cancelada. Como posso ajudar agora?`,
                                  timestamp: new Date()
                                }]);
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
             })}

            {/* Typing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', animation: 'fadeIn 0.3s ease-out' }}>
                <img 
                  src="/finn-icon.png" 
                  alt="" 
                  style={{ width: 28, height: 28, borderRadius: '8px', objectFit: 'cover' }} 
                />
                <div style={{
                  padding: '1rem',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', gap: '5px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.4)',
                      animation: `typing-dot 1s ease-in-out ${i * 0.15}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              alignItems: 'center',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '0.35rem 0.35rem 0.35rem 1rem',
              borderRadius: '999px',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte algo para o Finn..."
                style={{ 
                  flex: 1, 
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '0.9rem',
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none',
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                    : 'rgba(255,255,255,0.05)',
                  color: input.trim() && !isLoading ? 'white' : 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {isLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} style={{ marginLeft: '-2px' }} />}
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar - Quick Actions */}
        {!compactMode && (
          <div className="ai-suggestions-sidebar">
            
            <div style={{ 
              background: 'rgba(10,10,18,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1.25rem', 
              borderRadius: '16px' 
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0' }}>
                Sugestões do Finn
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.text)}
                    disabled={isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.82rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  >
                    <span style={{ fontSize: '1rem' }}>{q.emoji}</span>
                    <span style={{ flex: 1 }}>{q.text}</span>
                    <ArrowRight size={14} style={{ opacity: 0.5 }} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <img src="/finn-icon.png" alt="" style={{ width: 20, height: 20, borderRadius: '4px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc' }}>Inteligência Ativa</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
                Eu analiso seus dados financeiros usando IA avançada para entregar respostas personalizadas e privadas.
              </p>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
