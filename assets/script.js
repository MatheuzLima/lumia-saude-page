/* Lumina Saúde Integrada — comportamento da página (JavaScript puro, sem dependências) */
(function () {
  "use strict";

  /* ============ Configuração (edite aqui) ============ */
  var CONFIG = {
    // WhatsApp que recebe os agendamentos: DDI + DDD + número, só dígitos.
    whatsapp: "5512988586826",
    clinic: "Lumina Saúde Integrada",
    timezone: "America/Sao_Paulo",
    // Horário de atendimento: 0 = domingo … 6 = sábado → [abre, fecha] em horas.
    hours: { 1: [7, 20], 2: [7, 20], 3: [7, 20], 4: [7, 20], 5: [7, 20], 6: [8, 13] },
  };

  var DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  function waLink(message) {
    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(message);
  }

  function track(eventName, label) {
    // Pronto para Google Tag Manager / GA4: basta instalar o GTM na página.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, label: label });
  }

  /* ============ Links de WhatsApp ============ */
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    a.href = waLink(a.getAttribute("data-wa-msg") || "Olá! Gostaria de agendar uma consulta.");
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", function () {
      track("whatsapp_click", a.getAttribute("data-track") || "link");
    });
  });

  /* ============ Ano no rodapé ============ */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ============ Menu mobile ============ */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ============ "Aberto agora" ============ */
  function nowInClinicTz() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CONFIG.timezone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[map.weekday];
    var hour = parseInt(map.hour, 10) % 24;
    return { day: dayIndex, minutes: hour * 60 + parseInt(map.minute, 10) };
  }

  function updateOpenStatus() {
    var el = document.getElementById("openStatus");
    if (!el) return;
    var label = el.querySelector("span:last-child");
    try {
      var now = nowInClinicTz();
      var today = CONFIG.hours[now.day];
      var open = today && now.minutes >= today[0] * 60 && now.minutes < today[1] * 60;
      if (open) {
        el.className = "status is-open";
        label.textContent = "Aberto agora · atendemos até às " + today[1] + "h";
        return;
      }
      // próxima abertura
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7;
        var h = CONFIG.hours[d];
        if (!h) continue;
        if (i === 0 && now.minutes >= h[0] * 60) continue; // hoje já passou
        var when = i === 0 ? "hoje" : i === 1 ? "amanhã" : DAYS[d];
        el.className = "status is-closed";
        label.textContent = "Fechado agora · abrimos " + when + " às " + h[0] + "h";
        return;
      }
    } catch (err) {
      /* mantém o texto padrão do HTML */
    }
  }
  updateOpenStatus();
  setInterval(updateOpenStatus, 60000);

  /* ============ Filtro de especialidades ============ */
  var filters = document.getElementById("specFilters");
  var cards = Array.prototype.slice.call(document.querySelectorAll("#specGrid .spec"));
  if (filters) {
    filters.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var f = btn.getAttribute("data-filter");
      filters.querySelectorAll(".chip").forEach(function (c) {
        var on = c === btn;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", String(on));
      });
      cards.forEach(function (card) {
        var cats = (card.getAttribute("data-cat") || "").split(" ");
        card.hidden = !(f === "all" || cats.indexOf(f) !== -1);
        if (!card.hidden) card.classList.add("in");
      });
    });
  }

  /* ============ Aparecer ao rolar ============ */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) {
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--rd", Math.min(siblings, 6) * 0.06 + "s");
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ============ Triagem ágil (3 perguntas → WhatsApp) ============ */
  var wizard = document.getElementById("wizard");
  if (!wizard) return;

  var body = document.getElementById("wizBody");
  var bar = document.getElementById("wizBar");
  var stepLabel = document.getElementById("wizStep");
  var backBtn = document.getElementById("wizBack");

  var WHO = [
    { id: "eu", label: "Para mim", desc: "Consulta para mim mesmo(a)", text: "mim" },
    { id: "filho", label: "Para meu filho(a)", desc: "Criança ou adolescente", text: "meu filho(a)" },
    { id: "outro", label: "Para outra pessoa", desc: "Familiar ou conhecido", text: "outra pessoa" },
  ];

  var NEEDS = [
    { id: "checkup", label: "Check-up e exames de rotina", spec: "Check-up e exames" },
    { id: "dor", label: "Dor ou desconforto físico", spec: "Clínica Geral" },
    { id: "pele", label: "Pele, cabelo ou unhas", spec: "Dermatologia" },
    { id: "coracao", label: "Coração, pressão alta ou palpitações", spec: "Cardiologia", adult: true },
    { id: "mente", label: "Ansiedade, estresse ou sono", spec: "Psicologia" },
    { id: "nutri", label: "Alimentação, peso ou energia", spec: "Nutrição" },
    { id: "mulher", label: "Saúde da mulher", spec: "Ginecologia", adult: true },
    { id: "ossos", label: "Dor muscular ou nas articulações", spec: "Ortopedia" },
    { id: "crianca", label: "Crescimento, vacinas ou febre da criança", spec: "Pediatria", child: true },
    { id: "naosei", label: "Não sei, preciso de orientação", spec: "Clínica Geral" },
    { id: "urgencia", label: "Dor forte no peito, falta de ar ou desmaio", emergency: true },
  ];

  var PERIODS = ["Manhã", "Tarde", "Noite", "O mais cedo possível"];
  var PAYMENTS = ["Convênio", "Particular"];

  var state = { step: 1, who: null, need: null, period: null, payment: null, name: "" };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function needsFor(who) {
    return NEEDS.filter(function (n) {
      if (n.child) return who === "filho";
      if (n.adult) return who !== "filho";
      return true;
    });
  }

  function suggestedSpecialty() {
    var need = NEEDS.filter(function (n) { return n.id === state.need; })[0];
    if (!need) return "Clínica Geral";
    // Para crianças, orientações gerais seguem pela pediatria.
    if (state.who === "filho" && (need.spec === "Clínica Geral" || need.id === "dor")) return "Pediatria";
    return need.spec;
  }

  function buildMessage() {
    var who = WHO.filter(function (w) { return w.id === state.who; })[0];
    var need = NEEDS.filter(function (n) { return n.id === state.need; })[0];
    var lines = [
      "Olá! Vim pelo site da " + CONFIG.clinic + " e fiz a triagem rápida.",
      "• Consulta para: " + (who ? who.text : "-"),
      "• Necessidade: " + (need ? need.label : "-"),
      "• Especialidade sugerida: " + suggestedSpecialty(),
      "• Preferência de horário: " + state.period,
      "• Atendimento: " + state.payment,
    ];
    if (state.name.trim()) lines.push("• Nome: " + state.name.trim());
    lines.push("Podem me ajudar a agendar?");
    return lines.join("\n");
  }

  function setProgress(step, total) {
    bar.style.width = (step / total) * 100 + "%";
  }

  function focusHeading() {
    var h = body.querySelector("[data-focus]");
    if (h) h.focus({ preventScroll: true });
  }

  function render() {
    var html = "";
    backBtn.hidden = state.step === 1;

    if (state.step === 1) {
      stepLabel.textContent = "Passo 1 de 3";
      setProgress(1, 3);
      html =
        '<h3 class="wiz-q" tabindex="-1" data-focus>Para quem é a consulta?</h3>' +
        '<p class="wiz-sub">Assim indicamos o profissional mais adequado.</p>' +
        '<div class="opts">' +
        WHO.map(function (w) {
          return '<button type="button" class="opt" data-who="' + w.id + '"><span class="opt__t">' + esc(w.label) + '</span><span class="opt__d">' + esc(w.desc) + "</span></button>";
        }).join("") +
        "</div>";
    } else if (state.step === 2) {
      stepLabel.textContent = "Passo 2 de 3";
      setProgress(2, 3);
      html =
        '<h3 class="wiz-q" tabindex="-1" data-focus>O que você precisa?</h3>' +
        '<p class="wiz-sub">Escolha a opção que mais se aproxima.</p>' +
        '<div class="opts">' +
        needsFor(state.who).map(function (n) {
          return '<button type="button" class="opt' + (n.emergency ? " opt--danger" : "") + '" data-need="' + n.id + '"><span class="opt__t">' + esc(n.label) + "</span></button>";
        }).join("") +
        "</div>";
    } else if (state.step === "emergency") {
      stepLabel.textContent = "Atenção";
      setProgress(2, 3);
      html =
        '<div class="alert" role="alert">' +
        '<strong tabindex="-1" data-focus>Isso pode ser uma emergência</strong>' +
        "<p>Ligue agora para o <b>SAMU (192)</b> ou vá ao pronto-socorro mais próximo. A " + esc(CONFIG.clinic) + " não atende urgências e emergências.</p>" +
        '<a class="btn btn--block" href="tel:192">Ligar para o 192</a>' +
        "</div>";
    } else if (state.step === 3) {
      stepLabel.textContent = "Passo 3 de 3";
      setProgress(3, 3);
      html =
        '<h3 class="wiz-q" tabindex="-1" data-focus>Quando prefere ser atendido?</h3>' +
        '<p class="wiz-sub">Falta pouco para a sua mensagem ficar pronta.</p>' +
        '<div class="field"><span>Preferência de horário</span><div class="opts">' +
        PERIODS.map(function (p) {
          return '<button type="button" class="opt' + (state.period === p ? " is-selected" : "") + '" data-period="' + esc(p) + '"><span class="opt__t">' + esc(p) + "</span></button>";
        }).join("") +
        "</div></div>" +
        '<div class="field"><span>Como será o atendimento?</span><div class="opts">' +
        PAYMENTS.map(function (p) {
          return '<button type="button" class="opt' + (state.payment === p ? " is-selected" : "") + '" data-payment="' + esc(p) + '"><span class="opt__t">' + esc(p) + "</span></button>";
        }).join("") +
        "</div></div>" +
        '<label class="field"><span>Seu nome (opcional)</span><input type="text" id="wizName" autocomplete="name" maxlength="60" placeholder="Como podemos chamar você?" value="' + esc(state.name) + '"></label>' +
        '<p class="form-error" id="wizError" role="alert" hidden>Escolha o horário e a forma de atendimento para continuar.</p>' +
        '<button type="button" class="btn btn--wa btn--lg btn--block" id="wizNext">Ver resumo</button>';
    } else {
      stepLabel.textContent = "Tudo pronto";
      setProgress(3, 3);
      var link = waLink(buildMessage());
      html =
        '<div class="result">' +
        '<p class="result__tag">Especialidade sugerida</p>' +
        '<h3 class="result__spec" tabindex="-1" data-focus>' + esc(suggestedSpecialty()) + "</h3>" +
        '<ul class="result__list">' +
        "<li><b>Consulta para:</b> " + esc(WHO.filter(function (w) { return w.id === state.who; })[0].text) + "</li>" +
        "<li><b>Necessidade:</b> " + esc(NEEDS.filter(function (n) { return n.id === state.need; })[0].label) + "</li>" +
        "<li><b>Horário:</b> " + esc(state.period) + " · <b>Atendimento:</b> " + esc(state.payment) + "</li>" +
        "</ul>" +
        '<a class="btn btn--wa btn--lg btn--block" id="wizSend" href="' + link + '" target="_blank" rel="noopener noreferrer">Enviar no WhatsApp</a>' +
        '<button type="button" class="link-btn" id="wizReset">Refazer a triagem</button>' +
        "</div>";
    }

    body.innerHTML = html;
    focusHeading();
  }

  body.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;

    if (t.hasAttribute("data-who")) {
      state.who = t.getAttribute("data-who");
      state.need = null;
      state.step = 2;
      render();
    } else if (t.hasAttribute("data-need")) {
      state.need = t.getAttribute("data-need");
      var need = NEEDS.filter(function (n) { return n.id === state.need; })[0];
      state.step = need && need.emergency ? "emergency" : 3;
      track("triage_step", "need_" + state.need);
      render();
    } else if (t.hasAttribute("data-period")) {
      state.period = t.getAttribute("data-period");
      body.querySelectorAll("[data-period]").forEach(function (b) {
        b.classList.toggle("is-selected", b === t);
      });
    } else if (t.hasAttribute("data-payment")) {
      state.payment = t.getAttribute("data-payment");
      body.querySelectorAll("[data-payment]").forEach(function (b) {
        b.classList.toggle("is-selected", b === t);
      });
    } else if (t.id === "wizNext") {
      var input = document.getElementById("wizName");
      state.name = input ? input.value : "";
      if (!state.period || !state.payment) {
        document.getElementById("wizError").hidden = false;
        return;
      }
      state.step = 4;
      track("triage_step", "summary");
      render();
    } else if (t.id === "wizSend") {
      track("whatsapp_click", "triage_result");
    } else if (t.id === "wizReset") {
      state = { step: 1, who: null, need: null, period: null, payment: null, name: "" };
      render();
    }
  });

  backBtn.addEventListener("click", function () {
    if (state.step === 2) state.step = 1;
    else if (state.step === "emergency") state.step = 2;
    else if (state.step === 3) state.step = 2;
    else if (state.step === 4) state.step = 3;
    render();
  });

  render();
})();
