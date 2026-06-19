"use client";

import { useEffect, useState } from "react";
import { GABI_USER_KEY } from "@/lib/session/keys";
import { isGabiOperator } from "@/lib/gabi/operator";

type SessionUser = {
  email?: string;
  rol?: string;
};

export function useGabiOperator() {
  const [ready, setReady] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GABI_USER_KEY);
      if (!stored) {
        setReady(true);
        return;
      }
      const parsed = JSON.parse(stored) as SessionUser;
      setUser(parsed);
      setIsOperator(isGabiOperator(parsed));
    } catch {
      setIsOperator(false);
    } finally {
      setReady(true);
    }
  }, []);

  return { ready, isOperator, user };
}
