import { writable, get as getStore, type Writable, derived } from 'svelte/store';
import { ndk } from "@kind0/ui-common";
import { NDKEvent, NDKList, NDKSubscriptionCacheUsage, type NDKFilter, type NDKTag, type NDKUser, NDKKind, type NDKEventId, NDKDVMJobResult, NDKDVMRequest, NDKListKinds } from '@nostr-dev-kit/ndk';
import type NDKSvelte from '@nostr-dev-kit/ndk-svelte';
import { NDKHighlight } from "@nostr-dev-kit/ndk";
import { persist, createLocalStorage } from "@macfja/svelte-persistent-store";
import { newArticles } from './articles';
import debug from 'debug';

const d = debug('highlighter:session');

export const loadingScreen = writable<boolean>(false);

/**
 * Current user logged-in
 */
export const user = writable<NDKUser | null>(null);

/**
 * Current user's follows
 */
export const userFollows = persist(
    writable<Set<string>>(new Set()),
    createLocalStorage(),
    'user-follows'
);

/**
 * Current user app handlers
 */
type AppHandlerType = string;
type Nip33EventPointer = string;
export const userAppHandlers = persist(
    writable<Map<number, Map<AppHandlerType, Nip33EventPointer>>>(new Map()),
    createLocalStorage(),
    'user-app-handlers'
);

export const userDVMResults = writable<Map<NDKEventId, NDKDVMJobResult[]>>(new Map());
export const userDVMRequests = writable<Map<number, NDKDVMRequest[]>>(new Map());

/**
 * Current user's lists
 */
export const userLists = writable<Map<string, NDKList>>(new Map());

/**
 * Current user labels
 */
export const userLabels = writable<Set<string>>(new Set());

export const highlights = writable<Map<string, NDKHighlight>>(new Map());

/**
 * Current user's followed hashtags
 */
export const userFollowHashtags = writable<string[]>([]);

/**
 * Current user's interests lists
 */
export const userInterestLists = derived(userLists, $userLists => {
    return Array.from($userLists.values())
        .filter(list => list.kind === NDKKind.InterestsList);
});

export const userShelves = derived(userLists, $userLists => {
    return Array.from($userLists.values())
        .filter(list => list.kind === NDKKind.CategorizedHighlightList);
});

/**
 * The user's extended network
 */
export const networkFollows = persist(
    writable<Set<string>>(new Set()),
    createLocalStorage(),
    'network-follows'
);

/**
 * The user's extended network lists
 */
export const networkLists = writable<Map<string, NDKList>>(new Map());

export const networkShelves = derived(networkLists, $networkLists => {
    return Array.from($networkLists.values())
        .filter(list => list.kind === NDKKind.CategorizedHighlightList);
});

/**
 * Main entry point to prepare the session.
 */
export async function prepareSession(): Promise<void> {
    const $ndk = getStore(ndk);
    const $user = getStore(user);

    if (!$ndk || !$user) {
        return;
    }

    d(`running prepareSession`);

    return new Promise((resolve) => {
        const alreadyKnowFollows = getStore(userFollows).size > 0;

        console.log('before-follows', getStore(userFollows).size, getStore(userFollowHashtags).length, !alreadyKnowFollows);

        fetchData(
            'user',
            $ndk,
            [$user.hexpubkey],
            {
                highlightStore: highlights,
                followsStore: userFollows,
                labelsStore: userLabels,
                appHandlers: userAppHandlers,
                dvmResultsStore: userDVMResults,
                dvmRequestsStore: userDVMRequests,
                listsStore: userLists,
                followHashtagsStore: userFollowHashtags,
                waitUntilEoseToResolve: !alreadyKnowFollows,
            }
        ).then(() => {
            const $userFollows = getStore(userFollows);

            console.log(`user follows count: ${$userFollows.size}`);
            console.log(`user lists count: ${getStore(userLists).size}`);
            console.log(`user hashtags: ${Object.keys(getStore(userFollowHashtags)).length}`);

            newArticles.ref();
            setTimeout(() => newArticles.unref(), 5000);

            resolve();

            fetchData(
                'network',
                $ndk,
                Array.from($userFollows),
                {
                    highlightStore: highlights,
                    listsStore: networkLists,
                    listsKinds: [39802],
                }
            ).then(() => {
                console.log(`network lists count: ${getStore(networkLists).size}`);

                if (shouldFetchNetworkFollows()) {
                    fetchData(
                        'network-follows',
                        $ndk,
                        Array.from($userFollows),
                        {
                            followsStore: networkFollows,
                            closeOnEose: true,
                            waitUntilEoseToResolve: true
                        }
                    ).then(() => {
                        console.log(`network follows count: ${getStore(networkFollows).size}`);
                        localStorage.setItem('network-follows-updated-t', Date.now().toString());
                    });
                }
            });
        });
    });
}

