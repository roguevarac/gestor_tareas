// Tocar un aviso ("Te mandaron un pez") abre la app, o la trae al frente si ya estaba abierta.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      return self.clients.openWindow(self.registration.scope);
    })(),
  );
});
