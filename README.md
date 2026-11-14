# NixoraAI Helper

Asistente de inteligencia artificial web (escritorio Windows y PWA móvil) para jugadores del servidor oficial **`nixora.play.hosting`**.

## Características principales

- **Asistente IA (`gemini-4-hydrogen`)**: Responde dudas sobre supervivencia, Skyblock, PvP, redstone, lag/FPS, bugs y reglas del servidor oficial `nixora.play.hosting`.
- **Análisis visual y de video (5s)**: Captura de pantalla en PC, foto con cámara, grabación de clips de hasta 5 segundos o subida desde galería móvil con sistema explícito de permisos multimedia.
- **Escalado a moderadores por Gmail**: Si el jugador acepta enviar su incidencia, prepara y envía un correo electrónico real por Gmail a `paracrafteros@gmail.com` previa confirmación.
- **Doble inicio de sesión**:
  - **Google Sign-In** (Firebase Auth con permiso `gmail.send`).
  - **Correo normal** con código de verificación de 6 dígitos.
- **12 Minijuegos antiestrés** integrados en sala completa y panel lateral mientras la IA responde.
- **Notificaciones PC y Móvil** + instalación PWA (`manifest.webmanifest` y Service Worker).

---

## Subir este proyecto a GitHub

1. Descarga o extrae el proyecto en tu PC y abre una terminal dentro de la carpeta raíz.
2. Crea un repositorio vacío en [github.com/new](https://github.com/new) (por ejemplo, `nixora-ai-helper`).
3. Ejecuta estos comandos (no subas archivos `.env` con claves reales; `.gitignore` ya los protege):

```bash
git init
git add .
git commit -m "Versión inicial de NixoraAI Helper"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/nixora-ai-helper.git
git push -u origin main
```

---

## Convertir el repositorio de GitHub en un Sitio Web público

> **Nota importante:** Como esta aplicación utiliza un servidor Node/Express (`server.ts`) para proteger tu `GEMINI_API_KEY` y gestionar la verificación por código, debes alojarla en un servicio con soporte Node.js (como **Render**, **Railway** o **Google Cloud Run**), no en GitHub Pages estático.

### Opción A: Publicar gratis en Render.com desde GitHub
Este proyecto ya incluye `render.yaml` listo para usarse:
1. Crea una cuenta en [render.com](https://render.com) conectada con tu cuenta de GitHub.
2. Elige **New → Web Service** (o **Blueprint**) y selecciona tu repositorio `nixora-ai-helper`.
3. Render detectará automáticamente:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. En **Environment Variables**, agrega:
   - `GEMINI_API_KEY`: tu clave de Gemini AI Studio.
   - *(Opcional)* `RESEND_API_KEY` y `RESEND_FROM`: si quieres enviar correos reales para el código de verificación de 6 dígitos.
5. Pulsa **Deploy Web Service** y obtendrás tu URL pública `https://nixora-ai-helper.onrender.com`.

### Opción B: Publicar con Docker (Google Cloud Run / Railway / VPS)
El proyecto incluye un `Dockerfile` multi-etapa listo para producción (`PORT=3000`).

### Paso obligatorio para "Iniciar sesión con Google" en tu dominio web
Cuando tengas tu dominio final (por ejemplo `nixora-ai-helper.onrender.com` o tu dominio personalizado):
1. Ve a **Firebase Console** → proyecto `gen-lang-client-0999684804` → **Authentication → Settings → Authorized domains**.
2. Añade tu nuevo dominio web público para que el botón **Iniciar sesión con Google** y el envío por Gmail funcionen en tu sitio web.

---

## Ejecutar localmente en Windows

```bash
npm install
cp .env.example .env
# Agrega tu GEMINI_API_KEY en el archivo .env
npm run dev
```

Abre `http://localhost:3000` en tu navegador.
