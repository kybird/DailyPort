
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // The `/auth/callback` route is required for the server-side auth flow
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin
    const next = requestUrl.searchParams.get('next') || '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Check for specific redirect after auth (e.g. for password reset)
            const redirectTo = requestUrl.searchParams.get('redirect_to')
            if (redirectTo) {
                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}${redirectTo}`)
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`)
                } else {
                    return NextResponse.redirect(`${origin}${redirectTo}`)
                }
            }

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
