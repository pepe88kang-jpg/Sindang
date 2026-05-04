import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log("[v0] Auth timeout - forcing loading false");
      if (isMounted) setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        console.log("[v0] Auth state changed:", u?.email || "no user");
        setUser(u);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[v0] Auth error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
