/**
 * Telegram Bot on Cloudflare Workers (TypeScript)
 * Single-file serverless Telegram webhook bot template
 */

// ============================================================================
// 1. Types & Interfaces
// ============================================================================
export interface Env {
  /** Telegram Bot Token from @BotFather */
  BOT_TOKEN: string;
  /** Optional secret token for X-Telegram-Bot-Api-Secret-Token verification */
  WEBHOOK_SECRET?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
}

// ============================================================================
// 2. Telegram API Helper Functions
// ============================================================================
async function sendMessage(
  env: Env,
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

async function answerCallbackQuery(env: Env, queryId: string, text?: string) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: queryId,
      text,
    }),
  });
}

// ============================================================================
// 3. Command Handlers
// ============================================================================
async function handleStart(chatId: number, env: Env) {
  const welcome = `👋 <b>Hello!</b>\n\nI am your Telegram bot running serverless on <b>Cloudflare Workers</b> with TypeScript!\n\nUse /help for commands or click the buttons below.`;
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "📚 GitHub Guide", url: "https://github.com/SahasGamageX/telegram-bot-cloudflare-worker" },
        { text: "⚡ Test Callback", callback_data: "btn_ping" },
      ],
    ],
  };
  await sendMessage(env, chatId, welcome, keyboard);
}

async function handleHelp(chatId: number, env: Env) {
  const helpText = `📖 <b>Available Commands:</b>\n\n• /start - Start the bot\n• /ping - Check latency & status\n• /help - Show this message`;
  await sendMessage(env, chatId, helpText);
}

// ============================================================================
// 4. Main Cloudflare Worker Webhook Handler
// ============================================================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Health check for browser or non-POST requests
    if (request.method !== "POST") {
      return new Response("Bot is active and running on Cloudflare Workers!", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 2. Optional: Verify secret token if WEBHOOK_SECRET is set
    if (env.WEBHOOK_SECRET) {
      const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secretHeader !== env.WEBHOOK_SECRET) {
        console.warn("Unauthorized webhook request: secret mismatch.");
        return new Response("Unauthorized", { status: 403 });
      }
    }

    // 3. Parse incoming Telegram update
    try {
      const update: TelegramUpdate = await request.json();

      // Handle text messages
      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        if (text === "/start") {
          await handleStart(chatId, env);
        } else if (text === "/help") {
          await handleHelp(chatId, env);
        } else if (text === "/ping") {
          await sendMessage(env, chatId, "🏓 Pong! Running smoothly on Cloudflare Edge.");
        } else {
          await sendMessage(
            env,
            chatId,
            `You said: <i>${escapeHtml(text)}</i>\n\nUse /help to see commands.`
          );
        }
      }

      // Handle button clicks (callback query)
      if (update.callback_query) {
        const queryId = update.callback_query.id;
        const data = update.callback_query.data;
        if (data === "btn_ping") {
          await answerCallbackQuery(env, queryId, "⚡ Instant callback response!");
        } else {
          await answerCallbackQuery(env, queryId);
        }
      }

      // Always return 200 OK so Telegram doesn't retry
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Error processing update:", err);
      return new Response("OK", { status: 200 });
    }
  },
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
