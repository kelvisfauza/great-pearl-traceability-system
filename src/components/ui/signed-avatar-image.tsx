import { AvatarImage } from '@/components/ui/avatar';
import { extractAvatarPath, useSignedAvatarUrl } from '@/utils/avatarUrl';
import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof AvatarImage>, 'src'> & {
  /** Stored avatar value: a legacy public URL or a bare storage path. */
  src?: string | null;
};

/**
 * Drop-in replacement for <AvatarImage> that resolves photos from the
 * private `profile_pictures` bucket into short-lived signed URLs.
 * Renders nothing until the URL resolves, so the Avatar fallback shows.
 */
export function SignedAvatarImage({ src, ...rest }: Props) {
  const signed = useSignedAvatarUrl(src);

  // Values that don't point at the private profile_pictures bucket
  // (e.g. external/gravatar URLs) are passed through untouched.
  const isManagedPhoto = Boolean(extractAvatarPath(src));
  const resolved = isManagedPhoto ? signed : src || undefined;

  if (!resolved) return null;
  return <AvatarImage src={resolved} {...rest} />;
}

export default SignedAvatarImage;