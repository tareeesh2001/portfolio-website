// Chat client for Tareesh's AI assistant.
// Flow: email gate -> validated -> chat. Email is attached to every request.
// The API key lives only in the serverless function at /api/chat.

(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var API_URL = '/api/chat';

  var sessionEmail = null;
  var sending = false;

  var gate = document.getElementById('gate');
  var gateForm = document.getElementById('gate-form');
  var emailInput = document.getElementById('email');
  var gateErr = document.getElementById('gate-err');

  var chat = document.getElementById('chat');
  var messages = document.getElementById('messages');
  var starters = document.getElementById('starters');
  var composer = document.getElementById('composer');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('send');

  // ---------- Gate ----------
  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    if (!EMAIL_RE.test(email)) {
      emailInput.classList.add('invalid');
      gateErr.textContent = 'Please enter a valid email address.';
      emailInput.focus();
      return;
    }
    sessionEmail = email;
    gate.style.display = 'none';
    chat.classList.add('active');
    addMessage('bot', "Hi, I'm an assistant for Tareesh Muluguru. Ask me about his roles, skills, or projects and I'll answer from his resume. What would you like to know?");
    input.focus();
  });

  emailInput.addEventListener('input', function () {
    emailInput.classList.remove('invalid');
    gateErr.textContent = '';
  });

  // ---------- Starter chips ----------
  starters.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    autosize();
    sendQuestion();
  });

  // ---------- Composer ----------
  composer.addEventListener('submit', function (e) {
    e.preventDefault();
    sendQuestion();
  });

  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  });

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }

  // ---------- Send ----------
  function sendQuestion() {
    if (sending) return;
    var q = input.value.trim();
    if (!q) return;
    if (!sessionEmail) return;

    addMessage('user', q);
    input.value = '';
    autosize();
    hideStarters();

    sending = true;
    sendBtn.disabled = true;
    var typing = addTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sessionEmail, question: q })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        typing.remove();
        if (r.ok && r.data && r.data.answer) {
          addMessage('bot', r.data.answer);
        } else {
          addError((r.data && r.data.error) ? r.data.error : 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        typing.remove();
        addError("I couldn't reach the assistant. Please check your connection and try again.");
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // ---------- Rendering ----------
  function addMessage(who, text) {
    var msg = document.createElement('div');
    msg.className = 'msg ' + who;
    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = who === 'bot' ? 'AI' : 'You';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    msg.appendChild(avatar);
    msg.appendChild(bubble);
    messages.appendChild(msg);
    scrollDown();
    return msg;
  }

  function addError(text) {
    var msg = addMessage('bot', text);
    msg.querySelector('.bubble').classList.add('error');
  }

  function addTyping() {
    var msg = document.createElement('div');
    msg.className = 'msg bot';
    msg.innerHTML = '<div class="avatar">AI</div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>';
    messages.appendChild(msg);
    scrollDown();
    return msg;
  }

  function hideStarters() {
    if (starters) starters.style.display = 'none';
  }

  function scrollDown() {
    messages.scrollTop = messages.scrollHeight;
  }
})();
