# Ranking Video Studio

A zero-backend creator tool for making vertical ranking videos. Projects and clips stay in the browser, exports are rendered locally, and deployment is a static site.

## Features

- 9:16 vertical ranking-video editor.
- Upload clip files and keep pasted source links for reference.
- Manual or shuffled playback order for 5-6 ranked clips.
- Title, number stack, label, trim, volume, and background controls.
- Browser-local project saves with JSON import/export.
- In-browser video export with MP4 when supported and WebM fallback.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The built static site is emitted to `dist`.

## Cloudflare Pages

1. Create a new Cloudflare Pages project from this folder's Git repository.
2. Set build command to `npm run build`.
3. Set output directory to `dist`.
4. Do not configure Functions or server storage.

## Important Media Note

Pasted TikTok, Instagram, and YouTube links are reference fields only. This app does not download from social platforms. Upload clips you own or have permission to use.
