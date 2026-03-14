import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetCurrentUser, useLogin, useLogout, type Employee } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: Employee | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutateAsync"];
  logout: ReturnType<typeof useLogout>["mutateAsync"];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [autoLoggingIn, setAutoLoggingIn] = useState(true);

  const { data: user, isLoading: userLoading } = useGetCurrentUser({
    query: { retry: false, staleTime: Infinity }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
      }
    }
  });

  useEffect(() => {
    if (!userLoading && !user) {
      loginMutation.mutateAsync({ data: { username: "admin", password: "admin123" } })
        .finally(() => setAutoLoggingIn(false));
    } else if (!userLoading) {
      setAutoLoggingIn(false);
    }
  }, [userLoading]);

  const isLoading = userLoading || autoLoggingIn;

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isLoading,
      login: loginMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
