<script lang="ts">
import { newArticles } from '$stores/articles';
import { onMount, setContext } from 'svelte';
import { login } from '$lib/utils/login';
import '../app.postcss';
import { Modals, closeModal } from 'svelte-modals'
import { fade } from 'svelte/transition'
// import { pwaInfo } from 'virtual:pwa-info';
import "@fontsource/lora";
import Loading from '$lib/components/Loading.svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { user as uiCommonUser, userLabels as uiCommonUserLabels } from '@kind0/ui-common';
import { appHandlers } from "@kind0/ui-common";

// NOOP To make sure the import is not tree-shaken
$appHandlers;

import { user, userLabels, prepareSession, loadingScreen, userFollows, networkFollows, userAppHandlers, userDVMResults, highlights } from '$stores/session';
import { bunkerNDK, ndk } from '@kind0/ui-common';
import { page_mobiletabs } from '$stores/page_mobiletabs';
import { page_navbar } from '$stores/page_navbar';
import { page_layout } from '$stores/page_layout';
import PageContainer from '$components/PageContainer.svelte';
import Footer from '$components/Footer.svelte';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { app_device } from '$stores/app_device';
import { app_share } from '$stores/app_share';

$: webManifestLink = ''

let sessionPreparationStarted = false;
let mounted = false;
let mountedMobile = false;
loadingScreen.set(false)

onMount(async () => {
try {
$ndk.connect();
login($ndk, $bunkerNDK).then((user) => {
$user = user;
$uiCommonUser = user!;
})

//
// set device params (start)
const can_share = await Share.canShare()
app_share.set(can_share.value === true)

const info = await Device.getInfo();
app_device.set(info || undefined)

// set device params (start)
//
//
// set ui params (start)
let isMobile = true // @todo set properly
page_mobiletabs.set(isMobile)
page_navbar.set(true)
//
// set ui params (end)

// @todo better workaround to navigate to '/reader' on mobile
if(window.innerWidth < 450) {
await goto(`/reader`)
mountedMobile = true
}
} catch (e) {
console.error(`layout error2`, e);
mounted = true;
} finally {
mounted = true;
}
});

$: if (mounted && !!$user && !sessionPreparationStarted) {
sessionPreparationStarted = true;
if ($userFollows.size === 0) {
let finishLoading = false;
$loadingScreen = true;

if ($page.url.pathname === '/') {
goto('/reader');
} else if ($page.url.pathname !== '/reader') {
finishLoading = true;
}

prepareSession().then(() => {
console.log(`session finished`, {finishLoading});
if (finishLoading) $loadingScreen = false;
})
} else {
prepareSession();
}
}

$: if (!$uiCommonUser && $user) {
$uiCommonUser = $user;
}

$: $uiCommonUserLabels = $userLabels;

let shouldShowLoadingScreen = true;

$: shouldShowLoadingScreen = $page.url.pathname !== '/';

let refCount: number;
let sub: boolean;
let newArticleCount: number;
let networkFollowCount: number;

// setInterval(() => {
//     newArticleCount = $newArticles.length;
//     refCount = newArticles.refCount;
//     sub = !!newArticles.subscription;
//     networkFollowCount = $networkFollows?.size;
// }, 100);

/*
{#if $loadingScreen && shouldShowLoadingScreen}
<div transition:fade>
<Loading on:loaded={() => $loadingScreen = false } />
</div>
{/if}
*/
</script>

<svelte:head>
<title>Highlighter</title>
<meta name="description" content="Highlighter" />
{@html webManifestLink}
</svelte:head>

{#if mounted}
<div transition:fade>
<slot />
</div>
{/if}

<!-- <div class="sticky bottom-0 left-0 right-0 text-base-100-content">
<pre>
user = {!!$user}
userFollows = {$userFollows?.size}
userAppHandlers = {$userAppHandlers?.size}
appHandlers = {$appHandlers?.length}
userDVMResults = {$userDVMResults?.size}
userDVMRequests = {$userDVMRequests?.size}
userLists = {$userLists?.size}
userFollowHashtags = {$userFollowHashtags?.length}
networkFollows = {$networkFollows?.size}
<hr>
mounted = {mounted}
$page.url.pathname = {$page.url.pathname}
</pre>
</div> -->

<!-- <div class="fixed bottom-0 left-0 w-96 bg-base-300 p-4 h-24 overflow-y-auto">
<p>{$highlights?.size} highlights</p>
<p>{newArticleCount} new articles</p>
<p>{$newArticles?.length} new articles</p>
networkFollows = {networkFollowCount}
subs = {sub}
subs = {refCount}
</div> -->

<Modals>
<div
slot="backdrop"
class="backdrop z-10 fixed"
on:click={closeModal}
transition:fade={{ duration: 100 }}></div>
</Modals>

<div class="
hidden
max-h-[90vh]
max-w-md
!max-w-lg
max-w-4xl
min-h-96
!rounded-lg
lg:block
bg-purple-300
bg-orange-300
bg-blue-300
bg-yellow-300
bg-red-300
" />

<style>
.backdrop {
position: fixed;
top: 0;
bottom: 0;
right: 0;
backdrop-filter: blur(0.15rem);
left: 0;
background: rgba(0,0,0,0.50)
}
</style>
