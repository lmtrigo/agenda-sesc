/* Service worker de despedida do endereço antigo.
   ---------------------------------------------------------------------------
   Ele existe para DESFAZER o worker anterior, não para servir nada.

   O worker antigo guardava a casca do app e a servia com "cache primeiro".
   Quem instalou o PWA continuava abrindo a versão em cache mesmo depois de o
   endereço passar a devolver a página de redirecionamento: a rede nunca era
   consultada, então o app velho ficava eterno na tela.

   E havia um agravante. Ao publicar só o redirecionamento, o `sw.js` sumiu
   deste caminho e passou a responder 404. Quando a verificação de atualização
   não recebe um 2xx, o navegador NÃO desregistra nada — ele considera a
   atualização falha e mantém o worker que já estava lá. O app instalado ficava
   travado sem nenhuma forma de se consertar sozinho.

   Por isso este arquivo precisa existir, responder 200 e ser diferente do
   anterior: é a única coisa que o navegador vai buscar por conta própria.
   O que ele faz, em ordem:

     1. assume o controle na hora, sem esperar a aba fechar;
     2. apaga todos os caches deste endereço;
     3. desregistra a si mesmo;
     4. manda as janelas abertas recarregarem — e aí, já sem worker e sem
        cache, elas finalmente enxergam a página de redirecionamento.

   Não há `fetch` aqui de propósito: sem ele, toda requisição vai direto à
   rede, que é exatamente o que se quer enquanto a limpeza acontece. */

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1. o cache da casca antiga
    const nomes = await caches.keys();
    await Promise.all(nomes.map((n) => caches.delete(n)));

    // 2. e o próprio worker
    await self.clients.claim();
    await self.registration.unregister();

    // 3. recarrega quem estiver com o app aberto agora
    const janelas = await self.clients.matchAll({ type: 'window' });
    for (const j of janelas) {
      try { await j.navigate(j.url); } catch (_) { /* aba sem permissão de navegar */ }
    }
  })());
});
