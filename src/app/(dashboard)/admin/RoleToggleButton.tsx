
'use client'

import { useState } from 'react';
import { updateUserRole } from './actions-admin';
import { RefreshCw } from 'lucide-react';

interface Props {
    targetUserId: string;
    currentRole: 'user' | 'admin';
    isSelf: boolean;
}

export default function RoleToggleButton({ targetUserId, currentRole, isSelf }: Props) {
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (isSelf) {
            alert('자신의 권한은 직접 변경할 수 없습니다.');
            return;
        }

        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const confirmMsg = `정말 ${newRole === 'admin' ? '관리자로 승격' : '일반 유저로 강등'}하시겠습니까?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const result = await updateUserRole(targetUserId, newRole);
            if (!result.success) throw new Error('Failed');
        } catch (err: any) {
            alert(err.message || '권한 변경 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (isSelf) return <span className="text-xs text-zinc-400 italic">Self</span>;

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ml-auto ${currentRole === 'admin'
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                }`}
        >
            {loading && <RefreshCw size={12} className="animate-spin" />}
            {currentRole === 'admin' ? '일반 유저로 전환' : '관리자로 승격'}
        </button>
    );
}
