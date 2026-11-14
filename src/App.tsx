import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Gamepad2,
  ClipboardList,
  Server,
  Send,
  Copy,
  Check,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  RefreshCw,
  Menu,
  X,
  Bell,
  Camera,
  Video,
} from 'lucide-react';
import { NixoraLogo } from './components/NixoraLogo';
import { AuthModal } from './components/AuthModal';
import { GmailConfirmModal } from './components/GmailConfirmModal';
import { StressGames } from './components/StressGames';
import { MediaCaptureModal } from './components/MediaCaptureModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAControls';
import { initAuth, googleLogout } from './lib/firebaseAuth';
import {
  getNativeNotificationPermission,
  requestNativeNotificationPermission,
  dispatchNativeNotification,
  NativePermissionState,
} from './lib/notifications';
import {
  AuthUser,
  ChatMessage,
  ModeratorReportDraft,
  SentTicket,
  ServerStatusInfo,
  MediaAttachment,
  AppNotificationItem,
} from './types';

type NavView = 'chat' | 'games' | 'reports' | 'server';

const EMBLEM_IMG = '/src/assets/images/nixora_amethyst_emblem_1794659190117.jpg';
const SANCTUARY_IMG = '/src/assets/images/nixora_sanctuary_banner_1794659190199.jpg';
const EMAIL_USER_STORAGE_KEY = 'nixora_email_user_profile';

