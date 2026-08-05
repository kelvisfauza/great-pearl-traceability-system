import { AvatarImage } from '@/components/ui/avatar';
import { useSignedAvatarUrl } from '@/utils/avatarUrl';
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
  if (!signed) return null;
  return <AvatarImage src={signed} {...rest} />;
}

export default SignedAvatarImage;