// script.js (Unificato) - PARTE 1 di 4
// Contiene: Variabili Globali, Stato Iniziale, Funzioni Persistenza, Funzioni Inventario

// ======================================================
// SEZIONE 1: Variabili Globali e Stato Iniziale
// ======================================================
console.log("script.js: Inizializzazione variabili stato...");

// --- Stato Globale del Gioco ---
let gameState = {}; // Stato corrente del gioco, inizializzato vuoto all'inizio

// --- Variabili Temporanee per Configurazione Iniziale ---
// Queste vengono popolate solo durante la fase di creazione del personaggio
let tempStats = {};
let tempLang = null;
let peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

// --- Log di Combattimento (Volatile) ---
let combatLog = [];

// --- Stato Iniziale Default (Costante) ---
// Definisce la struttura e i valori di partenza per una nuova partita.
const initialGameState = Object.freeze({ // Impedisce modifiche accidentali all'oggetto base
    chapter: 0,
    stats: {
        combattivita: 5,
        resistenza: 30,
        resistenzaMax: 30,
        mira: 0,
        movimento: 0,
        sotterfugio: 0,
        scassinare: 0,
        percezione: 0,
        conoscenzaArcana: 0,
        puntiEsperienza: 3
    },
    lingue: ["Lingua Comune"],
    moneteOro: 5,
    inventory: {
        armi: ["Spada/Arma da corpo a corpo", "Arco/Arma dalla distanza"],
        indossati: ["Corpetto di Cuoio/Armatura", "Scudo/Scudo"],
        zaino: [],
        hasZaino: true
    },
    keywords: {
        attuali: [],
        permanenti: []
    },
    combat: null,
    skillCheck: null,
    gameOver: false
});

// Chiave usata per salvare/caricare da localStorage
const SAVE_KEY = 'librogameIlPassoMorteState';

// --- Funzioni di Persistenza (Salvataggio/Caricamento/Reset) ---

/**
 * Salva lo stato corrente del gioco (`gameState`) in localStorage.
 * Salva solo se il gioco è iniziato (ha statistiche valide), non è al capitolo 0, e non è game over.
 */
