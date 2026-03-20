(function() {
  if (window.__CientyWidget) return;
  window.__CientyWidget = true;

  const BASE_URL = (function() {
    const s = document.currentScript;
    if (s && s.src) return new URL(s.src).origin;
    return window.location.origin;
  })();

  const SESSION_ID = 'widget_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  const CSS = `
    #cienty-widget-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 99999;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, #c026d3, #9333ea);
      box-shadow: 0 4px 20px rgba(192,38,211,0.5);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s; border: none;
    }
    #cienty-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(192,38,211,0.6); }
    #cienty-widget-btn img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    #cienty-widget-btn .online-dot {
      position: absolute; bottom: 3px; right: 3px;
      width: 14px; height: 14px; background: #22c55e;
      border-radius: 50%; border: 2px solid white;
    }

    #cienty-widget-bubble {
      position: fixed; bottom: 100px; right: 28px; z-index: 99998;
      background: white; border-radius: 16px; padding: 14px 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14); max-width: 240px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; color: #1a1a1a; line-height: 1.5;
      animation: slideUp 0.3s ease;
    }
    #cienty-widget-bubble::after {
      content: ''; position: absolute; bottom: -8px; right: 28px;
      width: 16px; height: 16px; background: white;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    #cienty-widget-bubble strong { color: #c026d3; }
    #cienty-bubble-close {
      position: absolute; top: 8px; right: 10px;
      background: none; border: none; cursor: pointer;
      font-size: 16px; color: #aaa; line-height: 1;
    }

    #cienty-widget-chat {
      position: fixed; bottom: 100px; right: 28px; z-index: 99998;
      width: 360px; height: 520px; border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.18);
      display: none; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: white; animation: slideUp 0.3s ease;
    }
    #cienty-widget-chat.open { display: flex; }

    .cw-header {
      background: linear-gradient(135deg, #c026d3, #9333ea);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    .cw-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .cw-header-info h4 { color: white; font-size: 14px; font-weight: 700; margin: 0; }
    .cw-header-info p { color: rgba(255,255,255,0.8); font-size: 12px; margin: 2px 0 0; }
    .cw-close { margin-left: auto; background: none; border: none; color: white; font-size: 22px; cursor: pointer; opacity: 0.8; line-height: 1; padding: 0; }
    .cw-close:hover { opacity: 1; }

    .cw-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #f7f7f7; }
    .cw-msg { display: flex; gap: 8px; max-width: 85%; }
    .cw-msg.bot { align-self: flex-start; }
    .cw-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .cw-msg-av { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#c026d3,#9333ea); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; align-self: flex-end; }
    .cw-bubble { padding: 9px 13px; border-radius: 16px; font-size: 13px; line-height: 1.5; }
    .cw-msg.bot .cw-bubble { background: white; border: 1px solid #eee; border-bottom-left-radius: 3px; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .cw-msg.user .cw-bubble { background: linear-gradient(135deg,#c026d3,#9333ea); color: white; border-bottom-right-radius: 3px; }
    .cw-time { font-size: 10px; color: #bbb; margin-top: 3px; }
    .cw-msg.user .cw-time { text-align: right; }

    .cw-typing { padding: 0 16px 8px; background: #f7f7f7; }
    .cw-typing-inner { background: white; border: 1px solid #eee; border-radius: 16px; border-bottom-left-radius: 3px; padding: 10px 14px; display: none; width: fit-content; }
    .cw-typing-inner span { display: inline-block; width: 6px; height: 6px; background: #c026d3; border-radius: 50%; margin: 0 2px; animation: cwBounce 1.2s infinite; }
    .cw-typing-inner span:nth-child(2){animation-delay:.2s} .cw-typing-inner span:nth-child(3){animation-delay:.4s}

    .cw-suggestions { padding: 8px 12px; background: white; border-top: 1px solid #f0f0f0; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
    .cw-suggestions::-webkit-scrollbar { display: none; }
    .cw-sug { white-space: nowrap; padding: 5px 11px; background: #f9e6fc; border: 1px solid #e8c0f5; border-radius: 14px; font-size: 11px; color: #c026d3; cursor: pointer; font-weight: 500; }
    .cw-sug:hover { background: #f0c8fa; }

    .cw-input-area { padding: 10px 12px; background: white; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; align-items: center; }
    .cw-input { flex: 1; padding: 8px 12px; border: 1px solid #e5e5e5; border-radius: 20px; font-size: 13px; outline: none; font-family: inherit; }
    .cw-input:focus { border-color: #c026d3; }
    .cw-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: linear-gradient(135deg,#c026d3,#9333ea); color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cw-send:disabled { background: #ddd; }

    .cw-footer { padding: 6px; background: white; text-align: center; font-size: 10px; color: #ccc; }
    .cw-footer span { color: #c026d3; font-weight: 600; }

    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes cwBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    @media (max-width: 480px) {
      #cienty-widget-chat { width: calc(100vw - 20px); right: 10px; bottom: 80px; height: calc(100vh - 120px); max-height: 560px; }
      #cienty-widget-btn { bottom: 20px; right: 16px; }
      #cienty-widget-bubble { right: 16px; }
    }
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Floating button
  const btn = document.createElement('button');
  btn.id = 'cienty-widget-btn';
  btn.innerHTML = `<span style="font-size:28px">👩‍💼</span><div class="online-dot"></div>`;
  btn.title = 'Falar com a CarlinhIA · Suporte Cienty';
  document.body.appendChild(btn);

  // Bubble hint
  const bubble = document.createElement('div');
  bubble.id = 'cienty-widget-bubble';
  bubble.innerHTML = `
    <button class="cienty-bubble-close" id="cienty-bubble-close">✕</button>
    Precisa de ajuda? A <strong>CarlinhIA</strong> resolve erros de distribuidoras e dúvidas da plataforma na hora 💜
  `;
  document.body.appendChild(bubble);

  // Chat panel
  const chat = document.createElement('div');
  chat.id = 'cienty-widget-chat';
  chat.innerHTML = `
    <div class="cw-header">
      <div class="cw-avatar">👩‍💼</div>
      <div class="cw-header-info">
        <h4>CarlinhIA · Cienty</h4>
        <p>🟢 Online agora · responde em segundos</p>
      </div>
      <button class="cw-close" id="cw-close-btn">✕</button>
    </div>
    <div class="cw-messages" id="cw-messages">
      <div class="cw-msg bot">
        <div class="cw-msg-av">👩‍💼</div>
        <div>
          <div class="cw-bubble">Olá! Sou a CarlinhIA, assistente de suporte da Cienty 👋<br><br>Posso resolver erros de distribuidoras, verificar pedidos e tirar dúvidas da plataforma. Como posso te ajudar?</div>
          <div class="cw-time">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    </div>
    <div class="cw-typing"><div class="cw-typing-inner" id="cw-typing"><span></span><span></span><span></span></div></div>
    <div class="cw-suggestions">
      <div class="cw-sug" data-msg="Minha Servimed tá com erro">Servimed com erro</div>
      <div class="cw-sug" data-msg="Pedido travado em aguardando">Pedido travado</div>
      <div class="cw-sug" data-msg="Distribuidora sumiu da cotação">Distribuidora sumiu</div>
      <div class="cw-sug" data-msg="Preço diferente do esperado">Preço diferente</div>
    </div>
    <div class="cw-input-area">
      <input class="cw-input" id="cw-input" type="text" placeholder="Digite sua dúvida..." />
      <button class="cw-send" id="cw-send">➤</button>
    </div>
    <div class="cw-footer">Powered by <span>CarlinhIA</span></div>
  `;
  document.body.appendChild(chat);

  // State
  let isOpen = false;
  let bubbleDismissed = false;

  function getTime() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function addMsg(text, type) {
    const msgs = document.getElementById('cw-messages');
    const div = document.createElement('div');
    div.className = 'cw-msg ' + type;
    if (type === 'bot') {
      div.innerHTML = `<div class="cw-msg-av">👩‍💼</div><div><div class="cw-bubble">${text.replace(/\n/g,'<br>')}</div><div class="cw-time">${getTime()}</div></div>`;
    } else {
      div.innerHTML = `<div><div class="cw-bubble">${text}</div><div class="cw-time">${getTime()}</div></div>`;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setTyping(show) {
    document.getElementById('cw-typing').style.display = show ? 'block' : 'none';
    document.getElementById('cw-send').disabled = show;
    document.getElementById('cw-messages').scrollTop = 999999;
  }

  async function sendMsg() {
    const input = document.getElementById('cw-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg(text, 'user');
    setTyping(true);
    try {
      const res = await fetch(BASE_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: SESSION_ID, message: text })
      });
      const data = await res.json();
      setTyping(false);
      addMsg(data.reply || 'Desculpe, tive um problema.', 'bot');
    } catch {
      setTyping(false);
      addMsg('Erro de conexão. Tente novamente.', 'bot');
    }
  }

  function openChat() {
    isOpen = true;
    chat.classList.add('open');
    bubble.style.display = 'none';
    btn.innerHTML = `<span style="font-size:22px;color:white">✕</span>`;
    document.getElementById('cw-input').focus();
  }

  function closeChat() {
    isOpen = false;
    chat.classList.remove('open');
    btn.innerHTML = `<span style="font-size:28px">👩‍💼</span><div class="online-dot"></div>`;
    if (!bubbleDismissed) bubble.style.display = 'block';
  }

  btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  document.getElementById('cw-close-btn').addEventListener('click', closeChat);
  document.getElementById('cienty-bubble-close').addEventListener('click', (e) => {
    e.stopPropagation();
    bubbleDismissed = true;
    bubble.style.display = 'none';
  });
  document.getElementById('cw-send').addEventListener('click', sendMsg);
  document.getElementById('cw-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });
  chat.querySelectorAll('.cw-sug').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('cw-input').value = el.dataset.msg;
      sendMsg();
    });
  });

  // Show bubble after 2s
  setTimeout(() => { if (!isOpen) bubble.style.display = 'block'; }, 2000);
})();
