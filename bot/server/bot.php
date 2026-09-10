<?php
// Бот, который живёт на сайте и работает всегда.
//
// Как это устроено: Телеграм сам стучится сюда, когда кто-то написал боту.
// Держать ничего запущенным не надо — сайт и так работает круглосуточно.
//
// Рядом с этим файлом должны лежать:
//   bot-config.php  — токен бота и пароль (его в git не кладём)
//   bot-texts.txt   — тексты отчётов
//
// Тексты правятся в bot-texts.txt, сюда лезть не нужно.

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

$msg = isset($data['message']) ? $data['message'] : null;
if (!$msg || !isset($msg['text'])) {
    http_response_code(200);   // не сообщение — молча соглашаемся, иначе Телеграм будет слать снова
    exit('ok');
}

$chatId = $msg['chat']['id'];
$text   = trim($msg['text']);

// Команда может прийти с именем бота: /otchet@moy_bot
$parts = preg_split('/\s+/', $text);
$cmd   = mb_strtolower(explode('@', $parts[0])[0], 'UTF-8');

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

$podskazka = isset($T['help']) ? $T['help'] : 'Я понимаю команды /otchet, /nedelya, /srochno';

$komandy = array(
    '/start'   => isset($T['start'])   ? $T['start']   : $podskazka,
    '/help'    => $podskazka,
    '/otchet'  => isset($T['den'])     ? $T['den']     : $podskazka,
    '/nedelya' => isset($T['nedelya']) ? $T['nedelya'] : $podskazka,
    '/srochno' => isset($T['srochno']) ? $T['srochno'] : $podskazka
);

$otvet = isset($komandy[$cmd]) ? $komandy[$cmd] : $podskazka;

// ── Отвечаем ────────────────────────────────────────────────────────────────
$telo = json_encode(array(
    'chat_id' => $chatId,
    'text'    => $otvet,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true
), JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.telegram.org/bot' . $BOT_TOKEN . '/sendMessage');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $telo);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_exec($ch);
curl_close($ch);

// Телеграму важно услышать «принято», иначе он повторит то же сообщение.
http_response_code(200);
echo 'ok';
