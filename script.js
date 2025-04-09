// script.js (Unificato) - PARTE 1 di 4
// Contiene: Variabili Globali, Stato Iniziale, Funzioni Persistenza, Funzioni Inventario

// ======================================================
// SEZIONE 1: Variabili Globali e Stato Iniziale
// ======================================================
console.log("script.js: Inizializzazione variabili stato...");

let gameState = {}; // Stato corrente del gioco, inizializzato vuoto all'inizio

// Variabili temporanee usate SOLO durante la configurazione del personaggio (Fase PE Spending)
// Vengono inizializzate correttamente da showInitScreen
let tempStats = {};
let tempLang = null;
let peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

// Array per contenere i messaggi di log del combattimento corrente (volatile)
let combatLog = [];

// --- Stato Iniziale Default (Costante) ---
// Definisce la struttura e i valori di partenza per una nuova partita.
const initialGameState = Object.freeze({ // Usa Object.freeze per prevenire modifiche accidentali
    chapter: 0,
    stats: {
        combattivita: 5,
        resistenza: 30,
        resistenzaMax: 30, // Memorizza il massimo per recuperi/clamp
        mira: 0,
        movimento: 0,
        sotterfugio: 0,
        scassinare: 0,
        percezione: 0,
        conoscenzaArcana: 0,
        puntiEsperienza: 3 // Punti da spendere all'inizio
    },
    lingue: ["Lingua Comune"], // Lingua base
    moneteOro: 5, // Oro iniziale
    inventory: {
        armi: ["Spada/Arma da corpo a corpo", "Arco/Arma dalla distanza"], // Equip base
        indossati: ["Corpetto di Cuoio/Armatura", "Scudo/Scudo"], // Equip base
        zaino: [], // Zaino inizia vuoto (a parte oggetti scelti)
        hasZaino: true // Il personaggio inizia con uno zaino
    },
    keywords: {
        attuali: [],   // Parole chiave valide solo per la sessione corrente (o avventura?)
        permanenti: [] // Parole chiave che persistono tra salvataggi/avventure
    },
    combat: null,       // Oggetto che conterrà i dati del combattimento attivo (o null)
    skillCheck: null,   // Oggetto che conterrà i dati dello skill check attivo (o null)
    gameOver: false     // Flag per indicare se il gioco è terminato
});

// Chiave usata per salvare/caricare da localStorage
const SAVE_KEY = 'librogameIlPassoMorteState';

// --- Funzioni di Persistenza (Salvataggio/Caricamento/Reset) ---

/**
 * Salva lo stato corrente del gioco (`gameState`) in localStorage.
 * Salva solo se il gioco è iniziato (ha statistiche valide),
 * non è al capitolo 0, e non è in stato di game over.
 */
function saveGame() {
    // Verifica condizioni per il salvataggio
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) {
        try {
            // Converte l'oggetto gameState in una stringa JSON e la salva
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            console.log('Partita Salvata (stato attuale).');
            // La notifica accessibile viene gestita da chi chiama saveGame (es. in main.js)
             if(typeof announceMessage === 'function' && typeof getString === 'function') {
                 announceMessage(getString('infoGameSaved'));
             } else {
                 console.warn("Funzioni announceMessage/getString non disponibili per notifica salvataggio.");
             }
        } catch (e) {
            // Gestisce errori (es. localStorage pieno)
            console.error("Errore nel salvataggio in localStorage:", e);
            if(typeof announceMessage === 'function' && typeof getString === 'function') {
                announceMessage(getString('errorSaveFailed'), 'assertive');
            } else {
                alert("Errore Salvataggio!"); // Fallback alert
            }
        }
    } else {
        console.log("Salvataggio non eseguito (stato non idoneo).");
    }
}

/**
 * Carica lo stato del gioco da localStorage in `gameState`.
 * @returns {boolean} True se il caricamento ha avuto successo e i dati sono validi, False altrimenti.
 */
function loadGame() {
    const savedState = localStorage.getItem(SAVE_KEY); // Recupera stringa JSON
    if (savedState) {
        try {
            const loadedData = JSON.parse(savedState); // Converte stringa in oggetto
            // Validazione minima della struttura dati caricata
            if (!loadedData || typeof loadedData !== 'object' || typeof loadedData.chapter !== 'number' || typeof loadedData.stats !== 'object' || typeof loadedData.inventory !== 'object' || !Array.isArray(loadedData.lingue) || typeof loadedData.moneteOro !== 'number' || typeof loadedData.keywords !== 'object' || !Array.isArray(loadedData.keywords.attuali) || !Array.isArray(loadedData.keywords.permanenti)) {
                throw new Error("Dati salvati non validi o struttura incompleta/corrotta.");
            }
            // Sovrascrive lo stato corrente con quello caricato
            gameState = loadedData;
            // Resetta stati volatili che non dovrebbero persistere o essere caricati
            gameState.gameOver = false; // Assicura che non sia game over
            gameState.combat = null;    // Non si carica mai in mezzo a un combattimento
            gameState.skillCheck = null; // Non si carica mai in mezzo a uno skill check
            combatLog = [];             // Resetta il log testuale volatile

            console.log('Partita Caricata con successo.');
            return true; // Successo

        } catch (e) {
            console.error("Errore nel caricamento/parsing da localStorage:", e);
            gameState = {}; // Resetta gameState in caso di errore caricamento
            localStorage.removeItem(SAVE_KEY); // Rimuove dati corrotti
            return false; // Fallimento
        }
    } else {
        console.log("Nessuna partita salvata trovata.");
        return false; // Nessun salvataggio
    }
}

/**
 * Resetta lo stato del gioco ai valori iniziali e rimuove il salvataggio.
 * @param {boolean} confirmReset - Se true, chiede conferma all'utente.
 * @returns {boolean} True se il reset è stato eseguito, False altrimenti.
 */
function resetGame(confirmReset = true) {
    // Verifica che getString sia disponibile prima di usarla per il confirm
    const confirmMessage = (typeof getString === 'function') ? getString('confirmNewGame') : 'Sei sicuro di voler iniziare una nuova partita? I progressi non salvati verranno persi.';
    let doReset = !confirmReset || confirm(confirmMessage);

    if (doReset) {
        localStorage.removeItem(SAVE_KEY); // Rimuove salvataggio precedente
        gameState = {}; // Pulisce lo stato attuale (verrà ripopolato da showInitScreen)
        console.log("Salvataggio rimosso, pronto per nuova partita.");
        return true; // Reset confermato/eseguito
    }
    console.log("Reset annullato dall'utente.");
    return false; // Reset annullato
}


// --- Funzioni di Manipolazione Inventario ---

/**
 * Aggiunge un oggetto all'inventario del giocatore.
 * @param {string} itemName - Nome completo oggetto (es. "Spada/Arma...").
 * @param {string} itemType - Tipo ('Arma', 'Indossato', 'Generico').
 * @returns {boolean} True se aggiunto, False altrimenti.
 */
