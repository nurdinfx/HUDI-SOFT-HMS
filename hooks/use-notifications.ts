'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = 'BN3M5npdAHbqVJ6eBiKEwQkcXBCRkYd3EzCl5Sl0SfCxM1D8WLNUzIacVzrj5dB37GDGpb2HlM3F6dno2fGmhJw';

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }

        // Check for existing subscription
        const checkSubscription = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.getSubscription();
                setSubscription(sub);
            }
        };

        checkSubscription();
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) return 'unsupported';

        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
            await subscribeToPush();
        }

        return status;
    };

    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator)) return;

            const registration = await navigator.serviceWorker.ready;

            // Convert VAPID key to Uint8Array
            const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
            const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: outputArray
            });

            setSubscription(sub);

            // Send subscription to backend
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: sub,
                    userId: 'current-user-id' // In real app, get from auth context
                })
            });

            console.log('✅ Successfully subscribed to Push Notifications');
        } catch (error) {
            console.error('❌ Failed to subscribe to Push:', error);
        }
    };

    return { permission, subscription, requestPermission };
}
