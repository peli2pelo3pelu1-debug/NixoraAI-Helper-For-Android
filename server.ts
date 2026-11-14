import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = process.env.NIXORA_DATA_FILE || path.join(os.tmpdir(), 'nixora_helper_store.json');
const MODERATOR_EMAIL = 'paracrafteros@gmail.com';
const SERVER_HOST = 'nixora.play.hosting';
const SERVER_PORT = 25565;

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  verified: boolean;
  createdAt: string;
}

interface PendingOtp {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  code: string;
  expiresAt: number;
}

interface StoredTicket {
  id: string;
  userEmail: string;
  playerName: string;
  recipient: string;
  subject: string;
  category: string;
  urgency: string;
  body: string;
  status: string;
  gmailMessageId?: string;
  createdAt: string;
}

interface StoreData {
  users: Record<string, StoredUser>;
  tickets: StoredTicket[];
}

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      return {
        users: parsed.users || {},
        tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      };
    }
  } catch (err) {
    console.error('Failed to load store:', err);
  }
  return { users: {}, tickets: [] };
}

function saveStore(data: StoreData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

const pendingOtps = new Map<string, PendingOtp>();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `Eres NixoraAI Helper, la inteligencia artificial oficial de asistencia para jugadores del servidor oficial de Minecraft "${SERVER_HOST}".
Tu estilo es cercano, claro, gamer y resolutivo, diseñado para PC Windows y versión móvil PWA. Hablas siempre en español (a menos que el usuario te hable en otro idioma).

Tus responsabilidades y conocimiento integrado:
1. Dominas todo tipo de ayuda para "${SERVER_HOST}": supervivencia, Skyblock, PvP, redstone, granjas sin lag, economía, clanes, comandos útiles, optimización de FPS/ping en PC y móvil, diagnóstico de errores de Java/Bedrock/conexión, ideas creativas de construcción, eventos y estrategias dentro del servidor.
2. ANÁLISIS VISUAL Y DE VIDEO (MULTIMODAL):
   - Si el jugador adjunta una captura de pantalla, fotografía o un clip de video (de hasta 5 segundos), analiza con detalle todo lo que se ve: mensajes de error en pantalla, coordenadas F3, chat de Minecraft, inventario, jugadores sospechosos o fallos visuales, e intégralo en tu respuesta y en el reporte al moderador.
3. REGLA CLAVE DE ESCALADO A MODERADOR:
   - Cuando el jugador te pida ayuda con un problema o situación que le está pasando dentro del servidor "${SERVER_HOST}" (por ejemplo: bugs, robo/griefing, hackers, pérdida de objetos, sanciones/baneos, problemas de cuenta o compras, fallos del servidor), debes ayudarle con pasos iniciales útiles Y SIEMPRE avisarle claramente que puedes enviar su caso a un moderador oficial ("${MODERATOR_EMAIL}") para que revise lo que pasó, preguntándole explícitamente si desea que lo envíes (por ejemplo: "¿Quieres que envíe este reporte por Gmail al moderador (${MODERATOR_EMAIL}) para que revise lo ocurrido?").
   - En ese turno, establece "needsModeratorEscalation": true y "escalationConfirmedByUser": false, y redacta un "reportSummary" completo y profesional en español.
   - Si en el turno inmediatamente anterior propusiste enviar el reporte al moderador y el jugador responde aceptando (ej. "sí", "si", "claro", "acepto", "envíalo", "dale", "por favor", "ok"), establece "needsModeratorEscalation": true y "escalationConfirmedByUser": true, confirma amablemente que aceptas enviar el reporte al moderador (${MODERATOR_EMAIL}) y pide que pulse el botón de confirmación final de Gmail que aparecerá en pantalla.
   - Si el usuario hace una pregunta general, pide ideas de construcción/redstone/clanes o consejos sin reportar una incidencia, respóndele con soluciones completas y creativas manteniendo "needsModeratorEscalation": false y "escalationConfirmedByUser": false.
4. No inventes datos de jugadores conectados ni prometas devoluciones automáticas; di que el equipo de moderación revisará el caso.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'NixoraAI Helper' });
  });

  // Server reachability probe for nixora.play.hosting
  app.get('/api/server-status', async (_req: Request, res: Response) => {
    const start = Date.now();
    const checkTcp = () =>
      new Promise<{ reachable: boolean; latencyMs: number | null; note: string }>((resolve) => {
        const socket = new net.Socket();
        let settled = false;

        const finish = (reachable: boolean, note: string) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve({
            reachable,
            latencyMs: reachable ? Date.now() - start : null,
            note,
          });
        };

        socket.setTimeout(2500);
        socket.on('connect', () => finish(true, 'Puerto Minecraft 25565 accesible'));
        socket.on('timeout', () => finish(false, 'Tiempo de espera agotado al consultar puerto 25565'));
        socket.on('error', (err: NodeJS.ErrnoException) =>
          finish(false, err.code === 'ENOTFOUND' ? 'Dominio no resuelto desde este entorno' : `Conexión no disponible (${err.code || 'red'})`)
        );
        socket.connect(SERVER_PORT, SERVER_HOST);
      });

    const result = await checkTcp();
    res.json({
      host: SERVER_HOST,
      port: SERVER_PORT,
      reachable: result.reachable,
      latencyMs: result.latencyMs,
      checkedAt: new Date().toISOString(),
      note: result.note,
    });
  });

  // AI Chat endpoint using @google/genai server-side (text + image/video multimodal)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, playerName, userEmail, hasPendingEscalation, media } = req.body as {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        playerName?: string;
        userEmail?: string;
        hasPendingEscalation?: boolean;
        media?: {
          mimeType: string;
          base64Data: string;
          kind: 'image' | 'video';
        };
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Se requiere al menos un mensaje.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY no está configurada en el servidor.',
        });
        return;
      }

      const conversationText = messages
        .slice(-14)
        .map((m) => `${m.role === 'user' ? 'Jugador' : 'NixoraAI Helper'}: ${m.content}`)
        .join('\n\n');

      const contextPrompt = `Contexto de sesión:
- Servidor oficial: ${SERVER_HOST}
- Correo del moderador: ${MODERATOR_EMAIL}
- Nombre del usuario/jugador: ${playerName || 'Jugador'}
- Correo del usuario: ${userEmail || 'No proporcionado'}
- ¿Hay una propuesta de envío al moderador esperando respuesta del jugador?: ${hasPendingEscalation ? 'SÍ' : 'NO'}
${media ? `- Archivo multimedia adjunto (${media.kind === 'video' ? 'video de máx. 5s' : 'imagen/captura'}): Analiza el contenido visual cuidadosamente.` : ''}

Historial de conversación:
${conversationText}

Responde al último mensaje del jugador siguiendo estrictamente tus instrucciones.`;

      const contentsPayload =
        media && media.base64Data && media.mimeType
          ? {
              parts: [
                {
                  inlineData: {
                    mimeType: media.mimeType,
                    data: media.base64Data,
                  },
                },
                { text: contextPrompt },
              ],
            }
          : contextPrompt;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contentsPayload,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Respuesta clara, empática y útil de NixoraAI Helper en español.',
              },
              needsModeratorEscalation: {
                type: Type.BOOLEAN,
                description:
                  'true si el jugador reporta un problema/incidencia del servidor nixora.play.hosting que requiere revisión de moderador o está confirmando uno pendiente.',
              },
              escalationConfirmedByUser: {
                type: Type.BOOLEAN,
                description:
                  'true ÚNICAMENTE si había un escalado pendiente y el jugador acaba de decir que sí o aceptar enviarlo.',
              },
              reportSummary: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description:
                      'Una de: Bug Técnico, Reporte de Jugador, Apelación, Objetos Perdidos, Soporte General',
                  },
                  playerName: { type: Type.STRING },
                  urgency: {
                    type: Type.STRING,
                    description: 'Una de: Baja, Media, Alta',
                  },
                  body: {
                    type: Type.STRING,
                    description: 'Cuerpo completo y detallado del reporte para el moderador paracrafteros@gmail.com',
                  },
                },
                required: ['subject', 'category', 'playerName', 'urgency', 'body'],
              },
            },
            required: [
              'reply',
              'needsModeratorEscalation',
              'escalationConfirmedByUser',
              'reportSummary',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      res.json({
        reply: parsed.reply || 'No pude generar una respuesta en este momento.',
        needsModeratorEscalation: Boolean(parsed.needsModeratorEscalation),
        escalationConfirmedByUser: Boolean(parsed.escalationConfirmedByUser),
        reportSummary: {
          recipient: MODERATOR_EMAIL,
          subject: parsed.reportSummary?.subject || `Reporte en ${SERVER_HOST}`,
          category: parsed.reportSummary?.category || 'Soporte General',
          playerName: parsed.reportSummary?.playerName || playerName || 'Jugador de Nixora',
          urgency: parsed.reportSummary?.urgency || 'Media',
          body: parsed.reportSummary?.body || '',
        },
      });
    } catch (error: unknown) {
      console.error('Error in /api/chat:', error);
      const message =
        error instanceof Error ? error.message : 'Error interno al consultar NixoraAI.';
      res.status(500).json({ error: message });
    }
  });

  // Normal Email Auth Step 1: Request 6-digit verification code
  app.post('/api/auth/request-code', async (req: Request, res: Response) => {
    try {
      const { email, password, name, mode } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        mode?: 'login' | 'register';
      };

      const normalizedEmail = (email || '').trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
        return;
      }

      if (!password || password.length < 6) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
      }

      const store = loadStore();
      const existing = store.users[normalizedEmail];

      if (mode === 'login' && existing) {
        const candidateHash = hashPassword(password, existing.salt);
        if (candidateHash !== existing.passwordHash) {
          res.status(401).json({ error: 'Contraseña incorrecta para este correo.' });
          return;
        }
      }

      const salt = existing?.salt || crypto.randomBytes(16).toString('hex');
      const passwordHash = existing?.passwordHash || hashPassword(password, salt);
      const displayName =
        (name || '').trim() || existing?.name || normalizedEmail.split('@')[0];

      const code = String(crypto.randomInt(100000, 1000000));
      const expiresAt = Date.now() + 10 * 60 * 1000;

      pendingOtps.set(normalizedEmail, {
        email: normalizedEmail,
        name: displayName,
        passwordHash,
        salt,
        code,
        expiresAt,
      });

      let deliveryMode: 'email' | 'sandbox' = 'sandbox';
      if (process.env.RESEND_API_KEY) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM || 'NixoraAI Helper <onboarding@resend.dev>',
              to: [normalizedEmail],
              subject: `Tu código de verificación de NixoraAI Helper: ${code}`,
              text: `Hola ${displayName},\n\nTu código de verificación para iniciar sesión en NixoraAI Helper (${SERVER_HOST}) es: ${code}\n\nEste código caduca en 10 minutos.`,
            }),
          });
          if (emailRes.ok) {
            deliveryMode = 'email';
          }
        } catch (err) {
          console.warn('Resend delivery failed, falling back to sandbox preview:', err);
        }
      }

      res.json({
        ok: true,
        email: normalizedEmail,
        deliveryMode,
        expiresInSeconds: 600,
        // Provided only when no external email provider is configured so the user can complete verification
        previewCode: deliveryMode === 'sandbox' ? code : undefined,
      });
    } catch (error) {
      console.error('Error in /api/auth/request-code:', error);
      res.status(500).json({ error: 'No se pudo generar el código de verificación.' });
    }
  });

  // Normal Email Auth Step 2: Verify 6-digit code
  app.post('/api/auth/verify-code', (req: Request, res: Response) => {
    try {
      const { email, code } = req.body as { email?: string; code?: string };
      const normalizedEmail = (email || '').trim().toLowerCase();
      const cleanedCode = (code || '').trim();

      const pending = pendingOtps.get(normalizedEmail);
      if (!pending) {
        res.status(400).json({
          error: 'No hay un código pendiente para este correo. Solicita uno nuevo.',
        });
        return;
      }

      if (Date.now() > pending.expiresAt) {
        pendingOtps.delete(normalizedEmail);
        res.status(400).json({
          error: 'El código de verificación ha expirado. Solicita uno nuevo.',
        });
        return;
      }

      if (pending.code !== cleanedCode) {
        res.status(400).json({ error: 'El código ingresado no es correcto.' });
        return;
      }

      pendingOtps.delete(normalizedEmail);

      const store = loadStore();
      const existing = store.users[normalizedEmail];
      const userId =
        existing?.id || `usr_${crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12)}`;

      store.users[normalizedEmail] = {
        id: userId,
        email: normalizedEmail,
        name: pending.name,
        passwordHash: pending.passwordHash,
        salt: pending.salt,
        verified: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      saveStore(store);

      res.json({
        ok: true,
        user: {
          id: userId,
          email: normalizedEmail,
          name: pending.name,
          provider: 'email',
          emailVerified: true,
        },
      });
    } catch (error) {
      console.error('Error in /api/auth/verify-code:', error);
      res.status(500).json({ error: 'Error al verificar el código.' });
    }
  });

  // Moderator tickets history
  app.get('/api/tickets', (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const store = loadStore();
    const tickets = email
      ? store.tickets.filter((t) => t.userEmail.toLowerCase() === email)
      : store.tickets;
    res.json({ tickets: tickets.slice().reverse() });
  });

  app.post('/api/tickets', (req: Request, res: Response) => {
    try {
      const { userEmail, playerName, recipient, subject, category, urgency, body, status, gmailMessageId } =
        req.body as Partial<StoredTicket>;

      if (!subject || !body) {
        res.status(400).json({ error: 'El asunto y el contenido del reporte son obligatorios.' });
        return;
      }

      const store = loadStore();
      const newTicket: StoredTicket = {
        id: `NX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        userEmail: (userEmail || 'anonimo@nixora.local').toLowerCase(),
        playerName: playerName || 'Jugador',
        recipient: recipient || MODERATOR_EMAIL,
        subject,
        category: category || 'Soporte General',
        urgency: urgency || 'Media',
        body,
        status: status || 'Enviado por Gmail',
        gmailMessageId,
        createdAt: new Date().toISOString(),
      };

      store.tickets.push(newTicket);
      saveStore(store);
      res.status(201).json({ ticket: newTicket });
    } catch (error) {
      console.error('Error in POST /api/tickets:', error);
      res.status(500).json({ error: 'No se pudo guardar el reporte.' });
    }
  });

  const isProduction =
    process.env.NODE_ENV === 'production' || path.basename(__filename) === 'server.js';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NixoraAI Helper server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
