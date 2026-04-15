import React, { useState, useEffect, useRef } from 'react';
import { Wallet } from 'lucide-react';
import './AuthShowcase.css';

/* ── Feature slides data ──────────────────────────── */
const SLIDES = [
  {
    id: 'dashboard',
    tab: '📊 Dashboard',
    title: 'Visão completa das suas finanças',
    subtitle: 'Saldo, receitas e gastos em tempo real num painel limpo e intuitivo.',
    ui: <DashboardUI />,
  },
  {
    id: 'transactions',
    tab: '💳 Transações',
    title: 'Cada centavo no lugar certo',
    subtitle: 'Todas as suas movimentações organizadas automaticamente por categoria.',
    ui: <TransactionsUI />,
  },
  {
    id: 'ai',
    tab: '🤖 IA',
    title: 'Inteligência artificial trabalhando por você',
    subtitle: 'A IA analisa seus padrões e sugere como economizar mais todo mês.',
    ui: <AiUI />,
  },
  {
    id: 'goals',
    tab: '🎯 Metas',
    title: 'Conquiste seus objetivos financeiros',
    subtitle: 'Defina metas de economia e acompanhe seu progresso em tempo real.',
    ui: <GoalsUI />,
  },
  {
    id: 'reports',
    tab: '📈 Relatórios',
    title: 'Relatórios que revelam seus padrões',
    subtitle: 'Gráficos detalhados por categoria, período e tipo de gasto.',
    ui: <ReportsUI />,
  },
];

const INTERVAL = 4000;

export default function AuthShowcase() {
  const [active, setActive]     = useState(0);
  const [exiting, setExiting]   = useState(false);
  const timerRef                = useRef(null);

  const goTo = (idx) => {
    if (idx === active) return;
    setExiting(true);
    setTimeout(() => {
      setActive(idx);
      setExiting(false);
    }, 320);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setExiting(true);
      setTimeout(() => {
        setActive(prev => (prev + 1) % SLIDES.length);
        setExiting(false);
      }, 320);
    }, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [active]);

  const slide = SLIDES[active];

  return (
    <div className="showcase-root">
      {/* Orbs */}
      <div className="sc-orb sc-orb-1" />
      <div className="sc-orb sc-orb-2" />
      <div className="sc-orb sc-orb-3" />
      <div className="sc-dots" />

      {/* Brand */}
      <div className="sc-brand">
        <div className="sc-brand-icon"><Wallet size={20} /></div>
        <span className="sc-brand-name">Fync</span>
      </div>

      {/* Tabs */}
      <div className="sc-tabs">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`sc-tab ${i === active ? 'sc-tab-active' : ''}`}
            onClick={() => goTo(i)}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Slide content */}
      <div className={`sc-slide ${exiting ? 'sc-slide-exit' : 'sc-slide-enter'}`}>
        <div className="sc-text">
          <h2 className="sc-title">{slide.title}</h2>
          <p className="sc-subtitle">{slide.subtitle}</p>
        </div>

        <div className="sc-ui-window">
          <div className="sc-window-bar">
            <span /><span /><span />
          </div>
          <div className="sc-window-body">
            {slide.ui}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="sc-progress">
        {SLIDES.map((_, i) => (
          <button key={i} className={`sc-dot ${i === active ? 'sc-dot-active' : ''}`} onClick={() => goTo(i)} />
        ))}
      </div>

      {/* Social proof */}
      <div className="sc-social">
        <div className="sc-avatars">
          {['MR','LC','AB','SP'].map((init, i) => (
            <div key={i} className={`sc-avatar sc-av-${i}`}>{init}</div>
          ))}
        </div>
        <span className="sc-social-text">
          <strong>1.200+</strong> pessoas já usam o Fync
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   SLIDE UI MOCKUPS
══════════════════════════════════════ */

function DashboardUI() {
  return (
    <div className="ui-dashboard">
      {/* Balance */}
      <div className="ui-balance-card">
        <div className="ui-balance-label">Saldo atual</div>
        <div className="ui-balance-value">R$ 12.847,00</div>
        <div className="ui-balance-change ui-positive">▲ +8,2% este mês</div>
      </div>
      {/* Mini cards */}
      <div className="ui-mini-cards">
        <div className="ui-mini-card ui-income">
          <div className="ui-mini-label">Receitas</div>
          <div className="ui-mini-value">R$ 8.450</div>
          <div className="ui-mini-bar" style={{ '--w': '78%', '--c': '#10b981' }} />
        </div>
        <div className="ui-mini-card ui-expense">
          <div className="ui-mini-label">Gastos</div>
          <div className="ui-mini-value">R$ 3.129</div>
          <div className="ui-mini-bar" style={{ '--w': '38%', '--c': '#f87171' }} />
        </div>
        <div className="ui-mini-card ui-savings">
          <div className="ui-mini-label">Economias</div>
          <div className="ui-mini-value">R$ 1.268</div>
          <div className="ui-mini-bar" style={{ '--w': '55%', '--c': '#818cf8' }} />
        </div>
      </div>
      {/* Chart bars */}
      <div className="ui-chart">
        {[40,65,45,80,60,90,72,55,85,70,95,68].map((h, i) => (
          <div key={i} className="ui-chart-bar" style={{ '--h': h+'%', animationDelay: i * 0.05 + 's' }} />
        ))}
      </div>
    </div>
  );
}

