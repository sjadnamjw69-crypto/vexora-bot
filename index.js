const TelegramBot = require("node-telegram-bot-api");
const crypto = require("crypto");

const token = process.env.TELEGRAM_BOT_TOKEN;
const SUPPORT = "@Vexorini";
const ADMIN_ID = process.env.ADMIN_ID;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN تنظیم نشده است.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const orders = new Map();
const userStates = new Map();

const products = {
  stars: {
    name: "⭐ تلگرام استارز",
    options: [
      { label: "50 استارز", price: null },
      { label: "100 استارز", price: null },
      { label: "250 استارز", price: null },
      { label: "500 استارز", price: null },
      { label: "1000 استارز", price: null }
    ]
  },
  gifts: {
    name: "🎁 تلگرام گیفت",
    options: [
      { label: "گیفت تلگرام", price: null },
      { label: "گیفت ویژه", price: null }
    ]
  },
  premium: {
    name: "💎 تلگرام پریمیوم",
    options: [
      { label: "پریمیوم 3 ماهه", price: null },
      { label: "پریمیوم 6 ماهه", price: null },
      { label: "پریمیوم 12 ماهه", price: null }
    ]
  }
};

function mainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🛍️ فروشگاه", callback_data: "store" },
          { text: "📦 سفارش‌های من", callback_data: "myorders" }
        ],
        [
          { text: "⭐ استارز", callback_data: "product_stars" },
          { text: "🎁 گیفت", callback_data: "product_gifts" }
        ],
        [
          { text: "💎 پریمیوم", callback_data: "product_premium" },
          { text: "💳 راهنمای پرداخت", callback_data: "payment" }
        ],
        [
          { text: "🔎 پیگیری سفارش", callback_data: "track" },
          { text: "🎧 پشتیبانی", callback_data: "support" }
        ]
      ]
    }
  };
}

function backKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⬅️ منوی اصلی", callback_data: "home" }]
      ]
    }
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function newOrderId() {
  return "VX" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sendHome(chatId) {
  return bot.sendMessage(
    chatId,
    "💜 <b>به فروشگاه VEXORA خوش اومدی!</b>\n\n" +
    "✨ فروش محصولات دیجیتال تلگرام\n\n" +
    "⭐ استارز | 🎁 گیفت | 💎 پریمیوم\n\n" +
    "محصول موردنظرت رو انتخاب کن:",
    { ...mainKeyboard(), parse_mode: "HTML" }
  );
}

function productKeyboard(type) {
  const product = products[type];

  const rows = product.options.map((option, index) => [{
    text: option.label,
    callback_data: `choose_${type}_${index}`
  }]);

  rows.push([{ text: "⬅️ بازگشت", callback_data: "store" }]);

  return { reply_markup: { inline_keyboard: rows } };
}

function showMyOrders(chatId, userId) {
  const mine = [...orders.values()].filter(order => order.userId === userId);

  if (!mine.length) {
    return bot.sendMessage(chatId, "📦 هنوز سفارشی ثبت نکردی.", backKeyboard());
  }

  const text = mine.map(order =>
    `🧾 کد: <code>${order.id}</code>\n` +
    `🛍️ محصول: ${escapeHtml(order.product)}\n` +
    `💰 مبلغ: ${order.price ? order.price.toLocaleString("fa-IR") + " تومان" : "در انتظار اعلام قیمت"}\n` +
    `📌 وضعیت: ${escapeHtml(order.status)}`
  ).join("\n\n");

  return bot.sendMessage(chatId, "📦 <b>سفارش‌های تو</b>\n\n" + text, {
    parse_mode: "HTML",
    ...backKeyboard()
  });
}

async function notifyAdmin(order) {
  if (!ADMIN_ID) {
    console.log("ADMIN_ID تنظیم نشده است؛ سفارش:", order.id);
    return;
  }

  const text =
    "🛎️ <b>سفارش جدید VEXORA</b>\n\n" +
    `🧾 کد: <code>${order.id}</code>\n` +
    `👤 کاربر: ${escapeHtml(order.name)}\n` +
    `🆔 آیدی عددی: <code>${order.userId}</code>\n` +
    `📦 محصول: ${escapeHtml(order.product)}\n` +
    `🎯 مقصد: ${escapeHtml(order.target)}\n` +
    `💰 مبلغ: ${order.price ? order.price.toLocaleString("fa-IR") + " تومان" : "قیمت تعیین نشده"}\n` +
    `📌 وضعیت: ${escapeHtml(order.status)}`;

  await bot.sendMessage(ADMIN_ID, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ تأیید سفارش", callback_data: `admin_done_${order.id}` },
          { text: "❌ رد سفارش", callback_data: `admin_reject_${order.id}` }
        ]
      ]
    }
  }).catch(err => console.error("خطای ارسال به ادمین:", err.message));
}

