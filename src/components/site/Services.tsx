// Services, on black: three chapters, each laid out its own way around what that service makes.
// Program Growth beside a program's page; Institution Branding on a stage of phones; Admit
// Campaign beside its season. Each links to the enquiry form with the service already named.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { CTA, SERVICES, type ServiceKey } from '@/site/content';
import { ProgramPicture, SeasonPicture, SocialPicture } from './ServicePictures';
import styles from './services.module.css';
import site from './site.module.css';

const PICTURES: Readonly<Record<ServiceKey, () => React.JSX.Element>> = {
  'program-growth': ProgramPicture,
  'institution-branding': SocialPicture,
  'admit-campaign': SeasonPicture,
};

export function Services() {
  return (
    <section id="services" className={`${styles.services} ${site.grain}`} data-theme="dark" aria-labelledby="services-title">
      <div className={site.container}>
        <div className={`${styles.head} ${site.reveal}`}>
          <h2 id="services-title" className={`${site.title} ${site.titleLight}`}>
            {SERVICES.title}
          </h2>
          <p className={styles.note}>
            <Icon name="check" size={18} />
            {SERVICES.note}
          </p>
        </div>
        {SERVICES.items.map((service) => {
          const Picture = PICTURES[service.key];
          return (
            <article key={service.key} className={`${styles.chapter} ${styles[service.key]}`} aria-labelledby={`service-${service.key}`}>
              <div className={`${styles.words} ${site.reveal}`}>
                <h3 id={`service-${service.key}`} className={styles.name}>
                  {service.name}
                </h3>
                <p className={styles.line}>{service.line}</p>
                <Link href={`${CTA.enquiryPath}?about=${service.key}`} className={site.arrowLink}>
                  {SERVICES.link}
                  <span className="visually-hidden">, about {service.name}</span>
                  <Icon name="arrowRight" size={16} />
                </Link>
              </div>
              <div className={`${styles.picture} ${site.reveal}`}>
                <Picture />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
