// The service worker of NewsGenerator: it only receives the alerts of the affairs a reader follows (web push) and opens
// the affair when one is tapped. It caches nothing and answers no request of the page: the site works without it.
//
// The server sends {title, body, url, tag}: one notification per affair, a newer one for the same affair taking the
// place of the older (tag).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let message = {};
    try {
        message = event.data ? event.data.json() : {};
    } catch {
        message = {body: event.data ? event.data.text() : ''};
    }
    const title = message.title || 'NewsGenerator';
    event.waitUntil(self.registration.showNotification(title, {
        body: message.body || 'A new development.',
        tag: message.tag || 'affair',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {url: message.url || '/affairs'},
    }));
});

// the page of the affair, in the window already open when there is one
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/affairs', self.location.origin).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
        const open = windows.find(client => new URL(client.url).origin === self.location.origin);
        if (open) {
            await open.focus();
            if ('navigate' in open) await open.navigate(url);
        } else {
            await self.clients.openWindow(url);
        }
    })());
});
