import { Platform, Share } from 'react-native';
import { showAlert } from '@/lib/alert';

// Links into Seen: the app's seen:// scheme on a phone, this website's address on the web.

// Where sign-up confirmation and password-reset emails send you (handled by app/auth-confirm.tsx).
// On the web, this site's address must be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
export function authRedirectUrl() {
  if (Platform.OS === 'web') return `${window.location.origin}/auth-confirm`;
  return 'seen://auth/confirm';
}

function profileUrl(userId: string) {
  if (Platform.OS === 'web') return `${window.location.origin}/user/${userId}`;
  return `seen://user/${userId}`;
}

// Share a profile link. Browsers without a share sheet (most desktops) copy it instead.
export async function shareProfileLink(userId: string) {
  const url = profileUrl(userId);
  if (Platform.OS !== 'web') {
    await Share.share({ message: url });
    return;
  }
  if (navigator.share) {
    await navigator.share({ url }).catch(() => {}); // closing the share sheet isn't an error
    return;
  }
  await navigator.clipboard.writeText(url);
  showAlert('Link copied', 'Your profile link is on your clipboard.');
}
