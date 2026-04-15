import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, Sparkles,
  ShieldCheck, PieChart, Target, Bell, ArrowRight,
  CheckCircle, Star, Zap, MessageCircle, Send
} from 'lucide-react';
import './Landing.css';

/* ── Mini dashboard preview ── */
const TXN_ROWS = [
  { icon: '🛒', name: 'Mercado Extra',  cat: 'Alimentação',  val: '-R$ 267,00', color: '#f87171' },
  { icon: '💰', name: 'Salário Mensal', cat: 'Receita',      val: '+R$ 8.450',  color: '#10b981' },
  { icon: '⛽', name: 'Posto Shell',    cat: 'Transporte',   val: '-R$ 180,00', color: '#fbbf24' },
  { icon: '📺', name: 'Netflix',        cat: 'Assinaturas',  val: '-R$ 55,90',  color: '#f87171' },
];

const FEATURES = [
  { icon: <PieChart size={22} />, color: '#6366f1', title: 'Dashboard Completo',
    desc: 'Saldo, receitas e gastos num painel limpo. Veja tudo em tempo real sem precisar abrir vários apps de banco.' },
  { icon: <Sparkles size={22} />, color: '#a78bfa', title: 'IA que Trabalha Por Você',
    desc: 'Nossa IA analisa seus padrões, categoriza transações automaticamente e diz onde você pode economizar.' },
  { icon: <Target size={22} />, color: '#10b981', title: 'Metas Inteligentes',
    desc: 'Defina objetivos de economia e acompanhe o progresso. A IA ajusta as metas conforme seu perfil.' },
  { icon: <TrendingUp size={22} />, color: '#f59e0b', title: 'Relatórios Detalhados',
    desc: 'Gráficos por categoria, período e tipo de gasto. Entenda seus padrões e tome decisões com dados reais.' },
  { icon: <Bell size={22} />, color: '#f87171', title: 'Alertas Proativos',
    desc: 'Avisos antes de estourar o orçamento, quando uma assinatura renovar, e tudo que impacta suas finanças.' },
  { icon: <ShieldCheck size={22} />, color: '#38bdf8', title: 'Segurança Total',
    desc: 'Dados protegidos com criptografia de ponta a ponta. Nunca acessamos suas senhas ou movemos dinheiro.' },
];

const TESTIMONIALS = [
  { name: 'Marina R.', role: 'Designer', avatar: 'MR', color: '#6366f1',
    text: 'Em 2 semanas usando o Fync economizei R$ 800 que eu nem sabia que estava gastando à toa.' },
  { name: 'Lucas C.', role: 'Desenvolvedor', avatar: 'LC', color: '#10b981',
    text: 'Finalmente entendo para onde vai meu dinheiro. A IA de categorização é incrível, zero esforço.' },
  { name: 'Ana B.', role: 'Professora', avatar: 'AB', color: '#f59e0b',
    text: 'Organize minhas finanças de verdade pela primeira vez. As metas me mantêm motivada todo mês.' },
];

/* Finn AI chat demo */
const FINN_CHAT = [
  { from: 'user', text: 'Onde estou gastando mais este mês?' },
  { from: 'finn', text: '📊 Analisei seus gastos de Abril! Seus maiores gastos foram:', delay: 600 },
  { from: 'finn', type: 'breakdown', delay: 1200,
    items: [
      { cat: 'Alimentação', pct: 32, color: '#818cf8', val: 'R$ 1.001' },
      { cat: 'Moradia',     pct: 28, color: '#10b981', val: 'R$ 877'   },
      { cat: 'Transporte',  pct: 18, color: '#f59e0b', val: 'R$ 564'   },
    ]
  },
  { from: 'finn', text: '💡 Você pode economizar ~R$ 320 cortando assinaturas duplicadas. Quer ver?', delay: 2000 },
];

const SPARKS = [40,65,45,80,58,90,70,55,85,72,95,68];