bot.onText(/^\/start(?:@\w+)?$/, msg => {
  userStates.delete(msg.from.id);
  sendHome(msg.chat.id);
});

bot.onText(/^\/help(?:@\w+)?$/, msg => {
  bot.sendMessage(
    msg.chat.id,
    "📚 <b>راهنمای VEXORA</b>\n\n" +
    "/start — منوی اصلی\n" +
    "/shop — فروشگاه\n" +
    "/orders — سفارش‌های من\n" +
    "/support — پشتیبانی\n\n" +
    `🎧 پشتیبانی: ${SUPPORT}`,
    { parse_mode: "HTML", ...backKeyboard() }
  );
});

bot.onText(/^\/shop(?:@\w+)?$/, msg => sendHome(msg.chat.id));

bot.onText(/^\/orders(?:@\w+)?$/, msg => {
  showMyOrders(msg.chat.id, msg.from.id);
});

bot.onText(/^\/support(?:@\w+)?$/, msg => {
  bot.sendMessage(
    msg.chat.id,
    `🎧 پشتیبانی VEXORA\n\nبرای کمک و پیگیری سفارش به این آیدی پیام بده:\n${SUPPORT}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 ارتباط با پشتیبانی", url: "https://t.me/Vexorini" }],
          [{ text: "⬅️ منوی اصلی", callback_data: "home" }]
        ]
      }
    }
  );
});

bot.on("callback_query", async query => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const action = query.data;

  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (action === "home") return sendHome(chatId);

  if (action === "store") {
    return bot.sendMessage(
      chatId,
      "🛍️ <b>فروشگاه VEXORA</b>\n\nدسته‌بندی موردنظرت رو انتخاب کن:",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⭐ تلگرام استارز", callback_data: "product_stars" }],
            [{ text: "🎁 تلگرام گیفت", callback_data: "product_gifts" }],
            [{ text: "💎 تلگرام پریمیوم", callback_data: "product_premium" }],
            [{ text: "⬅️ منوی اصلی", callback_data: "home" }]
          ]
        }
      }
    );
  }

  if (action.startsWith("product_")) {
    const type = action.replace("product_", "");
    if (!products[type]) return;

    return bot.sendMessage(
      chatId,
      `${products[type].name}\n\nیک گزینه رو انتخاب کن.\n\nقیمت نهایی قبل از پرداخت باید توسط فروشگاه تأیید بشه.`,
      productKeyboard(type)
    );
  }

  if (action.startsWith("choose_")) {
    const [, type, indexText] = action.split("_");
    const product = products[type];
    const option = product?.options[Number(indexText)];

    if (!option) return;

    userStates.set(userId, {
      step: "waiting_target",
      product: `${product.name} — ${option.label}`,
      price: option.price
    });

    return bot.sendMessage(
      chatId,
      "📝 <b>ثبت سفارش</b>\n\n" +
      `محصول: ${escapeHtml(option.label)}\n\n` +
      "لطفاً آیدی تلگرام مقصد رو بفرست؛ مثلاً:\n" +
      "<code>@username</code>\n\n" +
      "⚠️ رمز عبور یا کد ورود تلگرامت رو هرگز ارسال نکن.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ لغو", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (action === "cancel") {
    userStates.delete(userId);
    return bot.sendMessage(chatId, "سفارش لغو شد.", mainKeyboard());
  }

  if (action === "myorders") return showMyOrders(chatId, userId);

  if (action === "track") {
    userStates.set(userId, { step: "waiting_order_id" });
    return bot.sendMessage(chatId, "🔎 کد سفارش رو بفرست؛ مثلاً VX1234ABCD", backKeyboard());
  }

  if (action === "payment") {
    return bot.sendMessage(
      chatId,
      "💳 <b>راهنمای پرداخت VEXORA</b>\n\n" +
      "۱. محصولت رو انتخاب کن و سفارش ثبت کن.\n" +
      "۲. منتظر اعلام مبلغ و تأیید پشتیبانی بمون.\n" +
      "۳. قبل از واریز، مشخصات پرداخت رو از پشتیبانی بگیر.\n" +
      "۴. بعد از بررسی پرداخت، وضعیت سفارش اعلام می‌شه.\n\n" +
      "⚠️ فعلاً پرداخت خودکار فعال نیست. تا وقتی مبلغ و روش پرداخت تأیید نشده، پولی واریز نکن.\n\n" +
      `🎧 پشتیبانی: ${SUPPORT}`,
      { parse_mode: "HTML", ...backKeyboard() }
    );
  }

  if (action === "support") {
    return bot.sendMessage(chatId, `🎧 پشتیبانی VEXORA\n\n${SUPPORT}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 ارتباط با پشتیبانی", url: "https://t.me/Vexorini" }],
          [{ text: "⬅️ منوی اصلی", callback_data: "home" }]
        ]
      }
    });
  }

  if (action.startsWith("admin_done_") || action.startsWith("admin_reject_")) {
    if (!ADMIN_ID || String(userId) !== String(ADMIN_ID)) {
      return bot.sendMessage(chatId, "⛔ این بخش فقط برای مدیر فروشگاه است.");
    }

    const isDone = action.startsWith("admin_done_");
    const orderId = action.replace(/^admin_(done|reject)_/, "");
    const order = orders.get(orderId);

    if (!order) return bot.sendMessage(chatId, "سفارش پیدا نشد.");

    order.status = isDone ? "تأییدشده توسط مدیر؛ تحویل را جداگانه بررسی کنید" : "رد شده";

    await bot.sendMessage(
      order.userId,
      `📦 وضعیت سفارش ${order.id} تغییر کرد:\n${order.status}`
    ).catch(() => {});

    return bot.sendMessage(chatId, `وضعیت سفارش ${order.id} به‌روزرسانی شد.`);
  }
});