function saveGame() {
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            console.log('Partita Salvata (stato attuale).');
            // La notifica UI è gestita da chi chiama saveGame (in questo caso, la funzione wrapper in questo stesso file)
            if (typeof announceMessage === 'function' && typeof getString === 'function') {
                announceMessage(getString('infoGameSaved'));
            } else {
                console.warn("Funzioni per messaggio salvataggio mancanti.");
            }
        } catch (e) {
            console.error("Errore nel salvataggio in localStorage:", e);
            if (typeof announceMessage === 'function' && typeof getString === 'function') {
                announceMessage(getString('errorSaveFailed'), 'assertive');
            } else {
                alert("Errore Salvataggio!"); // Fallback
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
    const savedState = localStorage.getItem(SAVE_KEY);
    if (savedState) {
        try {
            const loadedData = JSON.parse(savedState);
            // Validazione più robusta della struttura dati caricata
            if (!loadedData || typeof loadedData !== 'object' || typeof loadedData.chapter !== 'number' || typeof loadedData.stats !== 'object' || typeof loadedData.inventory !== 'object' || !Array.isArray(loadedData.lingue) || typeof loadedData.moneteOro !== 'number' || typeof loadedData.keywords !== 'object' || !Array.isArray(loadedData.keywords.attuali) || !Array.isArray(loadedData.keywords.permanenti)) {
                throw new Error("Dati salvati non validi o struttura incompleta/corrotta.");
            }
            // Sovrascrive lo stato corrente con quello caricato
            gameState = loadedData;
            // Resetta stati volatili che non devono persistere o essere caricati
            gameState.gameOver = false; // Il gioco riprende
            gameState.combat = null;    // Non si carica in combattimento
            gameState.skillCheck = null; // Non si carica in skill check
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
 * @param {string} itemName - Nome completo oggetto.
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

    if (cleanItemName.toLowerCase() === "zaino") {
         if(inv.hasZaino) { inv.hasZaino = false; inv.zaino = []; removed = true; announceMessage(getString('infoItemRemoved', {itemName: getString('backpackStatusLabel')})); }
     } else {
         const lists = ['zaino', 'armi', 'indossati'];
         for (const listName of lists) {
             if (!inv[listName]) continue; // Salta se la lista non esiste
             const index = inv[listName].findIndex(item => item.toLowerCase().startsWith(cleanItemName.toLowerCase()));
             if (index !== -1) { const removedItemFullName = inv[listName].splice(index, 1)[0]; removed = true; announceMessage(getString('infoItemRemoved', { itemName: removedItemFullName.split('/')[0] })); break; }
         }
     }
    if(removed) { updateCharacterSheetUI(); }
    else { console.warn(`Oggetto non trovato per rimozione: ${itemNameToRemove}`); }
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
// Popolate da cacheDOMElements()
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
 * DA CHIAMARE UNA SOLA VOLTA da main.js (Sezione 4) dopo DOMContentLoaded.
 */
function cacheDOMElements() {
    console.log("cacheDOMElements: Inizio caching..."); // Log inizio caching
    chapterTextEl = document.getElementById('chapter-text');
    actionsEl = document.getElementById('actions');
    combatInfoEl = document.getElementById('combat-info');
    combatEnemiesEl = document.getElementById('combat-enemies'); // ID corretto da HTML
    combatLogEl = document.getElementById('combat-log');
    diceRollEl = document.getElementById('dice-roll-area');
    diceResultEl = document.getElementById('dice-result');
    skillCheckPromptEl = document.getElementById('skill-check-prompt');
    rollDiceButton = document.getElementById('roll-dice-button');
    chapterTitleEl = document.getElementById('chapter-title');
    chapterTitleContainer = document.getElementById('chapter-title-container');
    imageContainer = document.getElementById('chapter-image-container');
    imageEl = document.getElementById('chapter-image');
    initOptionsEl = document.getElementById('init-options'); // Vecchio contenitore, verificare se ancora usato o rimuovere
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
         document.body.innerHTML = "<h1>Errore: Interfaccia utente non caricata correttamente (mancano elementi chiave).</h1>";
         throw new Error("Elementi UI critici mancanti."); // Blocca esecuzione se mancano elementi base
    } else {
        console.log("Elementi DOM Caching completato.");
    }
}


// --- Funzioni UI Pubbliche ---

/**
 * Mostra lo stato iniziale della UI (capitolo 0, nasconde elementi specifici).
 */
function displayInitialStateUI() {
    if (!chapterTextEl || !chapterTitleEl || !actionsEl || !globalActionsContainer) { console.error("displayInitialStateUI: Elementi UI principali non trovati!"); return; }

    // Mostra testo capitolo 0
    if (typeof gameData !== 'undefined' && typeof getString === 'function' && gameData["0"]) {
         const introChapter = gameData["0"];
         chapterTextEl.innerHTML = introChapter.text ? introChapter.text.replace(/\n/g, '<br>') : getString('loadingText');
         chapterTitleEl.textContent = introChapter.title || '';
         if (introChapter.images && introChapter.images.length > 0 && imageContainer) imageContainer.classList.add('hidden');
    } else {
         chapterTextEl.innerHTML = (typeof getString === 'function') ? getString('loadingText') : 'Loading...';
         chapterTitleEl.textContent = '';
    }
    // Nasconde sezioni specifiche
    actionsEl.innerHTML = '';
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
    if(initOptionsEl) initOptionsEl.classList.add('hidden');
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');

    updateCharacterSheetUI(); // Aggiorna scheda (mostra valori vuoti/default)
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false); // Abilita bottoni globali
}

/**
 * Prepara e mostra l'interfaccia per la configurazione iniziale del personaggio (Fase 1: Spesa PE).
 */
function showInitScreen() {
     // Verifica esistenza funzioni/stato base necessari
     if (typeof initialGameState === 'undefined' || typeof gameState === 'undefined' || typeof JSON === 'undefined' || typeof updateAllUIStrings !== 'function' || typeof displayInitialStateUI !== 'function' || typeof setupPESpendingUI !== 'function' || typeof updatePESpendingUI !== 'function' || typeof updateLanguageSelectionLabels !== 'function' || typeof getString !== 'function' || typeof announceMessage !== 'function') { console.error("Errore critico: Dipendenze mancanti per showInitScreen!"); if(chapterTextEl) chapterTextEl.textContent = getString('errorGeneric') || "Errore"; return; }

    console.log("showInitScreen: Avvio configurazione personaggio...");
    // Resetta stato temporaneo per spesa PE
    tempStats = JSON.parse(JSON.stringify(initialGameState.stats));
    tempLang = null;
    peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

    // Mostra la UI corretta
    // Non chiamare displayInitialStateUI qui, resetterebbe troppo
    if(actionsEl) actionsEl.innerHTML = '';
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.remove('hidden'); else console.error("Elemento peSpendingOptionsEl non trovato!");
    // if(initOptionsEl) initOptionsEl.classList.remove('hidden'); // Non più necessario se non è un container separato

    // Imposta titolo e pulisce testo
    if(chapterTitleEl) chapterTitleEl.textContent = getString('configTitlePE'); else console.error("Elemento chapterTitleEl non trovato!");
    if(chapterTextEl) chapterTextEl.innerHTML = '';

    // Resetta Checkbox Lingue
    if(peLanguageSelectionEl) { peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; }); }

    // Aggiorna UI spesa PE e label
    updatePESpendingUI();
    updateLanguageSelectionLabels();
    updateAllUIStrings(); // Aggiorna tutti gli altri testi statici

    announceMessage(getString('infoConfigStart'));
    if(chapterTitleContainer) chapterTitleContainer.focus(); else console.warn("chapterTitleContainer non trovato per focus.");
}

