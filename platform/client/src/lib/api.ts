/**
 * CENTRALIZED API CLIENT (Moved to native fetch, fully removing Axios)
 * 
 * 🔒 Security Guarantee:
 * - Every API request MUST include X-Tenant-ID header
 * - Tenant ID is automatically injected from AuthContext
 * - If tenant is missing, request is blocked immediately
 * 
 * 🎯 Usage:
 * - Import `api` from this file
 * - Use `api.get()`, `api.post()`, etc.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithInterceptor(endpoint: string, options: RequestInit = {}) {
    // 1. Intercept Request: Inject Tenant ID
    const storedUser = localStorage.getItem('email_engine_user');

    if (!storedUser) {
        throw new Error('🚨 SECURITY: No authenticated user found. Blocking API call.');
    }

    let tenantId: string | null = null;
    let token: string | null = null;

    try {
        const user = JSON.parse(storedUser);
        tenantId = user.tenantId;
        token = user.token || null;
    } catch (e) {
        throw new Error('🚨 SECURITY: Invalid user session. Blocking API call.');
    }

    if (!tenantId) {
        throw new Error('🚨 SECURITY: Tenant ID missing. Blocking API call to prevent data leakage.');
    }

    // Set up headers securely
    const headers = new Headers(options.headers || {});
    
    // Automatically set Content-Type to JSON if sending raw object data, unless they passed FormData
    if (!headers.has('Content-Type') && !(typeof window !== 'undefined' && options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    headers.set('X-Tenant-ID', tenantId);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const fullUrl = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

    console.log(`[API] ${options.method || 'GET'} ${fullUrl} | Tenant: ${tenantId}`);

    // Execute Request
    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    // 2. Intercept Response: Handle Errors like Axios did
    if (!response.ok) {
        const status = response.status;
        let errorData = null;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = await response.text();
        }

        switch (status) {
            case 400: console.error('[API] Bad Request:', errorData); break;
            case 401:
                console.error('[API] Unauthorized - redirecting to login');
                localStorage.removeItem('email_engine_user');
                if (typeof window !== 'undefined') window.location.href = '/login';
                break;
            case 403: console.error('[API] Forbidden - tenant access denied'); break;
            case 404: console.error('[API] Not Found:', fullUrl); break;
            case 500: console.error('[API] Server Error'); break;
            default: console.error('[API] Error:', status, errorData);
        }

        // Emulate Axios error wrapper
        const error = new Error(`Request failed with status code ${status}`) as any;
        error.response = { status, data: errorData };
        throw error;
    }

    // Axios automatically parses JSON, so we emulate that
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return { data, status: response.status, headers: response.headers };
}

// Emulate the Axios API shape that your components are currently using:
export const api = {
    get: (url: string, config?: any) => fetchWithInterceptor(url, { method: 'GET', ...config }),
    
    post: (url: string, data?: any, config?: any) => fetchWithInterceptor(url, { 
        method: 'POST', 
        body: data instanceof FormData ? data : JSON.stringify(data), 
        ...config 
    }),
    
    patch: (url: string, data?: any, config?: any) => fetchWithInterceptor(url, { 
        method: 'PATCH', 
        body: data instanceof FormData ? data : JSON.stringify(data), 
        ...config 
    }),
    
    put: (url: string, data?: any, config?: any) => fetchWithInterceptor(url, { 
        method: 'PUT', 
        body: data instanceof FormData ? data : JSON.stringify(data), 
        ...config 
    }),
    
    delete: (url: string, config?: any) => fetchWithInterceptor(url, { method: 'DELETE', ...config })
};

/**
 * Type-safe API helpers
 */
export const apiClient = {
    campaigns: {
        list: () => api.get('/campaigns'),
        get: (id: string) => api.get(`/campaigns/${id}`),
        create: (data: any) => api.post('/campaigns', data),
        update: (id: string, data: any) => api.patch(`/campaigns/${id}`, data),
        delete: (id: string) => api.delete(`/campaigns/${id}`),
        send: (id: string, data: any) => api.post(`/campaigns/${id}/send`, data),
        preview: (id: string, contact?: any) => api.post(`/campaigns/${id}/preview`, contact),
    },
    contacts: {
        upload: (file: File, projectId: string) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post(`/contacts/upload?project_id=${projectId}`, formData);
        },
    },
    analytics: {
        getStats: (projectId: string) => api.get(`/webhooks/stats?project_id=${projectId}`),
    },
};

export default api;
