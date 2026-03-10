"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Role } from "@/types/role";

interface User extends FirebaseUser {
  role?: Role;
  nucleoId?: string;
  nucleo?: { id: string; nome: string };
  backendToken?: string;
  backendId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: Role | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        // Fetch user profile from Backend
        try {
          // We use simple fetch here to avoid circular dependency or import issues with 'api' if configured differently
          // But ideally we use the configured api client. Let's try raw fetch for safety in Context.
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/usuarios/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            const userData = await response.json();
            const extendedUser: User = {
              ...firebaseUser,
              backendToken: token,
              backendId: userData.id,
              role: userData.role,
              nucleoId: userData.nucleo?.id,
              nucleo: userData.nucleo,
              // Merge other backend fields if needed
            };
            setUser(extendedUser);
          } else {
            console.error(
              "Failed to fetch backend profile",
              await response.text(),
            );
            // Fallback or Logout? For now, keep as basic user but warn
            const extendedUser: User = {
              ...firebaseUser,
              backendToken: token,
              role: Role.SOCIO, // Fallback to safe role
            };
            setUser(extendedUser);
          }
        } catch (error) {
          console.error("Error fetching backend profile", error);
          const extendedUser: User = {
            ...firebaseUser,
            backendToken: token,
            role: Role.SOCIO,
          };
          setUser(extendedUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role: user?.role || null }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
