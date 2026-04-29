const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface AccountWorkspace {
    tenant_id: string;
    workspace_name: string;
    role: string;
    status: string;
    workspace_type: string;
    onboarding_required: boolean;
    plan: string;
    is_last_active: boolean;
}

interface LegacyWorkspace {
    tenant_id: string;
    company_name: string;
    role: string;
    status: string;
}

function normalizeLegacyWorkspace(workspace: LegacyWorkspace): AccountWorkspace {
    return {
        tenant_id: workspace.tenant_id,
        workspace_name: workspace.company_name || 'Workspace',
        role: workspace.role || 'viewer',
        status: workspace.status || 'active',
        workspace_type: 'MAIN',
        onboarding_required: workspace.status === 'onboarding',
        plan: 'Free',
        is_last_active: false,
    };
}

export async function fetchAccountWorkspaces(authToken: string): Promise<AccountWorkspace[]> {
    const headers = { Authorization: `Bearer ${authToken}` };
    let accountErrorDetail = 'Failed to load your workspaces.';

    try {
        const accountResponse = await fetch(`${API_BASE}/account/workspaces`, { headers });
        if (accountResponse.ok) {
            const data = await accountResponse.json();
            return Array.isArray(data) ? data : [];
        }

        try {
            const payload = await accountResponse.json();
            accountErrorDetail = payload.detail || accountErrorDetail;
        } catch {}
    } catch {}

    const legacyResponse = await fetch(`${API_BASE}/auth/workspaces`, { headers });
    if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        if (!Array.isArray(legacyData)) {
            return [];
        }

        return legacyData.map(normalizeLegacyWorkspace);
    }

    try {
        const payload = await legacyResponse.json();
        accountErrorDetail = payload.detail || accountErrorDetail;
    } catch {}

    throw new Error(accountErrorDetail);
}