function shouldFetchNetworkFollows() {
    // check if the user has more than 30k network follows or if the last update was more than 7d ago
    const lastUpdate = localStorage.getItem('network-follows-updated-t');
    const lastUpdateDate = lastUpdate ? new Date(parseInt(lastUpdate)) : null;
    const networkFollowCount = getStore(networkFollows).size;

    if (networkFollowCount > 1000 && lastUpdateDate && lastUpdateDate.getDate() > (new Date()).getDate() - 7) {
        return false;
    }

    return networkFollowCount < 10000;
}

function isHashtagListEvent(event: NDKEvent) {
    return (
        // event.kind === 30001 &&
        event.tagValue('d') === 'hashtags'
    );
}

interface IFetchDataOptions {
    highlightStore? : Writable<Map<string, NDKEvent>>;
    followsStore?: Writable<Set<string>>;
    labelsStore?: Writable<Set<string>>;
    appHandlers?: Writable<Map<number, Map<AppHandlerType, Nip33EventPointer>>>;
    dvmResultsStore?: Writable<Map<NDKEventId, NDKEvent[]>>;
    dvmRequestsStore?: Writable<Map<number, NDKDVMRequest[]>>;
    listsStore?: Writable<Map<string, NDKList>>;
    listsKinds?: number[];
    extraKinds?: number[];
    followHashtagsStore?: Writable<string[]>;
    closeOnEose?: boolean;
    waitUntilEoseToResolve?: boolean;
}

/**
 * Fetches the information regarding the current user.
 * At this stage, we still don't know the user's network.
 *
 * * Protects from receiving multiple duplicated events
 * * Protects from unnecessarily calling updateFollows if the
 * * eventId is not different than something already processed
 */
