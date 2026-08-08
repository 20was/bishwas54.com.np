const SITE = 'https://bishwas54.com.np';
const AUTHOR_NAME = 'Bishwas Adhikari';

/** The surviving useful schema types for a content site (2026):
 *  Article, BreadcrumbList, Person, ProfilePage, WebSite.
 *  Deliberately no FAQPage/HowTo/Quiz — removed from Google rich results. */

export function personJsonLd() {
  return {
    '@type': 'Person',
    '@id': `${SITE}/#person`,
    name: AUTHOR_NAME,
    url: `${SITE}/about/`,
    jobTitle: 'Software & Platform Engineer',
    sameAs: ['https://github.com/20was'],
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: AUTHOR_NAME,
    url: `${SITE}/`,
    description: 'Beginner-friendly notes and tutorials by Bishwas Adhikari.',
    publisher: { '@id': `${SITE}/#person` },
  };
}

export function profilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: { ...personJsonLd(), '@context': undefined },
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  datePublished: Date;
  dateUpdated?: Date | undefined;
  tags?: string[];
  image?: string | undefined;
}

export function articleJsonLd(input: ArticleInput) {
  const url = `${SITE}${input.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    datePublished: input.datePublished.toISOString(),
    ...(input.dateUpdated && {
      dateModified: input.dateUpdated.toISOString(),
    }),
    ...(input.tags?.length && { keywords: input.tags.join(', ') }),
    ...(input.image && { image: `${SITE}${input.image}` }),
    author: personJsonLd(),
    inLanguage: 'en',
  };
}

export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE}${crumb.path}`,
    })),
  };
}
