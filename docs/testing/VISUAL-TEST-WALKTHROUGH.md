# Gemini — A Visual Product Walkthrough

Gemini is presented as a personal space for asking questions, exploring ideas, and keeping conversations together. This tour follows the experience from the public homepage through account access, then explains how conversations, account settings, and the Pro plan fit together.

> **A note before entering:** the public frontend is online, but the configured production API is currently suspended by its hosting service. The screenshots below are genuine browser captures. The signed-in screens and successful AI conversation are described where they belong in the journey, but are not shown as completed because doing so would require fabricating a successful backend response.

## The experience at a glance

The journey begins with a public introduction, continues through mobile-number sign-in or account creation, and is intended to lead into a saved AI chat workspace. Conversations are stored in PostgreSQL. Redis is used for conversation caching, message queueing and Basic-plan limits; the background worker currently calls OpenAI's `gpt-3.5-turbo` model despite the Gemini product branding.

## 1. Discover the space

### The homepage

![Gemini homepage](visuals/01-homepage.jpg)

The homepage explains the product before asking the visitor to create an account. The navigation links jump to Features, Preview and About. **Get started** and **Start exploring** open account creation; **Log in** opens the returning-user flow.

The call to action is deliberately clear: a visitor can look around first, then create an account when they are ready.

### Features: the kinds of things you can explore

![Features section](visuals/06-features.jpg)

This section describes the product's intended role as a place to untangle questions, plan, and develop ideas. These are introductory product claims, not separate backend modules: the actual assistant answer only exists when a signed-in request reaches the API and the AI worker completes it.

### Preview: choose a place to begin

![Interactive preview with a selected prompt](visuals/07-preview-selected-prompt.jpg)

The preview lets a visitor select a suggested prompt to see a starting point. The preview is intentionally a doorway, not a live AI conversation. Selecting **Meet your AI** or the send arrow asks the visitor to create an account before starting a real chat.

### Ready to begin

![Create account call to action](visuals/08-create-account-cta.jpg)

The final invitation leads back to the same account-creation journey. The idea is simple: a visitor can browse the page, understand the product, and enter through one consistent account flow.

## 2. Create an account

### Account creation

![Create account form](visuals/02-signup-form.jpg)

The form asks for a mobile number, password and confirmation. A name can be provided so the workspace can greet the user personally.

Behind the screen, the frontend is intended to send `POST /auth/signup`. The backend validates the submitted fields, checks that the mobile number is not already registered, hashes the password, writes a user record to PostgreSQL, and returns an access token. The frontend then uses that token to load the user's profile, conversation history and subscription tier.

A successful account creation and its database row could **not** be verified during this run because the production API is suspended. No registration is presented as successful without that evidence.

### What happens when the form is incomplete?

![Signup form validation feedback](visuals/09-signup-validation-feedback.jpg)

The form checks entries before attempting an account-creation request. This is useful feedback for a visitor, but browser-side validation is only the first layer: the backend schema and database constraints must still reject invalid input and duplicate mobile numbers.

### Returning to sign in

![Sign-in screen](visuals/03-signin-form.jpg)

Sign-in uses a mobile number and a one-time code rather than a password entry screen. This is the intended route back to an existing workspace.

### Invalid mobile number

![Sign-in input validation](visuals/10-signin-validation.jpg)

The interface checks the mobile number format before requesting a code. For a valid number, the frontend would submit `POST /auth/send-otp`, then `POST /auth/verify-otp` with the code. The verification endpoint is intended to issue the bearer token used by all protected workspace APIs.

The production request was attempted from the browser, but the Render service returned HTTP 503 with `x-render-routing: suspend-by-user`. The app could not complete OTP delivery or verification.

![The sign-in request cannot reach the suspended API](visuals/05-backend-error.jpg)

The failure shown here is the actual browser/network result. It is not an OTP-rejection screen from the backend—the application did not receive a response from the running API.

## 3. Recover account access

![Password recovery entry](visuals/11-password-recovery.jpg)

The **Need help?** entry opens recovery. The intended sequence is to submit a mobile number, verify a one-time code, and choose a new password.

The backend routes are `POST /auth/forgot-password` and `POST /auth/reset-password`. The signed-in Security panel also uses `POST /auth/change-password` for users who know their current password. The backend configures a five-minute OTP expiry and a maximum of five incorrect attempts.

This recovery journey could not be completed against the suspended production API. The repository currently documents the OTP response as a development/test flow that returns the code to the client. Before production use, that code must be delivered through a real, separate channel rather than returned in the API response.

## 4. Inside the chat workspace

A signed-in user is intended to arrive at a personal workspace with a sidebar for recent conversations, a central conversation area, and a message composer. The welcome screen offers starter prompts; the user can also type a question and send it with Enter, using Shift+Enter for a new line.

**The authenticated workspace screenshot is intentionally absent:** the only available backend deployment is suspended, and no genuine authenticated session could be established during this run. The documented UI behavior below is based on the actual frontend and backend source; it is not represented as a successful live walkthrough.

### Start a new conversation

When the user sends a first message, the frontend first creates a room with a title derived from that prompt. The backend's `POST /ChatRoom/chatroom` inserts a `chatrooms` row linked to the authenticated user. The frontend then selects the returned room and sends the message.