async function fetchData(
    name: string,
    $ndk: NDKSvelte,
    authors: string[],
    opts: IFetchDataOptions
): Promise<void> {
    // set defaults
    opts.waitUntilEoseToResolve ??= true;
    opts.closeOnEose ??= false;
    opts.listsKinds ??= NDKListKinds;

    const mostRecentEvents: Map<string, NDKEvent> = new Map();
    let processedKind3Id: string | undefined = undefined;
    let kind3Key: string;
    let eosed = false;
    const _ = d.extend(`fetch:${name}`);

    _({waitUntilEoseToResolve: opts.waitUntilEoseToResolve});

    const processEvent = (event: NDKEvent) => {
        const dedupKey = event.deduplicationKey();
        const existingEvent = mostRecentEvents.get(dedupKey);

        if (existingEvent && event.created_at! < existingEvent.created_at!) {
            return;
        }

        mostRecentEvents.set(dedupKey, event);

        if (event.kind === 3 && opts.followsStore) {
            kind3Key = dedupKey;
            processKind3(event);
        } else if (event.kind === NDKKind.Highlight && opts.highlightStore) {
            processHighlight(event);
        } else if (isHashtagListEvent(event) && opts.followHashtagsStore) {
            processHashtagList(event);
        } else if (event.kind === NDKKind.Label) {
            processLabel(event);
        } else if (event.kind === NDKKind.AppRecommendation) {
            processAppHandler(event);
        } else if (event.kind === NDKKind.DVMJobResult) {
            processDVMResults(event);
        } else if (event.kind! >= 65002 && event.kind! <= 65100) {
            processDVMRequests(event);
        } else if (NDKListKinds.includes(event.kind!) && opts.listsStore) {
            processList(event);
        }
    };

    const processHighlight = (event: NDKEvent) => {
        const highlight = NDKHighlight.from(event);
        opts.highlightStore!.update((highlights) => {
            highlights.set(highlight.id, highlight);

            return highlights;
        });
    };

    const processLabel = (event: NDKEvent) => {
        opts.labelsStore!.update((labels) => {
            for (const tag of event.getMatchingTags("l")) {
                if (tag[2] === "#t") labels.add(tag[1]);
            }

            return labels;
        });
    };

    const processAppHandler = (event: NDKEvent) => {
        opts.appHandlers!.update((appHandlers) => {
            const handlerKind = parseInt(event.tagValue("d")!);

            if (!appHandlers.has(handlerKind)) {
                appHandlers.set(handlerKind, new Map());
            }

            for (const tag of event.getMatchingTags("a")) {
                const [, eventPointer,, handlerType] = tag;

                appHandlers.get(handlerKind)!.set(handlerType, eventPointer);
            }

            return appHandlers;
        });
    };

    const processDVMResults = (event: NDKEvent) => {
        const dvmResults = NDKDVMJobResult.from(event);
        let jobRequestId: NDKEventId | undefined;

        try {
            jobRequestId = dvmResults.jobRequestId;

            if (!jobRequestId) {
                // console.log(`could not find a job request id`, dvmResults.rawEvent());
                dvmResults.jobRequestId;
            }

            if (!jobRequestId) return;

            opts.dvmResultsStore!.update((existingResults) => {
                if (!jobRequestId) return existingResults;

                if (!existingResults.has(jobRequestId)) {
                    existingResults.set(jobRequestId, []);
                }

                existingResults.get(jobRequestId)!.push(dvmResults);

                return existingResults;
            });
        } catch (e) {
            // console.log(e);
            return;
        }
    };

    const processDVMRequests = (event: NDKEvent) => {
        const dvmRequest = NDKDVMRequest.from(event);
        opts.dvmRequestsStore!.update((existingRequests) => {
            const kind = dvmRequest.kind!;
            if (!existingRequests.has(kind)) {
                existingRequests.set(kind, []);
            }

            existingRequests.get(kind)!.push(dvmRequest);

            return existingRequests;
        });
    };

    /**
     * Called when a newer event of kind 3 is received.
     */
    const processKind3 = (event: NDKEvent) => {
        if (
            (event.id !== processedKind3Id) ||
            authors.length > 1 // if authors has more than one, add the received list
        ) {
            processedKind3Id = event.id;
            updateFollows(event);
        }
    };

    const processHashtagList = (event: NDKEvent) => {
        userFollowHashtags.update((existingHashtags) => {
            for (const t of event.tags) {
                if (t[0] === 't') {
                    if (existingHashtags instanceof Array) {
                        if (!existingHashtags.includes(t[1]))
                            existingHashtags.push(t[1]);
                    // } else {
                    //     existingHashtags[t[1]] = (existingHashtags[t[1]] ?? 0) + 1;
                    }
                }
            }

            console.log(existingHashtags);

            return existingHashtags;
        });
    };

    const processList = (event: NDKEvent) => {
        const list = NDKList.from(event);

        if (!list.name || list.name.startsWith('chats/')) {
            return;
        }

        opts.listsStore!.update((lists) => {
            lists.set(list.tagId(), list);
            return lists;
        });
    };

    const updateFollows = (event: NDKEvent) => {
        const follows = event.tags
            .filter((t: NDKTag) => t[0] === 'p')
            .map((t: NDKTag) => t[1]);

        // if authors has more than one, add the current data, otherwise replace
        if (authors.length > 1) {
            opts.followsStore!.update((existingFollows) => {
                follows.forEach((f) => existingFollows.add(f));
                return existingFollows;
            });
        } else
            opts.followsStore!.set(new Set(follows));
    };

    return new Promise((resolve) => {
        const kinds = opts.extraKinds ?? [];
        let authorPubkeyLength = 64;
        if (authors.length > 10) {
            authorPubkeyLength -= Math.floor(authors.length / 10);

            if (authorPubkeyLength < 5) authorPubkeyLength = 6;
        }

        console.log(`will request authors`, authors.length, authorPubkeyLength);

        const authorPrefixes = authors.map(f => f.slice(0, authorPubkeyLength));

        if (opts.listsStore) {
            kinds.push(...opts.listsKinds!);
        }

        const filters: NDKFilter[] = [];

        if (kinds.length > 0) {
            filters.push({ kinds, authors: authorPrefixes, limit: 10 });
        }

        if (opts.highlightStore) {
            filters.push({ authors: authorPrefixes, kinds: [NDKKind.Highlight], limit: 50 });
            filters.push({ "#k": ["9802"], authors: authorPrefixes, limit: 50 });
        }

        if (opts.labelsStore) {
            filters.push({ authors: authorPrefixes, kinds: [NDKKind.Label], "#L": ["#t"], limit: 100 });
        }

        if (opts.appHandlers) {
            filters.push({ authors: authorPrefixes, kinds: [NDKKind.AppRecommendation] });
        }

        if (opts.dvmResultsStore) {
            filters.push({ "#p": authorPrefixes, kinds: [NDKKind.DVMJobResult], limit: 10 });
        }

        if (opts.dvmRequestsStore) {
            filters.push({ authors: authorPrefixes, kinds: [65002, 65008], limit: 10 });
        }

        if (opts.followsStore) {
            filters.push({ kinds: [3], authors: authorPrefixes });
        }

        if (opts.followHashtagsStore) {
            filters.push({ authors: authorPrefixes, "#d": ["hashtags"] });
        }

        const userDataSubscription = $ndk.subscribe(
            filters,
            {
                closeOnEose: opts.closeOnEose!,
                groupable: false,
                cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
                subId: `session:${name}`
            }
        );

        userDataSubscription.on('event', processEvent);

        userDataSubscription.on('eose', () => {
            eosed = true;
            _(`received eose`);
            console.log(`received eose`, opts.waitUntilEoseToResolve);

            if (kind3Key) {
                const mostRecentKind3 = mostRecentEvents.get(kind3Key!);

                // Process the most recent kind 3
                if (mostRecentKind3!.id !== processedKind3Id) {
                    processedKind3Id = mostRecentKind3!.id;
                    updateFollows(mostRecentKind3!);
                }
            }

            if (opts.waitUntilEoseToResolve) {
                _(`resolving`);
                console.log(`resolving`);
                resolve();
            }
        });

        if (!opts.waitUntilEoseToResolve) {
            _(`resolve without waiting for eose`);
            console.log(`resolve without waiting for eose`);
            resolve();
        }
    });
}
