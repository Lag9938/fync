import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, AlertCircle } from 'lucide-react';
import heroImage from '../assets/auth-hero.png';
import './Auth.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    
    setLoading(true);
    
    try {
      const result = await register(name, email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Falha ao criar a conta.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Branding Side */}
      <div className="auth-branding">
        <img 
          src={heroImage} 
          alt="Branding" 
          className="auth-branding-bg"
        />
        <div className="auth-branding-overlay"></div>
        <div className="auth-branding-content">
          <h2 className="auth-branding-tagline">
            Sua nova <br />
            <span style={{ color: 'var(--primary-color)' }}>vida financeira</span> <br />
            começa aqui.
          </h2>
          <p className="auth-branding-desc">
            Cadastre-se para começar a controlar seus gastos, acompanhar investimentos e planejar seu futuro de forma simples e segura.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              <div className="font-bold text-lg">Gratuito</div>
              <p className="text-xs text-muted">Acesso a todas as ferramentas</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              <div className="font-bold text-lg">Intuitivo</div>
              <p className="text-xs text-muted">Interface limpa e rápida</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-card animate-fade-in">
          <div className="auth-header">
            <div className="auth-logo">
              <Wallet size={28} />
            </div>
            <h1 className="auth-title">Criar conta</h1>
            <p className="auth-subtitle">Junte-se ao Fync hoje mesmo</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">Nome completo</label>
              <input
                type="text"
                id="name"
                className="input-field"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                className="input-field"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="password">Senha</label>
                <input
                  type="password"
                  id="password"
                  className="input-field"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="confirmPassword">Confirmar</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="input-field"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Processando...' : 'Cadastrar agora'}
            </button>
          </form>

          <div className="auth-separator">
            <span>ou</span>
          </div>

          <button 
            type="button" 
            className="btn-social" 
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                const result = await loginWithGoogle();
                if (result && !result.success) {
                  setError(result.message || 'Erro ao conectar com Google. Verifique o Supabase.');
                }
              } catch (err) {
                setError('Erro ao tentar conectar com o Google.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com o Google
          </button>

          <div className="auth-footer">
            Já tem uma conta? <Link to="/login">Faça login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