function addItem(itemName, itemType) {
    // Verifica dipendenze
    if (!gameState || !gameState.inventory || typeof announceMessage !== 'function' || typeof getString !== 'function' || typeof updateCharacterSheetUI !== 'function') {
        console.error("addItem: Dipendenze mancanti!"); return false;
    }
    let added = false; const maxArmi = 3; const maxZaino = 8;
    const cleanItemName = itemName.split('/')[0].trim();
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');
    const inv = gameState.inventory;
    // Inizializza liste se non esistono (importante dopo un reset o primo avvio)
    if (!inv.armi) inv.armi = []; if (!inv.indossati) inv.indossati = []; if (!inv.zaino) inv.zaino = [];

    const alreadyHas = inv.armi.some(i=>i.startsWith(cleanItemName)) || inv.indossati.some(i=>i.startsWith(cleanItemName)) || inv.zaino.some(i=>i.startsWith(cleanItemName));

    if (alreadyHas) { console.warn(`Duplicato non aggiunto: ${itemName}`); return false; }

    if (itemType === 'Arma' && inv.armi.length < maxArmi) { inv.armi.push(itemName); added = true; }
    else if (itemType === 'Generico' && inv.hasZaino && inv.zaino.length < maxZaino) { inv.zaino.push(itemName); added = true; }
    else if (itemType === 'Indossato') { /* TODO: subtype checks */ inv.indossati.push(itemName); added = true; }

    if(added) {
        console.log(`Aggiunto: ${itemName} (${itemType})`);
        announceMessage(getString('infoItemAdded', { itemName: getString('item_' + itemKey) || cleanItemName }));
        updateCharacterSheetUI();
    } else {
         let reason = "Limite raggiunto o tipo non valido";
         if (itemType === 'Generico' && !inv.hasZaino) reason = "Zaino mancante";
         console.warn(`Impossibile aggiungere ${itemName} (${itemType}) - ${reason}`);
         announceMessage(getString('infoCantTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName }));
    }
    return added;
}

/**
 * Rimuove un oggetto dall'inventario del giocatore.
 * @param {string} itemNameToRemove - Nome oggetto (match parziale iniziale, case-insensitive).
 * @returns {boolean} True se rimosso, False altrimenti.
 */
function removeItem(itemNameToRemove) {
     if (!gameState || !gameState.inventory || typeof announceMessage !== 'function' || typeof getString !== 'function' || typeof updateCharacterSheetUI !== 'function') {
          console.error("removeItem: Dipendenze mancanti!"); return false;
      }
    let removed = false; const lowerItemName = itemNameToRemove.toLowerCase();
    const cleanItemName = itemNameToRemove.split('/')[0].trim();
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');
    const inv = gameState.inventory;

    if (cleanItemName.toLowerCase() === "zaino") { // Caso speciale Zaino
         if(inv.hasZaino) { inv.hasZaino = false; inv.zaino = []; removed = true; announceMessage(getString('infoItemRemoved', {itemName: getString('backpackStatusLabel')})); }
     } else { // Cerca nelle liste
         const lists = ['zaino', 'armi', 'indossati'];
         for (const listName of lists) {
             if (!inv[listName]) continue; // Salta se lista non esiste
             // Cerca un item che *inizia* con il nome pulito (case-insensitive)
             const index = inv[listName].findIndex(item => item.toLowerCase().startsWith(cleanItemName.toLowerCase()));
             if (index !== -1) {
                 const removedItemFullName = inv[listName].splice(index, 1)[0]; // Rimuove e ottiene nome completo
                 removed = true;
                 console.log(`${removedItemFullName} rimosso da ${listName}`);
                 announceMessage(getString('infoItemRemoved', { itemName: removedItemFullName.split('/')[0] }));
                 break; // Esce dopo aver trovato e rimosso il primo match
             }
         }
     }
    if(removed) {
        updateCharacterSheetUI(); // Aggiorna la scheda se qualcosa è stato rimosso
    } else {
        console.warn(`Oggetto non trovato per rimozione: ${itemNameToRemove}`);
    }
    return removed;
}

// --- Fine Sezione 1 ---
console.log("script.js: Sezione 1 (Stato e Persistenza) definita.");

// CONTINUA NELLA PROSSIMA RISPOSTA... (Parte 2: Riferimenti UI e Funzioni UI)
// script.js (Unificato) - PARTE 2 di 4
// Contiene: Riferimenti UI, Funzioni UI

// ======================================================
// SEZIONE 2: Riferimenti Elementi UI e Funzioni UI
// ======================================================

// --- Riferimenti Elementi UI (Variabili globali) ---
// Popolate da cacheDOMElements() chiamata da initializeApp()
let chapterTextEl, actionsEl, combatInfoEl, combatEnemiesEl, combatLogEl, diceRollEl,
    diceResultEl, skillCheckPromptEl, rollDiceButton, chapterTitleEl, chapterTitleContainer,
    imageContainer, imageEl, initOptionsEl, peSpendingOptionsEl, initialItemsOptionsEl,
    initItemsSelectionEl, startGameButton, confirmPEButton, peRemainingEl,
    peLanguageSelectionEl, gameOverOverlay, gameOverReasonEl, globalActionsContainer,
    characterSheetEl, gameMessagesEl, langSelect, statCombattivita, statResistenza,
    statResistenzaMax, statMira, statMovimento, statSotterfugio, statScassinare,
    statPercezione, statConoscenzaArcana, lingueList, moneteOro, hasZaino, zainoCount,
    armiList, indossatiList, zainoList, keywordsAttualiList, keywordsPermanentiList;

/**
 * Ottiene e memorizza i riferimenti agli elementi principali del DOM.
 * DA CHIAMARE UNA SOLA VOLTA da initializeApp() dopo DOMContentLoaded.
 */
function cacheDOMElements() {
    console.log("cacheDOMElements: Inizio caching...");
    chapterTextEl = document.getElementById('chapter-text');
    actionsEl = document.getElementById('actions');
    combatInfoEl = document.getElementById('combat-info');
    combatEnemiesEl = document.getElementById('combat-enemies');
    combatLogEl = document.getElementById('combat-log');
    diceRollEl = document.getElementById('dice-roll-area');
    diceResultEl = document.getElementById('dice-result');
    skillCheckPromptEl = document.getElementById('skill-check-prompt');
    rollDiceButton = document.getElementById('roll-dice-button');
    chapterTitleEl = document.getElementById('chapter-title');
    chapterTitleContainer = document.getElementById('chapter-title-container');
    imageContainer = document.getElementById('chapter-image-container');
    imageEl = document.getElementById('chapter-image');
    initOptionsEl = document.getElementById('init-options'); // Contenitore generale init (verificare se usato)
    peSpendingOptionsEl = document.getElementById('pe-spending-options');
    initialItemsOptionsEl = document.getElementById('initial-items-options');
    initItemsSelectionEl = document.getElementById('initial-items-selection');
    startGameButton = document.getElementById('start-game-button');
    confirmPEButton = document.getElementById('confirm-pe-button');
    peRemainingEl = document.getElementById('pe-remaining');
    peLanguageSelectionEl = document.getElementById('pe-language-selection');
    gameOverOverlay = document.getElementById('game-over-overlay');
    gameOverReasonEl = document.getElementById('game-over-reason');
    globalActionsContainer = document.getElementById('global-actions');
    characterSheetEl = document.getElementById('character-sheet');
    gameMessagesEl = document.getElementById('game-messages'); // Per announceMessage
    langSelect = document.getElementById('lang-select');
    // Riferimenti scheda personaggio
    statCombattivita = document.getElementById('stat-combattivita');
    statResistenza = document.getElementById('stat-resistenza');
    statResistenzaMax = document.getElementById('stat-resistenza-max');
    statMira = document.getElementById('stat-mira');
    statMovimento = document.getElementById('stat-movimento');
    statSotterfugio = document.getElementById('stat-sotterfugio');
    statScassinare = document.getElementById('stat-scassinare');
    statPercezione = document.getElementById('stat-percezione');
    statConoscenzaArcana = document.getElementById('stat-conoscenza-arcana');
    lingueList = document.getElementById('lingue-list');
    moneteOro = document.getElementById('monete-oro');
    hasZaino = document.getElementById('has-zaino');
    zainoCount = document.getElementById('zaino-count');
    armiList = document.getElementById('armi-list');
    indossatiList = document.getElementById('indossati-list');
    zainoList = document.getElementById('zaino-list');
    keywordsAttualiList = document.getElementById('keywords-attuali-list');
    keywordsPermanentiList = document.getElementById('keywords-permanenti-list');

    // Verifica elementi critici per UI base
    if (!chapterTextEl || !actionsEl || !characterSheetEl || !globalActionsContainer) {
         console.error("FATAL: Elementi UI principali (#chapter-text, #actions, #character-sheet, #global-actions) non trovati! Controlla index.html.");
         // Potrebbe essere utile bloccare qui o mostrare un errore all'utente
         // throw new Error("Elementi UI critici mancanti.");
    } else {
        console.log("Elementi DOM Caching completato.");
    }
}


// --- Funzioni UI Pubbliche ---

/**
 * Mostra lo stato iniziale della UI (capitolo 0, nasconde elementi specifici).
 */
function displayInitialStateUI() {
    // Assicurati che gli elementi DOM siano stati cachati
    if (!chapterTextEl || !chapterTitleEl || !actionsEl || !globalActionsContainer) { console.error("displayInitialStateUI: Elementi UI principali non trovati/caricati!"); return; }

    // Mostra testo capitolo 0
    // Verifica che gameData e getString siano disponibili
    if (typeof gameData !== 'undefined' && typeof getString === 'function' && gameData["0"]) {
         const introChapter = gameData["0"];
         chapterTextEl.innerHTML = introChapter.text ? introChapter.text.replace(/\n/g, '<br>') : getString('loadingText');
         chapterTitleEl.textContent = introChapter.title || '';
         // Nasconde immagine del cap 0 se presente nei dati
         if (introChapter.images && introChapter.images.length > 0 && imageContainer) {
             imageContainer.classList.add('hidden');
         }
    } else {
         chapterTextEl.innerHTML = (typeof getString === 'function') ? getString('loadingText') : 'Loading...';
         chapterTitleEl.textContent = '';
    }
    // Nasconde tutte le sezioni specifiche
    actionsEl.innerHTML = '';
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
    if(initOptionsEl) initOptionsEl.classList.add('hidden'); // Nasconde vecchio container
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer && !(gameData && gameData["0"] && gameData["0"].images?.length > 0)) { // Nasconde se non è intro con immagine
        imageContainer.classList.add('hidden');
    }
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');

    updateCharacterSheetUI(); // Aggiorna per mostrare vuoto/default
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false); // Abilita bottoni globali
}

