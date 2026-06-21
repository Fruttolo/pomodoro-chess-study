# Studio ⇄ Pausa — Timer a scacchi

Timer pomodoro ispirato all'orologio da scacchi: **un timer alla volta**, nessun switch automatico silenzioso.

## Come funziona

### Logica a scacchi

- Gira **un solo timer per volta** (Studio o Pausa)
- Il bottone centrale **commuta manualmente** tra i due timer
- Quando un timer scade → **suona** e passa automaticamente all'altro
- Quando entrambi scadono → la sessione riparte da capo con lo Studio

### Caso speciale: Studio scade ma Pausa ha ancora tempo

Se lo Studio finisce mentre la Pausa è ancora in corso (o non ancora avviata), **non suona** e non cambia timer: il blocco Studio viene resettato e un blocco Pausa extra viene accumulato sul rimanente della Pausa. L'utente continua a lavorare sulla Pausa finché non la commuta manualmente.

### Stati delle card

| Stato | Significato |
|-------|-------------|
| `in corso` | Timer attivo, sta scorrendo |
| `in attesa` | Sessione avviata, questo timer è in pausa |
| `esaurito` | Timer finito (non si può commutare su di esso) |
| `pronto` | Sessione non ancora avviata |

## Interfaccia

**Bottone principale**
- `Avvia` → parte lo Studio
- `Passa a pausa` / `Riprendi studio` → commuta il timer attivo (disabilitato se il timer di destinazione è esaurito)

**Ferma suono** — appare solo quando l'allarme suona; lo ferma senza resettare la sessione.

**Reset** — appare durante la sessione; riporta tutto allo stato iniziale.

**Impostazioni** — minuti e secondi per Studio e Pausa, configurabili solo a sessione ferma (default: 25:00 / 05:00).

## Suono

Allarme continuo a due toni (quadra 900 Hz / 680 Hz alternati ogni 400 ms) tramite Web Audio API. L'audio viene sbloccato al primo click dell'utente (requisito browser).

## Uso

Apri `pomodoro-scacchi.html` in qualsiasi browser moderno — nessuna dipendenza, nessun server richiesto. Le uniche risorse esterne sono il font JetBrains Mono (Google Fonts) e la Web Audio API nativa.
