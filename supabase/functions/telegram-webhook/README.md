# Telegram → Nimbus task capture

Message your bot from anywhere and the task lands in **To Do** on your active
board. Quick-add syntax works: `Email Maya tomorrow #Work !high`.

## One-time setup

1. **Create the bot.** In Telegram, talk to [@BotFather](https://t.me/BotFather):
   `/newbot`, pick a name and a username (e.g. `MyNimbusBot`). Copy the token.

2. **Apply the migration** (creates `telegram_links`):

   ```sh
   supabase db push
   ```

3. **Set the function secrets** (pick any long random string for the webhook secret):

   ```sh
   supabase secrets set TELEGRAM_BOT_TOKEN="123456:ABC-…" TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 24)"
   ```

4. **Deploy the function:**

   ```sh
   supabase functions deploy telegram-webhook
   ```

5. **Point Telegram at it** (replace `<ref>` with the project ref, `<secret>` with
   the same value used in step 3):

   ```sh
   curl "https://api.telegram.org/bot<token>/setWebhook" \
     -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" \
     -d "secret_token=<secret>"
   ```

6. *(Optional)* Put the bot's username in `.env.local` so Settings can render a
   one-tap connect link:

   ```
   VITE_TELEGRAM_BOT=MyNimbusBot
   ```

## Connecting an account

Nimbus → **Settings → Telegram → Connect Telegram** generates a one-time code
(valid for **15 minutes**, single use). Send `/start <code>` to the bot (or tap
the link if `VITE_TELEGRAM_BOT` is set). After that, any plain message becomes
a task. `/help` shows the syntax.

## Notes

- The function runs with the service role; the acting user is derived from the
  verified `chat_id` link, never from message content. Telegram calls are
  authenticated via the `X-Telegram-Bot-Api-Secret-Token` header.
- Relative dates ("tomorrow", "friday") are resolved in **UTC**, so a late-night
  message may land a day off depending on your timezone.
- Tasks go to the board pinned with **`/board <name>`** (see `/boards` for the
  list); with no pin they follow the **active board** in the app, falling back
  to the first board. Deleting a pinned board clears the pin.
