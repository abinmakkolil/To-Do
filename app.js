// app.js
// ====== IMPORTANT: Insert your Firebase config below (Step 3 in README) ======
const firebaseConfig = {
apiKey: "AIzaSyBfs8z_6t4zgTCVVCkqv7cfEDAQzgx4l3o",
  authDomain: "to-do-list-75f59.firebaseapp.com",
  projectId: "to-do-list-75f59",
  storageBucket: "to-do-list-75f59.firebasestorage.app",
  messagingSenderId: "397431693639",
  appId: "1:397431693639:web:6ebf04625b26827a08ec62",
  measurementId: "G-F2ZCZFN144"
};
// =============================================================================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elements
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const googleBtn = document.getElementById('googleBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userBox = document.getElementById('userBox');
const userName = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');
const taskForm = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const dueInput = document.getElementById('due');
const notesInput = document.getElementById('notes');
const taskList = document.getElementById('taskList');
const filterSel = document.getElementById('filter');
const notifyBtn = document.getElementById('notifyBtn');
const permStatus = document.getElementById('permStatus');

let uid = null;
let unsubscribe = null;
let timers = new Map();

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js');
      console.log('SW registered');
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  });
}

// Notifications permission UI
updatePermText();
notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('Notifications are not supported in this browser.');
    return;
  }
  const permission = await Notification.requestPermission();
  updatePermText(permission);
});

function updatePermText(p = Notification.permission) {
  permStatus.textContent = `Notification permission: ${p}`;
}

// Auth
googleBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  if (user) {
    uid = user.uid;
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    userBox.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
    userPhoto.src = user.photoURL || 'icon-192.png';
    startTaskListener();
  } else {
    uid = null;
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    userBox.classList.add('hidden');
    stopTaskListener();
    taskList.innerHTML = '';
  }
});

// Firestore listeners
function startTaskListener() {
  stopTaskListener();
  unsubscribe = db.collection('users').doc(uid).collection('tasks')
    .orderBy('due', 'asc')
    .onSnapshot(snap => {
      const tasks = [];
      snap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
      renderTasks(tasks);
      scheduleNotifications(tasks);
    });
}

function stopTaskListener() {
  if (unsubscribe) unsubscribe();
  // clear timers
  timers.forEach(t => clearTimeout(t));
  timers.clear();
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const due = dueInput.value;
  const notes = notesInput.value.trim();
  if (!title || !due) return;
  await db.collection('users').doc(uid).collection('tasks').add({
    title,
    notes,
    due: new Date(due).toISOString(),
    done: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  taskForm.reset();
});

filterSel.addEventListener('change', () => {
  // Re-render based on current snapshot (listener will call renderTasks)
  // No-op here because renderTasks already reads filter value
});

function renderTasks(tasks) {
  const filter = filterSel.value;
  taskList.innerHTML = '';
  tasks
    .filter(t => filter === 'all' ? true : filter === 'pending' ? !t.done : t.done)
    .forEach(task => {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');
      const checkbox = document.createElement('label');
      checkbox.className = 'checkbox';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!task.done;
      const dot = document.createElement('div');
      dot.className = 'dot';
      cb.addEventListener('change', () => toggleDone(task.id, cb.checked));
      checkbox.appendChild(cb);
      checkbox.appendChild(dot);

      const body = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'task-title';
      title.textContent = task.title;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const dueStr = new Date(task.due).toLocaleString();
      meta.textContent = `${dueStr}${task.notes ? ' • ' + task.notes : ''}`;
      body.appendChild(title);
      body.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const del = document.createElement('button');
      del.className = 'btn danger';
      del.textContent = 'Delete';
      del.addEventListener('click', () => removeTask(task.id));
      actions.appendChild(del);

      li.appendChild(checkbox);
      li.appendChild(body);
      li.appendChild(actions);
      taskList.appendChild(li);
    });
}

async function toggleDone(id, done) {
  await db.collection('users').doc(uid).collection('tasks').doc(id).update({ done });
}

async function removeTask(id) {
  await db.collection('users').doc(uid).collection('tasks').doc(id).delete();
}

// Notification scheduling (works while the site is open; SW shows native toast)
async function scheduleNotifications(tasks) {
  // clear old timers
  timers.forEach(t => clearTimeout(t));
  timers.clear();

  // If no permission, no schedule
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker.getRegistration();
  for (const t of tasks) {
    if (t.done) continue;
    const dueMs = new Date(t.due).getTime();
    const now = Date.now();
    const delta = dueMs - now;
    if (delta <= 0) {
      // overdue -> notify immediately once
      reg && reg.showNotification('Task due', {
        body: t.title,
        tag: `task-${t.id}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png'
      });
      continue;
    }
    // To avoid extremely long timers limits, cap scheduling to 24h and refresh on snapshot updates
    if (delta > 24 * 60 * 60 * 1000) continue;

    const handle = setTimeout(async () => {
      const reg2 = await navigator.serviceWorker.getRegistration();
      reg2 && reg2.showNotification('Task due', {
        body: t.title,
        tag: `task-${t.id}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { id: t.id }
      });
      // Optional: mark as done automatically? (left to user)
    }, delta);
    timers.set(t.id, handle);
  }
}
