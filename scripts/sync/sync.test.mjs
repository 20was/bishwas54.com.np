import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { normalizeDoc, seriesSlug } from './contract.mjs';
import {
  checkSeriesContiguity,
  emptyManifest,
  hashBody,
  nextManifest,
  planSync,
} from './core.mjs';
import { applyPlan, readManifest, writeManifest } from './apply.mjs';

const note = (
  fm,
  body = '# Lesson 07 — Routing\n\nRouting is how packets find their way between networks over many hops.',
) => `---\n${fm.trim()}\n---\n\n${body}\n`;

const PUBLISHABLE = `
id: net-foundations-07
publish: true
`;

describe('contract', () => {
  it('skips files without frontmatter', () => {
    const r = normalizeDoc('# Private scratch note\n\nstuff', 'a/b.md');
    expect(r.publishable).toBe(false);
    expect(r.reason).toBe('no frontmatter');
  });

  it('skips publish:false and missing publish regardless of folder', () => {
    for (const fm of ['publish: false\nid: x', 'id: x']) {
      expect(
        normalizeDoc(note(fm), 'networking-lab/01-foundations/07-routing.md')
          .publishable,
      ).toBe(false);
    }
  });

  it('skips draft/private statuses even with publish:true', () => {
    const r = normalizeDoc(
      note(`${PUBLISHABLE}status: draft`),
      'x/07-routing.md',
    );
    expect(r.publishable).toBe(false);
    expect(r.reason).toBe('status is draft');
  });

  it('requires id, title, body for publishable docs', () => {
    const noId = normalizeDoc(note('publish: true'), 'x/07-routing.md');
    expect(noId.errors?.join()).toMatch(/requires an id/);
    const noBody = normalizeDoc(
      note(PUBLISHABLE, '# Title only'),
      'x/07-routing.md',
    );
    expect(noBody.errors?.join()).toMatch(/body is empty/);
  });

  it('series lesson gets a nested route, standalone a flat one', () => {
    const inSeries = normalizeDoc(
      note(PUBLISHABLE),
      'networking-lab/01-foundations/07-routing.md',
    );
    expect(inSeries.doc.route).toBe('devops-networking/routing');
    expect(inSeries.doc.series).toEqual({
      name: 'DevOps Networking',
      order: 7,
    });

    const standalone = normalizeDoc(note(PUBLISHABLE), 'essays/routing.md');
    expect(standalone.doc.series).toBeUndefined();
    expect(standalone.doc.route).toBe('routing');
  });

  it('seriesSlug is deterministic and URL-safe', () => {
    expect(seriesSlug('DevOps Networking — AWS')).toBe('devops-networking-aws');
    expect(seriesSlug('DevOps Networking')).toBe('devops-networking');
  });

  it('explicit frontmatter overrides derived values and is flagged explicit', () => {
    const r = normalizeDoc(
      note(
        `${PUBLISHABLE}slug: packet-routing\ntitle: Routing\ndescription: How routers pick paths.\ntags: [networking]`,
      ),
      'anywhere/at/all.md',
    );
    expect(r.doc.slug).toBe('packet-routing');
    expect(r.doc.explicit.description).toBe(true);
    expect(r.doc.explicit.level).toBe(false);
  });

  it('rejects non-sync-enabled collections and unknown types with actionable messages', () => {
    const badCollection = normalizeDoc(
      note(`${PUBLISHABLE}collection: notes`),
      'x/07-routing.md',
    );
    expect(badCollection.errors?.join()).toMatch(/not sync-enabled/);
    const badType = normalizeDoc(
      note(`${PUBLISHABLE}type: podcast`),
      'x/07-routing.md',
    );
    expect(badType.errors?.join()).toMatch(/invalid type/);
  });

  it('rejects path-traversal-shaped slugs and ids', () => {
    const r = normalizeDoc(
      note(`id: net-1\npublish: true\nslug: ../../evil`),
      'x/07-routing.md',
    );
    expect(r.errors?.join()).toMatch(/slug/);
    const r2 = normalizeDoc(
      note(`id: ../evil\npublish: true`),
      'x/07-routing.md',
    );
    expect(r2.errors?.join()).toMatch(/id/);
  });
});

const doc = (over = {}) => {
  const base = {
    id: 'net-foundations-07',
    status: 'published',
    type: 'tutorial',
    collection: 'tutorials',
    slug: 'routing',
    title: 'Routing',
    description: 'How routers pick paths.',
    tags: ['networking'],
    series: { name: 'DevOps Networking', order: 1 },
    sourcePath: 'networking-lab/01-foundations/07-routing.md',
    body: 'Routing body.',
    explicit: {
      title: false,
      description: false,
      tags: false,
      level: false,
      series: false,
    },
    ...over,
  };
  base.route =
    over.route ??
    (base.series ? `${seriesSlug(base.series.name)}/${base.slug}` : base.slug);
  base.bodyHash = hashBody(base.body);
  return base;
};

