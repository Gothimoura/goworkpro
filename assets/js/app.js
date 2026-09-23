(function () {
  const cfg = window.GOWORK_PRO_CONFIG || {};
  const base = cfg.pageBase || "";

  /* Marcador de origem: quando a tela 1 (roteador) manda o visitante para as
     telas externas, carimba ?hs=1. As telas seguintes guardam isso na sessão
     para saber que o visitante está atrás do hotspot e o login pode ser
     injetado depois do cadastro. */
  const HS_FLAG = "gowork-hotspot-origin";
  const HS_MAC = "gowork-hotspot-mac";

  /* Aceita MAC cru, com : ou -, e desfaz %3A / %253A (encode duplo no dst). */
  function normalizeMac(value) {
    let v = String(value || "").trim();
    if (!v || v.indexOf("$(") !== -1) return "";
    for (let i = 0; i < 3; i++) {
      try {
        if (!/%[0-9a-fA-F]{2}/.test(v)) break;
        const next = decodeURIComponent(v);
        if (next === v) break;
        v = next;
      } catch (e) {
        break;
      }
    }
    const hex = v.replace(/[^0-9a-fA-F]/g, "");
    if (hex.length !== 12) return "";
    return hex.replace(/(.{2})(?=.)/g, "$1:").toUpperCase();
  }

  function setHotspotOrigin() {
    try {
      const p = new URLSearchParams(location.search);
      if (p.get("hs") === "1") sessionStorage.setItem(HS_FLAG, "1");
      const m = normalizeMac(p.get("mac"));
      if (m) sessionStorage.setItem(HS_MAC, m);
    } catch (e) {
      /* navegador sem sessionStorage: segue sem a marca */
    }
  }

  /* MAC do visitante. Na tela 1 vem do servlet do RouterOS; nas telas externas
     vem da URL/sessão. Literal ou valor inválido é descartado. */
  function hotspotMac() {
    const hs = window.GOWORK_HOTSPOT || {};
    const fromHs = normalizeMac(hs.mac);
    if (fromHs) return fromHs;
    try {
      return normalizeMac(sessionStorage.getItem(HS_MAC) || "");
    } catch (e) {
      return "";
    }
  }

  function cameFromHotspot() {
    try {
      return sessionStorage.getItem(HS_FLAG) === "1";
    } catch (e) {
      return false;
    }
  }

  function addParam(url, key, value) {
    if (url.indexOf(key + "=") !== -1) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + key + "=" + encodeURIComponent(value);
  }

  /* URLSearchParams encodeia uma vez. Concatenar encodeURIComponent + qs.set
     no dst do hotspot gerava %253A e o RouterOS não autenticava. */
  function withHsFlag(url) {
    try {
      const abs = new URL(url, location.href);
      abs.searchParams.set("hs", "1");
      const mac = hotspotMac();
      if (mac) abs.searchParams.set("mac", mac);
      else abs.searchParams.delete("mac");
      if (abs.origin !== location.origin) return abs.href;
      return abs.pathname.replace(/^\//, "") + abs.search + abs.hash;
    } catch (e) {
      let out = addParam(url, "hs", "1");
      const mac = hotspotMac();
      if (mac) out = addParam(out, "mac", mac);
      return out;
    }
  }

  function href(page) {
    const url = base + page;
    /* base preenchido = cópia do roteador: carimba a origem no link externo.
       base vazio = cópia externa: propaga o carimbo adiante enquanto a sessão
       souber que viemos do portal. Assim o marcador sobrevive a navegador que
       bloqueia sessionStorage e a aba aberta do zero. */
    if (base) return withHsFlag(url);
    if (cameFromHotspot()) return withHsFlag(url);
    return url;
  }

  setHotspotOrigin();

  function qs(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }

  function money(n) {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function maskPhone(value) {
    const d = digits(value).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }

  function potential(plan, users) {
    const qtd = Math.max(0, Number(users) || 0);
    if (plan === "day") return 30 * qtd;
    if (plan === "mensal") return 300 * qtd * 12;
    return 0;
  }

  function productName(plan) {
    if (plan === "day") return "GoWork Pro Day";
    if (plan === "mensal") return "GoWork Pro Mensal";
    if (plan === "corporate") return "GoWork Pro Corporate";
    if (plan === "conecta") return "GoWork Conecta";
    return plan || "";
  }

  function fillUnits(select) {
    if (!select) return;
    const current = select.getAttribute("data-value") || "";
    (cfg.units || []).forEach(function (name) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === current) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function formToObject(form) {
    const data = {};
    const fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = [].concat(data[key], value);
      } else {
        data[key] = value;
      }
    });
    form.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
      if (!el.name) return;
      if (!Object.prototype.hasOwnProperty.call(data, el.name)) data[el.name] = [];
    });
    return data;
  }

  const HUBSPOT_ALIASES = {
    nome: "firstname",
    nome_solicitante: "firstname",
    email: "email",
    whatsapp: "phone",
    telefone: "phone",
    empresa: "company",
    cargo: "jobtitle",
    cargo_solicitante: "jobtitle",
  };

  function toHubspotFields(payload) {
    const mapped = Object.assign({}, payload);
    Object.keys(HUBSPOT_ALIASES).forEach(function (key) {
      if (mapped[key] != null && mapped[key] !== "") {
        mapped[HUBSPOT_ALIASES[key]] = mapped[key];
      }
    });
    return Object.keys(mapped).map(function (name) {
      const value = mapped[name];
      return {
        objectTypeId: "0-1",
        name: name,
        value: Array.isArray(value) ? value.join("; ") : String(value == null ? "" : value),
      };
    });
  }

  function stampLead(plan, payload) {
    /* Campos de identidade POR ÚLTIMO: o hidden mac_dispositivo do HTML
       chega vazio e, se vier antes, apaga o MAC da sessão. */
    return Object.assign({}, payload, {
      source: "gowork-pro-mvp",
      origem: "Portal Wi-Fi GoWork",
      produto: productName(plan),
      plano: plan,
      data_hora: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      mac_dispositivo: hotspotMac() || normalizeMac(payload && payload.mac_dispositivo),
    });
  }

  /* RouterOS só substitui $(...) no HTML. Token cru = não estamos no hotspot. */
  function isMikrotikLiteral(value) {
    return value == null || value === "" || String(value).indexOf("$(") !== -1;
  }

  function isLocalPreview() {
    return (
      location.protocol === "file:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "[::1]"
    );
  }

  function netlifyFormName(kind) {
    if (typeof cfg.netlifyForm === "string" && cfg.netlifyForm) return cfg.netlifyForm;
    return kind === "corporate" ? "gowork-pro-corporate" : "gowork-pro-day-mensal";
  }

  /* Netlify Forms exige application/x-www-form-urlencoded — JSON é ignorado. */
  function toUrlEncoded(payload, formName) {
    const params = new URLSearchParams();
    params.set("form-name", formName);
    Object.keys(payload).forEach(function (key) {
      if (key === "form-name") return;
      const value = payload[key];
      if (value == null) return;
      params.set(key, Array.isArray(value) ? value.join("; ") : String(value));
    });
    return params.toString();
  }

  async function submitNetlifyForm(kind, stamped) {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: toUrlEncoded(stamped, netlifyFormName(kind)),
    });
    if (!res.ok) throw new Error("Falha no envio (" + res.status + ").");
  }

  function saveLeadLocal(stamped) {
    const key = "gowork-pro-leads";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(stamped);
    localStorage.setItem(key, JSON.stringify(prev));
  }

  async function submitLead(kind, payload) {
    const stamped = stampLead(payload.plano || kind, payload);

    if (cfg.webhookUrl) {
      /* Se o webhook responder, acabou aqui. Se cair (n8n fora do ar, CORS,
         workflow desativado), NÃO perdemos o lead: seguimos para o próximo
         destino da cascata em vez de estourar erro para o visitante. */
      try {
        const res = await fetch(cfg.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stamped),
        });
        if (res.ok) return;
        console.warn("Webhook respondeu " + res.status + " — usando destino reserva.");
      } catch (ex) {
        console.warn("Webhook inacessível — usando destino reserva.", ex);
      }
    }

    const formId = kind === "corporate" ? cfg.hubspotFormIdCorporate : cfg.hubspotFormIdDayMensal;
    if (cfg.hubspotPortalId && formId) {
      const url =
        "https://api.hsforms.com/submissions/v3/integration/submit/" +
        encodeURIComponent(cfg.hubspotPortalId) +
        "/" +
        encodeURIComponent(formId);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: toHubspotFields(stamped),
          context: { pageUri: location.href, pageName: document.title },
        }),
      });
      if (!res.ok) throw new Error("HubSpot recusou o envio (" + res.status + ").");
      return;
    }

    if (cfg.netlifyForm) {
      try {
        await submitNetlifyForm(kind, stamped);
        return;
      } catch (ex) {
        /* Preview local/file:// não tem endpoint do Netlify — cai no localStorage. */
        if (!isLocalPreview()) throw ex;
      }
    }

    saveLeadLocal(stamped);
  }

  function bindPhone(input) {
    if (!input) return;
    input.addEventListener("input", function () {
      input.value = maskPhone(input.value);
    });
  }

  /* INJEÇÃO DE ACESSO: quem se cadastrou entra na rede.
     O formulário roda no domínio externo (HTTPS), mas quem autentica é o
     roteador. Então o visitante passa pelo endpoint de login do hotspot, que
     autentica e o devolve ao obrigado.html — já com internet liberada.
     Exige login-by=http-pap no profile do hotspot (a página externa não tem
     acesso ao desafio CHAP). */
  function hotspotInjectUrl(dst) {
    if (!cfg.hotspotLoginUrl) return "";
    /* Só injeta se o visitante veio mesmo da tela 1 do portal. Quem abriu o
       site de fora da rede GoWork não deve ser mandado para um IP local. */
    if (!cameFromHotspot()) return "";
    const q = new URLSearchParams();
    q.set("username", cfg.leadUsername || cfg.conectaUsername || "conecta");
    q.set(
      "password",
      cfg.leadPassword == null ? String(cfg.conectaPassword || "") : String(cfg.leadPassword)
    );
    if (dst) q.set("dst", dst);
    return cfg.hotspotLoginUrl + "?" + q.toString();
  }

  function goThanks(plan) {
    const thanks = href("obrigado.html?plano=" + encodeURIComponent(plan || ""));
    let dest;
    try {
      dest = new URL(thanks, location.href);
    } catch (e) {
      location.href = thanks;
      return;
    }
    /* dst do MikroTik tem que ser curto e sem MAC: %3A no dst vira %253A
       e o /login não autentica — o visitante fica preso nessa URL. */
    dest.searchParams.delete("mac");
    const inject = hotspotInjectUrl(dest.href);
    location.href = inject || dest.href;
  }

  function setPlanMode(plan) {
    document.querySelectorAll("[data-plan-mode]").forEach(function (el) {
      const modes = (el.getAttribute("data-plan-mode") || "").split(/\s+/);
      const on = modes.indexOf(plan) !== -1;
      el.hidden = !on;
      el.querySelectorAll("input, select, textarea").forEach(function (field) {
        if (field.hasAttribute("data-keep-required")) {
          field.required = on;
        }
      });
    });
  }

  function showHotspotError() {
    const err = document.getElementById("hotspot-error");
    if (!err) return;
    const text = (err.textContent || "").trim();
    if (text && !isMikrotikLiteral(text)) {
      err.hidden = false;
      err.dataset.show = "1";
    }
  }

  /* CTA Conecta = POST no hotspot. Fora do MikroTik, preview em obrigado.html. */
  function bindHotspotLogin() {
    const form = document.getElementById("hotspot-login");
    if (!form) return;

    showHotspotError();

    form.addEventListener("submit", function (e) {
      const action = form.getAttribute("action") || "";
      const onHotspot = !isMikrotikLiteral(action);
      const userEl = form.querySelector('[name="username"]');
      const passEl = form.querySelector('[name="password"]');
      const username = cfg.conectaUsername || "conecta";
      const password = cfg.conectaPassword == null ? "" : String(cfg.conectaPassword);

      if (userEl) userEl.value = username;

      if (!onHotspot) {
        e.preventDefault();
        if (cfg.conectaContinueUrl) {
          location.href = cfg.conectaContinueUrl;
          return;
        }
        const preview = form.getAttribute("data-preview-href") || "obrigado.html?plano=conecta";
        location.href = href(preview);
        return;
      }

      const chap = window.GOWORK_HOTSPOT || {};
      if (
        passEl &&
        !isMikrotikLiteral(chap.chapId) &&
        !isMikrotikLiteral(chap.chapChallenge) &&
        typeof window.hexMD5 === "function"
      ) {
        passEl.value = window.hexMD5(chap.chapId + password + chap.chapChallenge);
      } else if (passEl) {
        passEl.value = password;
      }
    });
  }

  window.GoworkPro = {
    cfg: cfg,
    href: href,
    qs: qs,
    money: money,
    potential: potential,
    productName: productName,
    fillUnits: fillUnits,
    formToObject: formToObject,
    submitLead: submitLead,
    bindPhone: bindPhone,
    goThanks: goThanks,
    setPlanMode: setPlanMode,
  };

  document.querySelectorAll("[data-href]").forEach(function (el) {
    el.setAttribute("href", href(el.getAttribute("data-href")));
  });

  const legalMap = {
    "data-terms": cfg.termsUrl,
    "data-policy": cfg.networkPolicyUrl,
    "data-privacy": cfg.privacyUrl,
  };
  Object.keys(legalMap).forEach(function (attr) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      if (legalMap[attr] && legalMap[attr] !== "#") el.setAttribute("href", legalMap[attr]);
    });
  });

  bindHotspotLogin();

  const macNow = hotspotMac();
  if (macNow) {
    document.querySelectorAll('input[name="mac_dispositivo"]').forEach(function (el) {
      el.value = macNow;
    });
  }
})();
