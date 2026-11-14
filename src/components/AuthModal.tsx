import React, { useState } from 'react';
import { X, Mail, KeyRound, Lock, User, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { NixoraLogo } from './NixoraLogo';
import { googleSignIn } from '../lib/firebaseAuth';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  canDismiss = true,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [showSandboxInbox, setShowSandboxInbox] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { user } = await googleSignIn();
      onAuthenticated({
        id: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Jugador Google',
        photoURL: user.photoURL,
        provider: 'google',
        emailVerified: true,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: authTab === 'register' ? name : undefined,
          mode: authTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar el código.');
      }
      setPreviewCode(data.previewCode || null);
      setShowSandboxInbox(Boolean(data.previewCode));
      setStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Código incorrecto.');
      }
      onAuthenticated(data.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al verificar código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-[#121521] p-6 shadow-2xl">
        {canDismiss && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-6 flex items-center gap-3">
          <NixoraLogo size={44} />
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-slate-50">
              Acceso a NixoraAI Helper
            </h2>
            <p className="text-xs text-slate-400">
              Servidor oficial nixora.play.hosting
            </p>
          </div>
        </div>

        {/* Google Sign-In Section */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="gsi-material-button"
        >
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                style={{ display: 'block' }}
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </div>
            <span>
              {googleLoading ? 'Conectando con Google...' : 'Iniciar sesión con Google'}
            </span>
          </div>
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          Recomendado para enviar reportes directos a moderadores por Gmail.
        </p>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500">o acceso normal con verificación</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="flex rounded-lg bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setError(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  authTab === 'login'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setError(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  authTab === 'register'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {authTab === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Nombre de jugador
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. SteveNixora"
                    className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] py-2.5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? 'Enviando código de verificación...' : 'Enviar código al correo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cambiar correo ({email})
            </button>

            <div className="rounded-lg border border-slate-800 bg-[#0B0D14] p-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="text-xs leading-relaxed text-slate-300">
                  Enviamos un código de verificación de 6 dígitos a{' '}
                  <span className="font-semibold text-slate-100">{email}</span>. Caduca en 10
                  minutos.
                </div>
              </div>
            </div>

            {previewCode && (
              <div className="rounded-lg border border-violet-500/35 bg-violet-950/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-violet-200">
                    Bandeja local (sin servidor SMTP configurado)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSandboxInbox(!showSandboxInbox)}
                    className="text-xs font-semibold text-violet-300 underline hover:text-violet-100"
                  >
                    {showSandboxInbox ? 'Ocultar' : 'Ver código'}
                  </button>
                </div>
                {showSandboxInbox && (
                  <div className="mt-2.5 flex items-center justify-between rounded-md bg-[#0B0D14] px-3 py-2">
                    <div>
                      <p className="text-[11px] text-slate-400">Tu código de verificación es:</p>
                      <p className="font-mono text-lg font-bold tracking-widest text-amber-300 tabular-nums">
                        {previewCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCode(previewCode)}
                      className="rounded-md bg-violet-600/80 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                    >
                      Autocompletar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Código de verificación (6 dígitos)
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] py-2.5 pl-9 pr-3 font-mono text-base tracking-[0.35em] text-slate-100 tabular-nums placeholder:tracking-normal placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar código e ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
