window.GOWORK_PRO_CONFIG = {
  /* Telas 2–4 no Netlify: preencha com a URL do site (barra no final). Tela 1 no roteador deixa isso no dist-router. */
  pageBase: "",
  /* Destino alternativo do CTA Conecta quando NÃO estamos no hotspot (preview local/Netlify). */
  conectaContinueUrl: "",
  /* Usuário genérico do hotspot MikroTik (login-by=http-chap). Criar o mesmo par no RB5009. */
  conectaUsername: "conecta",
  conectaPassword: "conecta",
  /* INJEÇÃO DE ACESSO pós-cadastro: endpoint de login do hotspot no RB5009.
     Só é acionado quando o visitante chegou pela tela 1 (marcador ?hs=1). */
  hotspotLoginUrl: "http://192.168.33.1/login",
  leadUsername: "lead",
  leadPassword: "gowork-lead",
  webhookUrl: "https://flux.gowork.com.br/webhook/gowork-pro-lead-teste",
  hubspotPortalId: "",
  hubspotFormIdDayMensal: "",
  hubspotFormIdCorporate: "",
  /* Liga o POST urlencoded para Netlify Forms (antes do localStorage). */
  netlifyForm: true,
  /* Relativos de propósito: a tela 1 não tem internet antes do login. */
  termsUrl: "termos.html",
  networkPolicyUrl: "politica-rede.html",
  privacyUrl: "privacidade.html",
  units: [
    "Alameda Santos",
    "Amauri II",
    "Berrini",
    "Butantã",
    "Campus",
    "Campus II",
    "Consolação",
    "Faria Lima",
    "Funchal II",
    "Joaquim Antunes",
    "Ministro",
    "Paulista 302",
    "Paulista 475",
    "Pinheiros",
    "Vila Olímpia",
    "Outra / não sei",
  ],
};
