'use client';

import { ReactNode } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export function CaptchaProvider({ children }: { children: ReactNode }) {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    const isPlaceholder = siteKey.includes('placeholder');

    if (!siteKey || isPlaceholder) {
        if (isPlaceholder) {
            console.info('reCAPTCHA is using a placeholder key. Bot protection is currently disabled.');
        } else {
            console.warn('reCAPTCHA Site Key is missing. Bot protection is disabled.');
        }
        return <>{children}</>;
    }

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={siteKey}
            scriptProps={{
                async: false,
                defer: false,
                appendTo: 'head',
                nonce: undefined,
            }}
        >
            {children}
        </GoogleReCaptchaProvider>
    );
}
