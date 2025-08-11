// Simple organization management for demo mode
export type Org = {
  id: string;
  name: string;
  slug: string;
};

// Local storage management for selected org
const ORG_KEY = 'bepoz_selected_org';

export const orgStorage = {
  getSelectedOrg: (): Org | null => {
    const orgData = localStorage.getItem(ORG_KEY);
    return orgData ? JSON.parse(orgData) : null;
  },
  
  setSelectedOrg: (org: Org): void => {
    localStorage.setItem(ORG_KEY, JSON.stringify(org));
  },
  
  removeSelectedOrg: (): void => {
    localStorage.removeItem(ORG_KEY);
  },
};

// API functions for org management
export const orgAPI = {
  getOrgs: async (): Promise<Org[]> => {
    try {
      const response = await fetch('/api/orgs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      return [];
    }
  },
  
  selectOrg: async (organizationId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/orgs/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to select organization');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to select organization:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to select organization' 
      };
    }
  },
};

// Custom fetch function that includes org context
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const selectedOrg = orgStorage.getSelectedOrg();
  const headers = {
    'Content-Type': 'application/json',
    ...(selectedOrg && { 'X-Org-Id': selectedOrg.id }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};