/**
 * Prepara la UI per la schermata di scelta oggetti iniziali.
 */
function setupInitialItemsUI() {
    if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !initItemsSelectionEl || !startGameButton || typeof handleInitialItemChange !== 'function' || typeof updateInitialItemLabels !== 'function' || typeof getString !== 'function') { console.error("Errore UI Oggetti o funzioni mancanti!"); return; }
    peSpendingOptionsEl.classList.add('hidden');
    initialItemsOptionsEl.classList.remove('hidden');
    // if(initOptionsEl) initOptionsEl.classList.remove('hidden');

    chapterTitleEl.textContent = getString('configTitleItems');

    if(initItemsSelectionEl) {
         initItemsSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
          handleInitialItemChange(); // Aggiorna stato bottone Start
    }
     updateInitialItemLabels(); // Assicura label tradotte
}


/**
 * Aggiorna la UI durante la spesa dei PE (valori temp, PE rimasti, stato bottoni).
 */
function updatePESpendingUI() {
    if (!peRemainingEl || !confirmPEButton || typeof initialGameState === 'undefined' || !initialGameState.stats || typeof peSpent === 'undefined' || typeof tempStats === 'undefined') { return; }
    const peLeft = initialGameState.stats.puntiEsperienza - peSpent.total;
    peRemainingEl.textContent = peLeft;
    for (const statKey in tempStats) { if (!tempStats.hasOwnProperty(statKey) || tempStats[statKey] === undefined) continue; const statEl = document.getElementById(`temp-stat-${statKey}`); if (statEl) statEl.textContent = tempStats[statKey]; const peSpentEl = document.getElementById(`pe-spent-${statKey}`); if (peSpentEl) peSpentEl.textContent = peSpent[statKey] !== undefined ? peSpent[statKey] : 0; }
    const peSpentLangEl = document.getElementById('pe-spent-lingua'); if(peSpentLangEl) peSpentLangEl.textContent = peSpent.lingua !== undefined ? peSpent.lingua : 0;
    const baseStats = initialGameState.stats;
    document.querySelectorAll('.pe-stat-row').forEach(row => { const plusButton = row.querySelector('.pe-btn-plus'); const minusButton = row.querySelector('.pe-btn-minus'); if(!plusButton || !minusButton) return; const statKey = plusButton.dataset.stat; if (!statKey || !tempStats.hasOwnProperty(statKey) || peSpent[statKey] === undefined) return; const currentValue = tempStats[statKey]; const currentPeSpentOnThis = peSpent[statKey] || 0; const maxPESpentOnStat = 1; const canAffordMorePE = peLeft > 0; let canIncrement = canAffordMorePE && currentPeSpentOnThis < maxPESpentOnStat; if (statKey === 'resistenza' && currentValue >= baseStats.resistenza + 3) canIncrement = false; if (statKey !== 'resistenza' && currentValue >= baseStats[statKey] + 1) canIncrement = false; plusButton.disabled = !canIncrement; minusButton.disabled = currentPeSpentOnThis <= 0; });
     const canAffordLanguage = peLeft > 0;
     if(peLanguageSelectionEl) { peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.disabled = (peSpent.lingua >= 1 && !cb.checked) || (!canAffordLanguage && peSpent.lingua < 1); }); }
    confirmPEButton.disabled = peSpent.total !== initialGameState.stats.puntiEsperienza;
}

/**
 * Aggiorna la visualizzazione della scheda personaggio nel DOM.
 */
