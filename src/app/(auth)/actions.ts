'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {

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

export async function resetPassword(formData: FormData) {
    const email = formData.get('email') as string
    const supabase = await createClient()

    // Assuming we want to redirect to a page where they can enter a new password
    // We need to construct the full URL for the callback
    const origin = (await headers()).get('origin')
    const callbackUrl = `${origin}/auth/callback?redirect_to=/auth/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl,
    })

    if (error) {
        console.error('Reset password error:', error)
        return redirect('/forgot-password?message=Could not send reset email')
    }

    return redirect('/forgot-password?message=Check your email for the password reset link')
}

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('password-confirm') as string

    if (password !== passwordConfirm) {
        return redirect('/auth/update-password?message=Passwords do not match')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        console.error('Update password error:', error)
        return redirect('/auth/update-password?message=Could not update password')
    }

    return redirect('/login?message=Password updated successfully')
}