const manifestWith = (...docs) => ({
  ...emptyManifest(),
  documents: Object.fromEntries(
    docs.map((d) => [
      d.id,
      {
        sourcePath: d.sourcePath,
        targetPath: `src/content/tutorials/${d.route}.mdx`,
        collection: d.collection,
        slug: d.slug,
        route: d.route,
        bodyHash: hashBody(d.body),
        status: d.status,
      },
    ]),
  ),
});

describe('planSync', () => {
  it('new id → create; same id+body → unchanged (idempotent)', () => {
    const d = doc();
    expect(planSync([d], emptyManifest()).creates).toHaveLength(1);
    const again = planSync([d], manifestWith(d));
    expect(again.creates).toHaveLength(0);
    expect(again.unchanged).toHaveLength(1);
  });

  it('body change → update; folder move alone → move, no duplicate', () => {
    const d = doc();
    const m = manifestWith(d);
    expect(planSync([doc({ body: 'body v2' })], m).updates).toHaveLength(1);
    const moved = planSync([doc({ sourcePath: 'platform/routing.md' })], m);
    expect(moved.moves).toHaveLength(1);
    expect(moved.creates).toHaveLength(0);
  });

  it('slug change on published id → frozen-route error', () => {
    const plan = planSync([doc({ slug: 'ip-routing' })], manifestWith(doc()));
    expect(plan.errors.join()).toMatch(/frozen/);
  });

  it('series/order change that alters the route → frozen-route error', () => {
    const demoted = doc({ series: undefined });
    const plan = planSync([demoted], manifestWith(doc()));
    expect(plan.errors.join()).toMatch(/frozen/);
  });

  it('duplicate ids and duplicate routes → errors', () => {
    const a = doc();
    expect(
      planSync(
        [a, doc({ sourcePath: 'other.md' })],
        emptyManifest(),
      ).errors.join(),
    ).toMatch(/duplicate id/);
    expect(
      planSync(
        [a, doc({ id: 'net-2', sourcePath: 'other.md' })],
        emptyManifest(),
      ).errors.join(),
    ).toMatch(/duplicate route/);
  });

  it('route claimed by different published id → error', () => {
    const plan = planSync([doc({ id: 'net-new' })], manifestWith(doc()));
    expect(plan.errors.join()).toMatch(/already belongs to published id/);
  });

  it('standalone slug colliding with a series landing segment → error', () => {
    const lesson = doc();
    const standalone = doc({
      id: 'essay-1',
      slug: 'devops-networking',
      series: undefined,
      sourcePath: 'essays/devops-networking.md',
    });
    const plan = planSync([lesson, standalone], emptyManifest());
    expect(plan.errors.join()).toMatch(
      /both a standalone post and a series landing/,
    );
  });

  it('series with a gap (1 and 3, no 2) → contiguity error naming the hole', () => {
    const one = doc({
      id: 'a',
      slug: 'l1',
      series: { name: 'S', order: 1 },
      sourcePath: 's/1.md',
    });
    const three = doc({
      id: 'c',
      slug: 'l3',
      series: { name: 'S', order: 3 },
      sourcePath: 's/3.md',
    });
    const plan = planSync([one, three], emptyManifest());
    expect(plan.errors.join()).toMatch(/missing part\(s\): 2/);
    expect(checkSeriesContiguity([one, three])).toHaveLength(1);
    expect(
      checkSeriesContiguity([
        one,
        doc({
          id: 'b',
          slug: 'l2',
          series: { name: 'S', order: 2 },
          sourcePath: 's/2.md',
        }),
      ]),
    ).toHaveLength(0);
  });

  it('duplicate order in a series → contiguity error', () => {
    const a = doc({
      id: 'a',
      slug: 'l1',
      series: { name: 'S', order: 1 },
      sourcePath: 's/1.md',
    });
    const b = doc({
      id: 'b',
      slug: 'l1b',
      series: { name: 'S', order: 1 },
      sourcePath: 's/1b.md',
    });
    expect(planSync([a, b], emptyManifest()).errors.join()).toMatch(
      /duplicate order/,
    );
  });

  it('vanished/unpublished doc → proposed archive, never silent delete', () => {
    const plan = planSync([], manifestWith(doc()));
    expect(plan.proposedArchives).toHaveLength(1);
    const after = nextManifest(manifestWith(doc()), plan, {});
    expect(after.documents['net-foundations-07'].status).toBe('published');
    const archived = nextManifest(manifestWith(doc()), plan, {
      applyArchives: true,
    });
    expect(archived.documents['net-foundations-07'].status).toBe('archived');
  });

  it('nextManifest keeps previousRoutes from a prior migration', () => {
    const d = doc();
    const m = manifestWith(d);
    m.documents[d.id].previousRoutes = ['routing'];
    const after = nextManifest(m, planSync([d], m), {});
    expect(after.documents[d.id].previousRoutes).toEqual(['routing']);
    expect(after.documents[d.id].route).toBe('devops-networking/routing');
  });
});

