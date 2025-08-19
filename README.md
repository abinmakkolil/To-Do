# Smart To‑Do Reminders (HTML + CSS + JS + Firebase)
A simple final‑year project: Google sign‑in, per‑user tasks in Firestore, and due‑time notifications using the Web Notifications API (via a Service Worker).

> ⚠️ Notifications fire while the site is open (foreground or background tab). To notify when the browser is fully **closed**, you need Push (e.g., Firebase Cloud Messaging) + a backend server, which is beyond plain HTML/JS.

## 1) Setup Firebase (10 minutes)
1. Go to [Firebase Console] → Add project.
2. Enable **Authentication** → **Sign‑in method** → turn on **Google** provider.
3. Enable **Firestore Database** → Start in test mode (for development).
4. Go to **Project settings** → **General** → **Your apps (Web)** → **Config**. Copy the config object.

## 2) Put your Firebase config
Open `app.js` and replace the placeholder inside:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 3) Run locally
Use any static server (because service workers require http/https):
- VS Code Live Server, or
- `python -m http.server 5500`

Then open: `http://localhost:5500/`

## 4) Grant notifications
- Click **Enable Notifications** in the UI and **Allow** when your browser prompts.
- On first run, a Service Worker is registered (for native toasts).

## 5) How notifications work here
- For each pending task with a due time within the next 24h, the app sets a timer.
- When it triggers, the Service Worker displays a native notification with the task title.
- If the time is in the past when you open the site, it will notify immediately once.

## 6) Deploy (optional)
- Firebase Hosting, GitHub Pages (with a custom domain), Netlify, Vercel — any static host works.
- For HTTPS (required for notifications/PWA), use a host with SSL (all above provide it).

## 7) Project structure
```
.
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
├── icon-192.png
├── icon-512.png
└── README.md
```

## 8) Notes for evaluation
- **Google login**: via Firebase Authentication (Google provider).
- **Per‑user storage**: Firestore under `users/{uid}/tasks` collection.
- **Notifications**: Web Notifications + Service Worker (`showNotification`) so toasts appear even if tab is in background.
- **No backend needed**: everything runs in the browser.
- **PWA-ready**: installable; persists login; works offline for viewing cached shell (online required to sync tasks).

---

Happy building! 🎉