/**
 * Prepara e mostra l'interfaccia per la configurazione iniziale del personaggio (Fase 1: Spesa PE).
 * Chiamata da resetGameAndUpdateUI (in Sezione 4).
 */
function showInitScreen() {
     // Verifica esistenza funzioni/stato base necessari
     // Nota: tempStats e peSpent sono definite globalmente (in questo file, Sezione 1)
     if (typeof initialGameState === 'undefined' || typeof gameState === 'undefined' || typeof JSON === 'undefined' || typeof updateAllUIStrings !== 'function' || typeof displayInitialStateUI !== 'function' || typeof updatePESpendingUI !== 'function' || typeof updateLanguageSelectionLabels !== 'function' || typeof getString !== 'function' || typeof announceMessage !== 'function') { console.error("Errore critico: Dipendenze mancanti per showInitScreen!"); if(chapterTextEl) chapterTextEl.textContent = getString('errorGeneric') || "Errore"; return; }

    console.log("showInitScreen: Avvio configurazione personaggio...");
    // Resetta stato temporaneo per spesa PE (variabili in Sezione 1)
    tempStats = JSON.parse(JSON.stringify(initialGameState.stats)); // Copia stats base
    tempLang = null;
    peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

    // Mostra la UI corretta (nasconde gioco/altre init, mostra spesa PE)
    // displayInitialStateUI(); // Non chiamare questo qui, resetterebbe troppo
    if(actionsEl) actionsEl.innerHTML = ''; // Pulisce azioni capitolo
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden'); // Nasconde scelta oggetti
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.remove('hidden'); else console.error("Elemento peSpendingOptionsEl non trovato!");
    // if(initOptionsEl) initOptionsEl.classList.remove('hidden'); // Non serve se peSpendingOptionsEl è il container principale

    // Imposta titolo e pulisce testo
    if(chapterTitleEl) chapterTitleEl.textContent = getString('configTitlePE'); else console.error("Elemento chapterTitleEl non trovato!");
    if(chapterTextEl) chapterTextEl.innerHTML = '';

    // Resetta Checkbox Lingue
    if(peLanguageSelectionEl) { peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; }); }

    // Aggiorna la UI della spesa PE e le label
    updatePESpendingUI(); // Aggiorna valori e stato bottoni PE
    updateLanguageSelectionLabels(); // Aggiorna testi label lingue
    updateAllUIStrings(); // Aggiorna tutti gli altri testi statici (inclusi titoli sezioni PE)

    // L'handler per confirmPEButton è associato in Sezione 4 (main)

    announceMessage(getString('infoConfigStart'));
    if(chapterTitleContainer) chapterTitleContainer.focus(); else console.warn("chapterTitleContainer non trovato per focus.");
}


/**
 * Prepara la UI per la schermata di scelta oggetti iniziali.
 * Chiamata da confirmPESpending (in Sezione 3).
 */
function setupInitialItemsUI() {
    // Verifica esistenza elementi e funzioni necessarie
    if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !initItemsSelectionEl || !startGameButton || typeof handleInitialItemChange !== 'function' || typeof updateInitialItemLabels !== 'function' || typeof getString !== 'function') { console.error("Errore: Elementi UI o funzioni mancanti per setupInitialItemsUI!"); return; }

    peSpendingOptionsEl.classList.add('hidden'); // Nasconde sezione PE
    initialItemsOptionsEl.classList.remove('hidden'); // Mostra sezione Oggetti
    // if(initOptionsEl) initOptionsEl.classList.remove('hidden'); // Non serve se initialItemsOptionsEl è il container principale

    chapterTitleEl.textContent = getString('configTitleItems'); // Imposta titolo

    // Resetta Checkbox Oggetti
    if(initItemsSelectionEl) {
         initItemsSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
          handleInitialItemChange(); // Aggiorna stato bottone Start (definita sotto)
    }
     updateInitialItemLabels(); // Assicura che le label siano tradotte (definita sotto)
     // L'handler per startGameButton è associato in Sezione 4 (main)
}


/**
 * Aggiorna la UI durante la spesa dei PE (valori temp, PE rimasti, stato bottoni).
 * Legge dalle variabili globali tempStats e peSpent (definite in Sezione 1).
 */
function updatePESpendingUI() {
    // Verifica esistenza elementi e stato prima di aggiornare
    if (!peRemainingEl || !confirmPEButton || typeof initialGameState === 'undefined' || !initialGameState.stats || typeof peSpent === 'undefined' || typeof tempStats === 'undefined') { console.warn("Impossibile aggiornare UI PE: elementi o stato mancanti."); return; }

    const peLeft = initialGameState.stats.puntiEsperienza - peSpent.total;
    peRemainingEl.textContent = peLeft;

    // Aggiorna visualizzazione stats temp e PE spesi per stat
    for (const statKey in tempStats) {
        if (!tempStats.hasOwnProperty(statKey) || tempStats[statKey] === undefined) continue;
        const statEl = document.getElementById(`temp-stat-${statKey}`);
        if (statEl) statEl.textContent = tempStats[statKey];
        const peSpentEl = document.getElementById(`pe-spent-${statKey}`);
        if (peSpentEl) peSpentEl.textContent = peSpent[statKey] !== undefined ? peSpent[statKey] : 0;
    }
    const peSpentLangEl = document.getElementById('pe-spent-lingua');
    if(peSpentLangEl) peSpentLangEl.textContent = peSpent.lingua !== undefined ? peSpent.lingua : 0;


    // Abilita/Disabilita Bottoni +/- Stats
    const baseStats = initialGameState.stats;
    document.querySelectorAll('.pe-stat-row').forEach(row => {
        const plusButton = row.querySelector('.pe-btn-plus');
        const minusButton = row.querySelector('.pe-btn-minus');
        if(!plusButton || !minusButton) return;
        const statKey = plusButton.dataset.stat;
        if (!statKey || !tempStats.hasOwnProperty(statKey) || peSpent[statKey] === undefined) return;

        const currentValue = tempStats[statKey];
        const currentPeSpentOnThis = peSpent[statKey] || 0;
        const maxPESpentOnStat = 1;
        const canAffordMorePE = peLeft > 0;

        // Logica abilitazione '+'
        let canIncrement = canAffordMorePE && currentPeSpentOnThis < maxPESpentOnStat;
        if (statKey === 'resistenza' && currentValue >= baseStats.resistenza + 3) canIncrement = false;
        if (statKey !== 'resistenza' && currentValue >= baseStats[statKey] + 1) canIncrement = false;
        plusButton.disabled = !canIncrement;

        // Logica abilitazione '-'
        minusButton.disabled = currentPeSpentOnThis <= 0;
    });

     // Abilita/Disabilita Checkbox Lingue
     const canAffordLanguage = peLeft > 0;
     if(peLanguageSelectionEl) {
        peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.disabled = (peSpent.lingua >= 1 && !cb.checked) || (!canAffordLanguage && peSpent.lingua < 1);
        });
     }
    // Abilita Conferma PE
    confirmPEButton.disabled = peSpent.total !== initialGameState.stats.puntiEsperienza;
}

