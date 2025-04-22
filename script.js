// script.js
// (unchanged)
let lastScroll = 0;
const header   = document.getElementById('site-nav');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  const current = window.pageYOffset;
  header.classList.toggle('hide', current > lastScroll && current > 100);
  lastScroll = current;

  sections.forEach(sec => {
    const top    = sec.offsetTop - 100;
    const height = sec.offsetHeight;
    const id     = sec.getAttribute('id');
    if (current >= top && current < top + height) {
      navLinks.forEach(l => l.classList.remove('active'));
      document.querySelector(`.nav-link[href="#${id}"]`).classList.add('active');
    }
  });
});

document.querySelectorAll('.typewriter').forEach(el => {
  const txt = el.dataset.text;
  void el.offsetWidth;
  el.textContent = txt;
});

const themeToggle = document.getElementById('theme-toggle');
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

const chatWindow = document.getElementById('chat-window');
const chatForm   = document.getElementById('chat-form');
const userInput  = document.getElementById('user-input');
const API_URL    = "http://localhost:4000/api/chat";

function appendMessage(text, sender='ai') {
  const div = document.createElement('div');
  div.textContent = text;
  div.className = sender;
  chatWindow.append(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const q = userInput.value.trim();
  if (!q) return;
  appendMessage(q, 'user');
  userInput.value = '';
  const loading = document.createElement('div');
  loading.textContent = '…typing…';
  loading.className = 'ai';
  chatWindow.append(loading);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q })
    });
    const { answer, error } = await res.json();
    loading.remove();
    appendMessage(answer || `⚠️ ${error}`, 'ai');
  } catch {
    loading.remove();
    appendMessage('❌ Failed to connect', 'ai');
  }
});