export default function Landing() {
  const [scrolled, setScrolled]           = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [chatStep, setChatStep]           = useState(0);
  const observerRef                       = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(s => new Set([...s, e.target.dataset.reveal]));
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  /* Auto-advance Finn chat */
  useEffect(() => {
    if (chatStep >= FINN_CHAT.length) return;
    const delay = FINN_CHAT[chatStep]?.delay ?? 800;
    const t = setTimeout(() => setChatStep(s => s + 1), delay);
    return () => clearTimeout(t);
  }, [chatStep]);

  const isVisible = (id) => visibleSections.has(id);

  return (
    <div className="lp-root">

      {/* ── NAVBAR ── */}
      <header className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/" className="lp-logo">
            <div className="lp-logo-icon"><Wallet size={20} /></div>
            <span>Fync</span>
          </Link>
          <nav className="lp-nav-links">
            <a href="#features">Recursos</a>
            <a href="#finn">Conheça o Finn</a>
            <a href="#how">Como funciona</a>
            <a href="#testimonials">Depoimentos</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-ghost">Entrar</Link>
            <Link to="/register" className="lp-btn-primary">Começar grátis</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-hero-grid" />

        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <Zap size={12} />
            <span>Gestão financeira com Inteligência Artificial</span>
          </div>

          <h1 className="lp-hero-title">
            Você não precisa<br />
            gerenciar seu dinheiro<br />
            <span className="lp-gradient-text">sozinho.</span>
          </h1>

          <p className="lp-hero-sub">
            Fync reúne todas as suas contas, categoriza seus gastos automaticamente 
            e deixa o <strong style={{color:'#a5b4fc'}}>Finn</strong> — nossa IA — trabalhar por você enquanto você vive sua vida.
          </p>

          <div className="lp-hero-ctas">
            <Link to="/register" className="lp-btn-hero-primary">
              Começar agora — É grátis <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="lp-btn-hero-secondary">Já tenho conta</Link>
          </div>

          <div className="lp-hero-proof">
            <div className="lp-proof-avatars">
              {['MR','LC','AB','SP','TK'].map((init, i) => (
                <div key={i} className={`lp-proof-av lp-av-${i}`}>{init}</div>
              ))}
            </div>
            <div className="lp-proof-text" style={{marginLeft:10}}>
              <div className="lp-proof-stars">{[...Array(5)].map((_,i)=><Star key={i} size={13} fill="#f59e0b" color="#f59e0b"/>)}</div>
              <span><strong>1.200+</strong> pessoas controlando as finanças agora</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview window */}
        <div className="lp-preview-wrap">
          <div className="lp-float-card lp-float-left">
            <div className="lp-float-icon" style={{background:'rgba(16,185,129,0.15)'}}><TrendingUp size={16} color="#10b981"/></div>
            <div>
              <div className="lp-float-label">Receitas do mês</div>
              <div className="lp-float-val">R$ 8.450,00</div>
            </div>
            <span className="lp-float-badge lp-positive">+12%</span>
          </div>

          <div className="lp-float-card lp-float-right">
            <div className="lp-float-icon" style={{background:'rgba(99,102,241,0.15)'}}><Sparkles size={16} color="#818cf8"/></div>
            <div>
              <div className="lp-float-label">Finn detectou</div>
              <div className="lp-float-val" style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.7)'}}>Economize R$ 420 em assinaturas</div>
            </div>
          </div>

          <div className="lp-window">
            <div className="lp-window-bar">
              <span/><span/><span/>
              <div className="lp-window-title">Fync Dashboard</div>
            </div>
            <div className="lp-window-body">
              <div className="lp-db-balance">
                <div>
                  <div className="lp-db-bal-label">Saldo Total</div>
                  <div className="lp-db-bal-val">R$ 12.847,00</div>
                  <div className="lp-db-bal-change">▲ +8,2% este mês</div>
                </div>
                <div className="lp-sparkline">
                  {SPARKS.map((h,i)=>(
                    <div key={i} className="lp-spark-bar" style={{height:h+'%',animationDelay:i*0.05+'s'}}/>
                  ))}
                </div>
              </div>

              <div className="lp-db-stats">
                <div className="lp-db-stat"><TrendingUp size={13} color="#10b981"/><span>Receitas</span><strong>R$ 8.450</strong></div>
                <div className="lp-db-stat"><TrendingDown size={13} color="#f87171"/><span>Gastos</span><strong>R$ 3.129</strong></div>
                <div className="lp-db-stat"><Target size={13} color="#818cf8"/><span>Meta</span><strong>84%</strong></div>
              </div>

              <div className="lp-db-txn-title">Transações recentes</div>
              <div className="lp-db-txns">
                {TXN_ROWS.map((t,i)=>(
                  <div key={i} className="lp-db-txn" style={{animationDelay:i*0.1+'s'}}>
                    <div className="lp-txn-icon">{t.icon}</div>
                    <div className="lp-txn-info">
                      <div className="lp-txn-name">{t.name}</div>
                      <div className="lp-txn-cat">{t.cat}</div>
                    </div>
                    <div className="lp-txn-val" style={{color:t.color}}>{t.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINN AI IDENTITY SECTION ── */}
      <section id="finn" className="lp-finn-section" data-reveal="finn">
        <div className={`lp-finn-inner lp-section-inner ${isVisible('finn') ? 'lp-reveal' : ''}`}>

          {/* Left: Finn character + info */}
          <div className="lp-finn-left">
            <div className="lp-section-badge">✦ Conheça o Finn</div>
            <h2 className="lp-section-title">
              Sua IA financeira<br />
              <span className="lp-gradient-text">pessoal e inteligente.</span>
            </h2>
            <p className="lp-section-sub">
              O Finn é a inteligência artificial do Fync. Ele aprende com seus hábitos, 
              detecta padrões antes de você e proativamente sugere como economizar mais 
              e atingir seus objetivos mais rápido.
            </p>

            <div className="lp-finn-perks">
              {[
                { icon: '🧠', text: 'Aprende com seus hábitos financeiros únicos' },
                { icon: '🔍', text: 'Detecta gastos fora do padrão automaticamente' },
                { icon: '💬', text: 'Responde perguntas sobre seus dados em linguagem natural' },
                { icon: '🎯', text: 'Sugere metas realistas baseadas na sua renda' },
              ].map((p, i) => (
                <div key={i} className="lp-finn-perk">
                  <span className="lp-finn-perk-icon">{p.icon}</span>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>

            {/* Finn mascot badge */}
            <div className="lp-finn-badge">
              <img src="/finn-icon.png" alt="Finn AI" className="lp-finn-badge-img" />
              <div>
                <div className="lp-finn-badge-name">Finn</div>
                <div className="lp-finn-badge-role">IA Assistente Financeiro · Fync</div>
              </div>
              <div className="lp-finn-badge-dot" />
            </div>
          </div>

          {/* Right: Finn character illustration + animated chat */}
          <div className="lp-finn-right">
            {/* Mascot hero image */}
            <div className="lp-finn-mascot-wrap">
              <div className="lp-finn-mascot-glow" />
              <img src="/finn-full.png" alt="Finn mascot" className="lp-finn-mascot" />
            </div>

            {/* Animated chat */}
            <div className="lp-finn-chat">
              <div className="lp-finn-chat-header">
                <img src="/finn-icon.png" alt="Finn" className="lp-finn-chat-av" />
                <div>
                  <div className="lp-finn-chat-name">Finn <span className="lp-finn-online">● Ativo agora</span></div>
                  <div className="lp-finn-chat-sub">Assistente IA · Fync</div>
                </div>
              </div>

              <div className="lp-finn-chat-messages">
                {FINN_CHAT.slice(0, chatStep).map((msg, i) => (
                  <div key={i} className={`lp-chat-msg ${msg.from === 'user' ? 'lp-chat-user' : 'lp-chat-finn'}`}>
                    {msg.from === 'finn' && (
                      <img src="/finn-icon.png" alt="" className="lp-chat-finn-av" />
                    )}
                    <div className="lp-chat-bubble">
                      {msg.text && <span>{msg.text}</span>}
                      {msg.type === 'breakdown' && (
                        <div className="lp-chat-breakdown">
                          {msg.items.map((item, j) => (
                            <div key={j} className="lp-breakdown-item">
                              <div className="lp-breakdown-name">{item.cat}</div>
                              <div className="lp-breakdown-bar">
                                <div className="lp-breakdown-fill" style={{width:item.pct+'%', background:item.color}} />
                              </div>
                              <div className="lp-breakdown-val" style={{color:item.color}}>{item.val}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatStep < FINN_CHAT.length && chatStep > 0 && FINN_CHAT[chatStep-1]?.from !== 'finn' && (
                  <div className="lp-chat-typing">
                    <img src="/finn-icon.png" alt="" className="lp-chat-finn-av" />
                    <div className="lp-typing-dots"><span/><span/><span/></div>
                  </div>
                )}
              </div>

              <div className="lp-finn-chat-input">
                <MessageCircle size={14} color="rgba(255,255,255,0.3)" />
                <span>Pergunte algo para o Finn...</span>
                <Send size={14} color="#6366f1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD IMAGE SHOWCASE ── */}
      <section className="lp-showcase-section" data-reveal="showcase">
        <div className={`lp-section-inner lp-showcase-inner ${isVisible('showcase') ? 'lp-reveal' : ''}`}>
          <div className="lp-section-badge">Produto</div>
          <h2 className="lp-section-title">Tudo que você precisa, num painel só.</h2>
          <p className="lp-section-sub">
            Visualize suas finanças completas com gráficos, metas, relatórios e insights em tempo real.
          </p>
          <div className="lp-showcase-img-wrap">
            <div className="lp-showcase-glow" />
            <img src="/dashboard-hero.png" alt="Fync Dashboard" className="lp-showcase-img" />
            {/* Overlay badges */}
            <div className="lp-showcase-badge lp-sc-badge-1">
              <span>📊</span> <span>Relatórios automáticos</span>
            </div>
            <div className="lp-showcase-badge lp-sc-badge-2">
              <span>🤖</span> <span>IA categoriza tudo</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-features" data-reveal="features">
        <div className={`lp-section-inner ${isVisible('features') ? 'lp-reveal' : ''}`}>
          <div className="lp-section-badge">Recursos</div>
          <h2 className="lp-section-title">Muito além de uma planilha</h2>
          <p className="lp-section-sub">
            O Fync usa inteligência artificial para automatizar o trabalho chato de organizar finanças.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map((f,i)=>(
              <div key={i} className="lp-feature-card" style={{animationDelay:i*0.08+'s'}}>
                <div className="lp-feature-icon" style={{background:`${f.color}18`,color:f.color}}>{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-how" data-reveal="how">
        <div className={`lp-section-inner ${isVisible('how') ? 'lp-reveal' : ''}`}>
          <div className="lp-section-badge">Como funciona</div>
          <h2 className="lp-section-title">Comece em 3 passos simples</h2>
          <div className="lp-steps">
            {[
              { num:'01', title:'Crie sua conta grátis', desc:'Cadastro em menos de 1 minuto com e-mail ou Google. Sem cartão de crédito.' },
              { num:'02', title:'Registre seus dados', desc:'Adicione transações manualmente ou importe via OFX. O Finn categoriza tudo automaticamente.' },
              { num:'03', title:'Veja a mágica acontecer', desc:'O Finn analisa padrões, gera insights e sugere onde economizar — proativamente.' },
            ].map((step,i)=>(
              <div key={i} className="lp-step" style={{animationDelay:i*0.15+'s'}}>
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-connector" />
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="lp-testimonials" data-reveal="testimonials">
        <div className={`lp-section-inner ${isVisible('testimonials') ? 'lp-reveal' : ''}`}>
          <div className="lp-section-badge">Depoimentos</div>
          <h2 className="lp-section-title">Quem usa, não volta atrás</h2>
          <div className="lp-testi-grid">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="lp-testi-card" style={{animationDelay:i*0.1+'s'}}>
                <div className="lp-testi-stars">{[...Array(5)].map((_,j)=><Star key={j} size={14} fill="#f59e0b" color="#f59e0b"/>)}</div>
                <p className="lp-testi-text">"{t.text}"</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-av" style={{background:`linear-gradient(135deg,${t.color},${t.color}aa)`}}>{t.avatar}</div>
                  <div>
                    <div className="lp-testi-name">{t.name}</div>
                    <div className="lp-testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-banner" data-reveal="cta">
        <div className={`lp-cta-inner lp-section-inner ${isVisible('cta') ? 'lp-reveal' : ''}`}>
          <div className="lp-cta-orb" />
          {/* Finn in the CTA */}
          <img src="/finn-icon.png" alt="Finn" className="lp-cta-finn" />
          <div className="lp-section-badge">Comece hoje</div>
          <h2 className="lp-cta-title">Suas finanças merecem<br/>mais do que uma planilha.</h2>
          <p className="lp-cta-sub">O Finn está pronto para te ajudar. Grátis, sem cartão de crédito.</p>
          <Link to="/register" className="lp-btn-hero-primary lp-btn-cta">
            Criar conta gratuita <ArrowRight size={18} />
          </Link>
          <div className="lp-cta-checks">
            {['100% grátis','Sem cartão de crédito','Cancele quando quiser'].map((item,i)=>(
              <div key={i} className="lp-cta-check">
                <CheckCircle size={14} color="#10b981"/>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon"><Wallet size={18}/></div>
            <span>Fync</span>
          </div>
          <p className="lp-footer-copy">© 2026 Fync. Feito com 💜 pelo Finn e sua equipe.</p>
          <div className="lp-footer-links">
            <a href="#">Termos de Uso</a>
            <a href="#">Privacidade</a>
            <a href="#">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
