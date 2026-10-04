import { Env, TelegramUpdate } from "../types";
import { handleStart } from "./handlers/commands";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Accept only POST requests from Telegram
    if (request.method !== "POST") {
      return new Response("Bot is active and running.", { status: 200 });
    }

    // Verify webhook secret token
    const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretHeader !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 403 });
    }

    try {
      const update: TelegramUpdate = await request.json();

      // Text message handling
      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        if (text === "/start") {
          await handleStart(chatId, env);
        } else if (text === "/ping") {
          await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: "🏓 Pong!" })
          });
        }
      }

      // Callback query handling (inline buttons)
      if (update.callback_query) {
        const queryId = update.callback_query.id;
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: queryId,
            text: "Button click received!"
          })
        });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      console.error("Error processing update:", e);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
