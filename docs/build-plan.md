# Build plan

The goal is to get from a crate of local tracks to an editable, exact-length set. We can build and review the whole workflow with invented data before writing a parser or deciding what makes a good transition.

## 1. Build the full UI with mock data

- **Import and library:** Choose a source file or load demo tracks. Show source type, track count, usable tempo/key counts, optional tag coverage and row-level warnings. Provide search, genre filters and sorting by BPM/key. Represent loading, empty, malformed file and partial metadata states with mocks.
- **Set setup:** Enter track count, start/end BPM and optional checkpoints. Pick anchor tracks by exact slot; an adjacent transition is two neighboring anchors. Show conflict messages for duplicate IDs, occupied slots, impossible counts and out-of-range slots.
- **Set workspace:** Show the order and key/BPM badges, drag handles plus keyboard-accessible move buttons, lock/unlock controls, and the transition explanation between tracks. Moving unlocked tracks must preserve fixed positions. Add a tempo chart with anchor markers and an optional, separately labeled energy view. Show missing values as gaps. A mock regenerate action should demonstrate how unlocked positions change and what happens if no set fits. Include undo and export affordances.
- **Ready to move on when:** A demo user can load a crate, configure a set, move a track, lock it, regenerate from canned data and preview export. Mock results are labeled. Verify keyboard operation, a narrow layout and all error states.

## 2. Import real metadata

Keep the normalized model small: stable track ID, source/native ID, title, artist, local path or URI, optional duration/BPM/wheel key/genre/energy, raw BPM/key, and warnings. Treat real export fields and optional user overrides as separate provenance. Return tracks, format, coverage counts and warnings from import. Start with VirtualDJ and use a handful of local tracks to compare displayed BPM/key; then add Rekordbox and verify Serato History CSV before committing to its schema. Use bounded XML/CSV reads and never follow a path from an import simply to parse metadata. No cloud requests or modification of DJ app libraries.

**Ready when:** Synthetic fixtures cover missing tags, invalid BPM/key, malformed XML, quoted CSV, Unicode paths, and distinct edits of the same title. At least one actual export per supported format has been checked privately.

## 3. Score transitions and build data structures

Implement the track hash table, directed adjacency list, and min-heap in Python. Test collisions/resizing, graph direction, heap ordering and tie-breaking. Index tracks by key and tempo buckets before scoring neighbors so candidate construction does not require a scan of every pair for every track. Keep outgoing top-K candidates plus allowed edges into/out of locked anchors. Prefer deterministic ordering.

Use a nonnegative sum of tempo change, harmonic relation, and optional genre/energy terms. Slot penalties measure deviation from the requested tempo curve; a style or energy term only compares real data. Keep a baseline for missing core data so an unknown key is not treated like a perfect match. Start with known tempo/key tracks for automatic selection, but allow intentional manual or anchored exceptions with a visible warning. Show the separate contributions alongside each suggested transition.

## 4. Generate sets and replan around locks

- Implement a heap-backed Dijkstra search for an **unrestricted-length** cheapest connection between tracks. With a binary heap that holds one active entry per vertex, runtime is O((V+E) log V); a lazy heap can use O(E) entries and O((V+E) log(V+E)) time. A simple scan implementation is a useful baseline. Plain Dijkstra on tracks can choose too few songs for the set.
- Implement the exact-length baseline on layers numbered 1 through N. State (slot, last track) takes the least cost predecessor from the previous layer, adds transition and slot cost, and records a backpointer. Filter each anchored layer to its pinned ID. On a graph with up to K outgoing candidates per track, time is O(N(V+E)), and backpointers take O(NV). This baseline finds the cheapest allowed walk and can revisit a track.
- For a playable no-repeat set, use a bounded beam with used IDs carried per path. Reserve all future locked IDs, and preserve uniqueness across the whole set. The beam is approximate; compare against exhaustive search on small libraries. Segment boundaries can speed up replanning later, but independent segment solutions can pick the same track twice. Validate all locks, exact count and no repeats before accepting a result.
- Treat locked positions as hard constraints and tempo targets as preferences unless the user explicitly chooses a hard limit. If a bounded search fails, widen candidates or beam under a budget and report that no set was found within the search limits. Reserve “impossible” for proven conflicts. Never silently drop a lock. Preserve the prior draft if regeneration fails.
- Define a request around track count, tempo checkpoints, anchors and candidate pool. Return ordered IDs, per-transition scores, warnings and search status. Run the engine independently from the UI, then connect the UI through a same-origin loopback API.

**Ready when:** A tiny hand-checkable graph distinguishes Dijkstra from exact-length planning, fixed transitions survive regeneration, repeated IDs are rejected, and the same inputs give the same result.

## 5. Export and verify the real workflow

Export an ordered UTF-8 M3U8 when all entries have usable paths, plus an ordered CSV set sheet when paths are missing. Let the DJ inspect or remap stale paths and test the playlist in the actual destination app. Check order, Unicode, paths on external drives and missing media. M3U8 references files; it does not transfer cue points, write a native crate or prepare a USB for a player.

Measure import, candidate construction, search and replanning separately at 500, 2,000, 5,000 and 20,000 synthetic tracks. Record edge count, N, K, beam width, elapsed time, peak memory and failure rates. Compare the optimizer to a greedy baseline and brute force on tiny examples. Finish with a real rehearsal: make a draft, pin an opener and a must-play transition, regenerate, review the weak links, then open the export in DJ software.
