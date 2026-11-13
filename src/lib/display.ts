type ProfileFields = { name: string | null; email: string | null };

/** First word of the profile name, or null when no usable name exists. */
export function getFirstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

/** Single uppercase character for avatar fallbacks, from name then email. */
export function getInitial({ name, email }: ProfileFields): string | null {
  const source = name?.trim() || email?.trim();
  const first = source ? Array.from(source)[0] : undefined;
  return first ? first.toUpperCase() : null;
}

const AVATAR_ORIGIN = "https://lh3.googleusercontent.com/";

/**
 * Only pass through image URLs allowed by next.config.ts images.remotePatterns;
 * anything else would make next/image throw, so fall back to initials instead.
 */
export function getAvatarUrl(image: string | null): string | null {
  return image?.startsWith(AVATAR_ORIGIN) ? image : null;
}
