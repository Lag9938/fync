import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FinnOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('fync_onboarded');
    if (!hasSeen) {
      // Pequeno atraso para dar efeito de boas-vindas
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (step < 2) {
      setStep(prev => prev + 1);
    } else {
      localStorage.setItem('fync_onboarded', 'true');
      setIsOpen(false);
    }
  };

  const steps = [
    {
      title: "Bem-vindo ao Fync!",
      text: "Eu sou o Finn, seu novo assistente pessoal. O Fync acabou de passar por uma evolução premium e estou aqui para guiar suas finanças ao próximo nível.",
      icon: <Sparkles size={40} className="text-primary" />
    },
    {
      title: "Análises de Excelência",
      text: "Nossos novos gráficos interativos e projeções permitem que você entenda exatamente onde seu dinheiro está indo. E com o Fync Score, sua saúde financeira vira um jogo que você sempre vence.",
      icon: <CheckCircle2 size={40} className="text-success" />
    },
    {
      title: "Tudo Pronto!",
      text: "Você pode me chamar pelo botão flutuante no canto da tela sempre que quiser suporte, análises ou dicas. Vamos começar?",
      icon: <img src="/finn-icon.png" alt="Finn" style={{ width: '60px', height: '60px', filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }} />
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="modal-overlay"
          style={{ zIndex: 99999, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-panel modal-content"
            style={{ 
              maxWidth: '450px', 
              width: '100%', 
              background: 'rgba(15, 15, 20, 0.95)',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25)',
              padding: '2.5rem',
              textAlign: 'center',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Efeito de brilho de fundo */}
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
              {steps[step].icon}
            </div>

            <h2 className="text-2xl font-bold mb-3" style={{ position: 'relative', zIndex: 1 }}>{steps[step].title}</h2>
            <p className="text-muted mb-8" style={{ fontSize: '1.05rem', lineHeight: '1.6', minHeight: '80px', position: 'relative', zIndex: 1 }}>
              {steps[step].text}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      width: i === step ? '20px' : '8px', 
                      height: '8px', 
                      borderRadius: '4px', 
                      background: i === step ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                      transition: 'all 0.3s ease'
                    }} 
                  />
                ))}
              </div>

              <button className="btn btn-primary" onClick={handleNext} style={{ padding: '0.6rem 1.5rem', borderRadius: '30px' }}>
                {step < 2 ? (
                  <>Próximo <ArrowRight size={18} /></>
                ) : (
                  "Explorar Fync"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
