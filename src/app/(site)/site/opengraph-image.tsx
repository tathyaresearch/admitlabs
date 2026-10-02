// The website's link preview image (1200 by 630), in the Spotlight style of its hero: the promise
// centred on black under a soft cone of light, inside a fine frame with small crosses, and the
// proof line under it. Set in Bricolage Grotesque from the report's font files. Made with Next's
// built-in image tool, once at build.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { HERO } from '@/site/content';

export const alt = 'AdmitLabs. Get discovered, trusted, and chosen. 120+ education companies worked with.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BLACK = '#0A0A0C';
const IVORY = '#F2E8D6';
const FALLEN = '#D6CEC0';
const SLATE = '#8A8D94';
const HAIR = 'rgba(242, 232, 214, 0.16)';
const MARK = 'rgba(242, 232, 214, 0.45)';

const EDGE = 96;
const TOP = 84;
const BOTTOM = 560;

const font = (file: string) => readFile(join(process.cwd(), 'src', 'report', 'fonts', file));

/** A small cross where two lines of the frame meet. */
function Cross({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: 'absolute', left: x - 5, top: y - 5, width: 11, height: 11, display: 'flex' }}>
      <div style={{ position: 'absolute', left: 5, top: 0, width: 1, height: 11, background: MARK }} />
      <div style={{ position: 'absolute', left: 0, top: 5, width: 11, height: 1, background: MARK }} />
    </div>
  );
}

export default async function Image() {
  const [regular, semibold, extrabold] = await Promise.all([
    font('BricolageGrotesque-Regular.ttf'),
    font('BricolageGrotesque-SemiBold.ttf'),
    font('BricolageGrotesque-ExtraBold.ttf'),
  ]);
  const { before, words } = HERO.title;
  const right = size.width - EDGE;

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: BLACK,
          backgroundImage: 'radial-gradient(ellipse 620px 420px at 600px -40px, rgba(242, 232, 214, 0.17), rgba(242, 232, 214, 0.05) 55%, rgba(10, 10, 12, 0) 100%)',
          color: IVORY,
          fontFamily: 'Bricolage',
        }}
      >
        <div style={{ position: 'absolute', left: EDGE, top: 0, width: 1, height: size.height, background: HAIR }} />
        <div style={{ position: 'absolute', left: right, top: 0, width: 1, height: size.height, background: HAIR }} />
        <div style={{ position: 'absolute', left: 0, top: TOP, width: size.width, height: 1, background: HAIR }} />
        <div style={{ position: 'absolute', left: 0, top: BOTTOM, width: size.width, height: 1, background: HAIR }} />
        <Cross x={EDGE} y={TOP} />
        <Cross x={right} y={TOP} />
        <Cross x={EDGE} y={BOTTOM} />
        <Cross x={right} y={BOTTOM} />

        <div style={{ position: 'absolute', left: EDGE + 28, top: 30, display: 'flex', fontSize: 30, letterSpacing: -0.8 }}>
          <span style={{ fontWeight: 800 }}>Admit</span>
          <span style={{ fontWeight: 400 }}>Labs</span>
        </div>

        <div style={{ position: 'absolute', left: 0, top: TOP, width: size.width, height: BOTTOM - TOP, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 600, lineHeight: 1, letterSpacing: -3.4 }}>
            {before} {words.discovered}, {words.trusted},
          </div>
          <div style={{ display: 'flex', marginTop: 4, fontSize: 78, fontWeight: 600, lineHeight: 1, letterSpacing: -3.4, color: FALLEN }}>
            and {words.chosen}.
          </div>
          <div style={{ display: 'flex', marginTop: 40, fontSize: 24, color: SLATE }}>{HERO.proof}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: regular, weight: 400, style: 'normal' },
        { name: 'Bricolage', data: semibold, weight: 600, style: 'normal' },
        { name: 'Bricolage', data: extrabold, weight: 800, style: 'normal' },
      ],
    },
  );
}
