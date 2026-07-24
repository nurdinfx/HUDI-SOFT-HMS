'use strict';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BN3M5npdAHbqVJ6eBiKEwQkcXBCRkYd3EzCl5Sl0SfCxM1D8WLNUzIacVzrj5dB37GDGpb2HlM3F6dno2fGmhJw';

export function PushNotificationManager() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permission, setPermission] = useState('default');

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        } else {
            setIsLoading(false);
        }
    }, []);

    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking subscription:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function subscribeToPush() {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Request permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                toast.error('Permission for notifications denied.');
                return;
            }

            // Create subscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send to backend
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });

            if (response.ok) {
                setIsSubscribed(true);
                toast.success('You are now subscribed to real-time notifications!');
            } else {
                throw new Error('Failed to store subscription');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            toast.error('Failed to enable notifications.');
        } finally {
            setIsLoading(false);
        }
    }

    async function unsubscribeFromPush() {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast.info('Notifications disabled.');
            }
        } catch (error) {
            console.error('Unsubscription error:', error);
            toast.error('Error disabling notifications.');
        } finally {
            setIsLoading(false);
        }
    }

    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    if (isLoading) return <Button variant="ghost" size="icon" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
            title={isSubscribed ? "Disable Notifications" : "Enable Notifications"}
        >
            {isSubscribed ? (
                <Bell className="h-4 w-4 text-teal-600" />
            ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
        </Button>
    );
}
