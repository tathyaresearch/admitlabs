// The website's home page below the system: services, Drishti (with the product page's own feature
// tiles and pictures), who we work with, our work (hidden until the samples are ready), how we
// work, Tathya for students, the FAQ and the final call.

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { AuditPicture, DemandPicture, RivalsPicture, SAMPLE_CAPTION } from '@/components/product/Previews';
import { FeatureTile, featureOf } from '@/components/product/Sections';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SITE_SETTINGS } from '@/config/site';
import { appLink } from '@/lib/urls';
import type { Showcase } from '@/product/showcase';
import { AUDIENCE, CTA, DRISHTI, FAQ, FINAL, HOW, SERVICES, TATHYA, WORK, type ServiceKey } from '@/site/content';
import { WORK_SAMPLES } from '@/site/work';
import { ServicePicture } from './ServicePictures';
import product from '@/components/product/product.module.css';
import sections from './sections.module.css';
import site from './site.module.css';

const SERVICE_ICONS: Readonly<Record<ServiceKey, IconName>> = {
  'program-growth': 'webPage',
  'institution-branding': 'institution',
  'admit-campaign': 'stopwatch',
};

function Head({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: string }) {
  return (
    <div className={sections.head}>
      <p className={site.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={sections.title}>
        {title}
      </h2>
      {lede ? <p className={sections.lede}>{lede}</p> : null}
    </div>
  );
}

export function Services() {
  return (
    <section id="services" className={sections.section} data-theme="dark" aria-labelledby="services-title">
      <div className={site.container}>
        <Head id="services-title" eyebrow={SERVICES.eyebrow} title={SERVICES.title} />
        <ul className={sections.services}>
          {SERVICES.items.map((service) => (
            <li key={service.key} className={`${sections.service} ${sections.reveal}`} data-theme="light">
              <div className={sections.serviceHead}>
                <span className={sections.serviceIcon} aria-hidden="true">
                  <Icon name={SERVICE_ICONS[service.key]} size={22} />
                </span>
                <h3 className={sections.serviceName}>{service.name}</h3>
              </div>
              <p className={sections.serviceLine}>{service.line}</p>
              <div className={sections.servicePicture} data-theme="dark" aria-hidden="true">
                <ServicePicture service={service.key} />
              </div>
              <Link href={`${CTA.enquiryPath}?about=${service.key}`} className={sections.serviceLink}>
                {SERVICES.link}
                <span className="visually-hidden">, about {service.name}</span>
                <Icon name="arrowRight" size={16} />
              </Link>
            </li>
          ))}
        </ul>
        <p className={sections.servicesNote}>
          <Icon name="check" size={20} />
          {SERVICES.note}
        </p>
      </div>
    </section>
  );
}

export function DrishtiSection({ showcase }: { showcase: Showcase }) {
  return (
    <section id="drishti" className={`${sections.section} ${sections.ruled}`} data-theme="dark" aria-labelledby="drishti-title">
      <div className={site.container}>
        <Head id="drishti-title" eyebrow={DRISHTI.eyebrow} title={DRISHTI.title} lede={DRISHTI.lede} />
        <ul className={sections.stats}>
          {DRISHTI.stats.map((stat) => (
            <li key={stat.label} className={`${sections.stat} ${sections.reveal}`}>
              {/* Counts up from 0 as it comes into view; the number is read out once, with its label. */}
              <span className={`${sections.statNumber} num`} style={{ ['--to' as string]: stat.value } as CSSProperties} aria-hidden="true" />
              <span className={sections.statLabel}>
                <span className="visually-hidden">{stat.value} </span>
                {stat.label}
              </span>
            </li>
          ))}
        </ul>
        <div className={product.bento}>
          <FeatureTile feature={featureOf('audit')} className={product.featureWide}>
            <AuditPicture showcase={showcase} />
          </FeatureTile>
          <FeatureTile feature={featureOf('rivals')}>
            <RivalsPicture showcase={showcase} />
          </FeatureTile>
          <FeatureTile feature={featureOf('demand')}>
            <DemandPicture showcase={showcase} />
          </FeatureTile>
        </div>
        <div className={sections.drishtiFoot}>
          <p className={sections.free}>{DRISHTI.free}</p>
          <div className={sections.actions}>
            <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
              {CTA.primary}
            </ButtonLink>
            {/* A full page load: the product page arrives with its own styles, exactly as it loads anywhere. */}
            <AnchorButton href={DRISHTI.explorePath} variant="secondary" size="lg">
              {DRISHTI.explore}
            </AnchorButton>
          </div>
        </div>
        <p className={sections.caption}>{SAMPLE_CAPTION}</p>
      </div>
    </section>
  );
}

export function Audience() {
  return (
    <section id="who" className={sections.section} data-theme="light" aria-labelledby="who-title">
      <div className={site.container}>
        <h2 id="who-title" className={site.eyebrow}>
          {AUDIENCE.eyebrow}
        </h2>
        <ul className={sections.audienceLines}>
          {AUDIENCE.lines.map((line) => (
            <li key={line} className={sections.audienceLine}>
              {line}
            </li>
          ))}
        </ul>
        <p className={sections.audiencePrograms}>{AUDIENCE.programs}</p>
      </div>
    </section>
  );
}

/** Built, and shown only once SITE_SETTINGS.showWork is on and the samples are in src/site/work.ts. */
export function OurWork() {
  if (!SITE_SETTINGS.showWork || WORK_SAMPLES.length === 0) return null;
  return (
    <section id="work" className={sections.section} data-theme="dark" aria-labelledby="work-title">
      <div className={site.container}>
        <Head id="work-title" eyebrow={WORK.eyebrow} title={WORK.title} />
        <ul className={sections.work}>
          {WORK_SAMPLES.map((sample) => (
            <li key={sample.title} className={`${sections.workItem} ${sections.reveal}`}>
              <Image src={sample.image} alt={sample.imageAlt} width={800} height={1000} className={sections.workImage} />
              <p className={sections.workMeta}>
                {sample.service}, {sample.client}
              </p>
              <h3 className={sections.workTitle}>{sample.title}</h3>
              <p className={sections.workResult}>{sample.result}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowWeWork() {
  return (
    <section id="how" className={sections.section} data-theme="dark" aria-labelledby="how-title">
      <div className={site.container}>
        <Head id="how-title" eyebrow={HOW.eyebrow} title={HOW.title} />
        <div className={sections.how}>
          <span className={sections.howTrack} aria-hidden="true">
            <span className={sections.howFill} />
          </span>
          <ol className={sections.howSteps}>
            {HOW.steps.map((step, index) => (
              <li key={step.name} className={sections.howStep}>
                <span className={`${sections.howNumber} num`} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={sections.howName}>{step.name}</h3>
                <p className={sections.howLine}>{step.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Tathya() {
  return (
    <section className={`${sections.section} ${sections.tathyaSection}`} data-theme="dark" aria-labelledby="tathya-title">
      <div className={site.container}>
        <div className={sections.tathya}>
          <div>
            <p className={site.eyebrow}>{TATHYA.eyebrow}</p>
            <h2 id="tathya-title" className={sections.tathyaName}>
              {TATHYA.name}
            </h2>
            <p className={sections.tathyaLine}>{TATHYA.line}</p>
          </div>
          {SITE_SETTINGS.tathyaUrl ? (
            <AnchorButton href={SITE_SETTINGS.tathyaUrl} variant="secondary" iconAfter="external" target="_blank" rel="noreferrer">
              {TATHYA.link}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </AnchorButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className={`${sections.section} ${sections.ruled}`} data-theme="dark" aria-labelledby="faq-title">
      <div className={`${site.container} ${sections.faqGrid}`}>
        <div className={sections.head}>
          <p className={site.eyebrow}>{FAQ.eyebrow}</p>
          <h2 id="faq-title" className={sections.title}>
            {FAQ.title}
          </h2>
          <p className={sections.lede}>
            {FAQ.more} <a href={`mailto:${SITE_SETTINGS.email}`}>{SITE_SETTINGS.email}</a>.
          </p>
        </div>
        <div className={sections.faqList}>
          {FAQ.items.map((item) => (
            <details key={item.question} className={sections.faqItem}>
              <summary className={sections.faqQuestion}>
                {item.question}
                <Icon name="plus" size={18} />
              </summary>
              <p className={sections.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCall() {
  return (
    <section className={`${sections.section} ${sections.final}`} data-theme="light" aria-labelledby="final-title">
      <div className={`${site.container} ${sections.finalInner}`}>
        <h2 id="final-title" className={sections.finalTitle}>
          {FINAL.title}
        </h2>
        <p className={sections.finalLine}>{FINAL.line}</p>
        <div className={sections.actions}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
            {CTA.primary}
          </ButtonLink>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="lg">
            {CTA.secondary}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
