# bishwas54.com.np

The personal learning notebook of Bishwas Adhikari — beginner-friendly tutorials and notes on whatever I'm learning, written so anyone can follow along. Every tutorial ends with a small practice quiz.

Built with [Astro](https://astro.build), deployed on Cloudflare Workers static assets.

## Develop

```sh
npm install
npm run dev
```

## Quality checks

```sh
npm run check        # types
npm run lint         # eslint
npm run format:check # prettier
npm run build        # static build (content schema validation happens here)
```

All checks run in CI and block merge.
