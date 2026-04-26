import { useAuth } from '@/context/AuthContext';

export type UserRole = 'OWNER' | 'MANAGER' | 'MEMBER';
export type WorkspaceType = 'MAIN' | 'FRANCHISE';

export type Action = 
    | 'ADD_DOMAIN'
    | 'VIEW_DOMAIN'
    | 'DELETE_DOMAIN'
    | 'ADD_FRANCHISE'
    | 'VIEW_FRANCHISE'
    | 'MANAGE_FRANCHISE'
    | 'VIEW_BILLING'
    | 'MANAGE_BILLING'
    | 'ADD_MANAGER'
    | 'ADD_MEMBER'
    | 'ADD_SENDER'
    | 'VIEW_SENDER'
    | 'VIEW_SETTINGS'
    | 'MANAGE_SETTINGS'
    | 'VIEW_TEAM'
    | 'MANAGE_TEAM'
    | 'VIEW_CONTACT'
    | 'MANAGE_CONTACT'
    | 'VIEW_ASSETS'
    | 'ADD_ASSETS'
    | 'VIEW_TEMPLATE'
    | 'MANAGE_TEMPLATE'
    | 'VIEW_CAMPAIGN'
    | 'CREATE_CAMPAIGN'
    | 'VIEW_ANALYTICS';


interface UserContext {
    role: UserRole;
    workspaceType: WorkspaceType;
}

export function can(user: UserContext | null | undefined, action: Action): boolean {
    if (!user || !user.role || !user.workspaceType) {
        // Fail-safe: if missing context, deny all
        return false;
    }

    // STRICT WORKSPACE OVERRIDE:
    // Franchise workspaces cannot manage infrastructure or spawn sub-franchises.
    if (user.workspaceType === 'FRANCHISE') {
        if (action === 'ADD_DOMAIN' || action === 'DELETE_DOMAIN' || action === 'ADD_FRANCHISE') {
            return false;
        }
    }

    const { role } = user;

    switch (role) {
        case 'OWNER':
            return true;

        case 'MANAGER':
            if (action === 'ADD_DOMAIN' || action === 'DELETE_DOMAIN' || action === 'ADD_FRANCHISE' || action === 'MANAGE_FRANCHISE' || action === 'VIEW_FRANCHISE' || action === 'VIEW_BILLING' || action === 'MANAGE_BILLING' || action === 'ADD_MANAGER') return false;
            return true;

        case 'MEMBER':
            // Members can ONLY view Operational data
            switch (action) {
                case 'VIEW_CAMPAIGN':
                case 'VIEW_ANALYTICS':
                case 'VIEW_CONTACT':
                case 'VIEW_TEMPLATE':
                case 'VIEW_ASSETS':
                    return true;
                default:
                    return false;
            }

        default:
            return false;
    }

}
