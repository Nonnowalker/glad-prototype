Librogame - Il Passo della Morte (Ambiente di Sviluppo)

==============================
CONTENUTO DELLA CARTELLA
==============================

*   `index.html`: File principale HTML dell'applicazione. Contiene la struttura della pagina e i link ai file CSS/JS.
*   `style.css`: Foglio di stile CSS. Contiene le regole per l'aspetto grafico e il layout dell'interfaccia.
*   `script.js`: File JavaScript principale. Contiene tutta la logica del gioco: gestione dello stato, visualizzazione capitoli, combattimento, test abilità, interazioni UI, inizializzazione Three.js, salvataggio/caricamento. NON contiene i dati dei capitoli.
*   `strings.js`: File JavaScript. Contiene le stringhe di testo per l'interfaccia utente (UI) in diverse lingue (italiano, inglese) e le funzioni per gestirle (`getString`, `setLanguage`, `updateAllUIStrings`).
*   `gameData.js`: File JavaScript. **Questo file viene generato automaticamente dallo script `compile_chapters.js`**. Contiene un singolo oggetto JavaScript (`gameData`) che mappa gli ID dei capitoli ai loro contenuti (testo, immagini, scelte, effetti, combattimenti, skill check) estratti dai file Markdown. **NON MODIFICARE QUESTO FILE MANUALMENTE.**
*   `compile_chapters.js`: Script Node.js. Questo script legge tutti i file `.md` presenti nella cartella `story/`, li analizza secondo la sintassi definita (vedi sotto e nelle istruzioni separate), e genera/aggiorna il file `gameData.js`.
*   `images/`: Cartella. **Inizialmente vuota.** Qui dovrai inserire TUTTE le immagini estratte dal PDF originale che vuoi visualizzare nel gioco.
*   `story/`: Cartella. Qui dovrai creare/modificare i file Markdown (`.md`), uno per ogni capitolo del librogame (es. `1.md`, `2.md`, ..., `340.md`). Il contenuto di questi file definisce la narrazione e le meccaniche di gioco.
*   `README_DEV.txt`: Questo file, con le istruzioni per lo sviluppo.
*   `package.json` (Opzionale): File generato da `npm init -y`. Utile se in futuro si aggiungono dipendenze Node.js.

==============================
WORKFLOW DI SVILUPPO
==============================

