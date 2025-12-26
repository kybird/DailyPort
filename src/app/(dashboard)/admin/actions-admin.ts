
'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(targetUserId: string, newRole: 'user' | 'admin') {
    const supabase = await createClient();

    // 1. Verify current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
        throw new Error('Unauthorized: Admin only');
    }

    // 2. Safety Checks
    // A. Prevent self-demotion
    if (targetUserId === currentUser.id && newRole !== 'admin') {
        throw new Error('Self-demotion is not allowed for safety');
    }

    // B. Prevent last admin removal
    if (newRole !== 'admin') {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'admin');

        if (count && count <= 1) {
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', targetUserId)
                .single();

            if (targetProfile?.role === 'admin') {
                throw new Error('Cannot remove the last admin');
            }
        }
    }

    // 3. Fetch old role for audit
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();

    if (!targetProfile) throw new Error('Target user not found');
    const oldRole = targetProfile.role;

    // 4. Update role and insert audit log (Atomic as possible in code)
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

    if (updateError) throw updateError;

    const { error: auditError } = await supabase
        .from('admin_role_audit')
        .insert({
            actor_id: currentUser.id,
            target_id: targetUserId,
            old_role: oldRole,
            new_role: newRole
        });

    if (auditError) {
        console.error('Audit log failed but role was updated:', auditError);
    }

    revalidatePath('/admin');
    return { success: true };
}

export async function getAllProfiles() {
    const supabase = await createClient();

    // Authorization check
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (profile?.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getAuditLogs() {
    const supabase = await createClient();

    // Authorization check
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (profile?.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('admin_role_audit')
        .select(`
            *,
            actor:profiles!actor_id(full_name, email),
            target:profiles!target_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;
    return data;
}
