import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, AlertCircle } from 'lucide-react';
import heroImage from '../assets/auth-hero.png';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Falha ao fazer login.');
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
            Sua jornada para a <br />
            <span style={{ color: 'var(--primary-color)' }}>liberdade financeira</span> <br />
            começa aqui.
          </h2>
          <p className="auth-branding-desc">
            Organize suas contas, acompanhe seus investimentos e alcance seus objetivos com a simplicidade e o poder do Fync.
          </p>
          
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <div className="font-bold text-xl">+70%</div>
              <p className="text-sm text-muted">Controle nos gastos</p>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            <div>
              <div className="font-bold text-xl">100%</div>
              <p className="text-sm text-muted">Seguro e Privado</p>
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
            <h1 className="auth-title">Bem-vindo</h1>
            <p className="auth-subtitle">Acesse sua conta para continuar gerenciando suas finanças</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
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

            <div className="input-group">
              <label className="input-label" htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="auth-footer">
            Não tem uma conta? <Link to="/register">Cadastre-se grátis</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
