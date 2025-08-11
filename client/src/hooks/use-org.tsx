import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { orgStorage, orgAPI, type Org } from "@/lib/org-manager";

interface OrgContextType {
  selectedOrg: Org | null;
  orgs: Org[];
  loading: boolean;
  selectOrg: (org: Org) => Promise<{ success: boolean; message?: string }>;
  clearOrg: () => void;
  loadOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  // Load selected org from storage on mount
  useEffect(() => {
    const storedOrg = orgStorage.getSelectedOrg();
    if (storedOrg) {
      setSelectedOrg(storedOrg);
    }
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    try {
      setLoading(true);
      const fetchedOrgs = await orgAPI.getOrgs();
      setOrgs(fetchedOrgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  const selectOrg = async (org: Org) => {
    try {
      const result = await orgAPI.selectOrg(org.id);
      
      if (result.success) {
        setSelectedOrg(org);
        orgStorage.setSelectedOrg(org);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Failed to select organization:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to select organization' 
      };
    }
  };

  const clearOrg = () => {
    setSelectedOrg(null);
    orgStorage.removeSelectedOrg();
  };

  return (
    <OrgContext.Provider value={{
      selectedOrg,
      orgs,
      loading,
      selectOrg,
      clearOrg,
      loadOrgs,
    }}>
      {children}
    </OrgContext.Provider>
  );
}