function updateCharacterSheetUI() {
    const stats = gameState && gameState.stats ? gameState.stats : { combattivita: 0, resistenza: 0, resistenzaMax: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0 };
    const inventory = gameState && gameState.inventory ? gameState.inventory : { armi: [], indossati: [], zaino: [], hasZaino: false };
    const languages = gameState && gameState.lingue ? gameState.lingue : [];
    const gold = gameState && gameState.moneteOro !== undefined ? gameState.moneteOro : 0;
    const keywords = gameState && gameState.keywords ? gameState.keywords : { attuali: [], permanenti: [] };

    // Aggiorna elementi DOM (con controlli esistenza)
    if (statCombattivita) statCombattivita.textContent = stats.combattivita;
    if (statResistenza) statResistenza.textContent = Math.max(0, stats.resistenza);
    if (statResistenzaMax) statResistenzaMax.textContent = stats.resistenzaMax;
    if (statMira) statMira.textContent = stats.mira;
    if (statMovimento) statMovimento.textContent = stats.movimento;
    if (statSotterfugio) statSotterfugio.textContent = stats.sotterfugio;
    if (statScassinare) statScassinare.textContent = stats.scassinare;
    if (statPercezione) statPercezione.textContent = stats.percezione;
    if (statConoscenzaArcana) statConoscenzaArcana.textContent = stats.conoscenzaArcana;
    if (lingueList) lingueList.innerHTML = languages.map(l => `<li>${l}</li>`).join('');
    if (moneteOro) moneteOro.textContent = gold;
    if (hasZaino) hasZaino.checked = inventory.hasZaino;
    if (zainoCount) zainoCount.textContent = inventory.zaino ? inventory.zaino.length : 0;
    if (armiList) armiList.innerHTML = inventory.armi.map(i => `<li>${i.split('/')[0]}</li>`).join('');
    if (indossatiList) indossatiList.innerHTML = inventory.indossati.map(i => `<li>${i.split('/')[0]}</li>`).join('');
    if (zainoList) zainoList.innerHTML = inventory.zaino.map(i => `<li>${i.split('/')[0]}</li>`).join('');
    if (keywordsAttualiList) keywordsAttualiList.innerHTML = keywords.attuali.map(k => `<li>${k}</li>`).join('');
    if (keywordsPermanentiList) keywordsPermanentiList.innerHTML = keywords.permanenti.map(k => `<li>${k}</li>`).join('');

     if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'off');
     setTimeout(() => { if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'polite'); }, 50);
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
    if (gameState.gameOver) { console.log("Game is over, cannot display chapter."); return; }
    // Assicurati che le dipendenze siano pronte
    if (typeof gameState === 'undefined' || typeof gameData === 'undefined' || typeof chapterTextEl === 'undefined' || typeof actionsEl === 'undefined' || typeof updateCharacterSheetUI !== 'function' || typeof getString !== 'function') { console.error("Errore critico: Stato, dati o funzioni UI base mancanti in displayChapter!"); return; }
    if (!gameData[chapterId]) { console.error(`Capitolo ${chapterId} non trovato in gameData!`); chapterTextEl.innerHTML = getString('errorChapterNotFound', { chapterId: chapterId }); actionsEl.innerHTML = ''; return; }
    if (!gameState.stats && chapterId !== 0) { console.log("Stato non inizializzato, reindirizzo all'inizio."); if(typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("displayInitialStateUI non def!"); return; }

    gameState.chapter = chapterId;
    const chapter = gameData[chapterId];
    console.log(`--- Caricamento Capitolo ${chapterId} ('${chapter.title || ''}') ---`);

    // Reset UI elements (chiama funzioni UI)
    actionsEl.innerHTML = '';
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    // Resetta stati interni del motore per il nuovo capitolo
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
    if (chapter.effects && Array.isArray(chapter.effects)) { chapter.effects.forEach(applyEffect); }

    // Impostare Immagine
    if (chapter.images && Array.isArray(chapter.images) && chapter.images.length > 0 && imageContainer && imageEl) {
        const imageData = chapter.images[0];
        imageEl.src = imageData.src; imageEl.alt = imageData.alt || `Illustrazione capitolo ${chapterId}`; // Fallback ALT
        imageContainer.classList.remove('hidden');
    }

    // Impostare Testo e Titolo
    chapterTextEl.innerHTML = chapter.text ? chapter.text.replace(/\n/g, '<br>') : '';
    chapterTitleEl.textContent = chapterId === 0 ? "" : chapter.title || `${getString('chapterLabel')} ${chapterId}`;

    // Impostare Combattimento o Skill Check
    if (chapter.combat && !gameState.skillCheck) {
         // Deep copy per evitare modifiche all'originale in gameData
         gameState.combat = JSON.parse(JSON.stringify(chapter.combat));
         if(gameState.combat.enemies && Array.isArray(gameState.combat.enemies)) {
             gameState.combat.enemies.forEach(e => { if(e.initialR === undefined) e.initialR = e.R; }); // Assicura initialR
         } else { gameState.combat.enemies = []; } // Inizializza se manca
         gameState.combat.turn = 'player'; // Il giocatore inizia sempre?
         if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non definita!");
    } else if (chapter.skillCheck && !gameState.combat) {
         gameState.skillCheck = { ...chapter.skillCheck }; // Copia oggetto
         if(typeof updateSkillCheckUI === 'function') updateSkillCheckUI(gameState.skillCheck); else console.error("updateSkillCheckUI non definita!");
    } else { // Nasconde UI specifiche se non attive
         if(combatInfoEl) combatInfoEl.classList.add('hidden');
         if(diceRollEl) diceRollEl.classList.add('hidden');
     }

    // Render Buttons (se non in combat/skill check)
    if (!gameState.combat && !gameState.skillCheck && chapterId !== 0) {
        actionsEl.innerHTML = ''; // Assicura sia pulito
        let itemsOffered = [];
        // Cerca oggetti offerti esplicitamente (da compile_chapters)
        if (chapter.itemsOffered && Array.isArray(chapter.itemsOffered)) { itemsOffered = chapter.itemsOffered; }
        else { /* Fallback cerca "Puoi prendere" - Omesso per brevità, ma la logica era nella risposta precedente se serve */ }

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
            button.addEventListener('click', (event) => { if (addItem(item.name, item.type)) { event.target.disabled = true; event.target.textContent = getString('buttonTakeItemTaken', { itemName: getString('item_' + itemKey) || cleanItemName }); saveGame(); } });
            actionsEl.appendChild(button);
        });

        // Crea Bottoni Scelte Navigazione
        if(chapter.choices && Array.isArray(chapter.choices)) {
            chapter.choices.forEach(choice => {
                let shouldDisplay = !choice.condition || checkCondition(choice.condition); // Usa checkCondition
                if (shouldDisplay) {
                    const button = document.createElement('button');
                    button.textContent = choice.text.includes(getString('chapterLabel')) ? choice.text : `${choice.text} (${getString('chapterLabel')} ${choice.target})`;
                    button.addEventListener('click', () => { displayChapter(choice.target); saveGame(); });
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
    if (gameState.stats && gameState.stats.resistenza <= 0 && !gameState.combat && !gameState.gameOver) { handleGameOver('infoGameOverDesc'); } // Chiama da questo file

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
                 else { console.warn("Invalid ITEM_ADD details or addItem function missing:", effect.details); }
                 break;
            case 'ITEM_REMOVE':
                 const itemNameToRemove = detailValue1;
                 if(itemNameToRemove && typeof removeItem === 'function') removeItem(itemNameToRemove); // Chiama da state.js
                 else { console.warn("Invalid ITEM_REMOVE details or removeItem function missing:", effect.details); }
                 break;
            case 'COMBAT_MOD':
                 if(detailValue1 === 'PARTNER_DAMAGE_DOUBLE' && detailValue2 === 'true') { console.log("Attivato mod: danno doppio"); if(gameState.combat) gameState.combat.doublePlayerDamage = true; else console.warn("COMBAT_MOD fuori da combat"); }
                 break;
            default: console.warn(`Unknown effect type: ${effect.type}`);
        }
    } catch (e) { console.error("Error applying effect:", effect, e); }
    // UI Update avviene alla fine di displayChapter
}

// --- Funzione Controllo Condizioni (DA COMPLETARE CON TUTTE LE CONDIZIONI) ---
function checkCondition(conditionText) {
     if (!gameState || !gameState.inventory || !conditionText) return true; // Assumi true se stato non pronto
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
         } else { console.warn(`Statistica non valida o valore non numerico in checkCondition: ${conditionText}`); return false; } // Stat non valida -> Falso
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
     if (!gameState.combat || gameState.combat.turn !== 'player' || gameState.gameOver || typeof gameState.stats === 'undefined') return; // Check stato valido
     // Verifica funzioni necessarie
     if(typeof finalizeCombat !== 'function' || typeof addLogToCombat !== 'function' || typeof updateCombatUI !== 'function' || typeof updateCharacterSheetUI !== 'function') { console.error("handleCombatActionAttack: Funzioni dipendenti mancanti!"); return; }

     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0); if (activeEnemies.length === 0) { finalizeCombat(true); return; }
     const targetEnemy = activeEnemies[0]; const playerRoll1=Math.floor(Math.random()*6)+1, playerRoll2=Math.floor(Math.random()*6)+1, playerTotalRoll=playerRoll1+playerRoll2;
     let playerDamage = playerTotalRoll + gameState.stats.combattivita - targetEnemy.C;
     if (gameState.combat.doublePlayerDamage) playerDamage *= 2; // Applica mod danno doppio
     if (playerTotalRoll === 2) { playerDamage = 0; addLogToCombat('logPlayerMiss',{targetName:targetEnemy.name,roll:playerTotalRoll},true); }
     else { if (playerTotalRoll === 12) playerDamage = Math.max(2, playerDamage); playerDamage = Math.max(0, playerDamage); targetEnemy.R -= playerDamage; addLogToCombat('logPlayerAttack',{targetName:targetEnemy.name,damage:playerDamage,roll:playerTotalRoll},true); }
     if (targetEnemy.R <= 0) addLogToCombat('logEnemyDefeated',{enemyName:targetEnemy.name},true);
     updateCombatUI(); updateCharacterSheetUI(); // Aggiorna UI dopo attacco
     if (gameState.combat.enemies.every(e => e.R <= 0)) { finalizeCombat(true); return; } // Check vittoria
     gameState.combat.turn = 'enemy'; updateCombatUI(); setTimeout(handleEnemyCombatTurn, 1200); // Passa turno a nemico
}

