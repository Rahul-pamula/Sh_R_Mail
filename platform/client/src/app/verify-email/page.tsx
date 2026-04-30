'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth';
import { Button, InlineAlert } from '@/components/ui';

function VerifyEmailContent() {
    const { user, finishAuthFlow, token, updateUserContext } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || user?.email || '';

    // Auto-redirect if the user is already verified (handles the UI glitch)
    useEffect(() => {
        if (user?.emailVerified && token) {
            finishAuthFlow(token, user).catch(console.error);
        }
    }, [user?.emailVerified, token, finishAuthFlow, user]);
    
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    useEffect(() => {
        // Auto-focus first input
        if (inputRefs[0].current) {
            inputRefs[0].current.focus();
        }
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only numbers
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Take only the last digit
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5 && inputRefs[index + 1].current) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs[index - 1].current) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        pastedData.split('').forEach((char, index) => {
            if (index < 6) newOtp[index] = char;
        });
        setOtp(newOtp);
        
        // Focus last input or the next empty one
        const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
        inputRefs[nextIndex].current?.focus();
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setIsSubmitting(true);
        setError('');
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: code }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Verification failed');
            }

            setSuccess('Email verified! Redirecting...');
            
            // Short delay to show success
            setTimeout(async () => {
                if (token && user) {
                    const updatedUser = { ...user, emailVerified: true };
                    updateUserContext({ emailVerified: true });
                    await finishAuthFlow(token, updatedUser);
                } else {
                    router.push('/dashboard'); // Fallback
                }
            }, 1000); // Reduced delay slightly for better UX
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-otp?email=${encodeURIComponent(email)}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to resend code');
            }

            const data = await response.json();
            if (data.message === "Email already verified") {
                // If the backend says they are already verified, force redirect
                if (token && user) {
                    await finishAuthFlow(token, user);
                } else {
                    router.push('/dashboard'); // Fallback
                }
                return;
            }

            setSuccess('A new verification code has been sent to your email.');
            setOtp(['', '', '', '', '', '']);
            inputRefs[0].current?.focus();
        } catch (err: any) {
            setError(err.message || 'Error resending code');
        } finally {
            setIsResending(false);
        }
    };

    // Auto-submit when all 6 digits are filled
    useEffect(() => {
        if (otp.join('').length === 6 && !isSubmitting) {
            handleSubmit();
        }
    }, [otp]);

    return (
        <AuthShell
            title="Check your email"
            description={
                <span>
                    We&apos;ve sent a 6-digit verification code to <span className="font-semibold text-[var(--text-primary)] break-all">{email || 'your email'}</span>.
                </span>
            }
            asideTitle="Security first, always"
            asideDescription="We use one-time codes to ensure your account remains protected and your workspace data stays isolated."
        >
            <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <InlineAlert
                            variant="danger"
                            title="Verification failed"
                            description={error}
                        />
                    )}
                    
                    {success && (
                        <InlineAlert
                            variant="success"
                            title={success.includes('verified') ? 'Success' : 'Code sent'}
                            description={success}
                        />
                    )}

                    <div className="flex justify-between gap-2 sm:gap-3">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={inputRefs[index]}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="h-12 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-center text-2xl font-bold text-[var(--text-primary)] transition-all focus:border-[var(--accent)] focus:bg-[var(--bg-card)] focus:ring-4 focus:ring-[var(--accent)]/10 sm:h-14"
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <Button 
                            type="submit" 
                            isLoading={isSubmitting} 
                            size="lg" 
                            className="w-full"
                            disabled={otp.join('').length < 6}
                        >
                            Verify email
                            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                        </Button>
                        
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isResending || isSubmitting}
                            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                            {isResending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Resend verification code
                        </button>
                    </div>
                </form>

                <p className="text-center text-sm text-[var(--text-muted)]">
                    Wait, that&apos;s the wrong email?{' '}
                    <button 
                        onClick={() => router.push('/signup')}
                        className="font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    >
                        Go back
                    </button>
                </p>
            </div>
        </AuthShell>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
