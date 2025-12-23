
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return redirect('/login?message=Could not authenticate user')
    }

    return redirect('/dashboard')
}

export async function signup(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    // Determine the base URL for redirection
    // Priority: NEXT_PUBLIC_SITE_URL -> Vercel Deployment URL -> Request Origin -> Localhost
    let redirectUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!redirectUrl) {
        // If VERCEL_URL is present (e.g. preview/production), it usually doesn't include https://
        if (process.env.VERCEL_URL) {
            redirectUrl = `https://${process.env.VERCEL_URL}`;
        } else {
            // Fallback to origin header
            const origin = (await headers()).get('origin');
            redirectUrl = origin || 'http://localhost:3000';
        }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${redirectUrl}/auth/callback`,
        },
    })

    if (error) {
        return redirect('/signup?message=Could not authenticate user')
    }

    return redirect('/signup?message=Check email to continue sign in process')
}
