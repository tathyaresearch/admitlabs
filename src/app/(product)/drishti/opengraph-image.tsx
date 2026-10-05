// The link preview image for the product page (1200 by 630): the lockup with the Drishti eye
// (still and open), the headline on black, the last words in an ivory block, set in Bricolage
// Grotesque from the report's font files. Made with Next's built-in image tool, once at build.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { EYE_EM, eyeSvg } from '@/graphics/eye';

export const alt = 'Drishti by AdmitLabs. See where you stand, who’s ahead, and what students want.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BLACK = '#0A0A0C';
const IVORY = '#F2E8D6';
const SLATE = '#8A8D94';

const font = (file: string) => readFile(join(process.cwd(), 'src', 'report', 'fonts', file));

/**
 * "Drishti" is set at 40: the eye before it is 1.12 times that wide, its foot a touch below the
 * baseline. The image tool lines an image's foot up with the text's descender line instead, 0.25 em
 * below the baseline, so the eye is lifted by the difference.
 */
const NAME_SIZE = 40;
const EYE_LIFT = NAME_SIZE * (0.25 - EYE_EM.drop);
const EYE = `data:image/svg+xml;base64,${Buffer.from(eyeSvg({ lashes: true, color: IVORY })).toString('base64')}`;

export default async function Image() {
  const [regular, semibold, extrabold, narrow] = await Promise.all([
    font('BricolageGrotesque-Regular.ttf'),
    font('BricolageGrotesque-SemiBold.ttf'),
    font('BricolageGrotesque-ExtraBold.ttf'),
    font('BricolageGrotesque-SemiCondensedBold.ttf'),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: 72, background: BLACK, color: IVORY, fontFamily: 'Bricolage' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- an image inside the generated image, not a page */}
          <img
            src={EYE}
            width={NAME_SIZE * EYE_EM.width}
            height={NAME_SIZE * EYE_EM.lashes}
            alt=""
            style={{ position: 'relative', top: -EYE_LIFT, marginRight: NAME_SIZE * EYE_EM.gap - 14 }}
          />
          <span style={{ fontFamily: 'Bricolage Narrow', fontSize: NAME_SIZE, letterSpacing: -1 }}>Drishti</span>
          <span style={{ display: 'flex', fontSize: 25, color: SLATE }}>
            by&nbsp;<span style={{ color: IVORY, fontWeight: 800 }}>Admit</span>
            <span style={{ color: IVORY, fontWeight: 400 }}>Labs</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontSize: 84, fontWeight: 600, lineHeight: 1.02, letterSpacing: -3.5 }}>
          <div style={{ display: 'flex' }}>See where you stand,</div>
          <div style={{ display: 'flex' }}>who’s ahead, and what</div>
          <div style={{ display: 'flex' }}>
            <span style={{ background: IVORY, color: BLACK, padding: '0 12px', borderRadius: 6 }}>students want.</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 56, paddingTop: 22, borderTop: `1px solid #303237`, fontSize: 24, color: SLATE }}>
          <span>Audit  ·  Rivals  ·  Demand</span>
          <span>Every month.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: regular, weight: 400, style: 'normal' },
        { name: 'Bricolage', data: semibold, weight: 600, style: 'normal' },
        { name: 'Bricolage', data: extrabold, weight: 800, style: 'normal' },
        { name: 'Bricolage Narrow', data: narrow, weight: 700, style: 'normal' },
      ],
    },
  );
}
