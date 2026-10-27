# My AI Assistant

A Next.js chat app configured for deployment on Netlify, with streaming OpenAI replies.

## Development

Use Node.js 22 or newer and run `npm ci`. Start the app with `netlify dev --port 8889` to use Netlify's local environment and AI Gateway integration. Run `npm run typecheck` to check TypeScript.

## Deployment

Netlify reads `netlify.toml`, runs the Next.js build, and publishes `.next` using its automatic Next.js adapter. The adapter serves both the home page and the `/api/chat` server route. Do not deploy the raw source directory as a static site.

Chat uses the official OpenAI SDK and the `gpt-4o-mini` model. Netlify AI Gateway supplies the server-side credentials and base URL on a credit-based Netlify plan. Existing OpenAI environment settings take precedence if configured. No credentials are sent to the browser.

Conversations last for the current page session. Errors appear above the composer, and failed requests restore your question so you can retry.