function handleEnemyCombatTurn() {
     if (gameState.gameOver || !gameState.combat || gameState.combat.turn !== 'enemy' || typeof gameState.stats === 'undefined') return;
     // Verifica funzioni necessarie
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
        updateCharacterSheetUI(); updateCombatUI(); // Aggiorna UI dopo ogni attacco nemico
     });
     if (playerDefeated) { finalizeCombat(false); return; } // Check sconfitta DOPO che tutti hanno attaccato
     gameState.combat.turn = 'player'; updateCombatUI(); // Passa turno a giocatore
}

function finalizeCombat(playerWon) {
    // Verifica funzioni necessarie
    if (typeof gameState === 'undefined' || typeof addLogToCombat !== 'function' || typeof displayChapter !== 'function' || typeof saveGame !== 'function' || typeof handleGameOver !== 'function') { console.error("finalizeCombat: Dipendenze mancanti!"); return;}

    const victoryChapter = gameState.combat?.victoryChapter; // Leggi prima di resettare
    gameState.combat = null; // Pulisce stato combattimento

    if (playerWon) {
        addLogToCombat('logVictory', {}, true);
        console.log("Combattimento vinto!");
        setTimeout(() => displayChapter(victoryChapter || gameState.chapter + 1), 1500); // Ritardo per leggere log finale
        saveGame();
    } else {
        console.log("Combattimento perso!");
        // handleGameOver viene già chiamato da handleEnemyCombatTurn in caso di sconfitta
        // Ma lo chiamiamo qui come fallback se playerDefeated non fosse gestito correttamente
        handleGameOver('infoGameOverCombat');
    }
}

