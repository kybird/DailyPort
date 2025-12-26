
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

    if (error || !profile || profile.role !== 'admin') {
        // If not admin, redirect to dashboard
        redirect('/dashboard?error=UnauthorizedAccess');
    }

    return { user, profile };
}
