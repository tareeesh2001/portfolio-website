// Chat client for Tareesh's AI assistant.
// Flow: email gate -> (email code verification) -> chat.
// When verification is configured server-side, the visitor must enter a 6-digit
// code emailed to them; the server returns a session token that is attached to
// every chat request. When verification is NOT configured, the server replies
// "verification_disabled" and the client goes straight to chat using the email.

(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var API_CHAT = '/api/chat';
  var API_VERIFY_START = '/api/verify/start';
  var API_VERIFY_CHECK = '/api/verify/check';

  var pendingEmail = null;   // email entered at the gate, awaiting code
  var sessionEmail = null;   // confirmed identity
  var sessionToken = null;   // set when verification is enabled
  var sending = false;
  var blocked = false;       // true once the daily limit is hit

  var gate = document.getElementById('gate');
  var gateForm = document.getElementById('gate-form');
  var emailInput = document.getElementById('email');
  var gateErr = document.getElementById('gate-err');
  var gateBtn = gateForm.querySelector('.btn-start');

  var verify = document.getElementById('verify');
  var verifyForm = document.getElementById('verify-form');
  var codeInput = document.getElementById('code');
  var verifyErr = document.getElementById('verify-err');
  var verifyEmailSpan = document.getElementById('verify-email');
  var resendBtn = document.getElementById('resend-btn');
  var resendNote = document.getElementById('resend-note');

  var chat = document.getElementById('chat');
  var messages = document.getElementById('messages');
  var starters = document.getElementById('starters');
  var composer = document.getElementById('composer');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('send');

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  // ---------- Step 1: email gate ----------
  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    if (!EMAIL_RE.test(email)) {
      emailInput.classList.add('invalid');
      gateErr.textContent = 'Please enter a valid email address.';
      emailInput.focus();
      return;
    }
    gateErr.textContent = '';
    gateBtn.disabled = true;
    gateBtn.textContent = 'Sending...';

    postJSON(API_VERIFY_START, { email: email })
      .then(function (r) {
        if (r.ok && r.data.status === 'code_sent') {
          pendingEmail = email;
          showVerify(email);
        } else if (r.ok && r.data.status === 'verification_disabled') {
          sessionEmail = email;
          startChat();
        } else {
          gateErr.textContent = r.data.error || 'Something went wrong. Please try again.';
        }
      })
      .catch(function () {
        gateErr.textContent = "Couldn't reach the server. Please try again.";
      })
      .finally(function () {
        gateBtn.disabled = false;
        gateBtn.innerHTML = 'Start chatting <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
      });
  });

  emailInput.addEventListener('input', function () {
    emailInput.classList.remove('invalid');
    gateErr.textContent = '';
  });

  // ---------- Step 2: code verification ----------
  function showVerify(email) {
    gate.style.display = 'none';
    verify.style.display = '';
    verifyEmailSpan.textContent = email;
    codeInput.value = '';
    verifyErr.textContent = '';
    codeInput.focus();
  }

  verifyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      verifyErr.textContent = 'Enter the 6-digit code from your email.';
      codeInput.focus();
      return;
    }
    verifyErr.textContent = '';
    var btn = verifyForm.querySelector('.btn-start');
    btn.disabled = true;

    postJSON(API_VERIFY_CHECK, { email: pendingEmail, code: code })
      .then(function (r) {
        if (r.ok && r.data.token) {
          sessionToken = r.data.token;
          sessionEmail = pendingEmail;
          startChat();
        } else if (r.ok && r.data.status === 'verification_disabled') {
          sessionEmail = pendingEmail;
          startChat();
        } else {
          verifyErr.textContent = r.data.error || 'That code did not work. Please try again.';
        }
      })
      .catch(function () {
        verifyErr.textContent = "Couldn't reach the server. Please try again.";
      })
      .finally(function () { btn.disabled = false; });
  });

  codeInput.addEventListener('input', function () { verifyErr.textContent = ''; });

  resendBtn.addEventListener('click', function () {
    if (!pendingEmail) return;
    resendNote.textContent = '';
    resendBtn.disabled = true;
    postJSON(API_VERIFY_START, { email: pendingEmail })
      .then(function (r) {
        if (r.ok && r.data.status === 'code_sent') {
          resendNote.textContent = 'New code sent.';
        } else {
          verifyErr.textContent = r.data.error || 'Could not resend. Try again shortly.';
        }
      })
      .catch(function () { verifyErr.textContent = "Couldn't reach the server."; })
      .finally(function () {
        setTimeout(function () { resendBtn.disabled = false; }, 1500);
      });
  });

  // ---------- Step 3: chat ----------
  function startChat() {
    gate.style.display = 'none';
    verify.style.display = 'none';
    chat.classList.add('active');
    addMessage('bot', "Hi, I'm Tareesh's assistant. Ask me about his roles, skills, or projects and I'll answer from his resume and project history. What would you like to know?");
    input.focus();
  }

  starters.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    autosize();
    sendQuestion();
  });

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

  function sendQuestion() {
    if (sending || blocked) return;
    var q = input.value.trim();
    if (!q) return;

    addMessage('user', q);
    input.value = '';
    autosize();
    hideStarters();

    sending = true;
    sendBtn.disabled = true;
    var typing = addTyping();

    var body = sessionToken ? { token: sessionToken, question: q } : { email: sessionEmail, question: q };

    postJSON(API_CHAT, body)
      .then(function (r) {
        typing.remove();
        if (r.ok && r.data.answer) {
          addMessage('bot', r.data.answer);
        } else if (r.data && r.data.code === 'rate_limited') {
          blocked = true;
          addError(r.data.error);
          input.placeholder = 'Daily limit reached. Check back tomorrow.';
          input.disabled = true;
        } else if (r.data && r.data.code === 'needs_verification') {
          addError('Your session expired. Please refresh the page and verify your email again.');
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
        if (!blocked) { sendBtn.disabled = false; input.focus(); }
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