1.  **Setup Iniziale (Solo la prima volta):**
    *   Installa Node.js (versione LTS raccomandata) da [nodejs.org](https://nodejs.org/).
    *   Apri un terminale/prompt dei comandi nella cartella principale del progetto (`PassoDellaMorte_Dev`).
    *   (Opzionale) Esegui `npm init -y` per creare `package.json`.

2.  **Modifica Contenuti:**
    *   **Capitoli:** Crea/modifica i file `.md` nella cartella `story/`. Segui scrupolosamente la sintassi definita nel file `ISTRUZIONI_MARKDOWN.txt` (o nella documentazione fornita) usando i commenti HTML `<!--KEY:VALUE-->` per metadati, immagini, effetti, combattimenti, skill check e la sezione `--- CHOICES:` per le scelte.
    *   **Immagini:** Estrai le immagini dal PDF, salvale nella cartella `images/` e referenziale correttamente nei file `.md` (`<!--IMAGE:images/nome_file.jpg|Alt Text-->`).
    *   **Stringhe UI:** Modifica/aggiungi traduzioni in `strings.js` per l'interfaccia.
    *   **Logica:** Modifica `script.js` per implementare la logica delle condizioni (`checkCondition`), degli effetti (`applyEffect`), e qualsiasi altra meccanica specifica non coperta dai marcatori standard. Aggiorna `updateAllUIStrings` in `strings.js` se aggiungi nuovi elementi UI statici.

3.  **Compila `gameData.js`:**
    *   **Ogni volta** che modifichi i file nella cartella `story/`, apri il terminale nella cartella principale.
    *   Esegui il comando: `node compile_chapters.js`
    *   Controlla l'output per eventuali errori o avvisi. Questo aggiornerà il file `gameData.js`.

4.  **Testa il Gioco:**
    *   Apri il file `index.html` nel tuo browser web.
    *   **Nota:** Generalmente non è necessario un server locale solo per leggere `gameData.js`, ma se usi `fetch` in `script.js` per caricare *altre* risorse (cosa che attualmente non fa), o se il browser impone restrizioni, potresti aver bisogno di un server locale semplice (es. VS Code "Live Server" extension, `python -m http.server`, `php -S localhost:8000`).
    *   Gioca, testa i nuovi capitoli, le scelte, le condizioni, i combattimenti, ecc. Usa la console del browser (F12) per il debug.

==============================
DISTRIBUZIONE AI PLAYTESTER
==============================

1.  **Assicurati che `gameData.js` sia Aggiornato:** Esegui `node compile_chapters.js` un'ultima volta dopo le tue modifiche.
2.  **Crea lo ZIP:**
    *   Prepara una cartella temporanea.
    *   Copia al suo interno **SOLO** i seguenti file e cartelle dal tuo ambiente di sviluppo:
        *   `index.html`
        *   `style.css`
        *   `script.js`
        *   `gameData.js` (Quello compilato!)
        *   `strings.js`
        *   La cartella `images/` (con tutte le immagini utilizzate).
    *   **NON INCLUDERE:** `story/`, `compile_chapters.js`, `README_DEV.txt`, `package.json`, `node_modules/` (se presente).
    *   Comprimi questa cartella temporanea in un file ZIP.
3.  **Invia:** Condividi il file ZIP con i tuoi playtester. Loro devono solo estrarlo e aprire `index.html`.

==============================
SINTASSI MARKDOWN
==============================

ISTRUZIONI PER LA CREAZIONE DEI FILE MARKDOWN DEI CAPITOLI (`story/N.md`)

Questo documento descrive la sintassi da utilizzare all'interno dei file Markdown (`.md`)
per definire il contenuto di ogni capitolo del librogame "Il Passo della Morte".
Lo script `compile_chapters.js` leggerà questi file per generare automaticamente
il file `gameData.js` utilizzato dal gioco.

==============================
STRUTTURA GENERALE DEL FILE
==============================

Ogni file `.md` rappresenta un singolo capitolo. Il nome del file dovrebbe preferibilmente
essere il numero del capitolo seguito da `.md` (es., `1.md`, `45.md`, `115.md`).

All'interno del file, puoi usare la normale formattazione Markdown per il testo narrativo
(es. paragrafi separati da righe vuote, `*corsivo*` o `_corsivo_`, `**grassetto**` o `__grassetto__`).

I metadati e gli elementi speciali del gioco vengono definiti usando commenti HTML specifici:
`<!--NOME_TAG:VALORE-->` o tag multi-linea come `<!--COMBAT_START--> ... <!--COMBAT_END-->`.

Il testo narrativo principale deve precedere la sezione delle scelte (se presenti).

==============================
MARCATORI SPECIALI (Commenti HTML)
==============================

1.  **ID Capitolo (Opzionale se nome file è N.md):**
    *   Sintassi: `<!--CHAPTER_ID:numero-->`
    *   Descrizione: Specifica l'ID numerico del capitolo. Necessario solo se il nome del file non è esattamente `numero.md`.
    *   Esempio: `<!--CHAPTER_ID:1-->`

2.  **Titolo Capitolo (Opzionale):**
    *   Sintassi: `<!--TITLE:Testo del Titolo-->`
    *   Descrizione: Fornisce un titolo descrittivo per il capitolo. Se omesso, verrà usato "Capitolo N".
    *   Esempio: `<!--TITLE:Imboscata nella Foresta-->`

3.  **Immagine:**
    *   Sintassi: `<!--IMAGE:percorso/relativo/immagine.jpg|Testo Alternativo Descritivo-->`
    *   Descrizione: Inserisce un'immagine nel capitolo. Il percorso è relativo alla cartella principale del progetto (dove si trova `index.html`). Il testo alternativo (dopo il `|`) è FONDAMENTALE per l'accessibilità e deve descrivere l'immagine.
    *   Esempio: `<!--IMAGE:images/troll_ponte.png|Un grosso Troll di pietra blocca un ponte di corda traballante-->`

4.  **Effetti sul Personaggio:**
    *   Descrizione: Marcatori per modificare statistiche, aggiungere/rimuovere oggetti o parole chiave. Vengono processati PRIMA di mostrare il testo del capitolo.
    *   **Cambio Statistica:**
        *   Sintassi: `<!--EFFECT:STAT_CHANGE|nome_statistica,valore-->`
        *   Descrizione: Modifica una statistica. `nome_statistica` deve corrispondere (case-insensitive) a una chiave in `gameState.stats` (es. `resistenza`, `combattivita`, `mira`, `movimento`, `sotterfugio`, `scassinare`, `percezione`, `conoscenzaArcana`, `moneteOro`, `puntiEsperienza`). `valore` può essere positivo o negativo.
        *   Esempio: `<!--EFFECT:STAT_CHANGE|resistenza,-3-->` (Perde 3 Resistenza)
        *   Esempio: `<!--EFFECT:STAT_CHANGE|moneteOro,5-->` (Guadagna 5 Monete d'Oro)
    *   **Aggiunta Keyword:**
        *   Sintassi: `<!--KEYWORD:TIPO|NOME_KEYWORD-->`
        *   Descrizione: Aggiunge una parola chiave. `TIPO` deve essere `PERMANENTE` o `ATTUALE`. `NOME_KEYWORD` sarà convertito in maiuscolo.
        *   Esempio: `<!--KEYWORD:PERMANENTE|SERPENTE-->`
        *   Esempio: `<!--KEYWORD:ATTUALE|INCONTRATO_NANO-->`
    *   **Aggiunta Oggetto:**
        *   Sintassi: `<!--EFFECT:ITEM_ADD|TipoOggetto,Nome Oggetto Completo-->`
        *   Descrizione: Aggiunge un oggetto all'inventario. `TipoOggetto` può essere `Arma`, `Indossato`, `Generico`. `Nome Oggetto Completo` è il nome come deve apparire (es. "Spada/Arma da corpo a corpo"). Lo script `addItem` gestirà i limiti.
        *   Esempio: `<!--EFFECT:ITEM_ADD|Generico,Pozione Minore-->`
    *   **Rimozione Oggetto:**
        *   Sintassi: `<!--EFFECT:ITEM_REMOVE|Nome Oggetto da Rimuovere-->`
        *   Descrizione: Rimuove un oggetto dall'inventario (cerca in armi, indossati, zaino). Se si rimuove "Zaino", rimuove anche tutto il contenuto dello zaino.
        *   Esempio: `<!--EFFECT:ITEM_REMOVE|Corpetto di Cuoio/Armatura-->`
        *   Esempio: `<!--EFFECT:ITEM_REMOVE|Zaino-->`

5.  **Combattimento:**
    *   Sintassi Blocco:
        ```markdown
        <!--COMBAT_START-->
        <!--COMBAT_ENEMY:Nome Nemico 1|ValoreC|ValoreR-->
        <!--COMBAT_ENEMY:Nome Nemico 2|ValoreC|ValoreR-->
        <!--COMBAT_VICTORY:numero_capitolo_vittoria-->
        <!--COMBAT_END-->
        ```
    *   Descrizione: Definisce uno scenario di combattimento.
        *   `<!--COMBAT_START-->`: Inizia la definizione del combattimento.
        *   `<!--COMBAT_ENEMY:Nome|C|R-->`: Definisce un nemico con nome, Combattività (C) e Resistenza (R). Ripetere per ogni nemico.
        *   `<!--COMBAT_VICTORY:numero-->`: Specifica il capitolo a cui andare in caso di vittoria. Se omesso, la vittoria potrebbe portare a un game over o a un capitolo di default (comportamento da definire meglio in `script.js` se necessario). La sconfitta porta sempre a Game Over.
        *   `<!--COMBAT_END-->`: Termina la definizione del combattimento.

6.  **Test Abilità (Skill Check):**
    *   Sintassi: `<!--SKILL_CHECK:NomeAbilità|ValoreTarget|CapitoloSuccesso|CapitoloFallimento-->`
    *   Descrizione: Definisce un test di abilità.
        *   `NomeAbilità`: Deve corrispondere a una delle abilità gestite in `script.js` (es. `Movimento`, `Sotterfugio`, `Mira`, `Percezione`, `Scassinare`, `Conoscenza Arcana`).
        *   `ValoreTarget`: Il valore minimo da ottenere con 2d6 + Abilità per avere successo.
        *   `CapitoloSuccesso`: L'ID del capitolo a cui andare in caso di successo.
        *   `CapitoloFallimento`: L'ID del capitolo a cui andare in caso di fallimento.
    *   Esempio: `<!--SKILL_CHECK:Sotterfugio|7|57|108-->`

==============================
SEZIONE SCELTE (Alla fine del file)
==============================

La definizione delle scelte di navigazione va posta preferibilmente alla fine del
testo narrativo, separata da `---` o iniziata con `CHOICES:`.

*   Sintassi per Riga di Scelta: `- text: Testo che apparirà sul bottone` `target: numero_capitolo` `condition: Condizione opzionale`
    *   `text:`: Il testo visualizzato sul pulsante di scelta.
    *   `target:`: L'ID numerico del capitolo a cui porta la scelta.
    *   `condition:` (Opzionale): Una stringa che descrive la condizione necessaria per mostrare/abilitare questa scelta (es. `possiedi Lanterna`, `conosci Sindarin`, `keyword Attuale INCONTRATO_NANO`). La logica per valutare queste stringhe deve essere implementata nella funzione `checkCondition` in `script.js`.

*   Esempio Sezione Scelte:
    ```markdown
    ---
    CHOICES:
    - text: Prova ad aprire la porta
      target: 123
      condition: possiedi Piede di Porco
    - text: Cerca un'altra via
      target: 124
    - text: Torna indietro
      target: 121
    ```

==============================
NOTE IMPORTANTI
==============================

*   **Consistenza:** Usa nomi consistenti per statistiche, abilità, oggetti e keyword tra i file `.md` e il codice `script.js` (specialmente nelle funzioni `checkCondition` e `applyEffect`).
*   **Ordine:** I marcatori `<!--EFFECT:...-->` e `<!--KEYWORD:...-->` vengono applicati *prima* che il testo venga mostrato e *prima* che vengano valutate le condizioni delle scelte o che partano combattimenti/skill check definiti nello *stesso* capitolo.
*   **Validità:** Assicurati che i numeri di capitolo (`target`, `CapitoloSuccesso`, ecc.) esistano come file `.md` corrispondenti.
*   **Testo Alt:** Fornisci sempre un testo `alt` descrittivo per le immagini per l'accessibilità.
*   **Compilazione:** Ricorda di eseguire `node compile_chapters.js` dopo aver modificato i file `.md` per aggiornare `gameData.js` prima di testare o distribuire.

==============================