import { useNativeBackButton } from '@/hooks/use-back-button';

export function BackButtonHandler() {
  useNativeBackButton();
  return null;
}
