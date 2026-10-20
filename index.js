const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("توکن ربات تنظیم نشده است.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const SUPPORT = "@Vexorini";

const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🛍️ فروشگاه", callback_data: "store" },
        { text: "📦 سفارش‌های من", callback_data: "orders" }
      ],
      [
        { text: "⭐ خرید استارز", callback_data: "stars" },
        { text: "🎁 خرید گیفت", callback_data: "gifts" }
      ],
      [
        { text: "💎 خرید پریمیوم", callback_data: "premium" },
        { text: "💳 راهنمای پرداخت", callback_data: "payment" }
      ],
      [
        { text: "🎧 پشتیبانی", callback_data: "support" }
      ]
    ]
  }
};

const productsMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "⭐ تلگرام استارز", callback_data: "stars" }],
      [{ text: "🎁 تلگرام گیفت", callback_data: "gifts" }],
      [{ text: "💎 تلگرام پریمیوم", callback_data: "premium" }],
      [{ text: "⬅️ بازگشت به منوی اصلی", callback_data: "home" }]
    ]
  }
};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `💜 به فروشگاه VEXORA خوش اومدی!

✨ مرجع خرید محصولات دیجیتال تلگرام

⭐ استارز | 🎁 گیفت | 💎 پریمیوم

🛒 از منوی زیر محصول موردنظرت رو انتخاب کن.`,
    mainMenu
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📚 راهنمای VEXORA

/start — نمایش منوی اصلی
/shop — ورود به فروشگاه
/support — ارتباط با پشتیبانی

🎧 پشتیبانی: ${SUPPORT}`
  );
});

bot.onText(/\/shop/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🛍️ به فروشگاه VEXORA خوش اومدی!\n\nمحصول موردنظرت رو انتخاب کن:",
    productsMenu
  );
});

bot.onText(/\/support/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🎧 پشتیبانی VEXORA

برای پیگیری سفارش یا پرسیدن سؤال، به پشتیبانی پیام بده:

${SUPPORT}`
  );
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  await bot.answerCallbackQuery(query.id);

  if (action === "home") {
    return bot.sendMessage(
      chatId,
      "💜 منوی اصلی VEXORA",
      mainMenu
    );
  }

  if (action === "
