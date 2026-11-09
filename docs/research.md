# Research notes

## Import a selected crate

The main workflow starts from one curated list of about 40 previously scanned tracks. Track analysis in the DJ app and metadata in the exported list are separate things.

| File | What to expect |
| --- | --- |
| VirtualDJ My Lists XML / .vdjfolder | Ordered paths, with optional artist, title, length, BPM and key. A local read-only check found 38 entries across 10 nonempty lists. All 38 had paths and order indexes. Seven had BPM and key, and 16 had length. Use the list as the selection and enrich by path from a companion database where needed. [My Lists format](https://virtualdj.com/wiki/lists.html) |
| VirtualDJ CSV, TXT and HTML | Text export choices for a selected list. Check the actual CSV header and whether paths, BPM and key survive the export before depending on them. [VirtualDJ export manual](https://autoupdate.virtualdj.com/manuals/virtualdj/appendix/export.html) |
| Rekordbox collection XML | Playlist nodes reference collection rows by track key. Select one playlist and resolve its ordered IDs to rows with AverageBpm, Tonality and Location. Plain TXT and M3U8 are separate playlist exports with no BPM/key guarantee established here. [XML specification](https://cdn.rekordbox.com/files/20200410160904/xml_format_list.pdf) · [Rekordbox manual](https://cdn.rekordbox.com/files/20260409151936/rekordbox7.214_manual_EN.pdf) |
| Serato CSV, TXT and M3U | These documented exports come from a played History session. The CSV header and key/BPM coverage still need a real sample. M3U points to audio paths and can omit manually inserted tracks. [Serato History](https://support.serato.com/hc/en-us/articles/223455687-History) |
| Generic M3U/M3U8 | Treat it as an ordered path list, with display information where present. Resolve analysis from companion metadata. Preserve relative paths against the playlist directory and report missing or ambiguous matches. |

## Import sources

| Source | What the documentation supports | Decision |
| --- | --- | --- |
| VirtualDJ database XML | [Database schema](https://virtualdj.com/wiki/VDJ_database.html) documents per-song fields, tags, and scanned values. Scan.Bpm is seconds per beat: BPM = 60 / Scan.Bpm. [Analyze Tracks](https://virtualdj.com/manuals/virtualdj/interface/database/analyze.html) says unscanned tracks can have blank BPM, key, and length. | First importer. Verify tag and scan precedence and units against the DJ application's display on a clean copy. Never apply the scan conversion to every BPM field. |
| VirtualDJ My Lists / history | [My Lists](https://virtualdj.com/wiki/lists.html) documents XML lists with paths and optional metadata; [History](https://autoupdate.virtualdj.com/manuals/virtualdj/interface/database/history.html) documents dated lists and export actions. | Treat a list or history file as a separate adapter or a selection of tracks from the database. Match by path or native ID when available; verify real history exports before promising support. |
| Rekordbox collection XML | [Rekordbox 7 export FAQ](https://rekordbox.com/en/support/faq/operation-hints-7/) and [XML specification](https://cdn.rekordbox.com/files/20200410160904/xml_format_list.pdf) document collection export and fields such as TrackID, AverageBpm, Tonality, Genre, and Location. TEMPO entries are separate beat-grid data. | Second importer. Read collection tracks; decode file URIs with URL parsing, preserving drive/host semantics. Verify empty fields, actual key notation, XML playlist references, Unicode paths, and compatibility on an export from the installed version. |
| Serato DJ Pro History CSV | [Serato History docs](https://support.serato.com/hc/en-us/articles/223455687-History) document per-session CSV and M3U exports. [Library columns](https://support.serato.com/hc/en-us/articles/203015464-Sorting-and-browsing-your-library) are a separate feature. | Third importer, conditional on an actual CSV sample. Inventory headers, units, duplicates and path coverage. If paths are absent, keep rows usable for planning and offer ordered CSV export; require verified paths for M3U8. Also support a documented generic CSV template. Native Serato crates are outside the first release. |

A read-only spot check of a local VirtualDJ database hit a malformed XML token after over a thousand completed song rows. In the readable prefix, about two thirds had scanned BPM/key, under half had a genre tag, and dedicated energy/subgenre attributes were absent from the tag fields inspected. Scanned keys were in a format other than wheel codes. These are observations from one incomplete file, not general coverage rates. No Serato History CSV or confirmed Rekordbox collection export was inspected. The repo includes no real library rows.

Before declaring an adapter supported, export or copy a small local sample, compare several rows with the UI, count blank/invalid fields, and recreate any needed edge cases with invented metadata. A malformed XML import should fail clearly and leave the current library intact. Provide steps to try a clean copy or fresh export.

## Musical choices

[Mixed In Key's harmonic mixing guide](https://mixedinkey.com/harmonic-mixing--guide/) gives same key, same-letter neighbors, and same-number A/B as useful defaults. Normalize note names and enharmonic spellings to a canonical wheel key, retain the raw value, and account for 12↔1 wraparound. Unknown key is its own state. Use relative tempo change for transition cost, and make half/double-time a separate opt-in rule that shows how the match was computed. A smooth harmonic score is guidance; vocals, rhythm, edit structure and whether key lock is on can change how a mix sounds.

BPM is useful for a tempo curve. Energy is a separate measurement and should come from an explicit rating or a confirmed source field. Leave gaps visible and disable energy targets when usable data is absent. Genre, grouping, rating, and vibe should not be inferred from one another. Compare versions by source ID or file path; artist/title alone can collapse the exact edit the DJ wants.

## Related work and stack

[DJ Crate](https://github.com/hacksics/dj-crate) describes local analysis and energy-arc set building; [CueKey](https://github.com/Supercarlillos/cuekey) provides local track analysis and Rekordbox workflows; [Rekordbox Setlist Builder](https://github.com/zachdissington/rekordbox-setlist-builder) also orders tracks harmonically. Crate Relay's focus is on existing metadata across DJ apps, fixed track positions, and explaining why a set was chosen.

Start with semantic HTML, CSS, vanilla JavaScript, and an SVG plot. It is easy to prototype using fake data without bundling or involving the optimizer. Keep the algorithms in a plain Python package so they can run from unit tests and a command line. Python's [CSV reader](https://docs.python.org/3/library/csv.html) is enough for tabular imports. Evaluate a hardened XML parser and input limits before opening user exports; see [Python's XML security notes](https://docs.python.org/3/library/xml.html#xml-vulnerabilities). Later, [FastAPI](https://fastapi.tiangolo.com/tutorial/request-files/) is a candidate for a loopback-only API and local file imports. No UI framework, cloud account, audio analysis, or data science dependency is needed for the first pass.
