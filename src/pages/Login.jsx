import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import AuthShowcase from './AuthShowcase';
import './Auth.css';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) navigate('/dashboard');
      else setError(result.message);
    } catch {
      setError('Falha ao fazer login. Verifique suas credenciais.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      if (result && !result.success) setError(result.message || 'Erro ao conectar com Google.');
    } catch {
      setError('Erro ao tentar conectar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Animated showcase (shared) ── */}
      <AuthShowcase />

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-right-inner">

          <div className="auth-form-header">
            <h2 className="auth-form-title">Bem-vindo de volta 👋</h2>
            <p className="auth-form-subtitle">
              Entre na sua conta para continuar sua jornada financeira.
            </p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Google — first */}
          <button
            className="auth-btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{ marginBottom: '1.25rem' }}
          >
            <svg className="auth-google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com o Google
          </button>

          <div className="auth-separator">
            <div className="auth-separator-line" />
            <span className="auth-separator-text">ou entre com e-mail</span>
            <div className="auth-separator-line" />
          </div>

          <form className="auth-form-body" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="login-email">E-mail</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Mail size={15} /></span>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="login-password">Senha</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Lock size={15} /></span>
                <input
                  id="login-password"
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-btn-spinner" />
                  Entrando...
                </span>
              ) : 'Entrar na minha conta'}
            </button>
          </form>

          <div className="auth-switch">
            Não tem uma conta?
            <Link to="/register">Crie grátis agora →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
