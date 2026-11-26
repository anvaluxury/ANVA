# Implementation notes

The editor persists display settings in `site_settings` using the existing `key` / `value` JSON pattern. Existing records are not overwritten:

- `site_design` stores the selected surface style, transparency and blur strength.
- `media_layouts` stores per-asset fit, x/y object position and scale, keyed by storage bucket and path.

Uploaded media is only removed after the replacement or removal metadata is saved, where supported by the current editor workflow. A replacement is uploaded as a new storage object first, so the previous object remains available if the upload itself fails.

The media preview is a local preview of the selected asset in the target aspect ratio. The saved fit, crop position and scale are also applied on the corresponding public site image/video elements.

No SQL migration was added. The project already uses `site_settings(key, value, updated_at)` in its current source code. If the live database schema differs from that source contract, verify it before publishing.

Not included: full site-wide click-to-edit architecture, server-side or browser FFmpeg MP4 transcoding/trimming, and draft/publish version history.
