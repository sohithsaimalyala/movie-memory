"use client";

import Image from "next/image";
import { useState } from "react";

type UserAvatarProps = {
  src: string | null;
  initial: string | null;
  size?: number;
};

// Client component only so a failed image (expired or blocked URL) can fall back to initials.
export function UserAvatar({ src, initial, size = 56 }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
      />
    );
  }

  return (
    <div
      aria-hidden
      data-avatar-fallback
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-zinc-100 ring-1 ring-zinc-700"
    >
      {initial ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-1/2 w-1/2 text-zinc-400">
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v1.5h16V19c0-2.8-3.6-5-8-5Z" />
        </svg>
      )}
    </div>
  );
}
