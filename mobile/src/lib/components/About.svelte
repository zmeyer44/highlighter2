<script lang="ts">
	import GenericEventCard from '$lib/components/events/generic/card.svelte';
    import { onMount } from "svelte";

    const purpleTextOrangeHighlightsId = '30023:6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93:1680612926599';
    const highlightId = '532808e4d60f5f82b95aeaa3ed2e930a0c5973dccb0ede68b28b1931db91440f';

</script>

<div class="text-xl flex flex-col gap-6 leading-relaxed sm:text-justify p-6 text-zinc-700 bg-white shadow rounded-lg">
    <p>Highlighter is a feed of a new kind of Nostr event:</p>

    <p class="text-black font-semibold"><mark class="p-1">Highlights</mark></p>

    <p>
        Think of it as a way of keeping
        <span class="text-black">the words you find valuable running on Nostr</span>.
    </p>

    <p>
        This might seem trivial at first;
        <em>what's special about keeping this on Nostr?</em>
    </p>

    <p>
        It's just a synonym of unleashing the value behind those words by making
        them organically interoperable with the rest of the information you,
        and your network, have access to.
    </p>

    <hr class="h-px mb-6 bg-gray-200 border-0 dark:bg-gray-700">

    <h4 class="text-4xl text-black font-serif font-thin mt-4">
        Origin
    </h4>

    <p>
        I started working on Highlighter basically immediately after reading
        <span class="text-orange-500">@dergigi</span>'s excellent
        <em><a href="/a/naddr1qqxnzd3cxqmrzv3exgmr2wfeqy08wumn8ghj7mn0wd68yttsw43zuam9d3kx7unyv4ezumn9wshszyrhwden5te0dehhxarj9ekk7mf0qy88wumn8ghj7mn0wvhxcmmv9uq3zamnwvaz7tmwdaehgu3wwa5kuef0qy2hwumn8ghj7un9d3shjtnwdaehgu3wvfnj7q3qdergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsxpqqqp65wy2vhhv" class="text-orange-500">Purple Text. Orange Highlights</a></em>,
        and was fascinated by the idea of using Nostr to create a new
        method to improve the current tooling around reading and discovering
        new valuable content.
    </p>

    <div class="text-base">
        <GenericEventCard
            id={highlightId}
            skipTitle={false}
            skipReplies={true}
        />
    </div>

    <p>
        Oh. Wait. What's special about this quote?
    </p>

    <p class="text-black">
        Well, the quote itself, the highlight, it's a nostr event itself.
    </p>

    <p>
        That means you can interact with it, just like with any other nostr event;
        you can reference it. You can repost it. You can like it.
    </p>

    <p>
        You can even ⚡️ zap it.
    </p>

    <h4 class="text-4xl text-black font-serif font-thin mt-4">
        ⚡️ Splits
    </h4>

    <p>
        Zapping highlights. Or like Gigi calls them, orange highlights.
    </p>

    <p>
        When you zap a highlight, the whole chain of events, nostr and life events, are rewarded
        for bringing the valuable words you are zapping, to you.
    </p>

    <p>
        Author, publisher, curator, broadcaster.
        <span class="text-black">Everyone that contributed to you reading
        these words, receives a share of the splits.</span>
    </p>
</div>