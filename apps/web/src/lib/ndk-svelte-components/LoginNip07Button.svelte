<script lang="ts">
    import { ndk } from "@kind0/ui-common";
    import { login } from '$lib/utils/login';
    import { user } from '$stores/session';
    import { SubtleButton } from "@kind0/ui-common";

    let noNip07extenion: boolean;

    $: noNip07extenion = !window.nostr;

    async function loginNip07() {
        const _user = await login($ndk, undefined, 'nip07');

        if (!_user) {
            alert('Login failed');
        } else {
            $user = _user;
            localStorage.setItem('nostr-key-method', 'nip07');
            localStorage.setItem('nostr-target-npub', $user.npub);
        }
    }
</script>

{#if noNip07extenion}
    <div class="alert flex flex-col bg-base-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"
            ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            /></svg
        >
        <span>No Nostr extension in your browser</span>
        <div class="hidden">
            <button class="btn btn-xs">Need help?</button>
        </div>
    </div>
{:else}
    <SubtleButton on:click={loginNip07} class="w-full">
        <span>Use Browser Extension</span>
    </SubtleButton>
{/if}
