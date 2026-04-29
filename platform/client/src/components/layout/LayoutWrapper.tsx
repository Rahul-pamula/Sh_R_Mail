"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import SettingsSidebar from "@/components/layout/SettingsSidebar";
import Header from "@/components/layout/Header";
import AccountShell from "@/components/layout/AccountShell";

interface LayoutWrapperProps {
    children: React.ReactNode;
}

import { useState } from "react";

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { isAuthenticated, isLoading, user, currentWorkspace } = useAuth();

    // Public routes that should NOT show sidebar (marketing/auth pages)
    const publicRoutes = ['/', '/login', '/signup', '/docs', '/forgot-password', '/reset-password', '/verify-email', '/waiting-room', '/team/join', '/contact', '/pricing', '/auth/callback', '/unsubscribe'];
    const isPublicRoute = publicRoutes.includes(pathname || '');
    const isOnboardingRoute = pathname?.startsWith('/onboarding');
    const isAccountRoute = pathname?.startsWith('/account');
    const isSettingsRoute = pathname?.startsWith('/settings');

    // Full-screen routes are reserved for focused builders/editors only.
    const isFullScreenRoute = (
        pathname?.startsWith('/templates/') && (
            pathname?.includes('/builder') || pathname?.includes('/editor') || pathname?.includes('/block')
        )
    );

    // Account routes live outside workspace chrome and should feel identity-scoped.
    const showAccountChrome = !isPublicRoute && !isOnboardingRoute && !isFullScreenRoute && isAuthenticated && isAccountRoute;

    // Settings use their own local rail and should not compete with the full app sidebar.
    const showAppChrome = !isPublicRoute && !isOnboardingRoute && !isFullScreenRoute && isAuthenticated && !isAccountRoute;
    const showSidebar = showAppChrome;
    const showHeader = showAppChrome;


    // Show loading state
    const isRedirectingToOnboarding = isAuthenticated && user?.tenantStatus === 'onboarding' && !isOnboardingRoute && !isPublicRoute && !isAccountRoute;
    if (isLoading || isRedirectingToOnboarding || (showAppChrome && !currentWorkspace)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <div className="w-8 h-8 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-solid border-[var(--accent)] border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (showAccountChrome) {
        return <AccountShell>{children}</AccountShell>;
    }

    return (
        <div className="flex h-screen overflow-hidden relative">

            {showSidebar && (
                isSettingsRoute 
                    ? <SettingsSidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
                    : <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
            )}

            <main className="flex-1 overflow-auto bg-[var(--bg-primary)] flex flex-col min-w-0">
                {showHeader && <Header setMobileMenuOpen={() => setMobileMenuOpen(true)} settingsMode={isSettingsRoute} />}
                <div className={`flex-1 ${showHeader ? `px-5 pt-6 pb-8 md:px-8 max-w-[1600px] mx-auto w-full` : 'w-full'}`}>
                    {children}
                </div>
            </main>
        </div>
    );
}
