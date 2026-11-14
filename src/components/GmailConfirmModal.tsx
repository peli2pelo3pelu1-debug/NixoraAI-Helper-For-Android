import React, { useState, useEffect } from 'react';
import { X, Send, ShieldAlert, MailCheck } from 'lucide-react';
import { ModeratorReportDraft, AuthUser } from '../types';
import { getAccessToken, googleSignIn, sendGmailReport } from '../lib/firebaseAuth';

interface GmailConfirmModalProps {
  isOpen: boolean;
  draft: ModeratorReportDraft | null;
  user: AuthUser | null;
  onClose: () => void;
  onConnectGoogle: (googleUser: AuthUser) => void;
  onSent: (result: {
    gmailMessageId: string;
    finalDraft: ModeratorReportDraft;
  }) => void;
}

export const GmailConfirmModal: React.FC<GmailConfirmModalProps> = ({
  isOpen,
  draft,
  user,
  onClose,
  onConnectGoogle,
  onSent,
}) => {
  const [subject, setSubject] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [body, setBody] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setSubject(draft.subject);
      setPlayerName(draft.playerName);
      setBody(draft.body);
      setHasToken(Boolean(getAccessToken()));
      setError(null);
    }
  }, [draft, isOpen]);

  if (!isOpen || !draft) return null;

  const handleConnectGoogle = async () => {
    setError(null);
    setConnecting(true);
    try {
      const { user: gUser } = await googleSignIn();
      onConnectGoogle({
        id: gUser.uid,
        email: gUser.email || '',
        name: gUser.displayName || gUser.email?.split('@')[0] || 'Jugador',
        photoURL: gUser.photoURL,
        provider: 'google',
        emailVerified: true,
      });
      setHasToken(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Google para enviar correos.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmSend = async () => {
    setError(null);
    setSending(true);
    try {
      const formattedBody = [
        `Reporte enviado desde NixoraAI Helper (Servidor oficial: nixora.play.hosting)`,
        `------------------------------------------------------------`,
        `Jugador: ${playerName}`,
        `Correo del remitente: ${user?.email || 'Cuenta Google conectada'}`,
        `Categoría: ${draft.category}`,
        `Urgencia: ${draft.urgency}`,
        `Fecha: ${new Date().toLocaleString('es-ES')}`,
        `------------------------------------------------------------`,
        ``,
        body,
      ].join('\n');

      const res = await sendGmailReport({
        to: draft.recipient || 'paracrafteros@gmail.com',
        subject,
        body: formattedBody,
        senderEmail: user?.email,
      });

      onSent({
        gmailMessageId: res.id,
        finalDraft: {
          ...draft,
          subject,
          playerName,
          body: formattedBody,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el correo.';
      if (msg === 'GMAIL_TOKEN_MISSING' || msg === 'GMAIL_TOKEN_EXPIRED') {
        setHasToken(false);
        setError(
          'Tu sesión de Gmail expiró o aún no está conectada. Conecta tu cuenta de Google para enviar este correo.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-confirm-title"
    >
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-[#121521] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Cancelar envío"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="gmail-confirm-title" className="font-display text-lg font-bold text-slate-50">
              Confirmar envío de correo por Gmail
            </h2>
            <p className="text-xs text-slate-400">
              Revisa los datos antes de enviarlo al moderador oficial de nixora.play.hosting.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Destinatario (Moderador)
              </label>
              <input
                type="text"
                readOnly
                value={draft.recipient || 'paracrafteros@gmail.com'}
                className="w-full rounded-lg border border-slate-800 bg-[#0B0D14] px-3 py-2 font-mono text-xs text-violet-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Nick en nixora.play.hosting
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] px-3 py-2 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Asunto del correo
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Categoría: {draft.category}</span>
            <span aria-hidden="true">·</span>
            <span>Urgencia: {draft.urgency}</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Mensaje para el moderador
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B0D14] p-3 text-sm leading-relaxed text-slate-100 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {!hasToken && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/25 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="flex-1 space-y-2.5">
                  <p className="text-xs leading-relaxed text-amber-100">
                    Para enviar este correo directamente desde tu Gmail a{' '}
                    <span className="font-mono font-semibold">paracrafteros@gmail.com</span>,
                    necesitas autorizar tu cuenta de Google.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={connecting}
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
                        {connecting ? 'Autorizando Gmail...' : 'Conectar Google para enviar Gmail'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmSend}
            disabled={!hasToken || sending || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Enviando correo...' : 'Confirmar y enviar por Gmail'}
          </button>
        </div>
      </div>
    </div>
  );
};
