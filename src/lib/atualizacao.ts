/**
 * Detecção de versão nova do app.
 *
 * O service worker é gerado com `skipWaiting` e `clientsClaim`, então a versão
 * nova assume o controle sozinha — mas a página que já está aberta continua
 * executando o JavaScript antigo até recarregar, e o `registerSW.js` que o
 * plugin injeta não avisa ninguém. Era isso que fazia o app mostrar a versão
 * desatualizada depois de um deploy.
 *
 * Aqui a gente escuta a troca de controlador e procura ativamente por versões
 * novas, porque o navegador só rechecaria o sw.js numa navegação ou a cada 24h
 * — o que quase nunca acontece num PWA que fica aberto.
 */
export function observarAtualizacao(aoDetectar: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  // Na primeiríssima visita a página carrega sem controlador: o worker se
  // registra e assume logo em seguida, disparando uma troca que NÃO é
  // atualização. Ignoramos só essa primeira, e a partir dela ficamos armados —
  // uma troca posterior, na mesma sessão, é versão nova de verdade.
  let armado = Boolean(navigator.serviceWorker.controller);

  const aoTrocarControlador = () => {
    if (!armado) {
      armado = true;
      return;
    }
    aoDetectar();
  };

  const procurarVersaoNova = () => {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        /* offline ou sem registro: tenta de novo no próximo gatilho */
      });
  };

  const aoVoltarParaOApp = () => {
    if (document.visibilityState === 'visible') procurarVersaoNova();
  };

  navigator.serviceWorker.addEventListener('controllerchange', aoTrocarControlador);
  document.addEventListener('visibilitychange', aoVoltarParaOApp);
  const timer = setInterval(procurarVersaoNova, 60 * 60 * 1000);
  procurarVersaoNova();

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', aoTrocarControlador);
    document.removeEventListener('visibilitychange', aoVoltarParaOApp);
    clearInterval(timer);
  };
}