bot.on("message", async msg => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const state = userStates.get(userId);

  if (!state) return;

  if (state.step === "waiting_order_id") {
    const orderId = msg.text.trim().toUpperCase();
    const order = orders.get(orderId);

    userStates.delete(userId);

    if (!order || order.userId !== userId) {
      return bot.sendMessage(chatId, "❌ سفارشی با این کد برای حساب تو پیدا نشد.", mainKeyboard());
    }

    return bot.sendMessage(
      chatId,
      `🧾 کد سفارش: ${order.id}\n📦 محصول: ${order.product}\n📌 وضعیت: ${order.status}`,
      mainKeyboard()
    );
  }

  if (state.step === "waiting_target") {
    const target = msg.text.trim();

    if (target.length < 2 || target.length > 100) {
      return bot.sendMessage(chatId, "❌ آیدی مقصد معتبر نیست. دوباره بفرست.");
    }

    const id = newOrderId();

    const order = {
      id,
      userId,
      name: msg.from.username ? "@" + msg.from.username : (msg.from.first_name || "کاربر"),
      product: state.product,
      target,
      price: state.price,
      status: "ثبت شده؛ در انتظار بررسی مدیر",
      createdAt: new Date().toISOString()
    };

    orders.set(id, order);
    userStates.delete(userId);

    await bot.sendMessage(
      chatId,
      "✅ <b>سفارش ثبت شد!</b>\n\n" +
      `🧾 کد پیگیری: <code>${id}</code>\n` +
      `📦 محصول: ${escapeHtml(order.product)}\n` +
      `🎯 مقصد: ${escapeHtml(target)}\n` +
      `💰 مبلغ: ${order.price ? order.price.toLocaleString("fa-IR") + " تومان" : "پس از بررسی اعلام می‌شود"}\n` +
      "📌 وضعیت: در انتظار بررسی مدیر\n\n" +
      "این کد رو نگه دار. برای پرداخت با پشتیبانی هماهنگ کن.",
      { parse_mode: "HTML", ...mainKeyboard() }
    );

    await notifyAdmin(order);
  }
});

bot.on("polling_error", error => {
  console.error("Telegram polling error:", error.message);
});

console.log("VEXORA bot started.");
