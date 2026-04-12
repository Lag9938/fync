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
  const { register } = useAuth();
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

          <div className="auth-footer">
            Já tem uma conta? <Link to="/login">Faça login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
