# Magic Eight Ball

A toy Magic 8-Ball website. Your question is sent to [Jev](https://docs.typesafe.ai), TypeSafe's System One decision model, as a `choice` question over the 20 classic eight-ball replies. Jev returns a probability distribution over the replies, and the ball samples from it so answers stay a little unpredictable.

## Run locally

```sh
export TYPESAFE_API_KEY=...   # from typesafe.ai
npm start
# open http://localhost:3000
```

Without a key the ball still works, it just picks a reply at random and shows an "offline" badge.

## How it works

- `server.js` serves `public/` and proxies `POST /api/ask` to `https://api.typesafe.ai/v1/systemone` so the API key stays server-side.
- `answers.js` holds the 20 replies plus the criteria Jev scores each one against.
- `public/` is the animated ball: shake, blue liquid swirl, triangle reveal. No frameworks.

## Deploy

Any Node 20+ host works. On Railway, set `TYPESAFE_API_KEY` in the service variables; the start command is `npm start`.
