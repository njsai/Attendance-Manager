import { createContext, useContext, ReactNode } from "react";
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
  const { data: user, isLoading } = useGetCurrentUser({
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