A conversation title is therefore not just a card in the UI: it corresponds to a database row that should reappear in recent history after the page is refreshed.

### Return to a previous conversation

The sidebar calls `GET /ChatRoom/chatroom` to load recent rooms. Opening one calls `GET /ChatRoom/chatroom/{chatroom_id}` to retrieve the room and its messages. The backend scopes these operations to the user represented by the bearer token.

The sidebar search filters the list of rooms already loaded in the browser; it is not a separate server-side search endpoint. Choosing **New chat** clears the current view without deleting saved conversations.

### Send a message and receive an answer

The composer sends `POST /message/{chatroom_id}/message`. The backend checks the user's plan and room ownership, saves the user message in `chat_messages`, and pushes a job to the Upstash Redis list `openai_chat_queue`. A background worker reads that job, calls OpenAI `gpt-3.5-turbo`, and stores the assistant reply. The frontend polls the room detail endpoint while waiting for the reply.

That sequence is the product's core experience, but it has **not** been verified end to end here: the deployed API is suspended, and no successful live Redis-to-worker-to-model response was available. No assistant answer has been invented for this document.

## 5. Your account, security and plan

These are the account tools present in the application. They are described here so a visitor can understand the workspace, but no successful authenticated screenshot is claimed while the API is unavailable.

### Account details and appearance

The Account panel is designed to show the user's name, mobile number, verification state, and Basic/Pro tier. The theme button switches between light and dark appearance and persists the preference in browser local storage under `gemini_theme`. That preference is local to the browser; it is not a PostgreSQL setting.

### Security

The Security panel submits the current and new password to `POST /auth/change-password`. The frontend checks for at least eight characters, a letter, a number, and a special character before sending. The server remains responsible for validating the token and applying the update. No real account password was changed during this run.

### Basic and Pro

The Plan panel calls `GET /subscribe/subscription/status` to display the stored subscription tier. Basic is described in the code as allowing five messages per day; Pro removes that product limit. The upgrade action calls `POST /subscribe/pro` and redirects to the returned Stripe Checkout URL.

After checkout, `POST /subscribe/webhook/stripe` is intended to verify the Stripe signature and update the user's `subscription_tier` after a completed session. No checkout or live payment was initiated.

### Is there a separate admin workspace?

The inspected frontend and backend do not expose a separate administrator dashboard, administrator role, or admin-only API group. The tour therefore follows the user-facing product that exists in these repositories.

## 6. The data behind the experience

The backend migrations define four PostgreSQL tables:

| Table | What it stores |
| --- | --- |
| `users` | Mobile number, password hash, OTP metadata, verification status and subscription tier |
| `chatrooms` | Conversation title and owning user |
| `chat_messages` | User and assistant messages linked to a room |
| `migrations` | Applied SQL migration filenames and timestamps |

The actual backend was started against a disposable local PostgreSQL database. Its migrations created all four tables, and `psql` confirmed that the schema existed. Negative API checks also confirmed that requests without a token to the profile, room list, room detail, subscription status, and message routes returned HTTP 403; the test database remained unchanged after those checks.

Relevant implementation: [database migrations](https://github.com/faizansaiyed123/gemini-backend-clone/tree/main/src/database), [chatroom service](https://github.com/faizansaiyed123/gemini-backend-clone/blob/main/src/services/chatroom_service.py), [message service](https://github.com/faizansaiyed123/gemini-backend-clone/blob/main/src/services/message_service.py), [background worker](https://github.com/faizansaiyed123/gemini-backend-clone/blob/main/src/services/worker.py).

## 7. A smaller screen

![Gemini homepage at a mobile viewport](visuals/12-mobile-home.jpg)

The homepage adapts to a narrow viewport and keeps the main call to action in view.

![Mobile navigation opened](visuals/04-mobile-nav.jpg)

The navigation menu expands and exposes the page links on mobile. The authenticated conversation sidebar is also responsive in the frontend code, but its signed-in behavior remains unverified until a valid session can be established.

## 8. A few implementation details worth knowing

- **The product name and model provider differ.** The backend worker calls OpenAI `gpt-3.5-turbo`; it does not call Google's Gemini API.
- **OTP is development-oriented today.** The current backend returns an OTP to the client; this should be replaced with secure out-of-band delivery for production.
- **Queue delivery needs stronger failure handling.** The queue helper currently logs exceptions without propagating failure, so a saved user message can be left without a queued AI job. This remains open for a reliable retry/outbox design and live Redis verification.
- **Two backend fixes have been applied on main.** The Basic-plan limiter now uses a synchronous Redis client while the chatroom cache retains its async client, and Stripe webhook requests with missing or invalid signatures now return HTTP 400. The isolated rate-limit boundary check passed; the missing-signature webhook was retested locally and returned HTTP 400. Live provider checks remain outstanding.

## Where the tour can continue

To add genuine screenshots of successful sign-in, saved conversations, assistant answers, Account/Security/Plan panels, and a completed Stripe test flow, the owner needs to resume the suspended Render API. Then the walkthrough can follow a dedicated test account through the actual browser, capture each successful UI state, and verify each write/read in PostgreSQL and each asynchronous response through Redis and the worker.

Until that prerequisite is available, this document presents the real public experience and explains the intended authenticated journeys without passing off a designed screen or synthetic assistant answer as a verified result.