const QUICK_PROMPTS = [
  'Me robaron mis ítems dentro de nixora.play.hosting y necesito ayuda',
  'Encontré un bug grave en el servidor que duplica o borra bloques',
  'Hay un jugador usando hacks y molestando en el spawn',
  'Tengo problemas para conectarme a nixora.play.hosting o apelar una sanción',
];

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSideGame, setShowSideGame] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<MediaAttachment | null>(null);
  const [captureModalOpen, setCaptureModalOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<ModeratorReportDraft | null>(null);
  const [activeEscalationMsgId, setActiveEscalationMsgId] = useState<string | null>(null);

  const [tickets, setTickets] = useState<SentTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [serverStatus, setServerStatus] = useState<ServerStatusInfo | null>(null);
  const [checkingServer, setCheckingServer] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  const [notifPerm, setNotifPerm] = useState<NativePermissionState>(() =>
    getNativeNotificationPermission()
  );
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotificationItem | null>(null);

  const [emblemBroken, setEmblemBroken] = useState(false);
  const [bannerBroken, setBannerBroken] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const pushNotification = useCallback(
    async (title: string, body: string, kind: AppNotificationItem['kind'] = 'info') => {
      const item: AppNotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        kind,
        createdAt: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 30));
      setActiveToast(item);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setActiveToast(null), 4200);

      await dispatchNativeNotification({ title, body, tag: item.id });
    },
    []
  );

  // Initialize Firebase auth listener + restore verified email profile if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        if (parsed?.provider === 'email' && parsed.emailVerified) {
          setUser(parsed);
        }
      }
    } catch {
      // Ignore invalid local profile
    }

    const unsubscribe = initAuth(
      (gUser) => {
        setUser({
          id: gUser.uid,
          email: gUser.email || '',
          name: gUser.displayName || gUser.email?.split('@')[0] || 'Jugador',
          photoURL: gUser.photoURL,
          provider: 'google',
          emailVerified: true,
        });
      },
      () => {
        setUser((prev) => (prev?.provider === 'google' ? null : prev));
      }
    );

    return () => {
      unsubscribe();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadTickets = async (email?: string) => {
    setTicketsLoading(true);
    try {
      const query = email ? `?email=${encodeURIComponent(email)}` : '';
      const res = await fetch(`/api/tickets${query}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {
      // Ignore transient error
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(user?.email);
  }, [user?.email]);

  const checkServerStatus = async () => {
    setCheckingServer(true);
    try {
      const res = await fetch('/api/server-status');
      if (res.ok) {
        const data = (await res.json()) as ServerStatusInfo;
        setServerStatus(data);
      }
    } catch {
      setServerStatus({
        host: 'nixora.play.hosting',
        port: 25565,
        reachable: false,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        note: 'No se pudo consultar el estado del servidor',
      });
    } finally {
      setCheckingServer(false);
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText('nixora.play.hosting');
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleAuthenticated = (authedUser: AuthUser) => {
    setUser(authedUser);
    if (authedUser.provider === 'email') {
      localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(authedUser));
    } else {
      localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    }
    pushNotification(
      'Sesión iniciada',
      `Bienvenido a NixoraAI Helper, ${authedUser.name}.`,
      'success'
    );
  };

  const handleLogout = async () => {
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    if (user?.provider === 'google') {
      await googleLogout();
    }
    setUser(null);
  };

  const handleEnableNotifications = async () => {
    const res = await requestNativeNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      await pushNotification(
        'Notificaciones activadas',
        'Recibirás alertas en PC y móvil cuando NixoraAI responda o envíe reportes.',
        'success'
      );
    } else if (res === 'denied') {
      await pushNotification(
        'Permiso bloqueado en el navegador',
        'Seguirás viendo alertas dentro de la app; puedes habilitar notificaciones del sitio en los ajustes del navegador.',
        'warning'
      );
    } else {
      await pushNotification(
        'Notificaciones en la app listas',
        'Tu navegador no soporta alertas nativas del sistema, pero las verás aquí.',
        'info'
      );
    }
  };

  const hasPendingEscalation = messages.some(
    (m) => m.role === 'assistant' && m.escalation?.status === 'pending_user_decision'
  );

  const sendMessage = async (textOverride?: string) => {
    const rawText = (textOverride ?? inputText).trim();
    const mediaToSend = textOverride ? null : attachedMedia;
    const text =
      rawText ||
      (mediaToSend
        ? mediaToSend.kind === 'video'
          ? 'Analiza este video corto de 5 segundos y dime qué ocurre.'
          : 'Lee y analiza esta captura de pantalla o imagen.'
        : '');

    if (!text || chatLoading) return;

    setChatError(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      attachment: mediaToSend
        ? {
            kind: mediaToSend.kind,
            previewUrl: mediaToSend.previewUrl,
            fileName: mediaToSend.fileName,
            durationSeconds: mediaToSend.durationSeconds,
          }
        : undefined,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textOverride) {
      setInputText('');
      setAttachedMedia(null);
    }
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          playerName: user?.name || 'Jugador de Nixora',
          userEmail: user?.email || '',
          hasPendingEscalation,
          media: mediaToSend
            ? {
                mimeType: mediaToSend.mimeType,
                base64Data: mediaToSend.base64Data,
                kind: mediaToSend.kind,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo contactar a NixoraAI Helper.');
      }

      const aiMsgId = `msg_${Date.now()}_a`;
      const pendingBefore = [...updatedHistory]
        .reverse()
        .find((m) => m.role === 'assistant' && m.escalation?.status === 'pending_user_decision');

      const draft: ModeratorReportDraft | undefined = data.needsModeratorEscalation
        ? {
            recipient: data.reportSummary?.recipient || 'paracrafteros@gmail.com',
            subject: data.reportSummary?.subject || 'Reporte en nixora.play.hosting',
            category: data.reportSummary?.category || 'Soporte General',
            playerName:
              data.reportSummary?.playerName || user?.name || 'Jugador de Nixora',
            urgency: data.reportSummary?.urgency || 'Media',
            body: data.reportSummary?.body || text,
          }
        : undefined;

      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        escalation: draft
          ? {
              draft,
              status: data.escalationConfirmedByUser
                ? 'confirmed_ready'
                : 'pending_user_decision',
            }
          : undefined,
      };

      setMessages((prev) => {
        const cleaned = prev.map((m) =>
          data.escalationConfirmedByUser && m.id === pendingBefore?.id && m.escalation
            ? { ...m, escalation: { ...m.escalation, status: 'confirmed_ready' as const } }
            : m
        );
        return [...cleaned, aiMsg];
      });

      pushNotification(
        'NixoraAI Helper respondió',
        draft
          ? 'Se preparó un posible reporte para el moderador.'
          : data.reply.slice(0, 90),
        'info'
      );

      if (data.escalationConfirmedByUser && draft) {
        setActiveDraft(draft);
        setActiveEscalationMsgId(aiMsgId);
        setConfirmModalOpen(true);
      }
    } catch (err: unknown) {
      setChatError(
        err instanceof Error ? err.message : 'Ocurrió un error al consultar a NixoraAI.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  const openConfirmModalForMessage = (msg: ChatMessage) => {
    if (!msg.escalation) return;
    setActiveDraft(msg.escalation.draft);
    setActiveEscalationMsgId(msg.id);
    setConfirmModalOpen(true);
  };

  const cancelEscalation = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.escalation
          ? { ...m, escalation: { ...m.escalation, status: 'cancelled' } }
          : m
      )
    );
  };

  const handleGmailSent = async (result: {
    gmailMessageId: string;
    finalDraft: ModeratorReportDraft;
  }) => {
    setConfirmModalOpen(false);

    if (activeEscalationMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeEscalationMsgId && m.escalation
            ? {
                ...m,
                escalation: {
                  ...m.escalation,
                  status: 'sent',
                  gmailMessageId: result.gmailMessageId,
                },
              }
            : m
        )
      );
    }

    const confirmationMsg: ChatMessage = {
      id: `msg_${Date.now()}_sys`,
      role: 'assistant',
      content: `Reporte enviado por Gmail correctamente a ${result.finalDraft.recipient} (ID de mensaje: ${result.gmailMessageId}). Un moderador de nixora.play.hosting revisará tu caso pronto.`,
      timestamp: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, confirmationMsg]);

    pushNotification(
      'Correo enviado al moderador',
      `Tu reporte "${result.finalDraft.subject}" fue enviado a ${result.finalDraft.recipient}.`,
      'success'
    );

    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email || 'cuenta-google',
          playerName: result.finalDraft.playerName,
          recipient: result.finalDraft.recipient,
          subject: result.finalDraft.subject,
          category: result.finalDraft.category,
          urgency: result.finalDraft.urgency,
          body: result.finalDraft.body,
          status: 'Enviado por Gmail',
          gmailMessageId: result.gmailMessageId,
        }),
      });
      await loadTickets(user?.email);
    } catch {
      // Ticket UI notification already shown
    }
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const navItems: Array<{ id: NavView; label: string; shortLabel: string; icon: React.ReactNode }> = [
    { id: 'chat', label: 'Asistente IA', shortLabel: 'IA', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'games', label: '12 Minijuegos Antiestrés', shortLabel: 'Juegos', icon: <Gamepad2 className="h-4 w-4" /> },
    { id: 'reports', label: 'Mis Reportes', shortLabel: 'Reportes', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'server', label: 'Servidor Nixora', shortLabel: 'Nixora', icon: <Server className="h-4 w-4" /> },
  ];

  const viewTitles: Record<NavView, string> = {
    chat: 'NixoraAI Helper',
    games: '12 Juegos Antiestrés',
    reports: 'Reportes a Moderadores',
    server: 'Servidor nixora.play.hosting',
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0B0D14] text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Windows & Mobile Drawer Navigation Rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-800/90 bg-[#0F121C] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Brand Lockup with Custom Amethyst + Gemini Star Logo */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <NixoraLogo size={40} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-bold tracking-tight text-slate-50">
                NixoraAI Helper
              </p>
              <p className="truncate text-[11px] text-slate-400">
                nixora.play.hosting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menú principal">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-violet-600/20 text-violet-200'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <span className={active ? 'text-violet-400' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3">
            <PWAInstallButton />
          </div>
        </nav>

        {/* Server Quick Info & Moderator Contact */}
        <div className="mx-3 mb-3 rounded-lg border border-slate-800/80 bg-[#0B0D14] p-3">
          <p className="text-xs font-semibold text-slate-200">Moderación Oficial</p>
          <p className="mt-1 truncate font-mono text-[11px] text-violet-300">
            paracrafteros@gmail.com
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Soporte PC Windows y versión móvil instalable con envío por Gmail.
          </p>
        </div>

        {/* User Account Footer */}
        <div className="border-t border-slate-800/80 p-3">
          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-[#141827] px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/30 font-display text-xs font-bold text-violet-200">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-100">{user.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {user.provider === 'google' ? 'Google · Gmail listo' : 'Correo verificado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar (Compact 48px on mobile to stay well within 15% sticky budget, 56px on desktop) */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0F121C]/95 px-3 lg:h-14 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display truncate text-sm font-semibold text-slate-100 lg:text-base">
              {viewTitles[activeView]}
            </h1>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={handleCopyIp}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0B0D14] px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-violet-500/40 hover:text-slate-100 whitespace-nowrap"
            >
              <span>nixora.play.hosting</span>
              {copiedIp ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-500" />
              )}
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Notification Center Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifPanelOpen(!notifPanelOpen);
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
                aria-label="Centro de notificaciones"
                className="relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-800 bg-[#0B0D14] px-2.5 text-slate-200 hover:bg-slate-800"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="ml-1 font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifPanelOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-24px)] rounded-xl border border-slate-800 bg-[#121521] p-4 shadow-2xl">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <p className="font-display text-xs font-bold text-slate-100">
                      Notificaciones PC y Móvil
                    </p>
                    <button
                      type="button"
                      onClick={() => setNotifPanelOpen(false)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-800"
                      aria-label="Cerrar notificaciones"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={handleEnableNotifications}
                      className="min-h-[40px] w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                    >
                      {notifPerm === 'granted'
                        ? 'Probar notificación en PC / Móvil'
                        : 'Activar notificaciones en PC y Móvil'}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Estado del sistema:{' '}
                      <strong className="text-slate-200">
                        {notifPerm === 'granted'
                          ? 'Activadas'
                          : notifPerm === 'denied'
                            ? 'Bloqueadas en navegador'
                            : notifPerm === 'unsupported'
                              ? 'Solo en pantalla'
                              : 'Pendiente de permiso'}
                      </strong>
                    </p>
                  </div>

                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t border-slate-800 pt-3">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500">
                        Aún no hay notificaciones recientes.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-lg border border-slate-800/80 bg-[#0B0D14] p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-100">{n.title}</span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {n.createdAt}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                            {n.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeView === 'chat' ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowSideGame(!showSideGame)}
                  className="hidden items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 xl:inline-flex whitespace-nowrap"
                >
                  {showSideGame ? (
                    <PanelRightClose className="h-3.5 w-3.5 text-violet-400" />
                  ) : (
                    <PanelRightOpen className="h-3.5 w-3.5 text-violet-400" />
                  )}
                  {showSideGame ? 'Ocultar minijuego' : 'Juegos antiestrés'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setAttachedMedia(null);
                    setChatError(null);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nuevo chat</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveView('chat')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Asistente IA</span>
              </button>
            )}
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {activeView === 'chat' && (
            <div className="flex min-w-0 flex-1 overflow-hidden">
              {/* Chat Column (pb-14 on mobile to stay above bottom tab bar) */}
              <div className="flex min-w-0 flex-1 flex-col pb-14 lg:pb-0">
                <div className="flex-1 overflow-y-auto px-3.5 py-4 lg:px-8 lg:py-6">
                  <div className="mx-auto max-w-3xl space-y-5">
                    {messages.length === 0 ? (
                      <div className="space-y-5">
                        {/* Welcome Hero Card */}
                        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#121521]">
                          <div className="relative h-40 w-full overflow-hidden bg-[#151828] sm:h-44">
                            {!bannerBroken ? (
                              <img
                                src={SANCTUARY_IMG}
                                alt="Santuario de amatista del servidor Nixora"
                                referrerPolicy="no-referrer"
                                onError={() => setBannerBroken(true)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-[#1A1432] via-[#121521] to-[#0B0D14]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121521] via-[#121521]/55 to-transparent" />
                            <div className="absolute bottom-3.5 left-4 right-4 flex items-end gap-3.5 sm:bottom-4 sm:left-5">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-violet-400/30 bg-[#0B0D14] shadow-lg sm:h-14 sm:w-14">
                                {!emblemBroken ? (
                                  <img
                                    src={EMBLEM_IMG}
                                    alt="Emblema NixoraAI Helper"
                                    referrerPolicy="no-referrer"
                                    onError={() => setEmblemBroken(true)}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <NixoraLogo size={40} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h2 className="font-display text-lg font-bold text-slate-50 text-balance sm:text-xl">
                                  Hola, soy NixoraAI Helper
                                </h2>
                                <p className="text-xs text-slate-300">
                                  Asistente móvil y PC para nixora.play.hosting
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 p-4 sm:p-5">
                            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                              Cuéntame qué te pasó en{' '}
                              <span className="font-mono text-violet-300">nixora.play.hosting</span>{' '}
                              o envíame una <strong>captura / foto / video de 5 segundos</strong>{' '}
                              para que pueda verlo. Si hace falta un moderador, te avisaré para
                              enviarlo por Gmail a{' '}
                              <span className="font-mono text-slate-200">
                                paracrafteros@gmail.com
                              </span>{' '}
                              cuando tú digas que sí.
                            </p>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {QUICK_PROMPTS.map((prompt) => (
                                <button
                                  key={prompt}
                                  type="button"
                                  onClick={() => sendMessage(prompt)}
                                  className="min-h-[44px] rounded-lg border border-slate-800 bg-[#0B0D14] p-3 text-left text-xs leading-relaxed text-slate-300 transition-colors hover:border-violet-500/50 hover:bg-[#151929] hover:text-slate-100"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {!user && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#121521] px-4 py-3.5 sm:px-5">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                                Inicia sesión con Google o con código por correo
                              </p>
                              <p className="text-[11px] text-slate-400 sm:text-xs">
                                Necesario para enviar reportes directos por Gmail desde tu cuenta.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAuthModalOpen(true)}
                              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 whitespace-nowrap"
                            >
                              <LogIn className="h-3.5 w-3.5" />
                              Iniciar sesión
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 sm:gap-3 ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#141827]">
                              <NixoraLogo size={24} />
                            </div>
                          )}

                          <div
                            className={`max-w-[88%] space-y-2.5 sm:max-w-[82%] ${
                              msg.role === 'user' ? 'items-end' : 'items-start'
                            }`}
                          >
                            {msg.attachment && (
                              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F121C] p-1.5">
                                {msg.attachment.kind === 'image' ? (
                                  <img
                                    src={msg.attachment.previewUrl}
                                    alt={msg.attachment.fileName}
                                    className="max-h-56 w-auto rounded-lg object-contain"
                                  />
                                ) : (
                                  <video
                                    src={msg.attachment.previewUrl}
                                    controls
                                    playsInline
                                    className="max-h-56 w-full rounded-lg"
                                  />
                                )}
                                <p className="mt-1 px-1 text-[11px] text-slate-400">
                                  {msg.attachment.fileName}
                                </p>
                              </div>
                            )}

                            <div
                              className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                  ? 'bg-violet-600 text-white'
                                  : 'border border-slate-800 bg-[#121521] text-slate-200'
                              }`}
                            >
                              {msg.content}
                            </div>

                            <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500 tabular-nums">
                              <span>
                                {msg.role === 'user' ? user?.name || 'Tú' : 'NixoraAI Helper'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{msg.timestamp}</span>
                            </div>

                            {/* Moderator Escalation Action Card */}
                            {msg.escalation && (
                              <div className="rounded-xl border border-violet-500/35 bg-[#151828] p-4">
                                <p className="font-display text-xs font-bold text-violet-200">
                                  Envío a Moderador de nixora.play.hosting
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                  <span>Para: paracrafteros@gmail.com</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{msg.escalation.draft.category}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>Urgencia {msg.escalation.draft.urgency}</span>
                                </div>

                                <p className="mt-2.5 text-xs font-medium text-slate-200">
                                  Asunto: {msg.escalation.draft.subject}
                                </p>

                                {msg.escalation.status === 'sent' ? (
                                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>
                                      Enviado por Gmail correctamente
                                      {msg.escalation.gmailMessageId
                                        ? ` · ID ${msg.escalation.gmailMessageId}`
                                        : ''}
                                    </span>
                                  </div>
                                ) : msg.escalation.status === 'cancelled' ? (
                                  <p className="mt-3 text-xs text-slate-400">
                                    Envío al moderador cancelado por el jugador.
                                  </p>
                                ) : (
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openConfirmModalForMessage(msg)}
                                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap"
                                    >
                                      <Mail className="h-3.5 w-3.5" />
                                      Aceptar y enviar por Gmail
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => cancelEscalation(msg.id)}
                                      className="min-h-[42px] rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 whitespace-nowrap"
                                    >
                                      No enviar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {chatLoading && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#141827]">
                          <NixoraLogo size={24} />
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#121521] px-4 py-3 text-xs text-slate-300">
                          NixoraAI Helper está analizando tu consulta o multimedia... Puedes jugar cualquiera de los 12 juegos antiestrés mientras termino.
                        </div>
                      </div>
                    )}

                    {chatError && (
                      <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-200">
                        {chatError}
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Chat Composer with Attached Media Preview + Capture Trigger */}
                <div className="border-t border-slate-800/80 bg-[#0F121C] px-3 py-2.5 lg:px-8 lg:py-3.5">
                  <div className="mx-auto max-w-3xl space-y-2.5">
                    {attachedMedia && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/35 bg-[#141827] p-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          {attachedMedia.kind === 'image' ? (
                            <img
                              src={attachedMedia.previewUrl}
                              alt="Vista previa adjunta"
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-600/25 text-violet-300">
                              <Video className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-100">
                              {attachedMedia.fileName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {attachedMedia.kind === 'video'
                                ? `Video corto (${attachedMedia.durationSeconds || 5}s) listo para analizar`
                                : 'Imagen lista para que NixoraAI la lea'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedMedia(null)}
                          className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          aria-label="Quitar archivo adjunto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex items-end gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => setCaptureModalOpen(true)}
                        title="Capturar pantalla, cámara o video de 5s"
                        aria-label="Capturar imagen o video de 5 segundos"
                        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#0B0D14] text-violet-300 transition-colors hover:border-violet-500 hover:bg-slate-800"
                      >
                        <Camera className="h-4 w-4" />
                      </button>

                      <textarea
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Escribe qué pasa en nixora.play.hosting o adjunta captura/video 5s..."
                        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700/90 bg-[#0B0D14] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || (!inputText.trim() && !attachedMedia)}
                        className="inline-flex h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 whitespace-nowrap"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Enviar</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Right Side Anti-Stress Mini-Game Panel (Desktop XL) */}
              {showSideGame && (
                <aside className="hidden w-[400px] shrink-0 flex-col overflow-y-auto border-l border-slate-800/80 bg-[#0E111A] p-4 xl:flex">
                  <div className="mb-3">
                    <h2 className="font-display text-sm font-bold text-slate-100">
                      Minijuegos Antiestrés
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Relájate mientras NixoraAI analiza tu captura o consulta
                    </p>
                  </div>
                  <StressGames compact />
                </aside>
              )}
            </div>
          )}

          {activeView === 'games' && (
            <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-10 lg:pb-10">
              <div className="mx-auto max-w-4xl space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-50 lg:text-2xl">
                    12 Minijuegos Antiestrés Nixora
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 lg:text-sm">
                    Juega desde PC o móvil mientras el equipo revisa tu reporte o para desconectar.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#121521] p-4 lg:p-6">
                  <StressGames compact={false} />
                </div>
              </div>
            </div>
          )}

          {activeView === 'reports' && (
            <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-10 lg:pb-10">
              <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-50 lg:text-2xl">
                      Historial de Reportes Enviados
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 lg:text-sm">
                      Correos enviados mediante Gmail a paracrafteros@gmail.com desde NixoraAI Helper.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTickets(user?.email)}
                    disabled={ticketsLoading}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 bg-[#121521] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-[#121521] p-8 text-center lg:p-10">
                    <Mail className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                    <p className="font-display text-base font-semibold text-slate-200">
                      Aún no has enviado reportes a moderadores
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                      Cuéntale a NixoraAI Helper lo que te ocurrió en nixora.play.hosting y confirma cuando te proponga escribir a paracrafteros@gmail.com.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('chat')}
                      className="mt-4 min-h-[42px] rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                    >
                      Iniciar consulta con la IA
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#121521]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="px-4 py-3 font-medium">ID</th>
                          <th className="px-4 py-3 font-medium">Asunto</th>
                          <th className="px-4 py-3 font-medium">Categoría</th>
                          <th className="px-4 py-3 font-medium">Jugador</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          <th className="px-4 py-3 text-right font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-mono text-violet-300 tabular-nums">
                              {t.id}
                            </td>
                            <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-100">
                              {t.subject}
                            </td>
                            <td className="px-4 py-3 text-slate-300">{t.category}</td>
                            <td className="px-4 py-3 text-slate-300">{t.playerName}</td>
                            <td className="px-4 py-3 text-emerald-400">{t.status}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400 tabular-nums">
                              {new Date(t.createdAt).toLocaleDateString('es-ES')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'server' && (
            <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-10 lg:pb-10">
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-50 lg:text-2xl">
                      Servidor Oficial Nixora
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 lg:text-sm">
                      Información de conexión, verificación de red y contacto directo con moderación.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PWAInstallButton compact />
                    <button
                      type="button"
                      onClick={checkServerStatus}
                      disabled={checkingServer}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 bg-[#121521] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingServer ? 'animate-spin' : ''}`} />
                      Comprobar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-[#121521] p-5">
                    <p className="text-xs text-slate-400">Dirección IP del servidor</p>
                    <p className="mt-1.5 font-mono text-base font-semibold text-violet-300">
                      nixora.play.hosting
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyIp}
                      className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"
                    >
                      {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedIp ? 'IP copiada' : 'Copiar dirección IP'}
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#121521] p-5">
                    <p className="text-xs text-slate-400">Sondeo TCP (Puerto 25565)</p>
                    <p className="mt-1.5 font-display text-base font-semibold text-slate-100 tabular-nums">
                      {checkingServer
                        ? 'Comprobando...'
                        : serverStatus?.reachable
                          ? `Accesible · ${serverStatus.latencyMs} ms`
                          : 'Sin respuesta directa'}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {serverStatus?.note || 'Listo para comprobar'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#121521] p-5">
                    <p className="text-xs text-slate-400">Correo de Moderación</p>
                    <p className="mt-1.5 truncate font-mono text-sm font-semibold text-slate-100">
                      paracrafteros@gmail.com
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Canal verificado por Gmail OAuth desde la app.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-800 bg-[#121521] p-5 lg:p-6">
                  <h3 className="font-display text-base font-bold text-slate-100">
                    ¿En qué puede ayudarte NixoraAI Helper?
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      {
                        title: 'Robos, griefing y estafas',
                        desc: 'Describe coordenadas, nick del jugador implicado o adjunta una captura / video de 5s para paracrafteros@gmail.com.',
                        prompt: 'Necesito reportar un robo o griefing en mi zona dentro de nixora.play.hosting.',
                      },
                      {
                        title: 'Bugs y pérdida de objetos',
                        desc: 'Si un fallo del servidor borró ítems o bloqueó tu progreso, NixoraAI recopila los datos para moderación.',
                        prompt: 'Perdí objetos por un bug en nixora.play.hosting y necesito ayuda de un moderador.',
                      },
                      {
                        title: 'Problemas de acceso y lag',
                        desc: 'Diagnóstico guiado para errores de conexión, DNS o rendimiento en PC Windows y móvil.',
                        prompt: 'Tengo problemas de conexión o lag al entrar a nixora.play.hosting.',
                      },
                      {
                        title: 'Apelaciones de sanciones',
                        desc: 'Redacción ordenada de tu apelación para enviarla al equipo de moderación si estás de acuerdo.',
                        prompt: 'Quiero apelar una sanción o baneo injusto en nixora.play.hosting.',
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0B0D14] p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{card.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">{card.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('chat');
                            sendMessage(card.prompt);
                          }}
                          className="mt-3 min-h-[38px] self-start text-xs font-semibold text-violet-300 hover:text-violet-200"
                        >
                          Consultar con NixoraAI →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar (56px height -> total mobile sticky <= 14%) */}
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-4 border-t border-slate-800/90 bg-[#0F121C]/95 backdrop-blur-md lg:hidden"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? 'text-violet-300' : 'text-slate-400'
              }`}
            >
              <span>{item.icon}</span>
              <span className="truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating In-App Toast Notification (PC & Mobile) */}
      {activeToast && (
        <div className="fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-32px)] rounded-xl border border-violet-500/40 bg-[#151828]/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-xs font-bold text-slate-50">
                {activeToast.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                {activeToast.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800"
              aria-label="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Offline PWA Banner */}
      <OfflineIndicator />

      {/* Multimedia Capture + 5s Video + Mobile Permission Modal */}
      <MediaCaptureModal
        isOpen={captureModalOpen}
        onClose={() => setCaptureModalOpen(false)}
        onAttachMedia={(media) => {
          setAttachedMedia(media);
          pushNotification(
            media.kind === 'video' ? 'Video de 5s adjuntado' : 'Captura adjuntada',
            'Escribe tu duda o pulsa Enviar para que NixoraAI lo analice.',
            'info'
          );
        }}
      />

      {/* Auth Modal (Google + Normal Email with 6-digit Code) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      {/* Explicit Gmail Send Confirmation Modal */}
      <GmailConfirmModal
        isOpen={confirmModalOpen}
        draft={activeDraft}
        user={user}
        onClose={() => setConfirmModalOpen(false)}
        onConnectGoogle={(googleUser) => {
          handleAuthenticated(googleUser);
        }}
        onSent={handleGmailSent}
      />
    </div>
  );
}
