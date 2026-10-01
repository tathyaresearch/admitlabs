// Our work: the content samples the home page shows once they are ready. Empty until then, and the
// section also waits for SITE_SETTINGS.showWork (src/config/site.ts). Images go in public/work/.

export interface WorkSample {
  /** Who it was for, without the client's name unless they agreed: "Private university, Pune". */
  client: string;
  /** Which service: Program Growth, Institution Branding or Admit Campaign. */
  service: string;
  title: string;
  /** One line on what changed, with where it was measured. */
  result: string;
  /** Under public/, like '/work/bba-page.jpg'. */
  image: string;
  imageAlt: string;
}

export const WORK_SAMPLES: readonly WorkSample[] = [];
