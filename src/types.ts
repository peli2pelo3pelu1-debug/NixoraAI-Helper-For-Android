export type AuthProviderType = 'google' | 'email';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string | null;
  provider: AuthProviderType;
  emailVerified: boolean;
}

export interface ModeratorReportDraft {
  recipient: string;
  subject: string;
  category: 'Bug Técnico' | 'Reporte de Jugador' | 'Apelación' | 'Objetos Perdidos' | 'Soporte General';
  playerName: string;
  urgency: 'Baja' | 'Media' | 'Alta';
  body: string;
}

export interface MediaAttachment {
  kind: 'image' | 'video';
  mimeType: string;
  base64Data: string;
  previewUrl: string;
  fileName: string;
  durationSeconds?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachment?: {
    kind: 'image' | 'video';
    previewUrl: string;
    fileName: string;
    durationSeconds?: number;
  };
  escalation?: {
    draft: ModeratorReportDraft;
    status: 'pending_user_decision' | 'confirmed_ready' | 'sent' | 'cancelled';
    gmailMessageId?: string;
  };
}

export interface SentTicket {
  id: string;
  userEmail: string;
  playerName: string;
  recipient: string;
  subject: string;
  category: string;
  urgency: string;
  body: string;
  status: 'Enviado por Gmail' | 'Pendiente de conexión Google';
  gmailMessageId?: string;
  createdAt: string;
}

export interface ServerStatusInfo {
  host: string;
  port: number;
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: string;
  note: string;
}

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  kind: 'info' | 'success' | 'warning';
  createdAt: string;
  read: boolean;
}
