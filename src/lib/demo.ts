import { CHAVE_DEMO } from '../store';

/**
 * Modo demonstração: abre com `?demo` na URL, sem login e sem nuvem. Cada
 * visitante tem a sua cópia no próprio navegador. As vistas do app são estado,
 * não rotas, então o parâmetro continua na URL enquanto se navega.
 */
export const emDemo = new URLSearchParams(window.location.search).has('demo');

export function entrarNaDemo() {
  window.location.assign(`${window.location.pathname}?demo`);
}

/** Apaga o que o visitante mudou e volta às metas de exemplo. */
export function recomecarDemo() {
  try {
    localStorage.removeItem(CHAVE_DEMO);
  } catch {
    /* sem acesso ao storage: a recarga já volta ao exemplo */
  }
  window.location.reload();
}

export function sairDaDemo() {
  window.location.assign(window.location.pathname);
}
