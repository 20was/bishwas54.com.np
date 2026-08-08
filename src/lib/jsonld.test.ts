import { describe, expect, it } from 'vitest';
import { articleJsonLd, breadcrumbJsonLd, webSiteJsonLd } from './jsonld';

describe('articleJsonLd', () => {
  const base = {
    title: 'What is Git, actually?',
    description: 'Git explained from zero.',
    path: '/tutorials/what-is-git/',
    datePublished: new Date('2026-08-08'),
  };

  it('builds absolute URLs', () => {
    const result = articleJsonLd(base);
    expect(result.url).toBe('https://bishwas54.com.np/tutorials/what-is-git/');
    expect(result.mainEntityOfPage).toBe(result.url);
  });

  it('omits dateModified when there is no update', () => {
    expect(articleJsonLd(base)).not.toHaveProperty('dateModified');
  });

  it('includes dateModified when updated', () => {
    const result = articleJsonLd({
      ...base,
      dateUpdated: new Date('2026-09-01'),
    });
    expect(result.dateModified).toContain('2026-09-01');
  });

  it('names the author', () => {
    expect(articleJsonLd(base).author.name).toBe('Bishwas Adhikari');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from 1', () => {
    const result = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Tutorials', path: '/tutorials/' },
    ]);
    expect(result.itemListElement[0]!.position).toBe(1);
    expect(result.itemListElement[1]!.position).toBe(2);
    expect(result.itemListElement[1]!.item).toBe(
      'https://bishwas54.com.np/tutorials/',
    );
  });
});

describe('webSiteJsonLd', () => {
  it('links the publisher to the person id', () => {
    expect(webSiteJsonLd().publisher['@id']).toBe(
      'https://bishwas54.com.np/#person',
    );
  });
});
