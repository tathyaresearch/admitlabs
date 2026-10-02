# Drishti motion

The Drishti logo's reveals as motion graphics. Each starts with only the word; the eye arrives, settles in its place before the word, opens fully and blinks once.

- `side-reveal/`: the eye comes out from behind the D (2.8 seconds).
- `rise-reveal/`: the eye rises from behind the word, peeks over the top of the D, looks left and right, then glides down into its place (3 seconds). This is the one on the site: the intro of the `/drishti` hero and the website's Drishti section.

Each folder has, on black (#0A0A0C) and on ivory (#F2E8D6):

| File | What it is |
|---|---|
| `...-1080x1080.mp4` | Square MP4 |
| `...-1920x1080.mp4` | Wide MP4 |
| `...-1080x1080.gif` | Square GIF that loops, fading in from the background and out to it |

Names starting `drishti-by-admitlabs-` show the full lockup, "Drishti by AdmitLabs". Names starting `drishti-` show the eye and "Drishti" alone.

Every file is half a second of the word, the reveal, then the logo held for 1.7 seconds. The MP4s are H.264, tagged BT.709, so the black and the ivory play back exactly.

## Making them again

After a change to the eye or the reveals:

1. Start the app: `npm run dev`
2. Record: `npm run motion:record` (both reveals), or `npm run motion:record -- rise` (one)

It needs ffmpeg on the PATH and Edge or Chrome (or `BROWSER` set to one). The files are recorded from the stage at `/drishti/motion`, which opens while developing only and is kept out of search. It draws the logo with the site's own component (`ProductLockup` in `src/components/ui/Brand.tsx`), so the files always match the site.