/**
 * Aggiorna la visualizzazione della scheda personaggio nel DOM.
 * Legge i dati dalla variabile globale gameState (definita in Sezione 1).
 */
function updateCharacterSheetUI() {
    // Usa valori di default se gameState o elementi non sono pronti
    const stats = gameState && gameState.stats ? gameState.stats : { combattivita: 0, resistenza: 0, resistenzaMax: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0 };
    const inventory = gameState && gameState.inventory ? gameState.inventory : { armi: [], indossati: [], zaino: [], hasZaino: false };
    const languages = gameState && gameState.lingue ? gameState.lingue : [];
    const gold = gameState && gameState.moneteOro !== undefined ? gameState.moneteOro : 0;
    const keywords = gameState && gameState.keywords ? gameState.keywords : { attuali: [], permanenti: [] };

    // Aggiorna elementi DOM (con controlli di esistenza per robustezza)
    if (statCombattivita) statCombattivita.textContent = stats.combattivita; else console.warn("UI Warn: #stat-combattivita non trovato");
    if (statResistenza) statResistenza.textContent = Math.max(0, stats.resistenza); else console.warn("UI Warn: #stat-resistenza non trovato");
    if (statResistenzaMax) statResistenzaMax.textContent = stats.resistenzaMax; else console.warn("UI Warn: #stat-resistenza-max non trovato");
    if (statMira) statMira.textContent = stats.mira; else console.warn("UI Warn: #stat-mira non trovato");
    if (statMovimento) statMovimento.textContent = stats.movimento; else console.warn("UI Warn: #stat-movimento non trovato");
    if (statSotterfugio) statSotterfugio.textContent = stats.sotterfugio; else console.warn("UI Warn: #stat-sotterfugio non trovato");
    if (statScassinare) statScassinare.textContent = stats.scassinare; else console.warn("UI Warn: #stat-scassinare non trovato");
    if (statPercezione) statPercezione.textContent = stats.percezione; else console.warn("UI Warn: #stat-percezione non trovato");
    if (statConoscenzaArcana) statConoscenzaArcana.textContent = stats.conoscenzaArcana; else console.warn("UI Warn: #stat-conoscenza-arcana non trovato");

    if (lingueList) lingueList.innerHTML = languages.map(l => `<li>${l}</li>`).join(''); else console.warn("UI Warn: #lingue-list non trovato");
    if (moneteOro) moneteOro.textContent = gold; else console.warn("UI Warn: #monete-oro non trovato");

    if (hasZaino) hasZaino.checked = inventory.hasZaino; else console.warn("UI Warn: #has-zaino non trovato");
    if (zainoCount) zainoCount.textContent = inventory.zaino ? inventory.zaino.length : 0; else console.warn("UI Warn: #zaino-count non trovato");
    // Mostra nomi puliti nell'inventario
    if (armiList) armiList.innerHTML = inventory.armi.map(i => `<li>${i.split('/')[0]}</li>`).join(''); else console.warn("UI Warn: #armi-list non trovato");
    if (indossatiList) indossatiList.innerHTML = inventory.indossati.map(i => `<li>${i.split('/')[0]}</li>`).join(''); else console.warn("UI Warn: #indossati-list non trovato");
    if (zainoList) zainoList.innerHTML = inventory.zaino.map(i => `<li>${i.split('/')[0]}</li>`).join(''); else console.warn("UI Warn: #zaino-list non trovato");

    if (keywordsAttualiList) keywordsAttualiList.innerHTML = keywords.attuali.map(k => `<li>${k}</li>`).join(''); else console.warn("UI Warn: #keywords-attuali-list non trovato");
    if (keywordsPermanentiList) keywordsPermanentiList.innerHTML = keywords.permanenti.map(k => `<li>${k}</li>`).join(''); else console.warn("UI Warn: #keywords-permanenti-list non trovato");

    // Forza aggiornamento ARIA
     if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'off'); // Temporaneamente off
     setTimeout(() => { if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'polite'); }, 50); // Riattiva
}

// --- Fine Sezione 2 (UI) ---
console.log("script.js: Sezione 2 (UI) definita.");

// CONTINUA NELLA PROSSIMA RISPOSTA... (Parte 3: Motore di Gioco)
// script.js (Unificato) - PARTE 3 di 4
// Contiene: Motore di Gioco (displayChapter, effetti, condizioni, skill check, combattimento)

// ======================================================
// SEZIONE 3: Motore di Gioco (ex engine.js)
// ======================================================

/**
 * Visualizza il capitolo specificato, processando i dati e chiamando le funzioni UI.
 * Questa è la funzione principale che guida il flusso del gioco.
 * @param {number | string} chapterId - L'ID del capitolo da visualizzare.
 */
