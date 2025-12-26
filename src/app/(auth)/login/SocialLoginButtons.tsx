
'use client'

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

type Provider = 'google' | 'kakao' | 'naver';

export default function SocialLoginButtons() {
    const [loading, setLoading] = useState<Provider | null>(null);

    const handleSocialLogin = async (provider: Provider) => {
        setLoading(provider);
        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as any,
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                // Fix KOE205: Use queryParams to strictly override scope parameters
                ...(provider === 'kakao' ? {
                    scopes: 'account_email',
                    queryParams: {
                        scope: 'account_email',
                        prompt: 'login',
                    }
                } : {}),
            },
        });

        if (error) {
            console.error(`${provider} login error:`, error.message);
            setLoading(null);
        }
    };

    const buttons = [
        {
            id: 'google' as Provider,
            name: 'Google',
            bgColor: 'bg-white',
            textColor: 'text-zinc-700',
            borderColor: 'border-zinc-200',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
            ),
        },
        {
            id: 'kakao' as Provider,
            name: 'Kakao',
            bgColor: 'bg-[#FEE500]',
            textColor: 'text-[#191919]',
            borderColor: 'border-transparent',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-1.085 3.98c-.04.15.047.31.188.31.058 0 .114-.02.16-.058l4.74-3.134c.24.028.484.043.732.043 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
                </svg>
            ),
        },
        {
            id: 'naver' as Provider,
            name: 'Naver',
            bgColor: 'bg-[#03C75A]',
            textColor: 'text-white',
            borderColor: 'border-transparent',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-3 w-full">
            {buttons.map((btn) => (
                <button
                    key={btn.id}
                    onClick={() => handleSocialLogin(btn.id)}
                    disabled={!!loading}
                    className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border ${btn.borderColor} ${btn.bgColor} ${btn.textColor} font-bold text-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-50`}
                >
                    {loading === btn.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        btn.icon
                    )}
                    <span>{btn.name} 로그인</span>
                </button>
            ))}
        </div>
    );
}
