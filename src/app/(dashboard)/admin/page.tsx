
import { checkAdmin } from '@/utils/admin-guard';
import { getAllProfiles, getAuditLogs, updateUserRole } from './actions-admin';
import RoleToggleButton from './RoleToggleButton';
import { Shield, Users, Clock, History } from 'lucide-react';

export default async function AdminPage() {
    const { profile: currentAdmin } = await checkAdmin();
    const profiles = await getAllProfiles();
    const auditLogs = await getAuditLogs();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Admin Management</h1>
                </div>
                <p className="text-zinc-500">Manage user roles and monitor administrative actions.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Member Management List */}
                <section className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={20} className="text-blue-500" />
                        <h2 className="text-xl font-bold">Members</h2>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Provider</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {profiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-zinc-900 dark:text-white">{p.full_name || 'Anonymous'}</span>
                                                <span className="text-xs text-zinc-500">{p.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${p.role === 'admin'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-zinc-500 capitalize">{p.provider || 'email'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <RoleToggleButton
                                                targetUserId={p.id}
                                                currentRole={p.role as 'user' | 'admin'}
                                                isSelf={p.id === currentAdmin.id}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Audit Logs Sidebar */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <History size={20} className="text-orange-500" />
                        <h2 className="text-xl font-bold">Audit Logs</h2>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-4">
                        <div className="space-y-4">
                            {auditLogs.length === 0 ? (
                                <p className="text-sm text-zinc-500 text-center py-8">No recent activity.</p>
                            ) : (
                                auditLogs.map((log: any) => (
                                    <div key={log.id} className="text-xs border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-blue-600">
                                                {log.actor?.full_name || 'Admin'}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            Changed <span className="font-bold text-zinc-900 dark:text-white">{log.target?.full_name || log.target?.email}</span>&apos;s role
                                            from <span className="italic">{log.old_role}</span> to <span className="italic font-bold">{log.new_role}</span>.
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