function addLogToCombat(messageKey, params = {}, scroll = false) {
    // Verifica funzioni necessarie
    if(typeof getString !== 'function' || typeof addLogToUI !== 'function') { console.error("addLogToCombat: getString o addLogToUI non definite!"); return; }
    const message = getString(messageKey, params);
    console.log("COMBAT LOG:", message);
    combatLog.push(message); // Aggiunge al log interno (variabile in state.js)
    addLogToUI(message); // Chiama funzione UI per visualizzare
}

// --- Funzione Game Over (Logica + chiamata UI) ---
function handleGameOver(reasonKey, params = {}) {
    // Verifica funzioni necessarie
    if (typeof gameState === 'undefined' || typeof showGameOverUI !== 'function' || typeof getString !== 'function' || typeof announceMessage !== 'function') { console.error("handleGameOver: Dipendenze mancanti!"); return;}
    if(gameState.gameOver) return; // Evita chiamate multiple
    gameState.gameOver = true; // Imposta flag
    console.log("Game Over:", reasonKey, params);
    showGameOverUI(reasonKey, params); // Chiama da ui.js
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true);
    announceMessage(getString('gameOverTitle') + ": " + (getString(reasonKey, params) || getString('infoGameOverReason')), 'assertive');
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
 * Funzione helper definita qui per centralizzare la logica.
 * @param {string} message - Il messaggio da mostrare.
 * @param {string} [politeness='polite'] - Livello ARIA live ('polite' o 'assertive').
 */
function announceMessage(message, politeness = 'polite') {
    // Verifica che l'elemento esista (dovrebbe essere cachato da cacheDOMElements)
    // Aggiungiamo un controllo per sicurezza
    const msgEl = typeof gameMessagesEl !== 'undefined' ? gameMessagesEl : document.getElementById('game-messages');
    if (msgEl) {
        msgEl.setAttribute('aria-live', politeness);
        msgEl.textContent = message; // Imposta il testo del messaggio
        // Pulisce dopo un timeout per evitare letture multiple
        setTimeout(() => { if(msgEl) msgEl.textContent = ''; }, 3500);
    } else {
        // Fallback se l'elemento non è pronto o definito
        console.warn("Elemento #game-messages non trovato per announceMessage.");
    }
    console.log(`Announce (${politeness}): ${message}`); // Log per debug
}

/**
 * Wrapper per chiamare loadGame da state.js e gestire l'aggiornamento UI/messaggi.
 * Chiamata quando l'utente clicca "Carica Partita".
 */