function displayChapter(chapterId) {
    // Verifica esistenza stato, dati e funzioni UI base
    if (gameState.gameOver) { console.log("Game is over."); return; }
    if (typeof gameState === 'undefined' || typeof gameData === 'undefined' || typeof chapterTextEl === 'undefined' || typeof actionsEl === 'undefined' || typeof updateCharacterSheetUI !== 'function' || typeof getString !== 'function') { console.error("Errore critico: Stato, dati o elementi/funzioni UI base mancanti in displayChapter!"); return; }
    if (!gameData[chapterId]) { console.error(`Capitolo ${chapterId} non trovato in gameData!`); chapterTextEl.innerHTML = getString('errorChapterNotFound', { chapterId: chapterId }); actionsEl.innerHTML = ''; return; }
    if (!gameState.stats && chapterId !== 0) { console.log("Stato non inizializzato, reindirizzo all'inizio."); if(typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("displayInitialStateUI non def!"); return; }

    gameState.chapter = chapterId;
    const chapter = gameData[chapterId]; // Accede ai dati del capitolo specifico
    console.log(`--- Caricamento Capitolo ${chapterId} ('${chapter.title || ''}') ---`);

    // Reset UI elements (chiama funzioni UI)
    if(actionsEl) actionsEl.innerHTML = '';
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    // Resetta stati interni del motore
    gameState.combat = null;
    gameState.skillCheck = null;
    combatLog = []; // Resetta log testuale

    // Nascondi init UI se non è capitolo 0
     if (chapterId !== 0) {
         if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
         if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
         if(initOptionsEl) initOptionsEl.classList.add('hidden');
     }

    // Applicare Effetti PRIMA di mostrare testo/scelte
    if (chapter.effects && Array.isArray(chapter.effects)) { chapter.effects.forEach(applyEffect); } // applyEffect definito sotto

    // Impostare Immagine
    if (chapter.images && Array.isArray(chapter.images) && chapter.images.length > 0 && imageContainer && imageEl) {
        const imageData = chapter.images[0];
        imageEl.src = imageData.src; imageEl.alt = imageData.alt || `Illustrazione capitolo ${chapterId}`; // Fallback ALT
        imageContainer.classList.remove('hidden');
    }

    // Impostare Testo e Titolo
    if(chapterTextEl) chapterTextEl.innerHTML = chapter.text ? chapter.text.replace(/\n/g, '<br>') : '';
    if(chapterTitleEl) chapterTitleEl.textContent = chapterId === 0 ? "" : chapter.title || `${getString('chapterLabel')} ${chapterId}`;

    // Impostare Combattimento o Skill Check
    if (chapter.combat && !gameState.skillCheck) {
         gameState.combat = JSON.parse(JSON.stringify(chapter.combat)); // Deep copy
         if(gameState.combat.enemies && Array.isArray(gameState.combat.enemies)) { gameState.combat.enemies.forEach(e => { if(e.initialR === undefined) e.initialR = e.R; }); } else { gameState.combat.enemies = []; }
         gameState.combat.turn = 'player';
         if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non definita!"); // Da ui.js
    } else if (chapter.skillCheck && !gameState.combat) {
         gameState.skillCheck = { ...chapter.skillCheck }; // Copia oggetto
         if(typeof updateSkillCheckUI === 'function') updateSkillCheckUI(gameState.skillCheck); else console.error("updateSkillCheckUI non definita!"); // Da ui.js
    } else { // Nasconde UI specifiche se non attive
         if(combatInfoEl) combatInfoEl.classList.add('hidden');
         if(diceRollEl) diceRollEl.classList.add('hidden');
     }

    // Render Buttons
    if (actionsEl && !gameState.combat && !gameState.skillCheck && chapterId !== 0) {
        actionsEl.innerHTML = ''; // Assicura sia pulito
        let itemsOffered = [];
        // Cerca oggetti offerti esplicitamente (da compile_chapters)
        if (chapter.itemsOffered && Array.isArray(chapter.itemsOffered)) { itemsOffered = chapter.itemsOffered; }
        else { /* Fallback cerca "Puoi prendere" se necessario */
            const getItemRegex = /Puoi prendere (?:l[ae'] |gli |i |un[' ]|quest[aoei] )?([\w\s\/]+(?: \([\w\s]+\))?)(?: se lo desideri)?\./gi;
            let match; let tempTextForParsing = chapter.text || '';
            while ((match = getItemRegex.exec(tempTextForParsing)) !== null) {
                 const cleanItemName = match[1].trim();
                 let itemType = "Generico"; // Euristica
                 if (cleanItemName.toLowerCase().includes("/arma")) itemType = "Arma";
                 else if (cleanItemName.toLowerCase().includes("/armatura") || cleanItemName.toLowerCase().includes("/scudo")) itemType = "Indossato";
                 itemsOffered.push({ name: cleanItemName, type: itemType });
             }
        }

        // Crea bottoni Oggetti Offerti
        itemsOffered.forEach(item => {
            const button = document.createElement('button');
            const cleanItemName = item.name.split('/')[0]; const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');
            button.textContent = getString('buttonTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName });
            let canTake = false; const maxArmi = 3, maxZaino = 8;
            const alreadyHas = gameState.inventory.armi.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.indossati.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.zaino.some(i=>i.startsWith(cleanItemName));
            if (!alreadyHas) {
                if (item.type === 'Arma' && gameState.inventory.armi.length < maxArmi) canTake = true;
                else if (item.type === 'Generico' && gameState.inventory.hasZaino && gameState.inventory.zaino.length < maxZaino) canTake = true;
                else if (item.type === 'Indossato') { /* TODO: subtype */ canTake = true; }
            }
            button.disabled = !canTake; if(!canTake) button.textContent = getString('buttonTakeItemCant', { itemName: getString('item_' + itemKey) || cleanItemName });
            // Aggiunge listener che chiama addItem (da state.js)
            button.addEventListener('click', (event) => {
                if (addItem(item.name, item.type)) {
                    event.target.disabled = true;
                    event.target.textContent = getString('buttonTakeItemTaken', { itemName: getString('item_' + itemKey) || cleanItemName });
                    saveGame(); // Salva dopo aver preso oggetto
                }
            });
            actionsEl.appendChild(button);
        });

        // Crea Bottoni Scelte Navigazione
        if(chapter.choices && Array.isArray(chapter.choices)) {
            chapter.choices.forEach(choice => {
                let shouldDisplay = !choice.condition || checkCondition(choice.condition); // Usa checkCondition da questo file
                if (shouldDisplay) {
                    const button = document.createElement('button');
                    button.textContent = choice.text.includes(getString('chapterLabel')) ? choice.text : `${choice.text} (${getString('chapterLabel')} ${choice.target})`;
                    // Aggiunge listener che chiama displayChapter (da questo file)
                    button.addEventListener('click', () => {
                         displayChapter(choice.target); // Chiama ricorsivamente
                         if(typeof saveGame === 'function') saveGame(); else console.error("saveGame non definita!"); // Salva dopo la scelta
                    });
                    actionsEl.appendChild(button);
                }
            });
        }
    }

    // Gestione Stato Finale / Errori
    const isEndChapter = chapter.text && (chapter.text.includes("La tua avventura finisce qui.") || chapter.text.includes("Hai concluso vittoriosamente la tua avventura!"));
    if (actionsEl && actionsEl.innerHTML === '' && !gameState.combat && !gameState.skillCheck && chapterId !== 0) {
         if (isEndChapter) { announceMessage(getString('infoGameOverReason'), 'assertive'); if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true); }
         else if (!chapter.choices || chapter.choices.length === 0) { actionsEl.innerHTML = `<p><i>${getString('infoNoMoreActions')}</i></p>`; }
    } else if (chapterId !== 0 && !isEndChapter && !gameState.gameOver) { if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false); }

    // Check Morte (dopo aver applicato effetti)
    if (gameState.stats && gameState.stats.resistenza <= 0 && !gameState.combat && !gameState.gameOver) { handleGameOver('infoGameOverDesc'); } // Chiama handleGameOver da questo file

    if(typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI(); else console.error("updateCharacterSheetUI non def!");

    // Focus Management
    if(chapterId !== 0 && chapterTitleContainer) { setTimeout(() => { if (chapterTitleContainer.offsetParent !== null) chapterTitleContainer.focus({ preventScroll: true }); }, 150); }

} // --- End displayChapter ---


// --- Funzione per Applicare Effetti ---
function applyEffect(effect) {
    if (!effect || !effect.type) return;
    if (!gameState || !gameState.stats) { console.warn("Cannot apply effect: gameState not ready."); return; }
    const details = effect.details || ""; console.log(`Applying effect: ${effect.type}`, details);
    try {
        const detailsParts = details.split(','); const detailValue1 = detailsParts[0]?.trim(); const detailValue2 = detailsParts[1]?.trim(); let statKey;
        switch (effect.type.toUpperCase()) {
            case 'STAT_CHANGE':
                 const statName = detailValue1; const valueChange = parseInt(detailValue2);
                 statKey = Object.keys(gameState.stats).find(k => k.toLowerCase() === statName?.toLowerCase());
                 if (statKey && !isNaN(valueChange)) {
                     const oldValue = gameState.stats[statKey]; gameState.stats[statKey] += valueChange;
                     if (statKey === 'resistenza') gameState.stats.resistenza = Math.min(Math.max(0, gameState.stats.resistenza), gameState.stats.resistenzaMax);
                     else if (statKey === 'moneteOro') gameState.moneteOro = Math.min(Math.max(0, gameState.moneteOro || 0), 30);
                     const newValue = statKey === 'moneteOro' ? gameState.moneteOro : gameState.stats[statKey];
                     if (oldValue !== newValue && typeof announceMessage === 'function') announceMessage(`${statKey} modificata di ${valueChange}.`);
                 } else { console.warn("Invalid STAT_CHANGE details:", effect.details); }
                 break;
            case 'KEYWORD_ADD':
                 const kwType = effect.keywordType?.toLowerCase(); const kwName = effect.keywordName?.toUpperCase();
                 if (kwName && (kwType === 'permanente' || kwType === 'attuale') && gameState.keywords && gameState.keywords[kwType]) {
                     if (!gameState.keywords[kwType].includes(kwName)) { gameState.keywords[kwType].push(kwName); if(typeof announceMessage === 'function') announceMessage(`Parola Chiave ${kwType} aggiunta: ${kwName}.`); }
                 } else { console.warn("Invalid KEYWORD_ADD details:", effect); }
                 break;
            case 'ITEM_ADD':
                 const itemTypeAdd = detailValue1; const itemNameAdd = detailValue2;
                 if(itemTypeAdd && itemNameAdd && typeof addItem === 'function') addItem(itemNameAdd, itemTypeAdd); // Chiama da state.js
                 else { console.warn("Invalid ITEM_ADD details or addItem missing:", effect.details); }
                 break;
            case 'ITEM_REMOVE':
                 const itemNameToRemove = detailValue1;
                 if(itemNameToRemove && typeof removeItem === 'function') removeItem(itemNameToRemove); // Chiama da state.js
                 else { console.warn("Invalid ITEM_REMOVE details or removeItem missing:", effect.details); }
                 break;
              case 'COMBAT_MOD': // Esempio effetto speciale
                  if(detailValue1 === 'PARTNER_DAMAGE_DOUBLE' && detailValue2 === 'true') { console.log("Attivato mod: danno doppio"); if(gameState.combat) gameState.combat.doublePlayerDamage = true; else console.warn("COMBAT_MOD fuori da combat"); }
                  break;
             default: console.warn(`Unknown effect type: ${effect.type}`);
        }
    } catch (e) { console.error("Error applying effect:", effect, e); }
    // L'aggiornamento UI avviene alla fine di displayChapter
}

// --- Funzione Controllo Condizioni (DA COMPLETARE CON TUTTE LE CONDIZIONI) ---
function checkCondition(conditionText) {
     if (!gameState || !gameState.inventory || !conditionText) return true; // Assumi true se stato non pronto o condizione vuota
     const lowerCond = conditionText.toLowerCase().trim();

     // Check Oggetto
     if (lowerCond.startsWith("possiedi ")) {
         const itemNameLower = lowerCond.substring(9).trim();
         const hasItem = gameState.inventory.armi.some(item => item.toLowerCase().startsWith(itemNameLower)) ||
                       gameState.inventory.indossati.some(item => item.toLowerCase().startsWith(itemNameLower)) ||
                       (gameState.inventory.hasZaino && gameState.inventory.zaino.some(item => item.toLowerCase().startsWith(itemNameLower)));
         console.log(`Check Cond: "${conditionText}" -> ${hasItem}`); return hasItem;
     }
     // Check Lingua
     if (lowerCond.startsWith("conosci ") || lowerCond.startsWith("comprendi ")) {
         const langName = lowerCond.substring(lowerCond.indexOf(" ") + 1).trim();
         const hasLang = gameState.lingue.some(lang => lang.toLowerCase() === langName.toLowerCase());
         console.log(`Check Cond: "${conditionText}" -> ${hasLang}`); return hasLang;
     }
    // Check Keyword Attuale
    if (lowerCond.startsWith("keyword attuale ")) {
         const kwName = lowerCond.substring(16).trim().toUpperCase();
         const hasKw = gameState.keywords.attuali.includes(kwName);
         console.log(`Check Cond: "${conditionText}" -> ${hasKw}`); return hasKw;
     }
     // Check Keyword Permanente
    if (lowerCond.startsWith("keyword permanente ")) {
         const kwName = lowerCond.substring(19).trim().toUpperCase();
         const hasKw = gameState.keywords.permanenti.includes(kwName);
         console.log(`Check Cond: "${conditionText}" -> ${hasKw}`); return hasKw;
     }
     // Check Statistica (Base)
     const statCheckMatch = lowerCond.match(/^(\w+)\s*([><=!]+)\s*(\d+)$/);
     if (statCheckMatch) {
         const statNameCheck = statCheckMatch[1];
         const operator = statCheckMatch[2];
         const valueCheck = parseInt(statCheckMatch[3]);
         const statKeyCheck = Object.keys(gameState.stats).find(k => k.toLowerCase() === statNameCheck); // Cerca chiave case-insensitive
         if (statKeyCheck && !isNaN(valueCheck)) {
             const currentStatValue = gameState.stats[statKeyCheck]; let result = false;
             if (operator === '>' && currentStatValue > valueCheck) result = true;
             else if (operator === '<' && currentStatValue < valueCheck) result = true;
             else if (operator === '>=' && currentStatValue >= valueCheck) result = true;
             else if (operator === '<=' && currentStatValue <= valueCheck) result = true;
             else if ((operator === '==' || operator === '=') && currentStatValue === valueCheck) result = true;
             else if (operator === '!=' && currentStatValue !== valueCheck) result = true;
             console.log(`Check Cond: "${conditionText}" -> Val: ${currentStatValue}, Res: ${result}`); return result;
         } else { console.warn(`Statistica non valida o valore non numerico in checkCondition: ${conditionText}`); return false; }
     }

     // --- AGGIUNGI ALTRI CHECK QUI (MONETE, ECC.) ---

     console.warn(`Condizione non implementata o non riconosciuta: "${conditionText}" - Assumendo TRUE`);
     return true; // Default se non riconosciuta
}


// --- Funzioni Skill Check ---
function resolveSkillCheck() {
     if (!gameState.skillCheck || !gameState.stats || typeof getString !== 'function' || typeof announceMessage !== 'function' || typeof displayChapter !== 'function' || typeof saveGame !== 'function') { console.error("resolveSkillCheck: Dipendenze mancanti!"); return; }
     const roll1=Math.floor(Math.random()*6)+1, roll2=Math.floor(Math.random()*6)+1, totalRoll=roll1+roll2;
     const {skill, target, successChapter, failureChapter} = gameState.skillCheck;
     const skillKeyMap={'mira':'mira','movimento':'movimento','sotterfugio':'sotterfugio','scassinare':'scassinare','percezione':'percezione','conoscenza arcana':'conoscenzaArcana'};
     const statKey=Object.keys(skillKeyMap).find(k=>skill.toLowerCase().includes(k));
     const skillValue=statKey&&gameState.stats[skillKeyMap[statKey]]!==undefined?gameState.stats[skillKeyMap[statKey]]:0;
     const finalScore=totalRoll+skillValue; const success=finalScore>=target;
     const resultText=success?getString('diceSuccess'):getString('diceFailure');
     if(diceResultEl) diceResultEl.textContent = getString('diceResultFormat',{roll1,roll2,skillName:skill,skillValue,finalScore,targetValue:target,resultText});
     if(rollDiceButton) rollDiceButton.disabled=true; announceMessage(`Risultato test ${skill}: ${resultText}`);
     setTimeout(()=>{displayChapter(success?successChapter:failureChapter); saveGame();},2500);
}


// --- Funzioni Combattimento ---
function handleCombatActionAttack() {
     if (!gameState.combat || gameState.combat.turn !== 'player' || gameState.gameOver || !gameState.stats) return;
     if(typeof finalizeCombat !== 'function' || typeof addLogToCombat !== 'function' || typeof updateCombatUI !== 'function' || typeof updateCharacterSheetUI !== 'function') { console.error("handleCombatActionAttack: Funzioni dipendenti mancanti!"); return; }

     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0); if (activeEnemies.length === 0) { finalizeCombat(true); return; }
     const targetEnemy = activeEnemies[0]; const playerRoll1=Math.floor(Math.random()*6)+1, playerRoll2=Math.floor(Math.random()*6)+1, playerTotalRoll=playerRoll1+playerRoll2;
     let playerDamage = playerTotalRoll + gameState.stats.combattivita - targetEnemy.C;
     if (gameState.combat.doublePlayerDamage) playerDamage *= 2;
     if (playerTotalRoll === 2) { playerDamage = 0; addLogToCombat('logPlayerMiss',{targetName:targetEnemy.name,roll:playerTotalRoll},true); }
     else { if (playerTotalRoll === 12) playerDamage = Math.max(2, playerDamage); playerDamage = Math.max(0, playerDamage); targetEnemy.R -= playerDamage; addLogToCombat('logPlayerAttack',{targetName:targetEnemy.name,damage:playerDamage,roll:playerTotalRoll},true); }
     if (targetEnemy.R <= 0) addLogToCombat('logEnemyDefeated',{enemyName:targetEnemy.name},true);
     updateCombatUI(); updateCharacterSheetUI();
     if (gameState.combat.enemies.every(e => e.R <= 0)) { finalizeCombat(true); return; }
     gameState.combat.turn = 'enemy'; updateCombatUI(); setTimeout(handleEnemyCombatTurn, 1200);
}

