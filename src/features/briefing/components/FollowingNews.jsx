//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: FollowingNews.jsx
//  Description: The tab of what the profile follows: the bar of the news wanted for each name, and the
//               news found, as many as wanted, going back up to 30 days (see WatchedNews), their titles
//               translated into the language of the reader as they reach them
//

import {Notice, Working} from "@/components/ui/text.jsx";
import {TranslationContext} from "@/features/search/translation.js";
import {FollowLimit} from "@/features/briefing/components/FollowLimit.jsx";
import {WatchedNews} from "@/features/briefing/components/WatchedNews.jsx";

// following: {groups, error, loading} (see useFollowing); limit: the number wanted; onLimit(limit);
// translator: of the language of the reader (see createTranslator), null without one
export const FollowingNews = ({following, limit, onLimit, translator}) => (
    <TranslationContext.Provider value={translator}>
        <div className="space-y-6">
            <FollowLimit limit={limit} onChange={onLimit} disabled={following.loading}/>
            {following.error && <Notice type="error">The news you follow could not be searched: {following.error}</Notice>}
            {following.loading && (
                <Working>
                    Looking for the news of what you follow…
                    {following.progress && following.progress.total > 0 && ` ${following.progress.finished} of ${following.progress.total} names`}
                </Working>
            )}
            {following.partial && (
                <Notice title="The search stopped before the end">
                    A long list is searched for three minutes at most. The names that went back less than the month, as their tab says, may have more news
                    further back: ask for fewer news each, or follow fewer names, to go further.
                </Notice>
            )}
            {following.groups?.length === 0 && (
                <p className="caption">Nothing to show: add names, words, clubs or people on the page you follow.</p>
            )}
            {following.groups?.length > 0 && <WatchedNews watched={following.groups}/>}
        </div>
    </TranslationContext.Provider>
);
