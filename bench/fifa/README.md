# The FIFA presidency: mock API and contract

The page `/fifa` (`src/pages/Fifa.jsx`, `src/features/fifa/`) is built against a **mock API** with made-up data, so it can be
developed and tested before the server answers. **Nothing in this folder says what a real association or a real person
thinks**: the members are the real ones (name, FIFA code, ISO code, confederation: facts), but the candidates
("Mock candidate A/B/C"), the persons ("Mock president AFG"), the sentences ("[Mock sentence in es] ...") and the positions are
invented. Every answer carries `mock: true` and the page prints a banner when it sees it.

```
node bench/fifa/preview.mjs        # the mock on 3998 + Vite on 5180 (launch.json: "fifa-mock"), then open /fifa
MOCK_LEVELS=coarse node bench/fifa/preview.mjs   # the server stands behind ["soutien","inconnue"] only
node bench/fifa/fifa-mock-api.mjs  # the mock alone
```

`mock-members.json` is a snapshot of the facts of `server/services/utils/fifa-members.json` (12.11.2026). `mock-data.mjs` builds the answers
(also used by `tests/fifa-*.test.*`).

## Contract (what the client reads; the server conforms to it)

All under `/api/fifa`, cookie session, JSON. A refusal is `{error, status}` (the page says why and offers "Try again").

### `GET /fifa/map`

```
{
  generated_at: ISO date,
  levels: [ the position values the server stands behind, see below ],
  subjects: [ {qid, name, color_index: 1..6, status: 'incumbent'|'declared'|'rumoured'|'withdrawn',
               state: 'computing'|'ready', origin: 'seed'|'reader'|'news',
               found: null | {status: 'declared'|'rumoured', articles, media, quote, at},   // only for origin 'news'
               positions_known, uncertain_count} ],
  members: [ 211 associations + the 6 confederations, each:
    {qid, fifa, name, association, level: 'association'|'confederation', confederation: 'UEFA'.., iso, lat, lng,
     leader: {name, role, person_qid, since} | null,
     coverage: {articles_30d, media_30d},
     positions: { [subjectQid]: {
        position, since, previous, changed, stale, signals_count, last_signal_at, uncertain_count,
        articles_30d, media_30d,
        basis: [ {medium, published_at, url} ],  // 0 to 2 sources that explain the colour: the tooltip names them
        human: {value: 'for'|'against'|'unknown', by, at, newer_evidence} | null,   // the vote that decides, see "Votes"
        ai_position                                // only with human: the position the news give (position is then the decisive one)
     } } } ]
}
```

* **`levels`** is the list of `position` values the server has measured and stands behind. The page derives the legend, the Yes -> No
  scale and the filters from it and **hard-codes nothing**. Any subset of
  `soutien_declare, soutien_probable, soutien, inconnue, non_soutien_probable, non_soutien, non_soutien_declare`
  (`soutien` / `non_soutien` = the merged level when declared and probable do not pass the gate). A position whose value is not in
  `levels` is read as unknown. `inconnue` is always valid. A strong and a light colour per candidate are drawn only when both
  `soutien_declare` and `soutien_probable` are in `levels`. Without any `non_soutien*`, opposition is not shown (the legend says so).
* **Overview** (no candidate chosen) shows support only: opposition to one candidate is never given to another.
* **`name`** = what the page shows (the country: "Türkiye"); **`association`** = the full name of the association (optional).
* **`positions`** has a key per subject only when there is something to say (a position, an Uncertain signal, or an article).
  `uncertain_count` = established-as-about-the-election-and-the-association signals that are NOT a position: they never colour.
  `stale: true` = older than 90 days (drawn faded, said in the tooltip and the sheet). `changed: true` = it changed recently.
* **`coverage`** (member level) = distinct articles and media naming the association with any subject over 30 days (the figure
  "N articles in 30 days" of the list, the tooltip and the sheet when no candidate is chosen; without it the page sums `articles_30d` / `media_30d` of the positions). It is a number, never a colour of the map.
* A candidate with `state: 'computing'` makes the page say it is still being read (backfill).
* Associations without `lat`/`lng` and without a polygon (GIB has no polygon in Natural Earth) are not drawn: send coordinates for all.
* `iso` is the geometry key: ISO 3166-1 alpha-2, `GB-ENG`, `GB-SCT`, `GB-WLS`, `GB-NIR` for the four nations.

### Which candidate does a country lean towards? (the reader's choice, with no candidate chosen in the list)

What the user means by "the reader votes": NOT for or against a candidate, but **which candidate an association leans toward**. An association has one vote, so it leans toward at most one candidate.
* **With no candidate chosen in the list** (All candidates) the sheet has ONE block "Which candidate does {country} lean towards?" in the tab Positions, **under the strip of the candidates and the detail of the one selected** (13.11.2026: the strip is the first thing of the tab, see "The strip of the candidates").
  **With one candidate chosen** in the list the block is gone and that candidate is selected in the strip from the start: its detail has "Confirm this position ✓" and the vote (Supported by {country} / Not supported / No position / Remove my vote).
* The four states of the block:
  1. the news show a candidate (`lean.subject_qid`, source `news`): primary button "Confirm {candidate} ✓" -> `POST /fifa/votes {subject, member, value: 'confirm'}` (it becomes solid, "Confirmed by a reader",
     the news kept), "Read from the news", and "Not this one? Choose another candidate:" with the others and "None / undecided";
  2. a reader chose or confirmed it (source `reader`): "Chosen by X" (the `human.by` of the entry) or "Confirmed by A, B"; "Confirmed ✓" (disabled) when the signed-in reader holds a confirmation, else the Confirm button; the others
     stay available to change it;
  3. the news show several (`conflicting`): no Confirm button, "The news point to several: choose one." with all the candidates and none;
  4. no candidate is shown: "No candidate is shown yet. Which one does it lean towards?" (and, when a reader chose "none": "Undecided, set by X", "None / undecided" pressed).
  "Remove my choice" (link) takes back all this reader wrote on the association (`withdraw`); disabled when they wrote nothing.
* `POST /fifa/leans` body `{member, subject: <candidate qid> | 'none' | 'withdraw', source?, note?}` (`source` and `note`: see "Sources" below) -> `{ok, positions: {[subjectQid]: the entry as in the map, with human / ai_position / confirmed}, lean, written}`; 401 / 422 / 429 `{error}`
  shown as for a vote. Choosing X sets the association FOR X (a vote, solid) and "No position" (a vote) on every other candidate it was shown supporting; an opposition is never touched; a choice that already stands writes nothing.
  **The page puts the answer's `positions` over the entries of that member in its map (no new call of the map), clears the votes it had patched on that member, and reads the sheet again.**
* `lean` in `GET /fifa/map` and `GET /fifa/associations/:qid` (`{subject_qid, source: 'reader'|'news', conflicting: [qids]} | null`) is carried by the mock; **the page derives the lean from the positions it draws**
  (`leanOf`), so it stays right after a vote, a confirmation or a choice without another call. It reads the same rule: the candidate shown supporting (a position with a side "yes"), two at once = conflicting.

### Votes: a reader sets a position, the last vote of any reader decides for everyone