function handleEnemyCombatTurn() {
     if (gameState.gameOver || !gameState.combat || gameState.combat.turn !== 'enemy' || !gameState.stats) return;
     if(typeof finalizeCombat !== 'function' || typeof addLogToCombat !== 'function' || typeof updateCombatUI !== 'function' || typeof updateCharacterSheetUI !== 'function' || typeof removeItem !== 'function') { console.error("handleEnemyCombatTurn: Funzioni dipendenti mancanti!"); return; }

     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0); let playerDefeated = false;
     activeEnemies.forEach(enemy => {
        if (playerDefeated || gameState.gameOver) return;
        const enemyRoll1=Math.floor(Math.random()*6)+1, enemyRoll2=Math.floor(Math.random()*6)+1, enemyTotalRoll=enemyRoll1+enemyRoll2;
        let enemyDamage = enemyTotalRoll + enemy.C - gameState.stats.combattivita;
        if (enemyTotalRoll === 2) { enemyDamage = 0; addLogToCombat('logEnemyMiss',{enemyName:enemy.name,roll:enemyTotalRoll},true); }
        else {
            let damageReduction = 0; const hasScudo = gameState.inventory.indossati.some(i => i.toLowerCase().includes("scudo")); if (hasScudo) damageReduction = 2;
            if (enemyTotalRoll === 12) { enemyDamage = Math.max(2, enemyDamage); if(hasScudo) enemyDamage = Math.max(2, enemyDamage - damageReduction); }
            else { if(hasScudo) enemyDamage = Math.max(0, enemyDamage - damageReduction); else enemyDamage = Math.max(0, enemyDamage); }
            enemyDamage = Math.max(0, enemyDamage);
            if (enemyDamage > 0) {
                gameState.stats.resistenza -= enemyDamage; addLogToCombat('logEnemyAttack',{enemyName:enemy.name,damage:enemyDamage,roll:enemyTotalRoll},true);
                if (gameState.stats.resistenza <= 0) {
                    const corpettoIndex = gameState.inventory.indossati.findIndex(i => i.toLowerCase().includes("corpetto"));
                    if (corpettoIndex !== -1) { const corpettoName = gameState.inventory.indossati[corpettoIndex]; removeItem(corpettoName); gameState.stats.resistenza = 1; addLogToCombat('logArmorSave',{},true); }
                    else { addLogToCombat('logDefeat',{},true); playerDefeated = true; }
                }
            } else { addLogToCombat('logEnemyNoDamage',{enemyName:enemy.name,roll:enemyTotalRoll},true); }
        }
        updateCharacterSheetUI(); updateCombatUI();
     });
     if (playerDefeated) { finalizeCombat(false); return; }
     gameState.combat.turn = 'player'; updateCombatUI();
}

