import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("[v0] Auth timeout - forcing loading false");
        setLoading(false);
      }
    }, 5000);

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
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