describe('applyPlan', () => {
  let root;
  const TARGET = 'src/content/tutorials/devops-networking/routing.mdx';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sync-test-'));
    await mkdir(join(root, 'src/content/tutorials'), { recursive: true });
  });

  it('create writes into the series subdirectory; rerun is a no-op', async () => {
    const d = doc();
    const plan = planSync([d], emptyManifest());
    await applyPlan(plan, emptyManifest(), { root });
    await writeManifest(root, nextManifest(emptyManifest(), plan, {}));
    const first = await readFile(join(root, TARGET), 'utf8');
    expect(first).toMatch(/sourceId: net-foundations-07/);
    expect(first).toMatch(/Routing body\./);

    const manifest = await readManifest(root);
    const rerun = planSync([d], manifest);
    expect(rerun.unchanged).toHaveLength(1);
    expect(
      rerun.creates.length + rerun.updates.length + rerun.moves.length,
    ).toBe(0);
  });

  it('update replaces body, stamps dateUpdated, preserves site-curated frontmatter', async () => {
    const d = doc();
    const plan = planSync([d], emptyManifest());
    await applyPlan(plan, emptyManifest(), { root });
    const manifest = nextManifest(emptyManifest(), plan, {});

    const file = join(root, TARGET);
    const curated = (await readFile(file, 'utf8')).replace(
      'description: How routers pick paths.',
      'description: Curated on site.',
    );
    await writeFile(file, curated);

    const v2 = doc({ body: 'Routing body v2.' });
    await applyPlan(planSync([v2], manifest), manifest, { root });
    const after = await readFile(file, 'utf8');
    expect(after).toMatch(/Routing body v2\./);
    expect(after).toMatch(/description: Curated on site\./);
    expect(after).toMatch(/dateUpdated:/);
  });

  it('explicit source description overrides site curation', async () => {
    const d = doc();
    const plan = planSync([d], emptyManifest());
    await applyPlan(plan, emptyManifest(), { root });
    const manifest = nextManifest(emptyManifest(), plan, {});
    const v2 = doc({
      body: 'v2',
      description: 'Author truth.',
      explicit: { ...d.explicit, description: true },
    });
    await applyPlan(planSync([v2], manifest), manifest, { root });
    const after = await readFile(join(root, TARGET), 'utf8');
    expect(after).toMatch(/description: Author truth\./);
  });

  it('refuses to overwrite a manual (untracked) file with the same route', async () => {
    await mkdir(join(root, 'src/content/tutorials/devops-networking'), {
      recursive: true,
    });
    await writeFile(
      join(root, TARGET),
      '---\ntitle: Hand-written\n---\n\nManual content.\n',
    );
    const plan = planSync([doc()], emptyManifest());
    await expect(applyPlan(plan, emptyManifest(), { root })).rejects.toThrow(
      /manual file/,
    );
  });

  it('refuses cross-id overwrite even when sync-tracked', async () => {
    await mkdir(join(root, 'src/content/tutorials/devops-networking'), {
      recursive: true,
    });
    await writeFile(
      join(root, TARGET),
      '---\ntitle: Other\nsourceId: net-other\n---\n\nBody.\n',
    );
    const plan = planSync([doc()], emptyManifest());
    await expect(applyPlan(plan, emptyManifest(), { root })).rejects.toThrow(
      /collision/,
    );
  });

  it('archive flips archived:true and keeps the page', async () => {
    const d = doc();
    const plan = planSync([d], emptyManifest());
    await applyPlan(plan, emptyManifest(), { root });
    const manifest = nextManifest(emptyManifest(), plan, {});
    const gone = planSync([], manifest);
    await applyPlan(gone, manifest, { root, applyArchives: true });
    const after = await readFile(join(root, TARGET), 'utf8');
    expect(after).toMatch(/archived: true/);
    expect(after).toMatch(/Routing body\./);
  });

  it('dry run writes nothing', async () => {
    const plan = planSync([doc()], emptyManifest());
    await applyPlan(plan, emptyManifest(), { root, dryRun: true });
    await expect(readFile(join(root, TARGET), 'utf8')).rejects.toThrow();
  });
});