function finalizeCombat(playerWon) {
    // Verifica dipendenze
    if (typeof gameState === 'undefined' || typeof addLogToCombat !== 'function' || typeof displayChapter !== 'function' || typeof saveGame !== 'function' || typeof handleGameOver !== 'function') { console.error("finalizeCombat: Dipendenze mancanti!"); return;}

    const victoryChapter = gameState.combat?.victoryChapter;
    gameState.combat = null; // Pulisce stato combattimento
    if (playerWon) {
        addLogToCombat('logVictory', {}, true); // Aggiunge log vittoria
        console.log("Combattimento vinto!");
        setTimeout(() => displayChapter(victoryChapter || gameState.chapter + 1), 1500); // Ritardo per leggere log
        saveGame();
    } else {
        console.log("Combattimento perso!");
        handleGameOver('infoGameOverCombat'); // Chiama handleGameOver
    }
}

function addLogToCombat(messageKey, params = {}, scroll = false) {
    if(typeof getString !== 'function' || typeof addLogToUI !== 'function') { console.error("addLogToCombat: getString o addLogToUI non definite!"); return; }
    const message = getString(messageKey, params); console.log("COMBAT LOG:", message); combatLog.push(message); addLogToUI(message);
}

// --- Funzione Game Over (Logica + chiamata UI) ---
function handleGameOver(reasonKey, params = {}) {
    if(gameState.gameOver) return; // Evita chiamate multiple
    gameState.gameOver = true; // Imposta flag
    console.log("Game Over:", reasonKey, params);
    // Chiama la funzione UI per mostrare l'overlay
    if(typeof showGameOverUI === 'function') showGameOverUI(reasonKey, params); // Chiama da ui.js
    else console.error("Funzione showGameOverUI non definita!");
    // Disabilita bottoni Salva/Carica nel contenitore globale
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true);
}

// --- Fine Sezione 3 (Engine) ---
console.log("script.js: Sezione 3 (Engine) definita.");

// CONTINUA NELLA PROSSIMA RISPOSTA... (Parte 4: Inizializzazione Main)
// script.js (Unificato) - PARTE 4 di 4
// Contiene: Inizializzazione e Gestione Eventi (ex main.js)

// ======================================================
// SEZIONE 4: Inizializzazione e Gestione Eventi
// ======================================================

/**
 * Mostra un messaggio all'utente tramite la regione ARIA live.
 * @param {string} message - Il messaggio da mostrare.
 * @param {string} [politeness='polite'] - Livello ARIA live ('polite' o 'assertive').
 */
function announceMessage(message, politeness = 'polite') {
    // Verifica che l'elemento esista (dovrebbe essere cachato da cacheDOMElements)
    // Aggiungiamo un controllo per sicurezza, nel caso venga chiamata prima del caching
    const msgEl = typeof gameMessagesEl !== 'undefined' ? gameMessagesEl : document.getElementById('game-messages');
    if (msgEl) {
        msgEl.setAttribute('aria-live', politeness);
        msgEl.textContent = message; // Imposta il testo del messaggio
        // Pulisce dopo un timeout
        setTimeout(() => { if(msgEl) msgEl.textContent = ''; }, 3500);
    } else {
        console.warn("Elemento #game-messages non trovato per announceMessage.");
    }
    console.log(`Announce (${politeness}): ${message}`); // Log per debug
}

/**
 * Wrapper per chiamare loadGame da state.js e gestire l'aggiornamento UI/messaggi.
 * Chiamata quando l'utente clicca "Carica Partita".
 */
function loadGameAndUpdateUI() {
    // Verifica che le funzioni necessarie siano definite globalmente
    // Queste funzioni dovrebbero essere state definite nelle sezioni precedenti di questo file
    if (typeof loadGame !== 'function' || typeof getString !== 'function' || typeof setLanguage !== 'function' || typeof displayInitialStateUI !== 'function' || typeof displayChapter !== 'function' || typeof updateCharacterSheetUI !== 'function' || typeof updateAllUIStrings !== 'function' ) {
         console.error("Errore CRITICO: Funzioni necessarie per loadGameAndUpdateUI non definite!");
         alert((typeof getString === 'function' ? getString('errorGeneric') : "Errore") || "Si è verificato un errore interno durante il caricamento.");
         return;
     }

    if (loadGame()) { // loadGame (da Sezione 1) ritorna true se caricato con successo
        announceMessage(getString('infoGameLoaded'), 'assertive'); // Notifica accessibile
        setLanguage(currentLang); // Riapplica lingua corrente (da strings.js, chiama displayChapter/InitialState)
        // Assicura che i bottoni globali siano abilitati dopo un caricamento riuscito
        if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false);
    } else {
        // Se loadGame ritorna false, gestisci il motivo
        if (!localStorage.getItem(SAVE_KEY)) {
             announceMessage(getString('infoNoSavedGame'));
             alert(getString('infoNoSavedGame')); // Feedback utente immediato
        } else {
             // Errore durante il caricamento (es. dati corrotti)
             announceMessage(getString('errorLoadFailed'), 'assertive');
             alert(getString('errorLoadFailed'));
        }
        displayInitialStateUI(); // Mostra stato iniziale pulito (da Sezione 2)
    }
}

/**
 * Wrapper per chiamare resetGame da state.js e gestire l'aggiornamento UI/messaggi.
 * Chiamata quando l'utente clicca "Nuova Partita".
 * @param {boolean} [confirmReset=true] - Se chiedere conferma all'utente.
 */
function resetGameAndUpdateUI(confirmReset = true) {
     // Verifica funzioni necessarie
     if (typeof resetGame !== 'function' || typeof getString !== 'function' || typeof showInitScreen !== 'function') {
         console.error("Errore CRITICO: Funzioni necessarie per resetGameAndUpdateUI non definite!");
         alert(getString('errorGeneric') || "Si è verificato un errore interno durante il reset.");
         return;
     }

    if (resetGame(confirmReset)) { // resetGame (da Sezione 1) ritorna true se l'utente conferma
        announceMessage(getString('infoNewGame'));
        showInitScreen(); // Chiama funzione da Sezione 2 per mostrare schermata config PE
    } else {
        console.log("Reset annullato dall'utente."); // Nessun messaggio UI se l'utente annulla
    }
}


