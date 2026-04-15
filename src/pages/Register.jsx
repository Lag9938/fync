import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import AuthShowcase from './AuthShowcase';
import './Auth.css';

export default function Register() {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const { register, loginWithGoogle }          = useAuth();
  const navigate                               = useNavigate();

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#6366f1', '#10b981'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');
    if (password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres.');
    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.success) navigate('/dashboard');
      else setError(result.message);
    } catch {
      setError('Falha ao criar a conta. Tente novamente.');
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
            <h2 className="auth-form-title">Criar conta grátis ✨</h2>
            <p className="auth-form-subtitle">
              Preencha os dados abaixo e comece agora mesmo.
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
            Cadastrar com o Google
          </button>

          <div className="auth-separator">
            <div className="auth-separator-line" />
            <span className="auth-separator-text">ou crie com e-mail</span>
            <div className="auth-separator-line" />
          </div>

          <form className="auth-form-body" onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="reg-name">Nome completo</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><User size={15} /></span>
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  placeholder="Como quer ser chamado?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="reg-email">E-mail</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><Mail size={15} /></span>
                <input
                  id="reg-email"
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

            {/* Passwords */}
            <div className="auth-password-grid">
              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="reg-password">Senha</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Lock size={15} /></span>
                  <input
                    id="reg-password"
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="reg-confirm">Confirmar</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Lock size={15} /></span>
                  <input
                    id="reg-confirm"
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Strength */}
            {password && (
              <div className="auth-strength">
                <div className="auth-strength-bars">
                  {[1,2,3,4].map((n) => (
                    <div key={n} className="auth-strength-bar"
                      style={{ background: n <= strength ? strengthColor : 'rgba(255,255,255,0.07)' }}
                    />
                  ))}
                </div>
                <span className="auth-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}

            {/* Match */}
            {confirmPassword && (
              <div className="auth-match">
                {password === confirmPassword
                  ? <><CheckCircle size={13} color="#10b981" /><span style={{ color:'#10b981', fontSize:'0.8rem' }}>Senhas coincidem</span></>
                  : <><AlertCircle size={13} color="#ef4444" /><span style={{ color:'#ef4444', fontSize:'0.8rem' }}>Senhas não coincidem</span></>
                }
              </div>
            )}

            <button type="submit" className="auth-btn-submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-btn-spinner" />
                  Criando conta...
                </span>
              ) : 'Criar minha conta grátis →'}
            </button>
          </form>

          <div className="auth-switch">
            Já tem uma conta?
            <Link to="/login">Entrar agora</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
