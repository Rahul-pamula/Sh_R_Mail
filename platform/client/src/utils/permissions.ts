import { useAuth } from '@/context/AuthContext';

export type UserRole = 'OWNER' | 'ADMIN' | 'CREATOR' | 'VIEWER';
export type WorkspaceType = 'MAIN' | 'FRANCHISE';

export type Action = 
    | 'workspace:rename'
    | 'workspace:delete'
    | 'workspace:transfer'
    | 'workspace:view'
    | 'team:invite'
    | 'team:manage_roles'
    | 'team:view'
    | 'billing:manage'
    | 'billing:view'
    | 'domains:add'
    | 'domains:verify'
    | 'domains:delete'
    | 'domains:view'
    | 'campaign:create'
    | 'campaign:edit'
    | 'campaign:send'
    | 'campaign:manage'
    | 'campaign:view'
    | 'contacts:import'
    | 'contacts:export'
    | 'contacts:view'
    | 'analytics:view'
    | 'settings:view'
    | 'settings:update'
    | 'api_keys:manage'
    | 'franchise:manage'
    | 'template:view'
    | 'template:manage'
    | 'sender:manage'
    | 'settings:manage';


interface UserContext {
    role: UserRole;
    workspaceType: WorkspaceType;
}

/**
 * Production-grade RBAC permission check for UI elements.
 */
export function can(user: UserContext | null | undefined, action: Action): boolean {
    if (!user || !user.role || !user.workspaceType) {
        return false;
    }

    const { role, workspaceType } = user;

    // 1. WORKSPACE ISOLATION: Franchise workspaces cannot delete infrastructure
    if (workspaceType === 'FRANCHISE') {
        if (['workspace:delete', 'workspace:transfer', 'domains:delete'].includes(action)) {
            return false;
        }
    }

    // 2. ROLE-BASED ACCESS
    switch (role) {
        case 'OWNER':
            return true;

        case 'ADMIN':
            // Admins can do everything EXCEPT critical owner actions
            const ownerOnlyActions = [
                'workspace:rename', 'workspace:delete', 'workspace:transfer',
                'team:manage_roles', 'billing:manage', 'domains:delete', 
                'domains:add', 'domains:verify', 'api_keys:manage',
                'franchise:manage'
            ];
            return !ownerOnlyActions.includes(action);

        case 'CREATOR':
            // Creators focus on content production
            const creatorActions = [
                'campaign:create', 'campaign:edit', 'campaign:view',
                'contacts:import', 'contacts:view', 'analytics:view',
                'team:view', 'domains:view', 'billing:view',
                'template:view', 'template:manage',
                'workspace:view', 'settings:view', 'settings:update'
            ];
            // Explicitly deny manage permissions even if not in ownerOnlyActions
            if (['billing:manage', 'settings:manage'].includes(action)) return false;
            return creatorActions.includes(action as any);

        case 'VIEWER':
            // Viewers are read-only
            const viewerActions = [
                'campaign:view', 'analytics:view', 'contacts:view',
                'team:view', 'domains:view', 'billing:view',
                'template:view', 'workspace:view', 'settings:view'
            ];
            return viewerActions.includes(action as any);

        default:
            return false;
    }
}
