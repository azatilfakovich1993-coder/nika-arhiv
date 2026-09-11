<?php
// Бот, который живёт на сайте и отвечает всем и всегда.
//
// Как это устроено: Телеграм сам стучится сюда, когда кто-то написал боту.
// Держать ничего запущенным не надо — сайт и так работает круглосуточно.
//
// Рядом с этим файлом должны лежать:
//   bot-config.php  — токен бота и пароль (в git не кладём)
//   bot-texts.txt   — готовые тексты отчётов
//
// Тексты собираются на компьютере командой node sobrat-teksty.js и заливаются
// сюда файлом. Сам разбор PHP не считает: его дело — отдать готовое.

require __DIR__ . '/bot-config.php';   // задаёт $BOT_TOKEN и $SECRET

// ── Проверка, что стучится действительно Телеграм ────────────────────────────
// Адрес этой страницы открыт всему интернету. Пароль передаётся заголовком,
// который знает только Телеграм — мы сами ему этот пароль и сообщили.
$prishel = isset($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'])
    ? $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] : '';
if (!hash_equals($SECRET, $prishel)) {
    http_response_code(403);
    exit('no');
}

// ── Читаем, что прислали ────────────────────────────────────────────────────
// На сайте отключён разбор тела запроса, поэтому берём его как есть.
$syroe = file_get_contents('php://input');
$data  = json_decode($syroe, true);

// ── Сразу говорим Телеграму «принято» ───────────────────────────────────────
// Раньше мы отвечали ему только после того, как отправим сообщение человеку.
// Хостинг достукивается до серверов Телеграма медленно, тот не дожидался
// и писал «Connection timed out», а сообщения копились в очереди и приходили
// через раз. Теперь закрываем разговор с Телеграмом первым делом, а работу
// доделываем уже без него.
ignore_user_abort(true);
http_response_code(200);
header('Content-Type: text/plain; charset=utf-8');
header('Content-Length: 2');
header('Connection: close');
echo 'ok';
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    @ob_end_flush();
    @flush();
}

// ── Тексты ──────────────────────────────────────────────────────────────────
function prochitat_teksty($file) {
    $out = array();
    if (!is_readable($file)) return $out;
    $name = null;
    $buf  = array();
    foreach (preg_split("/\r?\n/", file_get_contents($file)) as $line) {
        if (preg_match('/^\s*\[([a-zA-Z0-9_]+)\]\s*$/', $line, $m)) {
            if ($name !== null) $out[$name] = trim(implode("\n", $buf));
            $name = $m[1];
            $buf  = array();
            continue;
        }
        if ($name !== null) $buf[] = $line;
    }
    if ($name !== null) $out[$name] = trim(implode("\n", $buf));
    return $out;
}

$T = prochitat_teksty(__DIR__ . '/bot-texts.txt');
$podskazka = isset($T['help']) ? $T['help'] : 'Я понимаю команды /tovary, /otchet, /ochered, /srochno';

// Кнопки с товарами. В файле лежат строками «Название · 92 | t0».
function knopki_tovarov($T) {
    if (empty($T['knopki'])) return null;
    $ryady = array();
    foreach (preg_split("/\r?\n/", $T['knopki']) as $line) {
        $line = trim($line);
        if ($line === '') continue;
        $parts = explode('|', $line);
        if (count($parts) < 2) continue;
        $ryady[] = array(array(
            'text' => trim($parts[0]),
            'callback_data' => trim($parts[1])
        ));
    }
    return $ryady ? array('inline_keyboard' => $ryady) : null;
}

function poslat($token, $chatId, $text, $knopki) {
    $telo = array(
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true
    );
    if ($knopki) $telo['reply_markup'] = $knopki;

    $ch = curl_init('https://api.telegram.org/bot' . $token . '/sendMessage');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($telo, JSON_UNESCAPED_UNICODE));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_exec($ch);
    curl_close($ch);
}

// ── Нажали кнопку с товаром ─────────────────────────────────────────────────
// Телеграм ждёт ответа на нажатие, иначе у человека крутятся часики.
if (isset($data['callback_query'])) {
    $q = $data['callback_query'];

    $ch = curl_init('https://api.telegram.org/bot' . $BOT_TOKEN . '/answerCallbackQuery');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array('callback_query_id' => $q['id'])));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_exec($ch);
    curl_close($ch);

    $kod = isset($q['data']) ? $q['data'] : '';
    $text = isset($T[$kod]) ? $T[$kod] : $podskazka;
    poslat($BOT_TOKEN, $q['message']['chat']['id'], $text, knopki_tovarov($T));

    exit;
}

// ── Обычное сообщение ───────────────────────────────────────────────────────
$msg = isset($data['message']) ? $data['message'] : null;
if (!$msg || !isset($msg['text'])) {
    exit;   // не сообщение — просто выходим, «принято» уже сказано
}

$chatId = $msg['chat']['id'];
$text   = trim($msg['text']);

// Команда может прийти с именем бота: /otchet@moy_bot
$parts = preg_split('/\s+/', $text);
$cmd   = mb_strtolower(explode('@', $parts[0])[0], 'UTF-8');

$komandy = array(
    '/start'   => 'start',
    '/help'    => 'help',
    '/tovary'  => 'tovary',
    '/otchet'  => 'otchet',
    '/ochered' => 'ochered',
    '/srochno' => 'srochno'
);

$kluch = isset($komandy[$cmd]) ? $komandy[$cmd] : null;
$otvet = ($kluch && isset($T[$kluch])) ? $T[$kluch] : $podskazka;

// Кнопки показываем там, где они к месту.
$knopki = ($cmd === '/tovary' || $cmd === '/start') ? knopki_tovarov($T) : null;

poslat($BOT_TOKEN, $chatId, $otvet, $knopki);

// «Принято» Телеграму уже сказано в самом начале — здесь ничего не печатаем.
