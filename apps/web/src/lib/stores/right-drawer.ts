import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { writable } from 'svelte/store';

export const rightDrawerContent = writable<NDKEvent|undefined>();