# Gemini Frontend Clone

A responsive AI chat interface built with React, TypeScript, and Vite. The frontend connects to the existing FastAPI backend in [gemini-backend-clone](https://github.com/faizansaiyed123/gemini-backend-clone); it does not change or duplicate backend code.

## Features

- OTP sign-in, account creation, and OTP-assisted password recovery
- Searchable conversation history, chatroom creation, and conversation reloads
- Asynchronous AI reply polling for the backend's Redis queue/worker flow
- Account details, password change, plan status, and Stripe Checkout redirect
- Light/dark theme, responsive mobile sidebar, loading and error states
- Accessible labels, keyboard send shortcut (Enter), and multiline composer (Shift+Enter)

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

By default the app uses the backend URL referenced by the backend repository's Postman environment:

`https://gemini-backend-q94y.onrender.com`

Set `VITE_API_BASE_URL` in `.env` to point at another backend. Restart the Vite dev server after changing environment variables.

To create and preview a production build:

```bash
npm run build
npm run preview
```

## Deployment (Vercel or another static host)

1. Import this repository into your hosting provider.
2. Use the Vite preset, build command `npm run build`, and output directory `dist`.
3. Set the build environment variable `VITE_API_BASE_URL` to the deployed backend origin (no trailing slash).
4. Deploy the app and test account creation, OTP sign-in, chat history, and sending a message.

A `vercel.json` rewrite is included so browser navigation to frontend paths such as `/payment/success` falls back to the SPA entry point.

### Stripe return URLs

The backend builds its Checkout return URLs from its own `FRONTEND_URL` setting. In the backend hosting dashboard, set `FRONTEND_URL` to the final frontend origin (for example, `https://your-app.vercel.app`, without a trailing slash). Configure Stripe's webhook to reach the backend's `/subscribe/webhook/stripe` endpoint. This frontend only redirects to the backend-provided `checkout_url`; payment completion and subscription activation remain backend responsibilities.

## Backend contract used by this UI

The API returns most successful responses as `{ code, data, message, status }`; the client unwraps `data` and checks HTTP and envelope errors.

| Feature | Endpoint |
| --- | --- |
| Create account | `POST /auth/signup` |
| Request sign-in OTP | `POST /auth/send-otp` |
| Verify OTP / obtain token | `POST /auth/verify-otp` |
| Request recovery OTP | `POST /auth/forgot-password` |
| Change password | `POST /auth/change-password` |
| Reset password after verification | `POST /auth/reset-password` |
| Current user | `GET /user/user/me` |
| List / create chats | `GET/POST /ChatRoom/chatroom` |
| Conversation with messages | `GET /ChatRoom/chatroom/{chatroom_id}` |
| Send message | `POST /message/{chatroom_id}/message` |
| Start Stripe Checkout | `POST /subscribe/pro` |
| Subscription tier | `GET /subscribe/subscription/status` |

The path casing is intentional: the backend mounts chatroom routes beneath `/ChatRoom`.

## Notes about the current backend

- Although this repository is branded as a Gemini clone, the backend README and worker currently use OpenAI `gpt-3.5-turbo` to generate assistant replies. The frontend does not call Gemini directly.
- The current backend mocks OTP delivery and returns the OTP in the API response. The UI surfaces that response as a **test code** so the current flow can be exercised. Replace that behavior with real, secure OTP delivery before production use.
- Basic accounts are limited by the backend to five messages per day; the frontend reads the subscription tier from the API and opens the backend-provided Stripe Checkout URL when upgrading.
- The backend must be deployed and configured with its database, Upstash Redis, OpenAI, and Stripe settings. A frontend deployment alone cannot make those services available.
