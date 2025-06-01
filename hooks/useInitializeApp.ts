import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function useInitializeApp() {
  const { refreshSession } = useAuthStore();

  useEffect(() => {
    // Check if there's an existing session when the app starts
    refreshSession();
  }, []);
}
