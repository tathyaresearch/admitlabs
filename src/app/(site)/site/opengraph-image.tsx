// The website's link preview image (1200 by 630): the headline on black, its three words in ivory,
// beside the hero's ivory Audit card of the sample institution (the same scores, from the sample
// world). Bricolage Grotesque for words and Inter for the numbers, from the report's font files.
// Made with Next's built-in image tool, once at build.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { bandStarts } from '@/domain/scores';
import { PILLAR_LABELS, PILLARS } from '@/domain/types';
import { SCORE_GAUGE, scoreGauge } from '@/graphics/gauge';
import { loadShowcase } from '@/product/showcase';

export const alt = 'AdmitLabs. Get discovered, trusted, and chosen. A sample Drishti Audit beside the headline.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BLACK = '#0A0A0C';
const IVORY = '#F2E8D6';
const SLATE = '#8A8D94';
const LINE = '#E2D9CA';
const TRACK = '#E5DCCE';
const MUTED = '#5E6066';

/** The gauge, drawn larger than on the page. */
const GAUGE_WIDTH = 300;
const SCALE = GAUGE_WIDTH / SCORE_GAUGE.width;
const GAUGE_HEIGHT = Math.round(SCORE_GAUGE.height * SCALE);

const font = (file: string) => readFile(join(process.cwd(), 'src', 'report', 'fonts', file));

export default async function Image() {
  const [regular, semibold, extrabold, interSemibold, showcase] = await Promise.all([
    font('BricolageGrotesque-Regular.ttf'),
    font('BricolageGrotesque-SemiBold.ttf'),
    font('BricolageGrotesque-ExtraBold.ttf'),
    font('Inter-SemiBold.ttf'),
    loadShowcase(),
  ]);
  const { scores, label } = showcase.audit;
  const shape = scoreGauge(scores.overall, bandStarts());
  const end = (x: number) => Math.round(x * SCALE);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', padding: '60px 72px', gap: 56, background: BLACK, color: IVORY, fontFamily: 'Bricolage' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 36, letterSpacing: -1 }}>
            <span style={{ fontWeight: 800 }}>Admit</span>
            <span style={{ fontWeight: 400 }}>Labs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontSize: 80, fontWeight: 600, lineHeight: 1.02, letterSpacing: -3.2 }}>
            <div style={{ display: 'flex' }}>
              <span style={{ color: SLATE }}>Get</span>&nbsp;discovered,
            </div>
            <div style={{ display: 'flex' }}>
              trusted,&nbsp;<span style={{ color: SLATE }}>and</span>
            </div>
            <div style={{ display: 'flex' }}>chosen.</div>
          </div>
          <div style={{ display: 'flex', marginTop: 36, paddingTop: 22, borderTop: '1px solid #303237', fontSize: 24, color: SLATE }}>
            Measure. Fix. Repeat. Every month.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 400, padding: 30, borderRadius: 24, background: IVORY, color: BLACK }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, letterSpacing: 2.4 }}>
            <span>DRISHTI AUDIT</span>
            <span style={{ color: MUTED }}>SAMPLE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', position: 'relative', width: GAUGE_WIDTH, height: GAUGE_HEIGHT + 24 }}>
              <svg width={GAUGE_WIDTH} height={GAUGE_HEIGHT} viewBox={`0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}`}>
                <path d={shape.track} fill="none" stroke={TRACK} strokeWidth={SCORE_GAUGE.stroke} />
                {shape.value ? <path d={shape.value} fill="none" stroke={BLACK} strokeWidth={SCORE_GAUGE.stroke} /> : null}
                {shape.notches.map((notch) => (
                  <line key={`${notch.x1}-${notch.y1}`} {...notch} stroke={MUTED} strokeWidth={1.5} />
                ))}
              </svg>
              {/* Bottoms aligned, then "/100" lifted onto the score's baseline (Inter's descent at each size). */}
              <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: GAUGE_HEIGHT - 82, justifyContent: 'center', alignItems: 'flex-end', fontFamily: 'Inter', fontWeight: 600 }}>
                <span style={{ fontSize: 80, lineHeight: 1, letterSpacing: -3 }}>{scores.overall}</span>
                <span style={{ paddingBottom: 6, fontSize: 20, lineHeight: 1.2, color: MUTED }}>/100</span>
              </div>
              <span style={{ position: 'absolute', top: GAUGE_HEIGHT + 2, left: end(shape.ends.zero[0]) - 10, width: 20, display: 'flex', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: 15, color: MUTED }}>0</span>
              <span style={{ position: 'absolute', top: GAUGE_HEIGHT + 2, left: end(shape.ends.hundred[0]) - 20, width: 40, display: 'flex', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: 15, color: MUTED }}>100</span>
            </div>
            <span style={{ display: 'flex', marginTop: 2, padding: '4px 12px', borderRadius: 4, background: BLACK, color: IVORY, fontSize: 17, fontWeight: 600 }}>{label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PILLARS.map((pillar, index) => (
              <div key={pillar} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 46, borderTop: index ? `1px solid ${LINE}` : 'none' }}>
                <span style={{ width: 118, fontSize: 20, fontWeight: 600 }}>{PILLAR_LABELS[pillar]}</span>
                <div style={{ display: 'flex', flex: 1, height: 7, borderRadius: 4, background: TRACK }}>
                  <div style={{ width: `${scores[pillar]}%`, height: 7, borderRadius: 4, background: BLACK }} />
                </div>
                <span style={{ display: 'flex', justifyContent: 'flex-end', width: 36, fontFamily: 'Inter', fontWeight: 600, fontSize: 22 }}>{scores[pillar]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: regular, weight: 400, style: 'normal' },
        { name: 'Bricolage', data: semibold, weight: 600, style: 'normal' },
        { name: 'Bricolage', data: extrabold, weight: 800, style: 'normal' },
        { name: 'Inter', data: interSemibold, weight: 600, style: 'normal' },
      ],
    },
  );
}
