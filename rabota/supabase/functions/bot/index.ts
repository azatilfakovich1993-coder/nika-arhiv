// Бот, живущий на Supabase. Отвечает всем и всегда, компьютер не нужен.
//
// Почему не на хостинге сайта: оттуда не получается дозвониться до серверов
// Телеграма — запрос висит и упирается в таймаут, сообщения приходят через раз.
// Серверы Supabase стоят за границей и до Телеграма достукиваются без помех.
//
// Тексты отчётов функция берёт с открытой страницы на GitHub. Так их можно
// обновлять обычным git push, не перевыкладывая саму функцию.

const TOKEN = Deno.env.get("BOT_TOKEN") ?? "";
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const TEKSTY_URL = Deno.env.get("TEKSTY_URL") ?? "";
const API = `https://api.telegram.org/bot${TOKEN}/`;

/* Тексты держим в памяти пять минут: незачем дёргать GitHub на каждое
   нажатие, но и залежаться надолго они не должны. */
let kesh: Record<string, string> | null = null;
let keshDo = 0;

function razobrat(syroe: string): Record<string, string> {
  const out: Record<string, string> = {};
  let imya: string | null = null;
  let buf: string[] = [];
  for (const line of syroe.split(/\r?\n/)) {
    const m = line.match(/^\s*\[([a-zA-Z0-9_]+)\]\s*$/);
    if (m) {
      if (imya) out[imya] = buf.join("\n").trim();
      imya = m[1];
      buf = [];
      continue;
    }
    if (imya) buf.push(line);
  }
  if (imya) out[imya] = buf.join("\n").trim();
  return out;
}

async function teksty(): Promise<Record<string, string>> {
  if (kesh && Date.now() < keshDo) return kesh;
  const r = await fetch(TEKSTY_URL + "?v=" + Date.now());
  kesh = razobrat(await r.text());
  keshDo = Date.now() + 5 * 60 * 1000;
  return kesh;
}

/* Кнопки с товарами. В текстах они лежат строками «Название · 92 | t0». */
function knopki(T: Record<string, string>) {
  const syroe = T["knopki"];
  if (!syroe) return undefined;
  const ryady = syroe.split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.lastIndexOf("|");
      if (i < 0) return null;
      return [{ text: s.slice(0, i).trim(), callback_data: s.slice(i + 1).trim() }];
    })
    .filter(Boolean) as Array<Array<{ text: string; callback_data: string }>>;
  return ryady.length ? { inline_keyboard: ryady } : undefined;
}

async function poslat(T: Record<string, string>, chatId: number, text: string, sKnopkami: boolean) {
  const telo: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (sKnopkami) {
    const k = knopki(T);
    if (k) telo.reply_markup = k;
  }
  await fetch(API + "sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(telo),
  });
}

const KOMANDY: Record<string, string> = {
  "/start": "start",
  "/help": "help",
  "/tovary": "tovary",
  "/otchet": "otchet",
  "/ochered": "ochered",
  "/srochno": "srochno",
};

async function obrabotat(data: any) {
  const T = await teksty();
  const podskazka = T["help"] ?? "Команды: /tovary, /otchet, /ochered, /srochno";

  // Нажали кнопку с товаром.
  if (data.callback_query) {
    const q = data.callback_query;
    // Телеграм ждёт ответа на нажатие, иначе у человека крутятся часики.
    await fetch(API + "answerCallbackQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: q.id }),
    });
    await poslat(T, q.message.chat.id, T[String(q.data)] ?? podskazka, true);
    return;
  }

  const m = data.message;
  if (!m || !m.text) return;

  // Команда может прийти с именем бота: /otchet@moy_bot
  const cmd = String(m.text).trim().split(/\s+/)[0].split("@")[0].toLowerCase();
  const kluch = KOMANDY[cmd];
  const otvet = (kluch && T[kluch]) ? T[kluch] : podskazka;
  await poslat(T, m.chat.id, otvet, cmd === "/tovary" || cmd === "/start");
}

Deno.serve(async (req) => {
  // Адрес функции открыт всему интернету. Пароль передаётся заголовком,
  // который знает только Телеграм — мы сами ему его и сообщили.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return new Response("no", { status: 403 });
  }

  let data: any = null;
  try {
    data = await req.json();
  } catch {
    return new Response("ok");
  }

  /* Отвечаем Телеграму сразу, а отправку доделываем после. Если ждать
     отправки, Телеграм успевает отвалиться по своему таймауту, и сообщения
     начинают приходить через раз — ровно это и случилось на хостинге. */
  const rabota = obrabotat(data).catch((e) => console.error("не отправилось:", e));
  // @ts-ignore — у Supabase это есть, в обычном Deno может не быть
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(rabota);
  } else {
    await rabota;
  }

  return new Response("ok");
});