* `positions[s].human` is the vote that decides now, or `null`. When it is set, `position` in that object is already the decisive one
  (`soutien_declare` / `non_soutien_declare` / `inconnue`) and `ai_position` is the computed one. **The page reads the side from
  `human.value`** and draws it whatever `levels` says (a vote is not a level the server measured: `for` = "Support", `against` =
  "Opposition", `unknown` = "No position", never "declared"). `ai_position` is read through `levels` like any position.
* The decisive vote is the latest vote among the readers who have not withdrawn (a reader's last word is the one that counts). So taking
  one's own vote back lets the previous standing vote of another reader decide again, and with none the AI reading comes back.
* The colour, the list status and the tooltip use the voted position (same colour as an established position) with the mark "Set by a reader".
  The coarse filters and the counters count it like an established one (`for` and `against` = Candidate indicated; `unknown` = Unknown, and the
  Uncertain signals that entry had stop ringing the grey: a reader decided). A vote of `against` shows only when its candidate is chosen
  (the overview shows support only). A vote never ages (no `stale`).
* `human.newer_evidence: true` = the news said more after the vote: the sheet says "New evidence since the vote" and invites the reader to vote
  again; **the colour never changes on its own**.
* `POST /fifa/votes` body `{subject, member, value: 'for'|'against'|'unknown'|'withdraw'|'confirm', note?, source?}` (`source`: see "Sources" below) -> `{ok: true, human: {...} | null}`: `human` is
  the vote that decides AFTER this one (the page puts it in its map without asking for the whole map again, and reads the sheet again).
  A refusal is `{error, status}`: 401 -> "Sign in to vote.", 429 -> "Too many votes in a short time...", anything else -> its `error`.
* "Mine" in the sheet = the newest vote of the signed-in reader (`user.username`) in `votes` for that candidate, when it is not `withdraw`.
  `votes[].by` must therefore be the same name as `/api/session`'s `username`.

### Confirming the position shown: "Confirm this position ✓"

The main action of the detail of a candidate in the sheet (tab Positions), under the position; the choices of a vote (Supported by {country} / Not supported / No position / Remove my vote) come right under it, **with no fold to open** (13.11.2026; the fold "Or change the position" is gone).
It is not there for a candidate the news say nothing of (nothing to confirm): only the vote and a line that says so.
* A confirmation is a **validation by hand**, the heaviest word there is: **it makes the position of the news SOLID.** It is no decision (no "Set by a reader": a vote still wins over it).
  It records which position of the news the reader saw, so it counts only for that one: once the news change it, `confirmed.count` is 0, `confirmed.outdated` > 0 and `position` is the news' own again.
* **What the server sends** for a position of the news that at least one reader has confirmed (`confirmed.count > 0`) and that no vote has overridden: `position` is already PROMOTED to the declared
  level of the same side (`soutien_declare` / `non_soutien_declare`), `ai_position` is the reading of the news (`soutien_probable`, `non_soutien_probable`, or the declared one), `human: null`,
  `stale: false` (a validated position never ages). A confirmation of "no position" (`inconnue`) promotes nothing. A decisive vote (for / against / unknown) wins over everything (`human` set as before).
  So the map, the markers and the list draw it solid with no new way of drawing; **dots now mean "read from the news, not confirmed by a reader".**
* **What the page does with it:** `readEntry` reads the news from `ai_position` whenever it is there (with or without `human`). `POST` answers `{ok, human, confirmed}` and NOT the new position: the page applies
  the same rule at once (`withVote`: confirmation that holds + no vote + a side -> the declared level of that side, the news kept as `ai_position`; none holds -> the news' own level and its dots) and the sheet
  is read again. The card says "Confirmed by a reader" (badge) and, under it, "AI reading from the news: Probable support" with its dotted swatch; the list and the tooltip say "(confirmed by a reader)" when it made
  a position solid that the news read as probable. The legend says "Solid colour: declared, or confirmed by a reader. Dots: read from the news, not confirmed by a reader."
* `POST /fifa/votes` body `{subject, member, value: 'confirm', note?}` -> `{ok, human, confirmed}`: `human` = the decisive vote after this one (a confirm after a for / against keeps it),
  `confirmed` = what the server says for the pair now. A refusal is the same as for a vote (401 / 429 / 400).
* `GET /fifa/map` and `GET /fifa/associations/:qid`: `positions[s].confirmed: {count, by: [names], at, outdated} | null`. `count` = readers whose confirmation still holds for the position of the news
  they saw, `outdated` = confirmations of a position that has since changed, `at` = the latest confirmation that holds. **`by` lists the readers whose confirmation holds first (newest first),
  then the outdated ones: the page shows `by.slice(0, count)`.** A pair with nothing but a confirmation of "no position" is present (position `inconnue`, `confirmed` set).
* `votes[]` of the sheet also holds `{value: 'confirm', seen, by, at, note, subject_qid}` (`seen`: the position the reader saw, e.g. `soutien_declare`, `inconnue`); the history says
  "Confirmed ✓ (saw: Declared support)". `withdraw` takes back both a reader's decision and their confirmation.
* The button: "Confirm this position ✓" (primary), "Confirm: no position" when the position shown is unknown. After it: "Confirmed by A, B · 12 Nov 2026" (3 names, then "and N more").
  When the signed-in reader's name is among the holders: "Confirmed ✓", disabled. When `count` is 0 and `outdated` > 0: "Confirmed before the latest news" and the button again.
* "Mine" (the choice pressed under the fold) = the reader's latest DECISION (for / against / unknown) in `votes[]`, `confirm` rows ignored (a confirm after a decision keeps it pressed).
  "Remove my vote" is enabled when the reader's latest row is not a `withdraw` (a decision or a confirmation to take back).

### The presidents

`GET /fifa/presidents` -> `{generated_at, presidents: [{person_qid: string | null, name, role, since: 'YYYY-MM-DD' | null, checked_at, member_qid, source: 'fifa' | 'wikidata', source_url: string,
articles_30d: number, last_mention: {at, medium, url, title} | null}]}`: one per association (211). `source` 'fifa' = the president named on the association's public page of FIFA, 'wikidata' = only Wikidata knew him
(`source_url` ''); `person_qid` is null unless Wikidata names the same person; `articles_30d` = the articles of the last 30 days of our tagged news that name him (0 for most), `last_mention` the latest or null.
The view is a table (see "The tables" below): the columns President, Association (country and code, a button that opens the sheet), Confederation, Position, "Articles, 30 days", "Latest mention"
(`2026-11-11 · camfoot.com` as a link to `last_mention.url`, the title as its tooltip, "—" without one), Source ("FIFA" as a link to `source_url` with the accessible name "Source: FIFA", or "Wikidata", no link) and Since (the year);
the counters "N presidents with mentions" and "X / 211" (the length of the list over the associations) are of all the presidents, whatever the table shows. The mock carries 211 presidents, about a third with mentions,
a few with source 'wikidata'.

### The tables: List, Confederations, Presidents (12.11.2026, client only, no contract change)

The three views that are lists of things are real tables (`<table>`, a caption, `<th scope="col" aria-sort>`), with the same behaviour. A phone (under 768 px) shows cards instead, the sort as a "Sort by" select and the filters in a sheet.

* **One search bar**, bound to the `q` of the address, the only one on the screen in these views (the bar of the filters of the page leaves them; it comes back on the map, the map & list and the timeline, with the same text).
  List: an association, a country or a FIFA code. Presidents: a president, or his association (name, country, code). Confederations: a confederation (code, name, president) or its members (association, country, code, president):
  a confederation whose members match opens on them and says "3 matching associations", the ones that match nothing go; one the reader closes stays closed while the search stays.
* **Filters of the page** (candidate, confederation, position level, search) and **filters of the columns** combine with AND. Each filter is a list of values (any of them keeps a row); the filters of different columns are ANDed.
  A filter of a column is a button in its header (a Radix popover of checkboxes); the filters on are chips under the bar ("Position: Unknown", each removable), and the bar says "N of 211 associations" in a `role="status"`.
  Nothing left: "No association matches these choices." and "Clear filters".
* **Sort**: the button in a header cycles none -> ascending -> descending -> none (a visible arrow, `aria-sort` on the `th`, keyboard: it is a button). A row with no value is last in either direction; a tie falls to the default order.
* **Address**: `sort=<column>` and `dir=desc` (ascending is the default and left out), one `f_<filter>=a,b` for each filter of a column. They survive a change of view and a reload; a column or a value the view does not know is ignored.
  "Clear filters" removes the `f_*` parameters and the sort and nothing else ("Reset" in the bar of the page is the other way round: it clears the candidate, the confederation, the level and the search).
* **Default orders**: List: category (candidate indicated, conflicting, Uncertain, Unknown), then last signal (newest first, none last), then articles of 30 days (most first), then the name. Presidents: articles (most first), latest mention
  (newest first, none last), name. Confederations: members (most first), code.
* **List** columns / filters: Association; Confederation (Confederation); Candidate (Candidate); Position (Position, Level declared|probable, Source news|reader); Last signal (7 days, 30 days, older, none); Articles, 30 days (Has articles);
  Established signals; Uncertain signals. **Presidents**: President; Association; Confederation (Confederation); Position (Position); Articles, 30 days (Mentions with|without); Latest mention; Source (FIFA|Wikidata); Since.
  **Confederations**: Confederation (a row opens on its members, the list of the page in its default order, a sheet each); President; Own position (indicated|uncertain|unknown); Members (Supports <candidate>); one column for each candidate
  (swatch and the number of members that support it); Conflicting; Uncertain; No position. The counts say what the members show as a whole, whatever candidate the list has chosen.
* The old `show=` parameter of the presidents (all / with / without) is gone: it is the filter `f_ment=with|without` of the column "Articles, 30 days".

### The list of candidates is dynamic (13.11.2026)

The server looks in the news once a day for persons named as candidates for the presidency (a federation nominating someone), has two AI models judge them and **adds them to the map by itself**. So the list is never fixed
and never only reader-added: it is `subjects` of `GET /fifa/map` (and `GET /fifa/subjects`), and **it can grow between two visits**.
* **Fields.** `origin`: `'seed'` (the president in office) | `'reader'` (a reader added the person) | `'news'` (found in the news by the server). `found`: `null`, or for origin `news` `{status: 'declared'|'rumoured', articles, media, quote (the words of the
  news that show it), at (ISO date)}`. `state: 'computing'` while the news of the last 30 days are read for a new candidate: its positions fill in as they are read.
* **The page asks the map again** (so the subjects) **when the window is focused or the tab becomes visible again** (not more than once in 30 s) **and every 5 minutes while it is open and visible** (`refreshTiming.js`, `useMapRefresh.js`), without leaving the page: what it shows stays
  as it is until the answer comes and when it fails (no message), and it never asks twice at once. The map a reader patched with their own votes (the answers to their votes and choices) is not patched any more for what happened before an ask began: the server's answer is the newer one
  (another reader may have voted since); what the reader does while an ask is on its way stays. While some candidate is `computing`, the page does not ask more often (it could: tell me).
* **The candidate in the address stays valid.** A `c` the list does not have (an old link, a removed candidate, one not found yet) reads as All candidates with no error (`useFifaState(candidates)`); it is that candidate again when the list gets it. Nothing else to do for the reader: a found candidate
  needs no "add" click, it is a choice like the others.
* **Tags** (`candidates.js`): a **neutral tag "Found in the news"** for origin `news`, with the words of the news (tooltip, and a line in the dialog and in the sheet): "Named as a candidate in {media} media ({articles} articles): “{quote}”" (1 medium, 1 article); **"Reading the news…"** while `state` is
  `computing`. Where: the select says only "Reading the news…" (`Mock candidate E · Reading the news…`; the user did not want "Found in the news" there, 13.11.2026), the list of candidates of the dialog (badge, the line; the ONLY place that says it, the user's choice of 13.11.2026: no tag in the select, the legend of the overview nor the card of the sheet). The page's line "X is still being read from the news of the last 30 days" stays.
* **Unchanged:** readers keep "Add a candidate" (Wikidata search) for the ones the news did not bring; **no place of the page changes the status of a candidate any more** (`PATCH /subjects/:qid` and `FifaApi.setStatus` stay for later, the page does not call them); **any signed-in reader removes one** (`DELETE /subjects/:qid`, see "Removing a candidate"); the news never bring a removed one back.
* **The mock.** `MOCK_SUBJECTS` (A seed, B and C reader, C `computing`) and `MOCK_NEWS_SUBJECTS`: **D** (origin `news`, `found` 7 articles in 4 media, ready, declared support in China and probable in Thailand) and **E** (origin `news`, rumoured, `computing`, no position yet).
  `buildMock()` keeps A, B, C (the tests); pass `candidates: [...MOCK_SUBJECTS, ...MOCK_NEWS_SUBJECTS]` for the five. **The mock API starts with A, B, C and D, and adds E `MOCK_FOUND_AFTER_MS` (90000) after it started** (computing for 20 s), as if the server had found it: keep the page open to see the select grow
  (a focus of the window asks at once). A candidate a reader adds has origin `reader` and `found: null`.

### The timeline of the sheet: the dots open the article (13.11.2026)

In the sheet of an association, under each candidate, the circles of the timeline are **links to the article** when they have one: the small dots are the sheet's `signals` (each has `url` and `medium`), the big dots (First position, Reversal, Weakened) are `history[]`, which now carries `url` and `medium` =
the article of the signal that made the change (`null` when the signal has none: that dot stays a plain, non-clickable marker).
* An event with a `url` is an `<a href target="_blank" rel="noopener noreferrer">`, keyboard focusable, with the look of the marker it replaces (hollow and dashed for an Uncertain sentence) and a pointer cursor; its `title` and `aria-label` say where it goes:
  "16 Oct 2026: africasoccer.com. Opens the article" (a key moment: "20 Sep 2026: First position, Declared support, africasoccer.com. Opens the article"; the Uncertain mention is kept: "… (Uncertain). Opens the article"). A click opens the article and nothing else (no handler above the dot hears it).
* An event without a `url` is what it was: a plain marker (not in the order of the keyboard, no pointer), or, with `onSelect`, the choice of the event. **The view Timeline (all the associations) is not changed**: its events have no `url` and its dots choose an association.
* **The mock:** every key moment has the article of the signal behind it (`https://example.test/mock/NOR/0`, the medium of that sentence) except a **weakening** (Egypt), which has `url: null, medium: null`.

### Removing a candidate: any reader, one confirmation (13.11.2026)

The system can be wrong (a person the news named who is no candidate), so **any signed-in reader can remove a candidate from the map, with no administrator to validate it.**
* `DELETE /api/fifa/subjects/:qid` -> **204**. **404** unknown candidate; **403** for the president in office (the subject with `origin: 'seed'`, or `status: 'incumbent'`: only an administrator removes him); **429** after 10 removals an hour (the message of the server is shown); **401** signed out ("Sign in to remove a candidate.").
  It deletes everything read for the candidate (its signals, the votes, the sources joined to those votes) and **the news never bring it back** (a reader can add it again by hand with the Wikidata search).
* **UI** (`CandidatesDialog.jsx`): a **cross button (X icon, `aria-label` "Remove {name}", pointer cursor, visible focus) at the right of each row of "List of candidates"** in the dialog "Add a candidate" (it was a "Remove" text button and a status menu before 13.11.2026), **none on the president in office unless the page knows the reader is an administrator** (`admin` of `FifaBoard`, `user.admin`).
  **One confirmation** before anything is sent (a safety of the interface, not a validation): "Remove {name} from the map? What was read for this candidate (positions, votes, sources) is deleted and the news will not bring the candidate back. You can add the candidate again by hand." with **Cancel / Remove**
  (the confirmation is inline, under the row; one at a time; the buttons are off while it is sent). A refusal is said under it with the words of the server (403, 404, 429; 401: "Sign in to remove a candidate."; a failed call: "The candidate could not be removed. Try again in a moment.") and the candidate stays.
* **After the 204** the page asks the **map again** (the candidate leaves the select, the dialog, the legend, the cards of the sheet and the columns of the tables); if the candidate removed was **the one chosen in the list of the page (or in the address `c`)**, the page goes back to **All candidates** and the address loses `c`.
  If the map cannot be read again: "{name} was removed, but the map could not be read again: …".
* **The mock:** `DELETE /fifa/subjects/:qid` as above (403 for the seed one, `MOCK_ADMIN=1` or the header `x-mock-admin: 1` to remove it; 10 an hour); the votes (and their sources) of the candidate go with it; **`buildMock({candidates})` reads only the votes of the candidates it is given**; a candidate found in the news later (E) is not brought back once it was removed.

### Candidates: a reader adds one, no administrator validates it

* `GET /fifa/people?q=` -> `{people: [{qid, name, description}]}` (humans of Wikidata only). The page asks from 2 letters, 300 ms after the last
  one, and drops the answer of an older search. 422 under 2 letters (never sent), 429 `{error}`: shown as it comes.
* `POST /fifa/subjects` body `{qid, status?: 'declared'|'rumoured'|'withdrawn'}` (**the page sends `{qid}` only, no status is asked when adding** (13.11.2026): the server makes it `declared`; the reader then clicks a country to take positions) ->
  201 `{subject, already: false}` | 200 `{subject, already: true}` | 409 / 422 / 429 `{error}`, **the text is shown as it comes**. On success the
  page asks `GET /fifa/map` again WITHOUT leaving the page (the view, the filters and the open sheet stay), then chooses `subject.qid`.
  The new subject has `state: 'computing'`: the page says its news are being read.
* `PATCH /fifa/subjects/:qid` body `{status: 'declared'|'rumoured'|'withdrawn'|'incumbent'}` -> 204: **no longer called by the page** (the status menu of the dialog was removed, 13.11.2026; the client function `FifaApi.setStatus` and the mock route are kept for later). The selector and the legend still say "(withdrawn)" for a candidate the server marked so. Any reader removes a candidate (see "Removing a candidate").
* `subjects[].color_index` is the colour of a candidate for good (1 to 6); a candidate removed by the server frees its index.

### How a position is drawn: solid, dots, hatch, ring, grey

Nothing to change on the server: `position` already says `*_declare` or `*_probable`.
* **Declared** (`soutien_declare`, `non_soutien_declare`), the merged level (`soutien`), a **vote** (`human`) and a position of the news **a reader confirmed** (the server sends it promoted to the declared level):
  the solid colour of the candidate (an opposition: the ink).
* **Probable** (`soutien_probable`, `non_soutien_probable`), i.e. read from the news and not confirmed by a reader: a fine pattern of **dots** of the candidate's colour on a light base of the same hue (an SVG `<pattern>`,
  not a lighter flat fill), an opposition the dots of the ink. Whatever the other levels are: a probable position the server sends is drawn as probable.
  Patterns `fifa-dots-1..6` and `fifa-dots-no` (and `fifa-dots-marker-*` for the round markers of the small territories), the hatch of conflicting indications
  `fifa-hatch` (`-marker`): dots are round and staggered, the hatch is a line, so the two are never alike. The ring of Uncertain stays on the grey.
* Colours only from the theme (`color-mix` of `--cand-n`, `--ink`, `--paper`): the base is 16 % of the colour on the paper, the dots 70 % of the colour with 30 % of the ink.
  Contrast of the dots against their base (WCAG, six candidate colours): 3.3 to 5.9 in the light theme, 4.8 to 6.1 in the dark one. The texture does not depend on the hue,
  so it holds for colour-blind readers; the contrast of the mean colour of the pattern with the solid colour is 1.4 to 2.6, so a probable position is also lighter, but never only that.
* The patterns of a polygon are kept at the size of the screen whatever the zoom (6 px tile, 5 px under 520 px of map): WorldMap sets their `patternTransform` at each zoom and resize.
* The legend has an entry for each: Declared (solid), Probable (dots), Conflicting (hatch), Uncertain (ring), Unknown (grey), built from `levels`: no Probable entry
  when `levels` holds no `*_probable` level, no Declared entry when it holds no `*_declare` level (the merged level has neither). A candidate chosen shows its scale with the same drawings.
* A position older than 90 days (`stale`) is faded (opacity) and keeps its way of drawing.

### The sentences of the sheet: Declared, Probable, Uncertain

In the tab Positions, under each candidate, the sentences are in groups apart: **Declared** and **Probable** (each with its own badge: a strong / light
dot like the map) then **Uncertain** (dotted badge, never coloured, with the reason). `signal.certainty === 'uncertain'` -> Uncertain; else
`signal.level === 'declared'` -> Declared; anything else (`probable`, `none`) -> Probable (an established sentence of an unknown level is never read as declared).
The caption of a group says whether the map colours it: strong / light when both levels are in `levels`, "Coloured" with a merged level, "Not coloured
on the map: it colours declared positions only" for a Probable group when `levels` holds no probable level. The sheet has no flat list of the sentences any more: they are under the positions.
`uncertain_reason` values with a text: speaker_not_binding, rumour, request_not_position, rival_from_association, ambiguous, readings_disagree, unconfirmed,
denied, past, other, colour_setting (another one is shown with its underscores as spaces).

### Sources: a reader joins the link of a page that says it to their choice (12.11.2026)

* **Request.** Optional field `source` on `POST /api/fifa/votes` (only with `value` `for` or `against`; **422** with `confirm` / `unknown` / `withdraw`) and on `POST /api/fifa/leans` (only when `subject` is a candidate qid: the source is joined to
  the FOR vote of the chosen candidate; 422 with `none` / `withdraw`). `source` is `{url}` or the url as a plain string; the page sends the plain string, trimmed, and nothing when the field is empty. `/leans` also takes `note` (up to 280 characters; 422 over).
  Errors (all `{error, status}`; **the message of the server is said** under the control, the link stays in the field): **422** not an address, a password in the address (`https://user:pass@...`), more than 500 characters;
  **400** a private address (localhost, 10.x, 192.168.x, 172.16-31.x, 169.254.x, *.local); **429** after 20 sources a day (the votes-a-minute 429 of a request without a source keeps the page's own words).
* **What the server does.** It reads the page with the AI in the background (10 to 60 s) and **never changes a colour because of it.**
* **Where it comes back.** `positions[subject].human.source = {url, medium, check, found, checked_at} | null` (`human` = the reader decision that stands; the answer of `POST /votes` carries it in `human` too) and in the sheet
  (`GET /associations/:qid`): `sources: [{subject_qid, value: 'for'|'against', by, at, note, url, medium, check, found, checked_at}]` (the sources of the choices that STAND, newest first: the last decision of each reader on each candidate, when it is
  for or against and has a source) and `votes[].source` (same object or null).
* **`check`**: `pending` (the AI is reading: "Checking…") · `says` (the page says what the reader chose; `found` = the sentence, shown: "The page says it") · `contradicts` (the page says the OTHER thing; `found`: warning badge "The page says the opposite")
  · `unclear` (the AI could not confirm it: neutral "Could not be confirmed", never said as wrong) · `unreadable` ("The page could not be read").
* **UI.** An optional field "Add a source (link)" in the block "Which candidate does {country} lean towards?" (sent with the candidate chosen; not with Confirm, which is a plain `confirm` vote, nor with None) and in the vote of the detail of the candidate selected, under
  "Your vote" (sent with Supported by {country} or Not supported, never with No position / Remove my vote). The field empties when the server accepted the choice. The sources are listed under the position of each candidate in the tab Positions (the medium as a link, "For / Against · by X · date", the
  check as a badge, the sentence `found` when there is one). **While a source is `pending` the sheet reads itself again after 30 s, at most twice (the AI takes 10 to 60 s)**; a new choice starts the count over.
* **The mock.** `source` goes through the same checks (`readSourceInput` in mock-data.mjs, 20 a day in the API). It decides what the AI "found" from a word of the address: `contradicts`, `unclear`, `unreadable` in the url give that check, anything else `says`; `pending` until
  `MOCK_SOURCE_READ_MS` (15000) after the choice. Seed: Mexico (Mock reader 1, For A, the page says it), Kenya (Mock reader 3, For A, the page says the opposite), France (Mock reader 2, Against B, unclear). `found` is an invented sentence.
  A choice that already stands is written again when it carries a source or a note (so they have a row to join): an assumption, tell me if the server does otherwise.

### Pages: a reader adds the link of a page with no candidate chosen, and it COUNTS (13.11.2026)

A source is not only joined to a choice: a reader can add **a page about an association on its own**, "just to enrich the system". The field "Add a source (link)" of the lean block and of the candidate card stays for choices (it still informs only); this is a separate way.
* **Request.** `POST /api/fifa/sources` body `{member, source: {url} | url, note?}` (a note up to 280 characters) -> **201** `{source: {...}}`. Errors (`{error, status}`, the message of the server is said, the link stays in the field): **422** not an address / missing, **400** a private address,
  **429** after 20 sources a day (shared with the sources of the choices) or 10 in 10 minutes. `DELETE /api/fifa/sources/:id` (the reader who added it or an administrator; **403** others; **404**) -> **204**.
* **The AI reads the page like a news, for EVERY candidate of the map, in the background (10-60 s), and what it finds COUNTS for the positions:** the signals it gives (established, or Uncertain) are kept like the news' and enter the positions, so **adding a page can change a colour and a position**. A page with no usable
  publication date gives only Uncertain signals (reason `other`). `DELETE` removes the signals the page gave: the positions can change back.
* **`sources[]` of the sheet** holds both kinds, newest first: kind `'choice'` (as before) and kind `'page'`: `{id, kind: 'page', subject_qid (the candidate the page speaks of, from its first reading, or null), value ('for'|'against'|null), by, at, note, url, medium, check ('pending'|'says'|'unclear'|'unreadable'),
  found (the sentence of the first reading, or ''), checked_at, readings: [{subject_qid, stance, level, found}] (one for each candidate the page speaks of), mine}`. **`signals[]`** of the sheet now carry `added_by` (the reader who added the page the signal comes from, else `null`) and `source_id` (the id of that source, else `null`).
* **The sheet.** At the top of the tab Positions an accordion **"Sources", closed at first** so it takes little room: one line (the title, "N pages · M being read" or "Add a page about this association", a chevron; `aria-expanded`). Open, it holds the button "+ Add a source" (a link "Link of the page", a note "Note (optional)" n / 280, "Add the source"), with the caption "The AI reads the page like a news: what it finds about this association counts for the positions."; it needs no candidate and has nothing to do with the lean block.
  Then the pages that are not under a candidate: **being read** ("Checking…"), **no clear position** ("The AI found no clear position in this page"), **could not read** ("Could not read the page"), or a page whose candidate is not on the map any more. A page the AI read something in (`check: 'says'`, `subject_qid` set) is under the position of that candidate,
  in "Pages added by readers", with its readings: the candidate, "for" / "against" ("(probable)" when the level is), the sentence; **one line for each candidate it speaks of** (the page is listed once, under the first). A page whose sentences are all Uncertain says "No date found on this page: its sentences are shown as Uncertain."
  Each page says its medium (a link), "Added by X (you)", the date and its note; the delete control ("Delete", "Delete this source? What the AI read in it goes too.", "Yes, delete" / "Keep it") is on the pages where `mine` is true and on every page when the reader is an administrator.
* **The sentences a page gave** carry a small neutral tag **"Added by {name} from a page"** (a button: it goes to the page in the sources of the sheet, focuses it) and "Read by the AI in a page a reader added".
* **The map and the sheet are read again.** While a page is `pending` the sheet reads itself again after 30 s (twice at most, as for the sources of choices). **When a page goes from pending to a final check the page asks the MAP again too** (a colour may have changed), and after a delete it reads the sheet and the map again (`onMapStale` of `AssociationSheet`).
* **The mock** (`bench/fifa/mock-data.mjs`, `fifa-mock-api.mjs`): `POST /fifa/sources` and `DELETE /fifa/sources/:id` as above (the limits too, `MOCK_ADMIN=1` / `x-mock-admin` for the administrator); the AI decides from a word of the address: **`unclear`**, **`unreadable`**, **`nodate`** (it says something, no date:
  Uncertain), else it `says`; **`for-b`** / **`against-a`** (the letter of a candidate) says which candidate and what, **`both`** a support of the first candidate and an opposition to the second, no word: a candidate drawn from the address. What it reads **counts**: a page gives a declared position where the news gave none (and a signal to a position they gave), an Uncertain signal for a
  page with no date, and the history gets the page as the article of the first position. **The mock API starts with four pages**: Argentina (read, the page says Mock candidate B: Argentina supports B on the map), Bolivia (unclear), Uruguay (pending for good), Paraguay (no date). `buildMock()` has no page by default (the tests keep their counts): `buildMock({pages: seedPages()})`.

### The strip of the candidates, and the detail of the one selected (13.11.2026)

The first thing of the tab Positions (the tab the sheet opens on) is a **strip of cards, one for EVERY candidate of the map** — the ones the news say nothing of for this association too — so that a reader who clicks a country sees at once the status of each candidate and can take a position on it. It replaces the chips ("All" + one per candidate, `CandidateBar.jsx`, removed) and the rule that left out the candidates with no news (13.11.2026, the user's request: they want to SEE every candidate with its status, as on a friend's site).
* **A card** (`CandidateStrip.jsx`) is a real `<button>` (`aria-pressed` = selected) in the group "Candidates and their status": the colour of the candidate on its **left edge** (`candidateFill`), its **name**, its **status for this association** in the words of the rest of the page (`statusOf` of `positions.js`: `labelOf` of the position read — Declared support, Probable support, Declared opposition, Probable opposition — or **"Uncertain: signals, no position"** when only Uncertain signals exist, or **"No known position"**, which is also what a candidate with no entry in `positions` has),
  a small **"Set by a reader"** or **"Confirmed by a reader"** when a reader decided or validated it, and **"Review →"** ("Take a position →" when no position is known). The status is `readEntry(positions[qid], levels)`: a reader's vote reads as "Support" / "Opposition" / "No known position", as in the rest of the page.
* **Order**: the candidates in the order of `summary.candidates` (the server's: supported first, then probable, then Uncertain only; `orderBySummary` of `positions.js`), then the candidates the summary does not hold (nothing on them) in their order (`orderCards`); with no `summary` (an older server) `orderCards`. **No candidate is left out.** Two columns in a narrow panel (a phone, the side panel), three when the panel is wide (a container query: `@xl`); a card is at least 44 px tall; Tab goes through the cards, Enter or Space selects, the focus is visible.
* **Selecting.** One card at a time: a click selects it (the others are not), a second click on the selected card **unselects** it. The candidate chosen in the list of the page is selected from the start (`?c=`), else none: the strip alone, then the lean block. The selection is the sheet's own (the select and the address of the page do not change), it starts again with each association and **stays after a vote** (the sheet reads itself again). A candidate that is not on the map (removed) selects nothing.
* **The detail** of the candidate selected is under the strip: the card of the sheet (position, who set or confirmed it, the news' reading, the sources joined to the votes, the pages, `Confirm this position ✓`, the groups of sentences, the timeline and the history) **with the vote always open**: "Your vote" with **"Supported by {country}"** (`for`), **"Not supported"** (`against`), **"No position"** (`unknown`) and "Remove my vote", and the field "Add a source (link)" that goes with the first two (the same `POST /fifa/votes` as before; the labels are only words: for a confederation the code of the confederation stands for the country).
  For a candidate the news say nothing of (no entry, no sentence, no source, no page): **only the vote and the line "No news name this association with {name} yet."** (no Confirm button: there is nothing to confirm).
* **Under the detail**: the lean block (when no candidate is chosen in the list), then the control "Add a source" and the pages that are not under a candidate. With no candidate at all on the map the tab says "No candidate is on the map yet.".
* **In the mock**: Spain holds A and B (C: "No known position", "Take a position →"), the United States hold nothing (three cards with "No known position"), Albania holds all three, France B is a reader's vote against ("Set by a reader"), Turkey A is only Uncertain ("Uncertain: signals, no position").

### The news that name the president, in the tab Leadership profile (13.11.2026)

* `GET /api/fifa/associations/:qid/leader/news?scope=football|all&limit=50&offset=0` -> `{leader: {name, person_qid} | null, scope, total, total_all, total_football, limit, offset, articles: [{id, title, description, medium, url, lang, published_at, relevant}]}`, newest first, the news of the last 30 days (the ones the president's
  "articles in 30 days" count). `scope` `football` (the default) = the news that also name (linked by the tagger) the association, its confederation or FIFA, or hold a football word; `all` = every news that names the person; anything else **422**. `total` = the count of the scope asked; `relevant` = it would pass
  the football filter (true for every news when `scope=football`). `limit` 1..100 (50 by default), **404** unknown association, `leader: null` and an empty list for an association with no president, **429** after 30 requests a minute.
* **UI** (`LeaderNews.jsx`), under the name / role / since lines, **asked when the tab is opened** (not with the sheet; again each time it is opened; not at all when the sheet has no president): the heading with the total of the scope ("126 football news in the last 30 days" / "145 news in the last 30 days"); a **segmented control**
  "Football news (126) | All news (145)" (football by default; radio buttons "News shown"), switching reloads from offset 0 with the scope; the list (date · medium, the title as a link that opens in a new tab with `rel="noopener noreferrer"`, the description in muted text cut to 2 lines, none when it is empty); "N of total shown" and **"Show more"**
  (the next page, offset = the number shown, same scope) until the total; in Football, when `total_all > total_football`, the muted line "{n} news that name this president are hidden (not about football)" with **"Show all"** (switches to All); in All the news with `relevant: false` carry a muted tag **"Not football"**.
  States: "Reading the news…" while it loads, an error with the message of the server and "Try again" (a failed "Show more" keeps the list and says so), "No football news name this president in the last 30 days." (with the hidden line when others exist), "No news name this president in the last 30 days.". The answer of a scope that was left is dropped.
  Two captions: the list is the news that name the person, in any context (a namesake or a passing mention can appear); the football filter reads the words and the links of each news, so in some languages a football news can be hidden: "All news" always shows everything.
* **The mock:** France has 145 news (126 about football, three pages of 50; the president's `articles_30d` is 145 too), the others the president's `articles_30d` (most 0), about a quarter of them not about football; every article has a description but one in five (to see the cut). **One association has no president:** `MOCK_LEADERLESS` (Gibraltar) for the mock API (210 presidents,
  `leader: null`, the route answers `leader: null` and an empty list); `buildMock()` keeps 211 for the tests (`leaderless: ['GIB']` to get it). The route checks scope / limit / offset (422), 404, and 30 requests a minute (429).

### The tab Summary, and the AI summary on demand (13.11.2026)

The sheet has a **tab "Summary"** (the **second** one: the sheet **opens on Positions**, the tabs are Positions, Summary, Leadership profile, Notes — the user's order, 13.11.2026). **Information only**: nothing in it confirms or votes (the buttons are in Positions). It has two parts.

**1. What the code built** (`GET /associations/:qid` carries `summary` and `context`; **no AI writes these lines**, the page only lays them out). `summary = {candidates: [...]}`, already ordered (positions first: set by a reader or declared, then probable, then only-Uncertain; the candidates with nothing are absent), each candidate:
`{subject_qid, name, color_index, status, position, ai_position, since, previous, changed, stale, signals_count, uncertain_count, articles_30d, media_30d, human: {value, by, at, newer_evidence} | null, confirmed, sides: [{stance: 'for'|'against', declared, probable, first_at, last_at, media,
speakers: [{name, role, binds}], key: [{id, sentence, url, medium, published_at, level, speaker, role, binds}]}], latest_change: {subject_qid, date, from, to, kind, url, medium} | null}`. `sides[0]` is the side the position stands on; an empty side (declared + probable = 0: only a reader says it) is not drawn.
`position` / `human` / `confirmed` are read with the same function as the cards (`readEntry`), so the words are the ones of the rest of the page ("Declared support", "No known position"...).

The lines of a candidate (a card `Mock candidate A: summary`): the heading with its colour and the badge of the position (+ "Set by a reader");
* **"{Position label} on {name} since {date}"**, then **", changed from {previous label}"** (`changed` and `previous`) — or **", set by a reader ({by}) on {date}"** with a caption "AI reading from the news: {label}" (and "New evidence since the vote…" when `newer_evidence`); with no position: **"No established position: {uncertain_count} sentences about the election and this association that do not say one"**;
  small captions: "Confirmed by {names}" (`confirmed`), "Older than 90 days: kept for the record." (`stale`, no vote), "Last 30 days: {n} articles in {m} media";
* for each side (a group named **"For {name}" / "Against {name}"**, the position's side first): **"{declared} declared and {probable} probable sentences in {media} media, last on {date}"** (singular: "sentence", "medium"); **"Said by {speaker} ({role}, speaks for the association)"** for a speaker who binds it (`binds`), "Said by {speaker} ({role})" for the others;
  the **key sentences word for word** between quotes, under them the medium as a link to `key[].url` (new tab, `rel="noopener noreferrer"`; plain text when the url is null), the date, "Declared" / "Probable", the speaker;
* **"Latest change, {date}: {First position|Reversal|Weakened}, {from} → {to}"** + the medium as a link (`latest_change`);
* the context, for a candidate that has something: **"{FIFA} itself: {label}. Other associations of {FIFA}: {for} for, {against} against (of {total})"**.

`context = null | {confederation: {qid, fifa, name}, own: {[subject_qid]: {position, since}}, associations: {[subject_qid]: {for, against, unknown, total}}}` — **null on the sheet of a confederation**. A candidate gets the line when the confederation has a position on it (`own`) or at least one other association is for or against; `own` has the candidates the confederation has a position on only (otherwise "No known position").
The line is shown under the candidates of `summary.candidates` only (a candidate the sheet holds nothing on has no card in the Summary). With no candidate at all: "Nothing to summarise yet: no sentence of the news ties this association to a candidate."

**The strip of the tab Positions follows the same order** (`orderBySummary` of `positions.js`): the candidates in the order of `summary.candidates`, then the ones it does not hold (`orderCards` order); none is left out (see "The strip of the candidates"). With no `summary` on the sheet (an older server) it is `orderCards` as before.

**2. The summary an AI writes, only when a reader asks** (the section "AI summary" under the lines). `GET /associations/:qid` also carries `ai_summary: null | {claims: [{text, facts: [ids]}], facts: [{id, kind: 'position'|'sentence', text, url?, medium?, date?}], model, generated_at, by, current}` and `ai_summary_available` (false when there is nothing to summarise or the AI summary is switched off).
* **`POST /api/fifa/associations/:qid/summary`** (no body) -> **200** `{ai_summary, generated}` (5 to 20 s; the page shows a busy button and "The AI is writing the summary: it takes 5 to 20 seconds."; the request lives in the sheet, so it goes on if the reader opens another tab); **409** nothing to summarise, **502** the AI gave nothing usable (try again), **403** switched off, **429** after 5 an hour, **401** signed out (the page says "Sign in to ask for a summary."). The message of the server is shown under the button (role `alert`), the button is back.
* The button **"Summarise with the AI"** is **hidden** when `ai_summary_available` is false (and nothing is said of the AI when there is no summary either). With a summary the block is dashed and says **"Written by the AI from the facts below: it can be wrong"** with **"by {by}, {generated_at}"** (it can be a summary another reader asked for); the claims as a short list, each followed by **numbered chips `[n]`** (button `Fact n`) that scroll to and focus fact n of `facts`;
  the facts are listed under (a sentence between quotes, with its medium as a link and its date; a position as the code read it, no link). `current: false` -> the notice **"The sheet has changed since this summary was written."** and the button becomes **"Write it again"**; `current: true` -> the button says **"Written {date}"** and is disabled.
* **The mock:** the summary and the context are built from the same signals as the sheet; **Spain on A has both sides** (the position is for, one older sentence says against; the sheet of the mock API starts with a summary written by "Mock reader 2" **before the sheet changed**: `current: false`), Norway a reversal (position against, the first reading was for), France B a reader set the position against while the news say for (the side of the vote is empty), Turkey only Uncertain sentences,
  Germany nothing (409, no button); Spain A also has the older sentence against (`counter` signal, only in the mock data). `POST /summary` answers after `MOCK_SUMMARY_MS` (4000 by default), writes in memory a summary built from the facts (`[Mock AI]` claims), is limited to 5 an hour (429), and honours the headers `x-mock-ai-fail: 1` (502) and `x-mock-signed-out: 1` (401); `MOCK_AI_SUMMARY=off` switches it off (403, `ai_summary_available: false`).
  `buildMock({aiSummaries: seedAiSummaries(), aiOff: false})` for the tests (none by default); `writeAiSummary(summary, {by})` writes one that is current for that summary (`summarySignature`).

### Notes: what readers write on an association (12.11.2026)

The sheet's third tab is **"Notes"** (it was "Sources and notes": the sources are under the positions now, and the flat list of the sentences of the news went with them). It holds the notes, then the history of the votes ("Position history", with the notes written with a vote, `votes[].note`, as today) and
the usual notices. A note is visible to every reader and is **not a position: it never changes a colour.**
* `GET /associations/:qid` carries `notes: [{id, by, at, text, mine}]`, newest first; `mine` = written by the signed-in reader.
* `POST /api/fifa/notes` body `{member, text}` (1 to 500 characters, trimmed; **422** otherwise; **429** after 10 notes an hour) -> **201** `{note: {id, by, at, text, mine: true}}`. The page shows it first at once (it does not read the sheet again).
* `DELETE /api/fifa/notes/:id` (the author or an administrator; **403** others; **404** unknown) -> **204**. The delete control ("Delete", then "Yes, delete" / "Keep it") is on the notes where `mine` is true, and on every note when the page knows the reader is an administrator
  (`user.admin === true` of the session, passed as `admin` to `FifaBoard`). The server remains the judge.
* The "+" button (`aria-label` "Add a note") opens a form (a counter n / 500); a refusal is said under it, what was typed stays.
* **The mock** holds 3 invented notes (Brazil 2, Nigeria 1), writes the new ones in memory (the author is the reader of the session, `mock`), `MOCK_ADMIN=1` makes that reader an administrator (`/session` says `admin: true`); the header `x-mock-admin: 1` does the same for one delete.

### `GET /fifa/associations/:qid`

```
{ member, positions, leader,
  votes: [ {subject_qid, value: 'for'|'against'|'unknown'|'withdraw'|'confirm', by, at, note, source: {...} | null} ],   // newest first, the withdrawn ones too
  sources: [ {subject_qid, value: 'for'|'against', by, at, note, url, medium, check, found, checked_at} ],             // the sources of the choices that stand, newest first
  notes: [ {id, by, at, text, mine} ],                                                                               // newest first
  signals: [ {id, subject_qid, certainty: 'established'|'uncertain', uncertain_reason, stance, level,
              mark: 'official'|'reported'|'denied', speaker: {name, role, binds}, sentence, translation, url, medium,
              published_at, lang} ],
  history: [ {subject_qid, date, from, to, kind: 'first'|'reversal'|'weakened', url, medium} ],                         // url / medium: the article of the signal that made the change, null when it has none
  summary: {candidates: [...]}, context: {...} | null, ai_summary: {...} | null, ai_summary_available }               // see "The tab Summary" (the AI summary is asked with POST /associations/:qid/summary)
```

`uncertain_reason` is the closed list `speaker_not_binding, rumour, request_not_position, rival_from_association, ambiguous,
readings_disagree`; another value is shown as it comes (underscores to spaces).

### `GET /fifa/presidents`

`{generated_at, presidents: [{person_qid, name, role, since, checked_at, member_qid}]}` (the page joins `member_qid` with the map).

### `GET /fifa/confederations`

`{generated_at, confederations: [ member of level 'confederation' + members_count ]}` (the counts by position are computed from the map).

### `GET /fifa/subjects`

`{generated_at, subjects: [...]}` same objects as in the map. (The page does not call it: the map carries the subjects.)

## Changes to the first provisional contract

* The tab Summary (13.11.2026): `GET /associations/:qid` carries `summary`, `context`, `ai_summary`, `ai_summary_available`; `POST /fifa/associations/:qid/summary` writes the AI summary on demand (409 / 502 / 403 / 429); the sheet has a tab "Summary" (second; it opens on Positions) and the strip of Positions follows the order of `summary.candidates`. No contract change for that.
* The strip of the candidates (13.11.2026, client only, no contract change): see "The strip of the candidates, and the detail of the one selected". The chips and the fold "Or change the position" are gone, the vote says "Supported by {country}" / "Not supported" / "No position" / "Remove my vote". See "The tab Summary, and the AI summary on demand".
* Removing a candidate (13.11.2026): `DELETE /fifa/subjects/:qid` for any signed-in reader (403 for the president in office); a "Remove" control with one confirmation in the dialog of the candidates. See "Removing a candidate".
* The sheet (13.11.2026): the cards of the candidates are ordered by what they hold and have chips above them; the tab Leadership profile lists the news that name the president (`GET /associations/:qid/leader/news`, scope football / all). See "The cards of the candidates in the sheet" and "The news that name the president".
* Pages (13.11.2026): `POST /fifa/sources`, `DELETE /fifa/sources/:id`; `sources[]` of the sheet has kind 'choice' and 'page'; `signals[]` carry `added_by` and `source_id`; a page counts for the positions (the map is asked again when the AI has read one). See "Pages".
* The timeline of the sheet (13.11.2026): `history[]` carries `url` and `medium`; the dots of that timeline are links to the article. See "The timeline of the sheet".
* The list of candidates is dynamic (13.11.2026, third server contract): `subjects[].origin` and `found`; the page asks the map again on focus and every 5 minutes; tags "Found in the news" / "Reading the news…". See "The list of candidates is dynamic".
* Sources and notes (12.11.2026, two server contracts): see "Sources" and "Notes" above. `POST /votes` and `POST /leans` take `source` (and `/leans` `note`); `positions[s].human.source`, `votes[].source`, `sources` and `notes` in the sheet; `POST /notes`, `DELETE /notes/:id`.
  The tab "Sources and notes" is now "Notes" (notes + the history of the votes).
* "Source coverage" removed (12.11.2026, the user's request): the select of the candidate is "Candidate" (All candidates + one item per candidate) and the map has no colouring by articles any more. The numbers stay (`coverage`
  of the members, `articles_30d` / `media_30d` of the positions, the column "Articles, 30 days", the presidents' articles). An old address `?c=coverage`, like any `c` the map does not list (a removed candidate), reads as All candidates, with no error.
* Tables (12.11.2026): List, Confederations and Presidents are tables with one search bar, sortable columns and filters of columns, all in the address; no endpoint changed. The presidents view lost its "Show" select (see "The tables").
* Which candidate a country leans toward (12.11.2026, the user's own words, after seeing the votes under each candidate): the vote per candidate is only in the card of the candidate chosen in the list; with none chosen,
  one block with `POST /fifa/leans` (see above). Presidents: `source`, `source_url`, `articles_30d`, `last_mention` and 211 of them. The mock has `lean` on the members, `answerLean` and the route.
* Confirmation makes the position solid (12.11.2026, sixth requirement, supersedes "a confirmation changes no colour"): `position` promoted by the server, `ai_position` = the news, `human: null`, `stale: false`;
  in the mock, Morocco (probable support for A confirmed by a reader 4 days ago) comes declared, Peru (probable, next to Brazil) can be confirmed to see it turn solid, and `seen` of a confirmation is the position of
  the NEWS (`ai_position ?? position`).
* Confirmation (12.11.2026, fifth requirement): `value: 'confirm'`, `confirmed` in the answer and in `positions[s]`, `seen` on the `confirm` rows of `votes[]`. In the mock: Nigeria (two readers confirmed
  the declared support), Egypt (a reader confirmed "declared support" before it weakened to probable: outdated), Germany on B (a confirmation of "no position" only). The mock records the position
  seen at the time of the confirmation (`answerVote` in mock-data.mjs, used by the mock API and the tests).
* Probable drawn with dots (12.11.2026, fourth requirement): no contract change. In the mock, Brazil (declared for A) and Peru (probable for A) are neighbours, Egypt, Morocco
  and Uzbekistan (118 days old, faded) are probable, Norway a probable opposition.
* Candidates (12.11.2026, third requirement): `GET /fifa/people`, `POST /fifa/subjects`, `PATCH /fifa/subjects/:qid`; `signal.level` is `declared|probable|none` (it was a
  position value). The mock holds an invented list of 9 persons ("Mock Alvarez"...), 3 adds a day then a 429, a map of 6 then a 409 (a withdrawn candidate
  makes room, the oldest first), a new candidate `computing` for 20 s; with `MOCK_LEVELS` declared only a probable position becomes an Uncertain
  sentence `colour_setting`.
* Votes (12.11.2026, second requirement): `positions[s].human`, `positions[s].ai_position`, `votes[]` on the sheet, `POST /fifa/votes`. In the mock, 3 readers
  ("Mock reader 1..3") have voted on MEX (a reader withdrew), FRA (against), QAT (no position), KEN (for, with newer evidence); the mock keeps
  the votes given while it runs (in memory, 30 a minute then a 429; the header `x-mock-signed-out: 1` makes it answer 401).

* `members[].name` is the country, `association` added. `coverage` added at member level. `positions[subject].basis` added.
* `levels` may contain the merged `soutien` / `non_soutien`.
* `members` carries the 6 confederations (`level: 'confederation'`) besides the 211 associations.
* "Conflicting indications" is computed by the page (support for two candidates); no field is needed.
