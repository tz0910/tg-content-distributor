"use client";

import { useState } from "react";

export function CoverImage({ src, className }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-muted text-xs text-slate-500 ${className || ""}`}>
        封面不可用
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} loading="lazy" onError={() => setFailed(true)} />;
}
