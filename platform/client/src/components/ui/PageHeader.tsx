'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;        // e.g. <Button>Import</Button>
    breadcrumb?: ReactNode;    // pass <Breadcrumb> component
}

function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
                {breadcrumb && (
                    <div className="mb-1">{breadcrumb}</div>
                )}
                <h1 className="heading-1 truncate leading-none mt-0">
                    {title}
                </h1>
                {subtitle && (
                    <p className="body-text mt-2">{subtitle}</p>
                )}
            </div>
            {action && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}

export { PageHeader };
