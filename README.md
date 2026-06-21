# Studio ⇄ Pausa — Timer a scacchi

Timer per sessioni di studio ispirato all'orologio degli scacchi: un contatore alla volta, nessuna installazione, un unico file HTML.

## Come funziona

Il timer funziona come un orologio da scacchi: solo un blocco conta alla volta. Avviando la sessione parte il timer **Studio**; premendo il pulsante principale si passa al timer **Pausa**, e viceversa.

### Logica di fine fase

- **Studio finisce, Pausa ha ancora tempo** → il blocco Studio si azzera e ricomincia, e il tempo di Pausa maturato viene *accumulato* sul timer Pausa (non si perde).
- **Studio finisce, Pausa è già esaurita** → Studio è marcato come esaurito e il controllo passa a Pausa.
- **Pausa finisce** → il controllo torna automaticamente a Studio.
- **Entrambi esauriti** → la sessione riparte dall'inizio.

## Funzionalità

| Funzione | Dettaglio |
|---|---|
| Durate configurabili | Stepper minuti/secondi (0–999 min, 0–59 sec) editabili anche da tastiera |
| Notifiche sonore | Arpeggio melodico (Do–Mi–Sol–Do, Web Audio API), attivabile separatamente per Studio e Pausa |
| Indicatore visivo | Bordo luminoso + animazione respiro sul blocco attivo; vignette rossa durante il suono |
| Barra di avanzamento | Mostra il tempo rimanente proporzionale alla durata impostata |
| Reset | Pulsante che appare solo durante la sessione, con animazione slide-in |
| Accessibilità | `aria-label` su tutti i controlli, `prefers-reduced-motion` rispettato |
| Responsive | Layout a griglia fluida, supporto safe area per dispositivi mobili |

## Utilizzo

Aprire `pomodoro-scacchi.html` in qualsiasi browser moderno. Nessuna dipendenza, nessun server, nessun build step.

```
# clona e apri
git clone <repo-url>
open pomodoro-scacchi.html   # macOS
xdg-open pomodoro-scacchi.html  # Linux
```

### Impostazioni predefinite

| Blocco | Durata |
|---|---|
| Studio | 25:00 |
| Pausa | 05:00 |

## Struttura

Il progetto è un singolo file `pomodoro-scacchi.html` che contiene HTML, CSS e JavaScript inline. Non ci sono dipendenze npm, framework o file di configurazione. L'unica risorsa esterna è il font [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) caricato da Google Fonts.

## Compatibilità

Richiede un browser con supporto a **Web Audio API** (tutti i browser desktop/mobile moderni). Il suono viene inizializzato al primo click dell'utente per rispettare le policy autoplay dei browser.
