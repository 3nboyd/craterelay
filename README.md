# Crate Relay

Crate Relay is a local DJ set planner for building a set from tracks you already have. I started it because planning a wedding or event set can take longer than playing it. I want to be able to pick an opener, keep the tracks or transitions that matter, and get a draft that makes sense in tempo and key without leaving out the edits that only exist in my library.

The workspace opens with a 40-track demo crate. Browse tracks, pin positions, reorder the draft, and preview CSV or M3U8. Generate uses two canned demo orders. Real file parsing and optimization are the next phases.

- [Build plan](docs/build-plan.md): UI first, followed by import, scoring, and search.
- [Research notes](docs/research.md): vendor formats, metadata findings, and decisions to verify.
- [Demo crate](web/demo.js): 40 fictional tracks used by the workspace.

To open the workspace locally with Python 3.11+:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Open http://127.0.0.1:8000. Keep real exports and audio under the ignored `local-data/` directory.
