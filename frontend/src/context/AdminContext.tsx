import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import api from "../api";

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  adminToken: string | null;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: async () => {},
  logout: () => {},
  adminToken: null,
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    sessionStorage.getItem("adminToken"),
  );

  const isAdmin = !!adminToken;

  const login = useCallback(async (password: string) => {
    const res = await api.post<{ token: string }>("/admin/login", {
      password,
    });
    const token = res.data.token;
    setAdminToken(token);
    sessionStorage.setItem("adminToken", token);
  }, []);

  const logout = useCallback(() => {
    if (adminToken) {
      api
        .post("/admin/logout", null, {
          params: { token: adminToken },
        })
        .catch(() => {});
    }
    setAdminToken(null);
    sessionStorage.removeItem("adminToken");
  }, [adminToken]);

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, adminToken }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
