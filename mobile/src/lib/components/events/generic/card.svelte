<script lang="ts">
	import { longFormStore } from '$lib/stores/long-form';
    import NoteCard from '$lib/components/notes/card.svelte';
    import { getContext } from 'svelte';
    import { ndk, HighlightCard } from "@kind0/ui-common";
    import { createEventDispatcher } from 'svelte';
    import type { NDKEvent } from '@nostr-dev-kit/ndk';
    import { NDKListKinds } from "@nostr-dev-kit/ndk";
    import { user } from '$stores/session';
    import { NDKHighlight, NDKList } from "@nostr-dev-kit/ndk";
    import { naddrFromTagValue } from '$lib/utils';
    import ListCard from '$lib/components/lists/ListCard.svelte';
    import ArticleIntroCard from '$lib/components/articles/cards/ArticleIntroCard.svelte';
    import NDKArticle from "@nostr-dev-kit/ndk";
    import { createDraggableEvent } from '$lib/utils/draggable';
    import { isMarginNote } from './types';
    import { MarginNoteCard } from '@highlighter/svelte-kit-lib';

    export let bech32: string | undefined = undefined;
    export let id: string | undefined = undefined;
    export let skipReplies: boolean = false;
    export let skipTitle: boolean | undefined = undefined;
    export let skipFooter: boolean = false;
    export let expandReplies: boolean = true;
    export let event: NDKEvent | undefined = undefined;
    export let embeddedMode: boolean = false;
    export let draggable = true;

    const dispatcher = createEventDispatcher();
    let draggableEvent = {};

    async function loadEvent(): Promise<NDKEvent | undefined> {
        if (event) return event;

        if (id && id.startsWith(`31023:`)) {
            const naddr = naddrFromTagValue(id);
            return $longFormStore.get(naddr);
        }

        const p: Promise<NDKEvent | undefined> = new Promise((resolve, reject) => {
            if (!id && !bech32) {
                throw new Error(`no id or bech32`);
            }

            $ndk.fetchEvent(id??bech32!).then(async (e) => {
                if (!e) return reject(`no event ${id}`);

                if (e.kind === 4) {
                    await e.decrypt($user!);
                }

                event = e;
                draggableEvent = createDraggableEvent(e);

                resolve(e);

                dispatcher('eventLoad', e);
            });
        });

        return p;
    }
</script>

{#key id}
    {#await loadEvent()}
        <div class="flex flex-row gap-4 items-center">
            <span class="loading loading-infinity loading-lg"></span>
            Loading event...
        </div>
    {:then e}
        {#if e}
            <div
                class="w-full"
                use:draggableEvent
            >
                {#if isMarginNote(e)}
                    <MarginNoteCard event={e} />
                {:else if e.kind === 9802}
                    {#await NDKHighlight.from(e).getArticle() then article}
                        <HighlightCard
                            highlight={NDKHighlight.from(e)}
                            {skipReplies}
                            {article}
                            skipTitle={skipTitle??getContext("skipTitle")??true}
                            {skipFooter}
                            {embeddedMode}
                        />
                    {/await}
                {:else if e.kind === 1}
                    <NoteCard
                        event={e}
                        {skipReplies}
                        skipHeader={skipTitle}
                        {skipFooter}
                        {expandReplies}
                    />
                {:else if e.kind === 4}
                    <NoteCard
                        event={e}
                        {skipReplies}
                        skipHeader={skipTitle}
                        {skipFooter}
                        {expandReplies}
                    />
                {:else if NDKListKinds.includes(e.kind)}
                    <ListCard list={NDKList.from(e)} />
                {:else if e.kind === 9735}
                    <!-- <ZapEventCard event={e} /> -->
                {:else if e.kind === 30023 || e.kind === 31023}
                    <ArticleIntroCard
                        article={NDKArticle.from(e)}
                        href={`/a/${e.encode()}`}
                    />
                {:else if e.kind >= 30000 && e.kind < 30022}
                    <ListCard list={NDKList.from(e)} />
                {:else if e.kind === 31337}
                    <NoteCard
                        event={e}
                        {skipReplies}
                        {skipFooter}
                        {expandReplies}
                    />
                {:else}
                    <NoteCard
                        event={e}
                        {skipReplies}
                        {skipFooter}
                        {expandReplies}
                    />
                {/if}
            </div>
        {:else}
            <NoteCard
                event={e}
                {skipReplies}
                {skipFooter}
                {expandReplies}
            />
        {/if}
    {:catch e}
        <div class="card">
            <div class="card-body">
                <div class="text-left">
                    Error loading event: {e}
                </div>
            </div>
        </div>
    {/await}
{/key}