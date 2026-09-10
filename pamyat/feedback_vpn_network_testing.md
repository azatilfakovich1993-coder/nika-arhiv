---
name: feedback-vpn-network-testing
description: On the dev machine a VPN is usually ON while the phone has none — never judge network problems by tests from the PC.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4d960e16-5b5b-4f2e-be42-0105e5f9ca5e
  modified: 2026-08-11T12:20:52.348Z
---

На компьютере разработчика **обычно включён VPN**, а на телефоне его нет. Поэтому замеры доступности сервера с компьютера (`curl`, `openssl s_client`) НИЧЕГО не говорят о том, что видит телефон и обычные пользователи в РФ.

Проверять сеть надо с самого устройства: `adb shell ping <ip>`, `adb shell ping6 <ipv6>`, `adb shell ip -6 addr`, и смотреть логи веб-слоя (`loggingBehavior: 'production'` в capacitor.config.ts, затем `adb logcat | grep Capacitor/Console`).

**Why:** 2026-08-11 полдня ушло на ложные версии (истёкший сертификат, запрет незашифрованного трафика, путь проверки ACME), потому что с компьютера через VPN прокси отвечал за 0.5 с и всё выглядело исправным. Настоящая причина — недоступный сервером IPv6 в DNS — нашлась за минуту, как только проверили `ping6` с телефона. Пользователь сам сказал: «на компе сейчас подключен впн, а в телефоне нет».
**How to apply:** При жалобах на скорость/недоступность — СНАЧАЛА спросить, включён ли VPN и где, и делать замеры с телефона. Не выдавать результаты с компьютера за состояние продакшена. См. [[nur-hayat-pwa]].
