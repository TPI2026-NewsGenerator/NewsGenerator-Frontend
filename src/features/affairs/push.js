//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: push.js
//  Description: What the browser can do to receive the alerts of the affairs followed (web push): whether it can, whether
//               the reader allowed it, and the subscription that gives the server the address of this device
//

import {AffairApi} from "@/features/affairs/affairApi.js";

const WORKER = '/sw.js';

// 'unsupported' (the browser has no push: on an iPhone, the page must be opened from the home screen), 'denied' (the
// reader refused in the settings of the browser), 'ready' (can be asked), 'on' (this device is subscribed)
export const pushState = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
        const registration = await navigator.serviceWorker.getRegistration(WORKER);
        const subscription = await registration?.pushManager.getSubscription();
        return subscription && Notification.permission === 'granted' ? 'on' : 'ready';
    } catch {
        return 'ready';
    }
};

// whether this page runs as an app on the home screen: on an iPhone only then can it receive a push
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIphone = () => /iPhone|iPad|iPod/.test(window.navigator.userAgent);

// the public key as the bytes a browser subscribes with
const bytesOf = (key) => {
    const padded = (key + '='.repeat((4 - key.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
};

// Asks the reader's leave (call it from a tap: iOS refuses otherwise) and gives the server the address of this device.
// Answers 'on', or 'denied' when they said no; throws a sentence the page shows when the server cannot send
export const enablePush = async () => {
    const {enabled, publicKey, error} = await AffairApi.pushKey();
    if (error || !enabled || !publicKey) throw new Error('The server cannot send notifications yet.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    const registration = await navigator.serviceWorker.register(WORKER);
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: bytesOf(publicKey)});
    const answer = await AffairApi.subscribe(subscription.toJSON());
    if (answer?.error) throw new Error(answer.error);
    return 'on';
};

export const disablePush = async () => {
    const registration = await navigator.serviceWorker.getRegistration(WORKER);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await AffairApi.unsubscribe(subscription.endpoint);
    await subscription.unsubscribe();
};