/**
 * Funzione di Inizializzazione Principale dell'Applicazione.
 * Chiamata dopo che il DOM è pronto.
 */
function initializeApp() {
    console.log("initializeApp: Inizio inizializzazione completa...");

    // 1. Cache elementi DOM (definita in Sezione 2)
    // Verifica esistenza funzione prima di chiamare
    if (typeof cacheDOMElements === 'function') {
        cacheDOMElements();
    } else {
        console.error("FATAL: Funzione cacheDOMElements non definita! Impossibile continuare.");
        document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico nell'inizializzazione UI (cache).</h1>`;
        return;
    }

    // 2. Verifica dipendenze - Rimossa (ci affidiamo all'ordine e ai check al momento dell'uso)
    console.log("initializeApp: Verifica dipendenze non eseguita (affidamento a 'defer').");

    // 3. Init Three.js (definita in three_setup.js, ma deve essere nello scope globale o importata)
    console.log("initializeApp: Chiamo initThree...");
    // Verifica esistenza
    if (typeof initThree === 'function') {
        initThree();
        console.log("initializeApp: initThree chiamata.");
    } else {
        console.error("initThree non definita (da three_setup.js?)");
        // Considera se mostrare un fallback o un messaggio se la grafica 3D è essenziale/importante
        const visualsDiv = document.getElementById('visuals');
        if (visualsDiv) visualsDiv.innerHTML = "<p style='color:orange; text-align:center;'>Grafica 3D non caricata.</p>";
    }

    // 4. Init UI Strings (definita in Sezione 2)
    console.log("initializeApp: Chiamo updateAllUIStrings...");
    if (typeof updateAllUIStrings === 'function') updateAllUIStrings(); else console.error("updateAllUIStrings non definita!");
    console.log("initializeApp: updateAllUIStrings chiamata (se definita).");

    // 5. Mostra stato iniziale UI (definita in Sezione 2)
    console.log("initializeApp: Chiamo displayInitialStateUI...");
    if (typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("displayInitialStateUI non definita!");
    console.log("initializeApp: displayInitialStateUI chiamata (se definita).");

    // 6. Imposta lingua iniziale (definita in strings.js, resa globale)
    console.log("initializeApp: Imposto lingua iniziale...");
    // Verifica esistenza uiStrings e setLanguage
    const browserLang = navigator.language.split('-')[0];
    const initialLang = (typeof uiStrings !== 'undefined' && uiStrings[browserLang]) ? browserLang : 'it';
    if (typeof setLanguage === 'function') setLanguage(initialLang); else console.error("setLanguage non definita!");
    if(langSelect) langSelect.value = currentLang; // currentLang da strings.js
    console.log("initializeApp: Lingua impostata (se possibile).");

    // --- 7. AGGIUNTA DEGLI EVENT LISTENER AI CONTROLLI ---
    console.log("initializeApp: Aggiungo Event Listeners...");

    // Bottoni Globali
    const saveBtn = document.getElementById('save-button');
    const loadBtn = document.getElementById('load-button');
    const newGameBtn = document.getElementById('new-game-button');
    // Verifica esistenza bottone E funzione prima di aggiungere listener
    if (saveBtn && typeof saveGame === 'function') {
        saveBtn.addEventListener('click', saveGame); // Rimosso announceMessage da qui
    } else { console.warn("#save-button o funzione saveGame mancante."); }
    if (loadBtn && typeof loadGameAndUpdateUI === 'function') {
        loadBtn.addEventListener('click', loadGameAndUpdateUI);
    } else { console.warn("#load-button o funzione loadGameAndUpdateUI mancante."); }
    if (newGameBtn && typeof resetGameAndUpdateUI === 'function') {
        newGameBtn.addEventListener('click', () => resetGameAndUpdateUI(true));
    } else { console.warn("#new-game-button o funzione resetGameAndUpdateUI mancante."); }

    // Selettore Lingua
    if (langSelect && typeof setLanguage === 'function') {
        langSelect.addEventListener('change', (event) => setLanguage(event.target.value));
    } else { console.warn("#lang-select o funzione setLanguage mancante."); }

    // Listener per Elementi Dinamici (Configurazione, Combattimento, Skill Check) - Delegation
    if (peSpendingOptionsEl) {
        peSpendingOptionsEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.tagName === 'BUTTON' && (target.classList.contains('pe-btn-plus') || target.classList.contains('pe-btn-minus'))) {
                const stat = target.dataset.stat; const change = parseInt(target.dataset.change);
                if (stat && !isNaN(change) && typeof changeStatPE === 'function') changeStatPE(stat, change); // Da engine
            } else if (target.id === 'confirm-pe-button') {
                 if (typeof confirmPESpending === 'function') confirmPESpending(); // Da engine
                 else console.error("Funzione confirmPESpending non definita!");
            }
        });
    } else { console.warn("#pe-spending-options non trovato per delegation."); }

    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleLanguageSelection === 'function') handleLanguageSelection(event.target); // Da engine
         });
    } else { console.warn("#pe-language-selection non trovato per delegation."); }

     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleInitialItemChange === 'function') handleInitialItemChange(); // Da ui
         });
     } else { console.warn("#initial-items-selection non trovato per delegation."); }

     if (startGameButton) {
        if (typeof startGame === 'function') startGameButton.addEventListener('click', startGame); // Da engine
        else console.error("Funzione startGame non definita per bottone!");
     } else { console.warn("#start-game-button non trovato.");}

     if (rollDiceButton) {
        if (typeof resolveSkillCheck === 'function') rollDiceButton.addEventListener('click', resolveSkillCheck); // Da engine
        else console.error("Funzione resolveSkillCheck non definita per bottone!");
     } else { console.warn("#roll-dice-button non trovato."); }

     // Listener per Azioni Combattimento (delegation su #actions)
     if (actionsEl) {
         actionsEl.addEventListener('click', (event) => {
             const target = event.target;
             // Esegui solo se è un bottone DI COMBATTIMENTO, siamo in combattimento, ed è il turno del giocatore
             if (target.tagName === 'BUTTON' && gameState.combat && gameState.combat.turn === 'player') {
                 // Identifica bottone attacco (usa ID o testo localizzato)
                 if (target.id === 'combat-attack-button' || target.textContent === getString('attackButtonLabel')) {
                      // Verifica esistenza funzione prima di chiamare
                      if (typeof handleCombatActionAttack === 'function') handleCombatActionAttack(); else console.error("handleCombatActionAttack non definito!");
                 }
                 // Gestione Fuga (se implementata)
                 // else if (target.id === 'combat-flee-button' || ...) { /* handleFlee(); */ }
             }
             // I listener per i bottoni di scelta capitolo normale sono aggiunti
             // direttamente ai bottoni creati in displayChapter (engine.js)
         });
     } else { console.warn("#actions non trovato per listener delegato."); }

     console.log("initializeApp: Event Listeners aggiunti.");
     console.log(">>>> GIOCO PRONTO <<<<");
}


// --- ESECUZIONE PRINCIPALE ---
// Assicura che l'HTML sia pronto prima di eseguire l'inizializzazione
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else { // DOM già caricato
    initializeApp();
}


// --- Event Listener Globale (Salvataggio su Chiusura) ---
// Usa 'visibilitychange' e 'pagehide' per maggiore affidabilità
document.addEventListener('visibilitychange', () => {
    // Salva se la pagina diventa nascosta E il gioco è in uno stato valido
    if (document.visibilityState === 'hidden') {
         if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
             saveGame();
             console.log("Salvataggio su visibilitychange (hidden).");
         }
    }
});

window.addEventListener('pagehide', (event) => {
    // Salva se il gioco è in uno stato valido prima che la pagina venga eventualmente scaricata
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
        saveGame(); // Funzione da state.js
        console.log("Salvataggio su pagehide.");
    }
});

// --- Fine script.js ---
console.log("script.js: Script analizzato e inizializzazione avviata/completata.");