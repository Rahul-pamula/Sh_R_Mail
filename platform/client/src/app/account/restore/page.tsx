'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button, useToast } from '@/components/ui';
import { AlertTriangle, Clock, LogOut, RefreshCcw, ShieldCheck } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function DeletionRestorePage() {
    const { user, token, logout, refreshUserStatus } = useAuth();
    const { success, error } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, mins: number } | null>(null);

    useEffect(() => {
        if (user?.deletionScheduledAt) {
            const calculateTime = () => {
                const now = new Date().getTime();
                const deadline = new Date(user.deletionScheduledAt!).getTime();
                const diff = deadline - now;

                if (diff <= 0) return { days: 0, hours: 0, mins: 0 };

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                return { days, hours, mins };
            };

            setTimeLeft(calculateTime());
            const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
            return () => clearInterval(timer);
        }
    }, [user?.deletionScheduledAt]);

    const handleRestore = async () => {
        setIsCancelling(true);
        try {
            const res = await fetch(`${API_BASE}/account/cancel-deletion`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to restore account.');
            }

            success('Account restored successfully!');
            
            // Refresh user context to change status back to 'active'
            // We force a page reload to let AuthContext re-verify everything
            window.location.href = '/dashboard';
        } catch (err: any) {
            error(err.message);
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Premium Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-xl w-full relative z-10 space-y-8 text-center">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    Account Deletion Scheduled
                </div>

                {/* Main Heading */}
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                        Restore Access?
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-md mx-auto leading-relaxed">
                        Your account is currently in a 30-day grace period. Access to dashboards and shared teams is restricted until restoration.
                    </p>
                </div>

                {/* Countdown Card */}
                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl shadow-2xl space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-3xl font-mono font-bold text-white">{timeLeft?.days ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Days</p>
                        </div>
                        <div className="space-y-1 border-x border-zinc-800">
                            <p className="text-3xl font-mono font-bold text-white">{timeLeft?.hours ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Hours</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-mono font-bold text-white">{timeLeft?.mins ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Minutes</p>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-center gap-3 text-sm text-zinc-500">
                        <Clock className="w-4 h-4" />
                        Remaining until permanent anonymization
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4">
                    <Button 
                        size="lg" 
                        onClick={handleRestore}
                        isLoading={isCancelling}
                        className="h-16 text-lg font-bold rounded-2xl bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all group"
                    >
                        <RefreshCcw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                        Restore Account & Access
                    </Button>
                    
                    <button 
                        onClick={() => void logout()}
                        className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors py-2 group"
                    >
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Logout and Continue Deletion
                    </button>
                </div>

                {/* Footer Info */}
                <div className="pt-8 flex flex-col items-center gap-6">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                    <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            GDPR Compliant
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Grace Period Active
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