function loadGameAndUpdateUI() {
    // Verifica che le funzioni necessarie siano definite globalmente (dagli altri script)
    if (typeof loadGame !== 'function' || typeof getString !== 'function' || typeof setLanguage !== 'function' || typeof displayInitialStateUI !== 'function' || typeof displayChapter !== 'function' || typeof updateCharacterSheetUI !== 'function' || typeof updateAllUIStrings !== 'function' ) {
         console.error("Errore CRITICO: Funzioni necessarie per loadGameAndUpdateUI non definite!");
         // Usa alert come fallback se getString non è disponibile
         alert((typeof getString === 'function' ? getString('errorGeneric') : "Errore") || "Si è verificato un errore interno durante il caricamento.");
         return;
     }

    if (loadGame()) { // loadGame (da state.js) ritorna true se caricato con successo
        announceMessage(getString('infoGameLoaded'), 'assertive'); // Notifica accessibile
        setLanguage(currentLang); // Riapplica lingua corrente (che chiama displayChapter o InitialState)
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
        displayInitialStateUI(); // Mostra stato iniziale pulito
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

    if (resetGame(confirmReset)) { // resetGame (da state.js) ritorna true se l'utente conferma
        announceMessage(getString('infoNewGame'));
        showInitScreen(); // Chiama funzione da questo file (ex ui.js) per mostrare config PE
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

    // 1. Cache elementi DOM (definita in Sezione 2 - UI)
    // Verifica che sia stata definita prima di chiamarla
    if (typeof cacheDOMElements === 'function') {
        cacheDOMElements();
    } else {
        console.error("FATAL: Funzione cacheDOMElements non definita! Impossibile continuare.");
        document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico nell'inizializzazione UI (cache).</h1>`;
        return;
    }

    // 2. Verifica dipendenze critiche (più dettagliata)
    console.log("initializeApp: Verifica dipendenze dettagliata...");
    const dependenciesToCheck = {
        // Oggetti/Variabili
        THREE: typeof THREE,
        SimplexNoise: typeof SimplexNoise, // Da three_setup? No, globale da CDN
        uiStrings: typeof uiStrings,         // da strings.js
        gameData: typeof gameData,           // da gameData.js
        initialGameState: typeof initialGameState, // da state (Sezione 1)
        gameState: typeof gameState,         // da state (Sezione 1)
        currentLang: typeof currentLang,     // da strings.js

        // Funzioni Chiave
        getString: typeof getString,           // da strings.js
        setLanguage: typeof setLanguage,       // da strings.js
        initThree: typeof initThree,             // da three_setup
        cacheDOMElements: typeof cacheDOMElements,   // da ui (Sezione 2)
        updateAllUIStrings: typeof updateAllUIStrings, // da ui (Sezione 2)
        displayInitialStateUI: typeof displayInitialStateUI, // da ui (Sezione 2)
        showInitScreen: typeof showInitScreen,       // da ui (Sezione 2)
        displayChapter: typeof displayChapter,     // da engine (Sezione 3)
        saveGame: typeof saveGame,             // da state (Sezione 1)
        loadGame: typeof loadGame,             // da state (Sezione 1)
        resetGame: typeof resetGame,           // da state (Sezione 1)
        addItem: typeof addItem,               // da state (Sezione 1)
        removeItem: typeof removeItem,           // da state (Sezione 1)
        updateCharacterSheetUI: typeof updateCharacterSheetUI, // da ui (Sezione 2)
        updateCombatUI: typeof updateCombatUI,       // da ui (Sezione 2)
        updateSkillCheckUI: typeof updateSkillCheckUI,   // da ui (Sezione 2)
        applyEffect: typeof applyEffect,           // da engine (Sezione 3)
        checkCondition: typeof checkCondition,       // da engine (Sezione 3)
        resolveSkillCheck: typeof resolveSkillCheck,   // da engine (Sezione 3)
        handleCombatActionAttack: typeof handleCombatActionAttack, // da engine (Sezione 3)
        handleGameOver: typeof handleGameOver,       // da engine (Sezione 3)
        changeStatPE: typeof changeStatPE,           // da engine (Sezione 3)
        handleLanguageSelection: typeof handleLanguageSelection, // da engine (Sezione 3)
        confirmPESpending: typeof confirmPESpending,   // da engine (Sezione 3)
        startGame: typeof startGame,               // da engine (Sezione 3)
        handleInitialItemChange: typeof handleInitialItemChange, // da ui (Sezione 2)
        // Aggiungi altre funzioni se necessario
    };

    let missingDepsDetailed = [];
    console.log("--- Risultati Verifica Dipendenze ---");
    for (const depName in dependenciesToCheck) {
        const type = dependenciesToCheck[depName];
        console.log(`  - ${depName}: ${type}`);
        if (type === 'undefined') {
            missingDepsDetailed.push(depName);
        }
    }
    console.log("------------------------------------");


    if (missingDepsDetailed.length > 0) {
         console.error("Errore CRITICO: Una o più dipendenze base mancanti o non definite!", missingDepsDetailed);
         document.body.innerHTML = `<h1 style="color:red; text-align:center;">Errore Inizializzazione Critico (${missingDepsDetailed.join(', ')} mancante/i).</h1>`;
         return; // Blocca esecuzione
     }
     console.log("initializeApp: Dipendenze base verificate con successo.");

    // ... resto di initializeApp (chiamate a initThree, updateAllUIStrings, etc.) ...

    // 3. Init Three.js (definita in Sezione Three.js - se la mettiamo qui)
    // O assumiamo sia definita globalmente da three_setup.js
    console.log("initializeApp: Chiamo initThree...");
    initThree(); // Deve essere definita prima di questa chiamata
    console.log("initializeApp: initThree chiamata.");

    // 4. Init UI Strings (definita in Sezione UI)
    console.log("initializeApp: Chiamo updateAllUIStrings...");
    updateAllUIStrings();
    console.log("initializeApp: updateAllUIStrings chiamata.");

    // 5. Mostra stato iniziale UI (definita in Sezione UI)
    console.log("initializeApp: Chiamo displayInitialStateUI...");
    displayInitialStateUI();
    console.log("initializeApp: displayInitialStateUI chiamata.");

    // 6. Imposta lingua iniziale (definita in strings.js, resa globale)
    console.log("initializeApp: Imposto lingua iniziale...");
    const browserLang = navigator.language.split('-')[0];
    const initialLang = (typeof uiStrings !== 'undefined' && uiStrings[browserLang]) ? browserLang : 'it';
    setLanguage(initialLang); // setLanguage da strings.js
    if(langSelect) langSelect.value = currentLang; // currentLang da strings.js
    console.log("initializeApp: Lingua impostata.");

    // --- 7. AGGIUNTA DEGLI EVENT LISTENER ---
    console.log("initializeApp: Aggiungo Event Listeners...");

    // Bottoni Globali
    const saveBtn = document.getElementById('save-button');
    const loadBtn = document.getElementById('load-button');
    const newGameBtn = document.getElementById('new-game-button');
    // Verifica esistenza prima di aggiungere listener
    if (saveBtn) saveBtn.addEventListener('click', () => { saveGame(); announceMessage(getString('infoGameSaved')); }); else console.warn("#save-button non trovato");
    if (loadBtn) loadBtn.addEventListener('click', loadGameAndUpdateUI); else console.warn("#load-button non trovato");
    if (newGameBtn) newGameBtn.addEventListener('click', () => resetGameAndUpdateUI(true)); else console.warn("#new-game-button non trovato");

    // Selettore Lingua
    if (langSelect) langSelect.addEventListener('change', (event) => setLanguage(event.target.value)); else console.warn("#lang-select non trovato");

    // Listener per Elementi Dinamici (Configurazione, Combattimento, Skill Check) - Delegation
    if (peSpendingOptionsEl) {
        peSpendingOptionsEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.tagName === 'BUTTON' && (target.classList.contains('pe-btn-plus') || target.classList.contains('pe-btn-minus'))) {
                const stat = target.dataset.stat; const change = parseInt(target.dataset.change);
                if (stat && !isNaN(change)) changeStatPE(stat, change); // Da engine
            } else if (target.id === 'confirm-pe-button') { confirmPESpending(); } // Da engine
        });
    } else { console.warn("#pe-spending-options non trovato per delegation."); }

    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') handleLanguageSelection(event.target); // Da engine
         });
    } else { console.warn("#pe-language-selection non trovato per delegation."); }

     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') handleInitialItemChange(); // Da ui
         });
     } else { console.warn("#initial-items-selection non trovato per delegation."); }

     if (startGameButton) { startGameButton.addEventListener('click', startGame); } // Da engine
     else { console.warn("#start-game-button non trovato.");}

     if (rollDiceButton) { rollDiceButton.addEventListener('click', resolveSkillCheck); } // Da engine
     else { console.warn("#roll-dice-button non trovato."); }

     // Listener per Azioni Combattimento (delegation su #actions)
     if (actionsEl) {
         actionsEl.addEventListener('click', (event) => {
             const target = event.target;
             if (target.tagName === 'BUTTON' && gameState.combat && gameState.combat.turn === 'player') {
                 if (target.id === 'combat-attack-button' || target.textContent === getString('attackButtonLabel')) {
                      if (typeof handleCombatActionAttack === 'function') handleCombatActionAttack(); else console.error("handleCombatActionAttack non definito!");
                 }
                 // else if (target.id === 'combat-flee-button' || ...) { /* handleFlee(); */ }
             }
             // I listener per i bottoni di scelta capitolo normale vengono aggiunti
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
    if (document.visibilityState === 'hidden') {
         // Salva solo se il gioco è in uno stato valido
         if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
             saveGame();
             console.log("Salvataggio su visibilitychange (hidden).");
         }
    }
});

window.addEventListener('pagehide', (event) => {
    // Salva solo se il gioco è in uno stato valido
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
        saveGame(); // Funzione da state.js
        console.log("Salvataggio su pagehide.");
    }
});

// --- Fine script.js ---
console.log("script.js: Script analizzato.");