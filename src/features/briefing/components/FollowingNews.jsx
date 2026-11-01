//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: FollowingNews.jsx
//  Description: The tab of what the profile follows: the bar of the news wanted for each name, and the
//               news found, as many as wanted, going back up to 30 days (see WatchedNews)
//

import {Notice, Working} from "@/components/ui/text.jsx";
import {FollowLimit} from "@/features/briefing/components/FollowLimit.jsx";
import {WatchedNews} from "@/features/briefing/components/WatchedNews.jsx";

// following: {groups, error, loading} (see useFollowing); limit: the number wanted; onLimit(limit)
export const FollowingNews = ({following, limit, onLimit}) => (
    <div className="space-y-6">
        <FollowLimit limit={limit} onChange={onLimit} disabled={following.loading}/>
        {following.error && <Notice type="error">The news you follow could not be searched: {following.error}</Notice>}
        {following.loading && <Working>Looking for the news of what you follow…</Working>}
        {following.groups?.length === 0 && (
            <p className="caption">Nothing to show: add names, words, clubs or people on the page you follow.</p>
        )}
        {following.groups?.length > 0 && <WatchedNews watched={following.groups}/>}
    </div>
);