function TransactionsUI() {
  const txns = [
    { icon: '🛒', name: 'Mercado Extra', cat: 'Alimentação', val: '-R$ 267,00', color: '#f87171' },
    { icon: '⛽', name: 'Posto Shell',   cat: 'Transporte',  val: '-R$ 180,00', color: '#fbbf24' },
    { icon: '💰', name: 'Salário',       cat: 'Receita',     val: '+R$ 8.450',  color: '#10b981' },
    { icon: '📺', name: 'Netflix',       cat: 'Lazer',       val: '-R$ 55,90',  color: '#f87171' },
    { icon: '🏠', name: 'Aluguel',       cat: 'Moradia',     val: '-R$ 1.800',  color: '#f87171' },
  ];
  return (
    <div className="ui-transactions">
      <div className="ui-txn-header">
        <span>Recentes</span>
        <span className="ui-txn-filter">◀ Abril 2025 ▶</span>
      </div>
      {txns.map((t, i) => (
        <div key={i} className="ui-txn-row" style={{ animationDelay: i * 0.08 + 's' }}>
          <div className="ui-txn-icon">{t.icon}</div>
          <div className="ui-txn-info">
            <div className="ui-txn-name">{t.name}</div>
            <div className="ui-txn-cat">{t.cat}</div>
          </div>
          <div className="ui-txn-val" style={{ color: t.color }}>{t.val}</div>
        </div>
      ))}
    </div>
  );
}

function AiUI() {
  const insights = [
    { icon: '💡', text: 'Você gasta 23% a mais em restaurantes do que o ideal para sua renda.', type: 'warning' },
    { icon: '✅', text: 'Parabéns! Seus gastos com assinaturas caíram R$ 120 vs. mês passado.', type: 'success' },
    { icon: '🎯', text: 'Se poupar R$ 500/mês, você atinge sua meta de viagem em 8 meses.', type: 'info' },
  ];
  return (
    <div className="ui-ai">
      <div className="ui-ai-header">
        <div className="ui-ai-avatar">✦</div>
        <div>
          <div className="ui-ai-title">Assistente Fync</div>
          <div className="ui-ai-sub">Analisando seus dados...</div>
        </div>
        <div className="ui-ai-pulse" />
      </div>
      <div className="ui-ai-insights">
        {insights.map((ins, i) => (
          <div key={i} className={`ui-ai-insight ui-ai-${ins.type}`} style={{ animationDelay: i * 0.12 + 's' }}>
            <span className="ui-ai-ins-icon">{ins.icon}</span>
            <span className="ui-ai-ins-text">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalsUI() {
  const goals = [
    { name: 'Viagem Europa 🌍', current: 4200, target: 8000, color: '#818cf8' },
    { name: 'Reserva de emergência', current: 9500, target: 15000, color: '#10b981' },
    { name: 'Notebook novo 💻',  current: 1800, target: 3500, color: '#f59e0b' },
  ];
  return (
    <div className="ui-goals">
      <div className="ui-goals-header">Minhas metas</div>
      {goals.map((g, i) => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={i} className="ui-goal-item" style={{ animationDelay: i * 0.1 + 's' }}>
            <div className="ui-goal-top">
              <span className="ui-goal-name">{g.name}</span>
              <span className="ui-goal-pct" style={{ color: g.color }}>{pct}%</span>
            </div>
            <div className="ui-goal-track">
              <div className="ui-goal-fill" style={{ '--pct': pct + '%', '--c': g.color }} />
            </div>
            <div className="ui-goal-vals">
              <span>R$ {g.current.toLocaleString('pt-BR')}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>de R$ {g.target.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportsUI() {
  const cats = [
    { name: 'Alimentação', pct: 32, color: '#818cf8' },
    { name: 'Moradia',     pct: 28, color: '#10b981' },
    { name: 'Transporte',  pct: 18, color: '#f59e0b' },
    { name: 'Lazer',       pct: 12, color: '#f87171' },
    { name: 'Outros',      pct: 10, color: '#a78bfa' },
  ];
  return (
    <div className="ui-reports">
      <div className="ui-reports-title">Gastos por categoria — Abril</div>
      <div className="ui-reports-body">
        {/* Donut */}
        <div className="ui-donut">
          <div className="ui-donut-ring" />
          <div className="ui-donut-center">
            <div className="ui-donut-val">R$ 3.129</div>
            <div className="ui-donut-lbl">total</div>
          </div>
        </div>
        {/* Legend */}
        <div className="ui-legend">
          {cats.map((c, i) => (
            <div key={i} className="ui-legend-item" style={{ animationDelay: i * 0.08 + 's' }}>
              <div className="ui-legend-dot" style={{ background: c.color }} />
              <span className="ui-legend-name">{c.name}</span>
              <span className="ui-legend-pct" style={{ color: c.color }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
