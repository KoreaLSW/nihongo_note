"use client";

import { useEffect } from "react";

type Props = { seed: string };

export function QuizSeedSync({ seed }: Props) {
  useEffect(() => {
    if (!seed) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("seed") === seed) return;
    params.set("seed", seed);
    const url = `${window.location.pathname}?${params}`;
    window.history.replaceState(null, "", url);
  }, [seed]);

  return null;
}
