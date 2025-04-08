// state.js
// Gestione dello stato del gioco e persistenza

// --- Stato Globale del Gioco ---
// Queste variabili sono dichiarate qui per centralizzare lo stato,
// saranno accessibili dagli altri file JS caricati successivamente.
let gameState = {}; // Stato corrente del gioco, inizializzato vuoto all'inizio
let tempStats = {}; // Stato temporaneo durante la spesa PE
let tempLang = null; // Lingua temporanea scelta
let peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 }; // PE spesi durante init
let combatLog = []; // Log testuale per combattimento corrente

// --- Stato Iniziale Default ---
const initialGameState = {
    chapter: 0, // Capitolo di partenza (verrà mostrato il testo del capitolo 0 all'inizio)
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
        hasZaino: true // Inizia con uno zaino
    },
    keywords: {
        attuali: [],
        permanenti: []
    },
    combat: null, // Nessun combattimento attivo all'inizio
    skillCheck: null, // Nessun test abilità attivo all'inizio
    gameOver: false // Flag per indicare se il gioco è terminato
};

// Chiave usata per salvare/caricare da localStorage
const SAVE_KEY = 'librogameIlPassoMorteState';

// --- Funzioni di Persistenza (Salvataggio/Caricamento/Reset) ---

/**
 * Salva lo stato corrente del gioco in localStorage.
 * Salva solo se il gioco è iniziato (ha statistiche) e non è in stato di game over.
 */
function saveGame() {
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            console.log('Partita Salvata.');
            // La notifica UI/accessibile viene gestita da chi chiama saveGame (in main.js)
            // announceMessage(getString('infoGameSaved'));
        } catch (e) {
            console.error("Errore nel salvataggio:", e);
            // La notifica UI/accessibile viene gestita da chi chiama saveGame
            // alert(getString('errorSaveFailed'));
            // announceMessage(getString('errorSaveFailed'), 'assertive');
        }
    } else {
        console.log("Salvataggio non eseguito (gioco non iniziato, terminato o stato non valido).");
    }
}

/**
 * Carica lo stato del gioco da localStorage.
 * @returns {boolean} True se il caricamento ha avuto successo, False altrimenti.
 */
function loadGame() {
    const savedState = localStorage.getItem(SAVE_KEY);
    if (savedState) {
        try {
            const loadedData = JSON.parse(savedState);
            // Validazione minima della struttura dati caricata
            if (!loadedData.chapter || !loadedData.stats || !loadedData.inventory || !loadedData.lingue || loadedData.moneteOro === undefined || !loadedData.keywords) {
                throw new Error("Dati salvati non validi o struttura incompleta.");
            }
            // Sovrascrive lo stato corrente con quello caricato
            // È importante fare una copia profonda se ci sono oggetti annidati che potrebbero
            // essere modificati e poi si vuole tornare indietro (ma per load sovrascriviamo tutto)
            gameState = loadedData;
            // Resetta flags temporanei o stati che non dovrebbero persistere tra sessioni se necessario
            gameState.gameOver = false; // Assicura che non sia game over
            gameState.combat = null;    // Non si carica mai in mezzo a un combattimento? (Da decidere)
            gameState.skillCheck = null; // Non si carica mai in mezzo a uno skill check? (Da decidere)
            combatLog = []; // Resetta il log volatile

            console.log('Partita Caricata. Stato:', gameState);
            // La notifica e l'aggiornamento UI vengono gestiti da chi chiama loadGame
            return true; // Successo

        } catch (e) {
            console.error("Errore nel caricamento:", e);
            // La notifica e il reset vengono gestiti da chi chiama loadGame
            return false; // Fallimento
        }
    } else {
        // La notifica viene gestita da chi chiama loadGame
        return false; // Nessun salvataggio trovato
    }
}

/**
 * Resetta lo stato del gioco ai valori iniziali e rimuove il salvataggio.
 * @param {boolean} confirmReset - Se true, chiede conferma all'utente.
 * @returns {boolean} True se il reset è stato eseguito, False altrimenti.
 */
function resetGame(confirmReset = true) {
    // Chiede conferma solo se richiesto
    let doReset = !confirmReset || confirm(getString('confirmNewGame') || 'Sei sicuro di voler iniziare una nuova partita? I progressi non salvati verranno persi.');

    if (doReset) {
        localStorage.removeItem(SAVE_KEY); // Rimuove salvataggio precedente
        // gameState verrà resettato da showInitScreen chiamato successivamente
        console.log("Salvataggio rimosso, pronto per nuova partita.");
        // La notifica e il setup UI vengono gestiti da chi chiama resetGame
        return true; // Reset confermato
    }
    return false; // Reset annullato dall'utente
}

// --- Funzioni di Supporto allo Stato (spostate da engine.js) ---
// Queste funzioni manipolano gameState direttamente

/**
 * Aggiunge un oggetto all'inventario del giocatore.
 * @param {string} itemName - Nome completo dell'oggetto (es. "Spada/Arma...")
 * @param {string} itemType - Tipo di oggetto ('Arma', 'Indossato', 'Generico')
 * @returns {boolean} True se l'oggetto è stato aggiunto, False altrimenti.
 */
function addItem(itemName, itemType) {
    if (!gameState || !gameState.inventory) { console.error("addItem: gameState.inventory non definito"); return false; }
    let added = false;
    const maxArmi = 3;
    const maxZaino = 8;
    const cleanItemName = itemName.split('/')[0].trim(); // Nome base per controlli
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_'); // Chiave per stringa UI

    // Check per duplicati (controlla in tutte le liste pertinenti)
    const alreadyHas =
        gameState.inventory.armi.some(i => i.startsWith(cleanItemName)) ||
        gameState.inventory.indossati.some(i => i.startsWith(cleanItemName)) ||
        gameState.inventory.zaino.some(i => i.startsWith(cleanItemName));

    if (alreadyHas) {
         console.warn(`Tentativo di aggiungere duplicato: ${itemName}`);
         // Non notifichiamo l'utente per non essere troppo verbosi, ma potremmo farlo
         // announceMessage(getString('infoCantTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName }));
         return false; // Già posseduto
    }

    // Logica aggiunta
    if (itemType === 'Arma' && gameState.inventory.armi.length < maxArmi) {
        gameState.inventory.armi.push(itemName);
        added = true;
    } else if (itemType === 'Generico' && gameState.inventory.hasZaino && gameState.inventory.zaino.length < maxZaino) {
        gameState.inventory.zaino.push(itemName);
        added = true;
    } else if (itemType === 'Indossato') {
        // TODO: Aggiungere check per sottotipi se necessario (es. non 2 armature)
        gameState.inventory.indossati.push(itemName);
        added = true;
    }

    // Messaggio e aggiornamento UI solo se aggiunto
    if(added) {
        console.log(`Aggiunto: ${itemName} (${itemType})`);
        announceMessage(getString('infoItemAdded', { itemName: getString('item_' + itemKey) || cleanItemName }));
        updateCharacterSheetUI(); // Aggiorna la scheda
    } else {
         console.warn(`Impossibile aggiungere ${itemName} (${itemType}) - Limite/Zaino?`);
         announceMessage(getString('infoCantTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName }));
    }
    return added;
}

/**
 * Rimuove un oggetto dall'inventario del giocatore.
 * @param {string} itemNameToRemove - Nome dell'oggetto da rimuovere (può essere parziale o completo)
 * @returns {boolean} True se l'oggetto è stato rimosso, False altrimenti.
 */
function removeItem(itemNameToRemove) {
     if (!gameState || !gameState.inventory) { console.error("removeItem: gameState.inventory non definito"); return false; }
    let removed = false;
    const lowerItemName = itemNameToRemove.toLowerCase();
    const cleanItemName = itemNameToRemove.split('/')[0].trim(); // Nome base
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_'); // Chiave per stringa UI

    if (lowerItemName.includes("zaino")) { // Caso speciale rimozione Zaino
         if(gameState.inventory.hasZaino) {
             gameState.inventory.hasZaino = false;
             gameState.inventory.zaino = []; // Svuota contenuto
             removed = true;
             console.log("Zaino e contenuto rimossi");
             announceMessage(getString('infoItemRemoved', {itemName: getString('backpackStatusLabel')})); // Usa label generica zaino
         }
     } else { // Cerca oggetto specifico nelle liste
         const lists = ['zaino', 'armi', 'indossati'];
         for (const listName of lists) {
             // Cerca un item che *inizia* con il nome pulito (case-insensitive)
             const index = gameState.inventory[listName].findIndex(item => item.toLowerCase().startsWith(cleanItemName.toLowerCase()));
             if (index !== -1) {
                 const removedItemFullName = gameState.inventory[listName].splice(index, 1)[0]; // Rimuove e ottiene nome completo
                 removed = true;
                 console.log(`${removedItemFullName} rimosso da ${listName}`);
                 // Usa nome pulito per messaggio
                 announceMessage(getString('infoItemRemoved', { itemName: removedItemFullName.split('/')[0] }));
                 break; // Esce dopo aver trovato e rimosso
             }
         }
     }
    if(removed) updateCharacterSheetUI(); // Aggiorna la scheda se qualcosa è stato rimosso
    else console.warn(`Oggetto non trovato per rimozione: ${itemNameToRemove}`);
    return removed;
}


window.saveGame = saveGame;
window.loadGame = loadGame; // Funzione base, il wrapper la usa
window.resetGame = resetGame; // Funzione base, il wrapper la usa
window.addItem = addItem; // Utile globale se chiamata da effetti o altro
window.removeItem = removeItem; // Utile globale


// ui.js
// Funzioni dedicate alla manipolazione del DOM e aggiornamento dell'interfaccia utente

// --- Riferimenti Elementi UI (Assunti globalmente accessibili o definiti in main.js) ---
// Nota: È importante che questi ID corrispondano a quelli in index.html
const chapterTextEl = document.getElementById('chapter-text');
const actionsEl = document.getElementById('actions');
const combatInfoEl = document.getElementById('combat-info');
const combatEnemiesEl = document.getElementById('combat-enemies');
const combatLogEl = document.getElementById('combat-log');
const diceRollEl = document.getElementById('dice-roll-area');
const diceResultEl = document.getElementById('dice-result');
const skillCheckPromptEl = document.getElementById('skill-check-prompt');
const rollDiceButton = document.getElementById('roll-dice-button');
const chapterTitleEl = document.getElementById('chapter-title');
const chapterTitleContainer = document.getElementById('chapter-title-container');
const imageContainer = document.getElementById('chapter-image-container');
const imageEl = document.getElementById('chapter-image');
// const initContainerEl = document.getElementById('init-container'); // Non più usato?
const peSpendingOptionsEl = document.getElementById('pe-spending-options');
const initialItemsOptionsEl = document.getElementById('initial-items-options');
const initItemsSelectionEl = document.getElementById('initial-items-selection');
const startGameButton = document.getElementById('start-game-button');
const confirmPEButton = document.getElementById('confirm-pe-button');
const peRemainingEl = document.getElementById('pe-remaining');
const peLanguageSelectionEl = document.getElementById('pe-language-selection');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverReasonEl = document.getElementById('game-over-reason');
const globalActionsContainer = document.getElementById('global-actions');
const characterSheetEl = document.getElementById('character-sheet');
const gameMessagesEl = document.getElementById('game-messages');
const langSelect = document.getElementById('lang-select');

// Riferimenti scheda personaggio
const statCombattivita = document.getElementById('stat-combattivita');
const statResistenza = document.getElementById('stat-resistenza');
const statResistenzaMax = document.getElementById('stat-resistenza-max');
const statMira = document.getElementById('stat-mira');
const statMovimento = document.getElementById('stat-movimento');
const statSotterfugio = document.getElementById('stat-sotterfugio');
const statScassinare = document.getElementById('stat-scassinare');
const statPercezione = document.getElementById('stat-percezione');
const statConoscenzaArcana = document.getElementById('stat-conoscenza-arcana');
const lingueList = document.getElementById('lingue-list');
const moneteOro = document.getElementById('monete-oro');
const hasZaino = document.getElementById('has-zaino');
const zainoCount = document.getElementById('zaino-count');
const armiList = document.getElementById('armi-list');
const indossatiList = document.getElementById('indossati-list');
const zainoList = document.getElementById('zaino-list');
const keywordsAttualiList = document.getElementById('keywords-attuali-list');
const keywordsPermanentiList = document.getElementById('keywords-permanenti-list');

// --- Funzioni UI ---

/**
 * Mostra lo stato iniziale della UI (capitolo 0, nasconde elementi specifici).
 */
function displayInitialStateUI() {
    // Mostra testo capitolo 0 o messaggio di default
    if (typeof gameData !== 'undefined' && gameData["0"]) {
         const introChapter = gameData["0"]; // Ora gameData è accessibile globalmente
         if(chapterTextEl) chapterTextEl.innerHTML = introChapter.text ? introChapter.text.replace(/\n/g, '<br>') : getString('loadingText');
         if(chapterTitleEl) chapterTitleEl.textContent = introChapter.title || '';
         // Nasconde immagine del cap 0 se esiste
         if (introChapter.images && introChapter.images.length > 0 && imageContainer) {
             imageContainer.classList.add('hidden');
         }
    } else {
         if(chapterTextEl) chapterTextEl.innerHTML = getString('loadingText');
         if(chapterTitleEl) chapterTitleEl.textContent = '';
    }
    // Nasconde tutte le sezioni specifiche
    if(actionsEl) actionsEl.innerHTML = '';
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden'); // Assicura sia nascosto
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');
    updateCharacterSheetUI(); // Aggiorna per mostrare vuoto/default
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false); // Abilita bottoni globali
}

/**
 * Prepara la UI per la schermata di spesa PE.
 */
function setupPESpendingUI() {
     // Verifica esistenza elementi necessari
     if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !chapterTextEl || !confirmPEButton) {
         console.error("Errore: Elementi UI per spesa PE mancanti!");
         return;
     }

     peSpendingOptionsEl.classList.remove('hidden'); // Mostra sezione PE
     initialItemsOptionsEl.classList.add('hidden'); // Nasconde sezione Oggetti

     chapterTitleEl.textContent = getString('configTitlePE'); // Imposta titolo
     chapterTextEl.innerHTML = ''; // Pulisce area testo principale

     // Resetta Checkbox Lingue (event listener sono in main.js)
     if(peLanguageSelectionEl) {
         peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
             cb.checked = false;
             cb.disabled = false;
         });
     }
     updatePESpendingUI(); // Aggiorna valori iniziali e stato bottoni
     // L'handler per confirmPEButton è in main.js
}

/**
 * Prepara la UI per la schermata di scelta oggetti iniziali.
 */
function setupInitialItemsUI() {
    // Verifica esistenza elementi necessari
    if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !initItemsSelectionEl || !startGameButton) {
         console.error("Errore: Elementi UI per scelta oggetti mancanti!");
        return;
    }

    peSpendingOptionsEl.classList.add('hidden'); // Nasconde sezione PE
    initialItemsOptionsEl.classList.remove('hidden'); // Mostra sezione Oggetti
    chapterTitleEl.textContent = getString('configItemsTitle'); // Imposta titolo

    // Resetta Checkbox Oggetti (event listener sono in main.js)
    if(initItemsSelectionEl) {
         initItemsSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
             cb.checked = false;
             cb.disabled = false;
         });
          handleInitialItemChange(); // Aggiorna stato bottone Start (funzione logica in ui.js stesso per ora)
    }
     updateInitialItemLabels(); // Assicura che le label siano tradotte (funzione in strings.js ma chiamata da qui)
     // L'handler per startGameButton è in main.js
}


/**
 * Aggiorna la UI durante la spesa dei PE (valori temp, PE rimasti, stato bottoni).
 * Richiede che le variabili globali tempStats e peSpent (da state.js) siano aggiornate.
 */
function updatePESpendingUI() {
    // Verifica esistenza elementi prima di aggiornare
    if (!peRemainingEl || !confirmPEButton || typeof initialGameState === 'undefined' || !initialGameState.stats || typeof peSpent === 'undefined' || typeof tempStats === 'undefined') {
         console.warn("Impossibile aggiornare UI PE: elementi o stato mancanti.");
         return;
     }

    const peLeft = initialGameState.stats.puntiEsperienza - peSpent.total;
    peRemainingEl.textContent = peLeft;

    // Aggiorna stats temp e PE spesi
    for (const statKey in tempStats) {
        if (tempStats[statKey] === undefined) continue; // Salta se la stat non è definita (dovrebbe esserlo)
        const statEl = document.getElementById(`temp-stat-${statKey}`);
        if (statEl) statEl.textContent = tempStats[statKey];
        const peSpentEl = document.getElementById(`pe-spent-${statKey}`);
        if (peSpentEl) peSpentEl.textContent = peSpent[statKey] !== undefined ? peSpent[statKey] : 0;
    }
    const peSpentLangEl = document.getElementById('pe-spent-lingua');
    if(peSpentLangEl) peSpentLangEl.textContent = peSpent.lingua;


    // Abilita/Disabilita Bottoni +/- Stats
    const baseStats = initialGameState.stats;
    document.querySelectorAll('.pe-stat-row').forEach(row => {
        const plusButton = row.querySelector('.pe-btn-plus');
        const minusButton = row.querySelector('.pe-btn-minus');
        if(!plusButton || !minusButton) return;

        const statKey = plusButton.dataset.stat; // Legge dal data attribute
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
            // Disabilita se: hai già scelto una lingua E non è questa checkbox OPPURE non puoi permetterti un'altra lingua E nessuna è selezionata
            cb.disabled = (peSpent.lingua >= 1 && !cb.checked) || (!canAffordLanguage && peSpent.lingua < 1);
        });
     }

    // Abilita Conferma PE
    confirmPEButton.disabled = peSpent.total !== initialGameState.stats.puntiEsperienza;
}

/**
 * Aggiorna la visualizzazione della scheda personaggio nel DOM.
 * Legge i dati dalla variabile globale gameState (definita in state.js).
 */
function updateCharacterSheetUI() {
    // Usa valori di default se gameState non è pronto o manca
    const stats = gameState && gameState.stats ? gameState.stats : { combattivita: 0, resistenza: 0, resistenzaMax: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0 };
    const inventory = gameState && gameState.inventory ? gameState.inventory : { armi: [], indossati: [], zaino: [], hasZaino: false };
    const languages = gameState && gameState.lingue ? gameState.lingue : [];
    const gold = gameState && gameState.moneteOro !== undefined ? gameState.moneteOro : 0;
    const keywords = gameState && gameState.keywords ? gameState.keywords : { attuali: [], permanenti: [] };

    // Aggiorna elementi DOM (con controlli di esistenza)
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
    if (zainoCount) zainoCount.textContent = inventory.zaino.length;
    if (armiList) armiList.innerHTML = inventory.armi.map(i => `<li>${i.split('/')[0]}</li>`).join('');
    if (indossatiList) indossatiList.innerHTML = inventory.indossati.map(i => `<li>${i.split('/')[0]}</li>`).join('');
    if (zainoList) zainoList.innerHTML = inventory.zaino.map(i => `<li>${i.split('/')[0]}</li>`).join('');

    if (keywordsAttualiList) keywordsAttualiList.innerHTML = keywords.attuali.map(k => `<li>${k}</li>`).join('');
    if (keywordsPermanentiList) keywordsPermanentiList.innerHTML = keywords.permanenti.map(k => `<li>${k}</li>`).join('');

    // Forza aggiornamento ARIA
     if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'off');
     setTimeout(() => { if(characterSheetEl) characterSheetEl.setAttribute('aria-live', 'polite'); }, 50);
}

/**
 * Aggiorna la UI per mostrare lo stato del combattimento.
 * Legge i dati da gameState.combat.
 */
function updateCombatUI() {
    if (!gameState.combat || !combatInfoEl || !combatEnemiesEl || !combatLogEl || !actionsEl) return;

    combatInfoEl.classList.remove('hidden');
    actionsEl.innerHTML = ''; // Pulisce bottoni precedenti
    if(diceRollEl) diceRollEl.classList.add('hidden');

    // Aggiorna lista nemici
    combatEnemiesEl.innerHTML = '';
    gameState.combat.enemies.forEach(enemy => {
         combatEnemiesEl.innerHTML += `<li>${enemy.name} (C: ${enemy.C}, R: ${Math.max(0, enemy.R)}/${enemy.initialR})</li>`;
     });

    // Aggiorna log combattimento
    combatLogEl.innerHTML = '';
    combatLog.forEach(msg => { combatLogEl.innerHTML += `<p>${msg}</p>`; });
    scrollToCombatLogBottom();

    // Mostra bottoni azione appropriati
    if (gameState.combat.turn === 'player') {
        const attackButton = document.createElement('button');
        attackButton.textContent = getString('attackButtonLabel');
        // L'event listener è gestito in main.js che chiama handleCombatActionAttack
        attackButton.id = "combat-attack-button"; // Aggiungi ID per main.js
        actionsEl.appendChild(attackButton);

        const fleeButton = document.createElement('button');
        fleeButton.textContent = getString('fleeButtonLabel');
        fleeButton.disabled = true;
        fleeButton.id = "combat-flee-button";
        actionsEl.appendChild(fleeButton);
    } else { // Turno nemico
        actionsEl.innerHTML = `<p><i>${getString('enemyTurnLabel')}</i></p>`;
    }
}

/**
 * Prepara la UI per uno skill check.
 * @param {object} skillCheckData - L'oggetto gameState.skillCheck.
 */
function updateSkillCheckUI(skillCheckData) {
    if (!skillCheckData || !diceRollEl || !skillCheckPromptEl || !diceResultEl || !rollDiceButton || !actionsEl) return;

    skillCheckPromptEl.textContent = getString('skillCheckRollPrompt', { skillName: skillCheckData.skill, targetValue: skillCheckData.target });
    diceResultEl.textContent = ``;
    // L'event listener per rollDiceButton è in main.js
    rollDiceButton.disabled = false;

    diceRollEl.classList.remove('hidden');
    actionsEl.innerHTML = '';
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
}

/**
 * Aggiunge un messaggio al log di combattimento nella UI.
 * @param {string} message - Il messaggio da aggiungere.
 */
function addLogToUI(message) {
    if (combatLogEl && combatInfoEl && !combatInfoEl.classList.contains('hidden')) {
        const logP = document.createElement('p');
        logP.textContent = message;
        combatLogEl.appendChild(logP);
        scrollToCombatLogBottom();
    }
}

/**
 * Scorre il div del log di combattimento fino in fondo.
 */
function scrollToCombatLogBottom() {
    if (combatLogEl) combatLogEl.scrollTop = combatLogEl.scrollHeight;
}

/**
 * Mostra la schermata di Game Over.
 * @param {string} reasonKey - La chiave della stringa per il motivo del game over.
 * @param {object} params - Parametri opzionali per la stringa del motivo.
 */
function showGameOverUI(reasonKey, params = {}) {
    if (!gameOverOverlay || !gameOverReasonEl) return;
    gameOverOverlay.classList.remove('hidden');
    gameOverReasonEl.textContent = getString(reasonKey, params) || getString('infoGameOverReason');
    // Disabilitazione bottoni Salva/Carica gestita in handleGameOver (engine.js)
    updateGameOverUI(); // Aggiorna testi statici overlay (titolo, bottone ricarica)
}

/**
 * Gestisce l'aggiornamento dell'abilitazione/disabilitazione dei checkbox
 * durante la selezione degli oggetti iniziali.
 */
function handleInitialItemChange() {
    if (!initItemsSelectionEl || !startGameButton) return;
    const checkedCount = initItemsSelectionEl.querySelectorAll('input:checked').length;
    const checkboxes = initItemsSelectionEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.disabled = checkedCount >= 3 && !cb.checked;
    });
    startGameButton.disabled = checkedCount !== 3;
}


window.showInitScreen = showInitScreen;
// Aggiungi qui altre funzioni UI se vengono chiamate direttamente da main.js o HTML
window.updateAllUIStrings = updateAllUIStrings; // Già presente in strings.js? Spostala qui o in main.
window.displayInitialStateUI = displayInitialStateUI;
window.updateCharacterSheetUI = updateCharacterSheetUI;
window.setupPESpendingUI = setupPESpendingUI;
window.updatePESpendingUI = updatePESpendingUI;
window.setupInitialItemsUI = setupInitialItemsUI;
window.updateInitialItemLabels = updateInitialItemLabels; // Da strings.js? Spostala qui.
window.updateCombatUI = updateCombatUI;
window.updateSkillCheckUI = updateSkillCheckUI;
window.addLogToUI = addLogToUI;
window.scrollToCombatLogBottom = scrollToCombatLogBottom;
window.showGameOverUI = showGameOverUI;
window.updateGameOverUI = updateGameOverUI; // Da strings.js? Spostala qui.
window.handleInitialItemChange = handleInitialItemChange; // Handler per checkbox oggetti


// engine.js
// Contiene il "motore" del gioco: displayChapter, applyEffect, checkCondition,
// resolveSkillCheck, handleCombatActionAttack, handleEnemyCombatTurn, finalizeCombat, addLogToCombat,
// startGame (logica), confirmPESpending (logica), changeStatPE, handleLanguageSelection

// --- Core Game Loop: displayChapter ---
/**
 * Visualizza il capitolo specificato, processando i dati e chiamando le funzioni UI.
 * @param {number | string} chapterId - L'ID del capitolo da visualizzare.
 */
function displayChapter(chapterId) {
    // Verifica esistenza stato e dati capitolo
    if (gameState.gameOver) { console.log("Game is over."); return; }
    // Assicura che le variabili globali (gameState, gameData) siano disponibili
    if (typeof gameState === 'undefined' || typeof gameData === 'undefined') {
         console.error("Errore critico: gameState o gameData non definiti!");
         if (chapterTextEl) chapterTextEl.textContent = "Errore critico di stato."; // Mostra errore UI
         return;
     }
    if (!gameData[chapterId]) {
        console.error(`Capitolo ${chapterId} non trovato in gameData!`);
        // Usa la funzione getString definita in strings.js
        if(chapterTextEl) chapterTextEl.innerHTML = getString('errorChapterNotFound', { chapterId: chapterId });
        if(actionsEl) actionsEl.innerHTML = '';
        return;
    }
    // Se lo stato non è inizializzato E non stiamo cercando di mostrare il capitolo 0, reindirizza all'inizio
    if (!gameState.stats && chapterId !== 0) {
        console.log("Stato di gioco non inizializzato, mostro stato iniziale.");
        if (typeof displayInitialStateUI === 'function') displayInitialStateUI(); // Chiama funzione da ui.js
        else console.error("Funzione displayInitialStateUI non definita!");
        return;
    }

    gameState.chapter = chapterId;
    const chapter = gameData[chapterId]; // Accede ai dati del capitolo specifico
    console.log(`--- Caricamento Capitolo ${chapterId} ('${chapter.title || ''}') ---`);
    // console.log('Dati Capitolo:', chapter); // Debug: mostra dati caricati

    // Reset UI elements (chiamando funzioni da ui.js)
    if(actionsEl) actionsEl.innerHTML = '';
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    // Resetta stati interni del motore per il nuovo capitolo
    gameState.combat = null;
    gameState.skillCheck = null;
    combatLog = [];

    // Nascondi init UI se non è capitolo 0
     if (chapterId !== 0) {
         if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
         if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
     }

    // --- Applicare Effetti del Capitolo ---
    if (chapter.effects && Array.isArray(chapter.effects)) {
        chapter.effects.forEach(effect => {
            applyEffect(effect); // Chiama la funzione per applicare effetti (definita sotto)
        });
    }

    // --- Impostare Immagine (Logica qui, UI in ui.js) ---
    if (chapter.images && chapter.images.length > 0 && imageContainer && imageEl) {
        const imageData = chapter.images[0]; // Usa la prima immagine
        imageEl.src = imageData.src;
        imageEl.alt = imageData.alt; // !!! MIGLIORA ALT TEXT IN COMPILER/MD !!!
        imageContainer.classList.remove('hidden');
    }

    // --- Impostare Testo e Titolo (Logica qui, UI in ui.js) ---
    if(chapterTextEl) chapterTextEl.innerHTML = chapter.text ? chapter.text.replace(/\n/g, '<br>') : '';
    if(chapterTitleEl) chapterTitleEl.textContent = chapterId === 0 ? "" : chapter.title || `${getString('chapterLabel')} ${chapterId}`;


    // --- Impostare Combattimento o Skill Check (Prepara stato, UI aggiornata da funzioni specifiche) ---
    if (chapter.combat && !gameState.skillCheck) {
         gameState.combat = JSON.parse(JSON.stringify(chapter.combat)); // Deep copy
         if(gameState.combat.enemies && Array.isArray(gameState.combat.enemies)) {
            gameState.combat.enemies.forEach(e => { if(e.initialR === undefined) e.initialR = e.R; }); // Assicura initialR
         } else {
            gameState.combat.enemies = []; // Inizializza vuoto se manca o non è array
         }
         gameState.combat.turn = 'player'; // Inizia il giocatore
         if(typeof updateCombatUI === 'function') updateCombatUI(); // Chiama funzione da ui.js per mostrare UI combattimento
         else console.error("updateCombatUI non definita!");
    } else if (chapter.skillCheck && !gameState.combat) {
         gameState.skillCheck = { ...chapter.skillCheck }; // Copia oggetto
         if(typeof updateSkillCheckUI === 'function') updateSkillCheckUI(gameState.skillCheck); // Chiama funzione da ui.js per mostrare UI skill check
         else console.error("updateSkillCheckUI non definita!");
    } else {
         // Assicura che le UI specifiche siano nascoste se non attive
         if(combatInfoEl) combatInfoEl.classList.add('hidden');
         if(diceRollEl) diceRollEl.classList.add('hidden');
     }

    // --- Render Buttons (Logica qui, UI in ui.js) ---
    if (actionsEl && !gameState.combat && !gameState.skillCheck && chapterId !== 0) {
        actionsEl.innerHTML = ''; // Pulisce esplicitamente prima di aggiungere

        // Bottoni Oggetti Offerti (Cerca marcatore specifico o testo, crea bottoni)
         const itemsOffered = []; // Ricostruisci itemsOffered qui se necessario
         // Cerca "Puoi prendere" nel testo se non c'è marcatore esplicito (da migliorare in compile_chapters.js?)
         const getItemRegex = /Puoi prendere (?:l[ae'] |gli |i |un[' ]|quest[aoei] )?([\w\s\/]+(?: \([\w\s]+\))?)(?: se lo desideri)?\./gi;
         let match;
         let tempTextForParsing = chapter.text || ''; // Usa copia per non modificare testo originale mostrato
         while ((match = getItemRegex.exec(tempTextForParsing)) !== null) {
             const cleanItemName = match[1].trim();
             let itemType = "Generico";
             if (cleanItemName.toLowerCase().includes("/arma")) itemType = "Arma";
             else if (cleanItemName.toLowerCase().includes("/armatura") || cleanItemName.toLowerCase().includes("/scudo")) itemType = "Indossato";
             itemsOffered.push({ name: cleanItemName, type: itemType });
         }
         itemsOffered.forEach(item => {
            const button = document.createElement('button');
            const cleanItemName = item.name.split('/')[0];
            const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');
            button.textContent = getString('buttonTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName });
            let canTake = false;
            const maxArmi = 3, maxZaino = 8;
            const alreadyHas = gameState.inventory.armi.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.indossati.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.zaino.some(i=>i.startsWith(cleanItemName));

            if (!alreadyHas) {
                 if (item.type === 'Arma' && gameState.inventory.armi.length < maxArmi) canTake = true;
                 else if (item.type === 'Generico' && gameState.inventory.hasZaino && gameState.inventory.zaino.length < maxZaino) canTake = true;
                 else if (item.type === 'Indossato') { /* TODO: subtype */ canTake = true; }
             }

            button.disabled = !canTake;
            if(!canTake) button.textContent = getString('buttonTakeItemCant', { itemName: getString('item_' + itemKey) || cleanItemName });

            button.onclick = (event) => { // onclick qui per semplicità o usare delegation in main.js
                if (addItem(item.name, item.type)) { // addItem è in state.js
                    event.target.disabled = true;
                    event.target.textContent = getString('buttonTakeItemTaken', { itemName: getString('item_' + itemKey) || cleanItemName });
                    saveGame();
                }
            };
            actionsEl.appendChild(button);
         });

        // Bottoni Scelte di Navigazione (Verifica presenza prima di iterare)
        if(chapter.choices && Array.isArray(chapter.choices)) {
            chapter.choices.forEach(choice => {
                let shouldDisplay = !choice.condition || checkCondition(choice.condition); // Usa checkCondition
                if (shouldDisplay) {
                    const button = document.createElement('button');
                    // Usa il testo definito, che può essere descrittivo o un target
                    button.textContent = choice.text.includes(getString('chapterLabel')) ? choice.text : `${choice.text} (${getString('chapterLabel')} ${choice.target})`;
                    // Aggiungi event listener invece di onclick diretto
                     button.addEventListener('click', () => {
                         displayChapter(choice.target); // Chiama ricorsivamente
                         saveGame(); // Salva dopo la scelta
                    });
                    actionsEl.appendChild(button);
                }
            });
        }
    }

    // --- Gestione Stato Finale / Errori ---
    const isEndChapter = chapter.text && (chapter.text.includes("La tua avventura finisce qui.") || chapter.text.includes("Hai concluso vittoriosamente la tua avventura!"));
    if (actionsEl && actionsEl.innerHTML === '' && !gameState.combat && !gameState.skillCheck && chapterId !== 0) {
         if (isEndChapter) {
             announceMessage(getString('infoGameOverReason'), 'assertive');
             if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true);
         } else if (!chapter.choices || chapter.choices.length === 0) { // Controlla se non c'erano scelte definite
             actionsEl.innerHTML = `<p><i>${getString('infoNoMoreActions')}</i></p>`;
         }
    } else if (chapterId !== 0 && !isEndChapter && !gameState.gameOver) { // Riabilita bottoni globali se non è la fine
         if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false);
    }

    // Check Morte (dopo aver applicato effetti)
    if (gameState.stats && gameState.stats.resistenza <= 0 && !gameState.combat && !gameState.gameOver) {
        handleGameOver('infoGameOverDesc'); // Chiama funzione da questo file
    }

    // Aggiorna la scheda personaggio alla fine
    if(typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI(); // Chiama funzione da ui.js
    else console.error("updateCharacterSheetUI non definita!");

    // Focus Management (importante per accessibilità)
    if(chapterId !== 0 && chapterTitleContainer) {
        setTimeout(() => {
            // Verifica che l'elemento sia ancora nel DOM e visibile
            if (chapterTitleContainer.offsetParent !== null) {
                chapterTitleContainer.focus({ preventScroll: true }); // Evita scroll improvviso
            }
        }, 150); // Piccolo ritardo per permettere rendering
    }
} // --- End displayChapter ---


// --- Funzione per Applicare Effetti ---
function applyEffect(effect) {
    // ... (Logica applyEffect come nella risposta precedente, assicurati che chiami addItem/removeItem da state.js) ...
     if (!effect || !effect.type) return;
     if (!gameState || !gameState.stats) { console.warn("Cannot apply effect: gameState not ready."); return; }

     const details = effect.details || "";
     console.log(`Applying effect: ${effect.type}`, details);

     try {
         const detailsParts = details.split(',');
         const detailValue1 = detailsParts[0]?.trim();
         const detailValue2 = detailsParts[1]?.trim();
         let statKey; // Dichiarata fuori dallo switch per riutilizzo

         switch (effect.type.toUpperCase()) {
             case 'STAT_CHANGE':
                 const statName = detailValue1;
                 const valueChange = parseInt(detailValue2);
                 statKey = Object.keys(gameState.stats).find(k => k.toLowerCase() === statName?.toLowerCase());
                 if (statKey && !isNaN(valueChange)) {
                     const oldValue = gameState.stats[statKey];
                     gameState.stats[statKey] += valueChange;
                     // Clamp (limit) values
                     if (statKey === 'resistenza') { gameState.stats.resistenza = Math.min(Math.max(0, gameState.stats.resistenza), gameState.stats.resistenzaMax); }
                     else if (statKey === 'moneteOro') { gameState.moneteOro = Math.min(Math.max(0, gameState.moneteOro || 0), 30); }
                     const newValue = statKey === 'moneteOro' ? gameState.moneteOro : gameState.stats[statKey]; // Leggi valore corretto
                     if (oldValue !== newValue) { announceMessage(`${statKey} ${valueChange > 0 ? 'aumentata' : 'diminuita'} a ${newValue}.`); }
                 } else { console.warn("Invalid STAT_CHANGE details:", effect.details); }
                 break;
             case 'KEYWORD_ADD':
                 const kwType = effect.keywordType?.toLowerCase(); // Usa campo specifico
                 const kwName = effect.keywordName?.toUpperCase();
                 if (kwName && (kwType === 'permanente' || kwType === 'attuale') && gameState.keywords && gameState.keywords[kwType]) {
                     if (!gameState.keywords[kwType].includes(kwName)) {
                         gameState.keywords[kwType].push(kwName);
                         announceMessage(`Parola Chiave ${kwType} aggiunta: ${kwName}.`);
                     }
                 } else { console.warn("Invalid KEYWORD_ADD details:", effect); }
                 break;
             case 'ITEM_ADD':
                 const itemTypeAdd = detailValue1;
                 const itemNameAdd = detailValue2;
                 if(itemTypeAdd && itemNameAdd) addItem(itemNameAdd, itemTypeAdd); // Chiama da state.js
                 else { console.warn("Invalid ITEM_ADD details:", effect.details); }
                 break;
             case 'ITEM_REMOVE':
                 const itemNameToRemove = detailValue1;
                 if(itemNameToRemove) removeItem(itemNameToRemove); // Chiama da state.js
                 else { console.warn("Invalid ITEM_REMOVE details:", effect.details); }
                 break;
              case 'COMBAT_MOD':
                  if(detailValue1 === 'PARTNER_DAMAGE_DOUBLE' && detailValue2 === 'true') {
                      console.log("Attivato modificatore: danno partner raddoppiato");
                      if(gameState.combat) gameState.combat.doublePlayerDamage = true;
                      else console.warn("Tentativo di attivare COMBAT_MOD fuori dal combattimento");
                  }
                  break;
             default: console.warn(`Unknown effect type: ${effect.type}`);
         }
     } catch (e) { console.error("Error applying effect:", effect, e); }
     // L'aggiornamento UI avviene alla fine di displayChapter
 }


// --- Funzione Controllo Condizioni (DA COMPLETARE) ---
function checkCondition(conditionText) {
    // ... (Logica checkCondition come nella risposta precedente) ...
     if (!gameState || !gameState.inventory || !conditionText) return true;
     const lowerCond = conditionText.toLowerCase().trim();
     if (lowerCond.startsWith("possiedi ")) { /* ... check item ... */ }
     if (lowerCond.startsWith("conosci ") || lowerCond.startsWith("comprendi ")) { /* ... check lingua ... */ }
     if (lowerCond.startsWith("keyword attuale ")) { /* ... check kw attuale ... */ }
     if (lowerCond.startsWith("keyword permanente ")) { /* ... check kw permanente ... */ }
     // --- AGGIUNGI ALTRI CHECK QUI (STATISTICHE, MONETE, ECC.) ---
     const statCheckMatch = lowerCond.match(/^(\w+)\s*([><=!]+)\s*(\d+)$/);
     if (statCheckMatch) { /* ... check stats ... */}
     console.warn(`Condizione non implementata o non riconosciuta: "${conditionText}" - Assumendo TRUE`);
     return true;
}


// --- Funzioni Skill Check ---
function resolveSkillCheck() { // Logica del tiro
    // ... (Logica resolveSkillCheck come nella risposta precedente, chiama displayChapter/saveGame) ...
     if (!gameState.skillCheck) return;
     const roll1 = Math.floor(Math.random() * 6) + 1;
     const roll2 = Math.floor(Math.random() * 6) + 1;
     const totalRoll = roll1 + roll2;
     const skillName = gameState.skillCheck.skill;
     const skillKeyMap = { 'mira': 'mira', 'movimento': 'movimento', 'sotterfugio': 'sotterfugio', 'scassinare': 'scassinare', 'percezione': 'percezione', 'conoscenza arcana': 'conoscenzaArcana' };
     const statKey = Object.keys(skillKeyMap).find(key => skillName.toLowerCase().includes(key));
     const skillValue = statKey && gameState.stats[skillKeyMap[statKey]] !== undefined ? gameState.stats[skillKeyMap[statKey]] : 0;
     const finalScore = totalRoll + skillValue;
     const success = finalScore >= gameState.skillCheck.target;
     const targetChapter = success ? gameState.skillCheck.successChapter : gameState.skillCheck.failureChapter;
     const resultText = success ? getString('diceSuccess') : getString('diceFailure');
     if(diceResultEl) diceResultEl.textContent = getString('diceResultFormat', { roll1, roll2, skillName, skillValue, finalScore, targetValue: gameState.skillCheck.target, resultText });
     if(rollDiceButton) rollDiceButton.disabled = true;
     announceMessage(`Risultato test ${skillName}: ${resultText}`);
     setTimeout(() => { displayChapter(targetChapter); saveGame(); }, 2500);
}


// --- Funzioni Combattimento ---
function handleCombatActionAttack() { // Logica attacco giocatore
    // ... (Logica handleCombatActionAttack come nella risposta precedente, chiama addLogToCombat/finalizeCombat/updateUI) ...
     if (!gameState.combat || gameState.combat.turn !== 'player' || gameState.gameOver) return;
     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0);
     if (activeEnemies.length === 0) { finalizeCombat(true); return; }
     const targetEnemy = activeEnemies[0];
     const playerRoll1 = Math.floor(Math.random() * 6) + 1;
     const playerRoll2 = Math.floor(Math.random() * 6) + 1;
     const playerTotalRoll = playerRoll1 + playerRoll2;
     let playerDamage = playerTotalRoll + gameState.stats.combattivita - targetEnemy.C;
     if (gameState.combat.doublePlayerDamage) { playerDamage *= 2; console.log("Danno giocatore raddoppiato!"); }
     if (playerTotalRoll === 2) { playerDamage = 0; addLogToCombat('logPlayerMiss', { targetName: targetEnemy.name, roll: playerTotalRoll }, true); }
     else {
         if (playerTotalRoll === 12) playerDamage = Math.max(2, playerDamage);
         playerDamage = Math.max(0, playerDamage);
         targetEnemy.R -= playerDamage;
         addLogToCombat('logPlayerAttack', { targetName: targetEnemy.name, damage: playerDamage, roll: playerTotalRoll }, true);
     }
     if (targetEnemy.R <= 0) addLogToCombat('logEnemyDefeated', { enemyName: targetEnemy.name }, true);
     updateCombatUI(); updateCharacterSheetUI();
     if (gameState.combat.enemies.every(e => e.R <= 0)) { finalizeCombat(true); return; }
     gameState.combat.turn = 'enemy';
     updateCombatUI(); setTimeout(handleEnemyCombatTurn, 1200);
}

function handleEnemyCombatTurn() { // Logica turno nemici
    // ... (Logica handleEnemyCombatTurn come nella risposta precedente, chiama addLogToCombat/finalizeCombat/updateUI/removeItem) ...
     if (gameState.gameOver || !gameState.combat || gameState.combat.turn !== 'enemy') return;
     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0);
     let playerDefeated = false;
     activeEnemies.forEach(enemy => { /* ... logica attacco nemico, check corpetto, set playerDefeated ... */ });
     if (playerDefeated) { finalizeCombat(false); return; }
     gameState.combat.turn = 'player';
     updateCombatUI();
}

function finalizeCombat(playerWon) { // Gestisce fine combattimento
    const victoryChapter = gameState.combat?.victoryChapter;
    gameState.combat = null; // Pulisce stato
    if (playerWon) {
        addLogToCombat('logVictory', {}, true); // Aggiunge log vittoria prima di cambiare capitolo
        console.log("Combattimento vinto!");
        setTimeout(() => displayChapter(victoryChapter || gameState.chapter + 1), 1500);
        saveGame();
    } else {
        console.log("Combattimento perso!");
        handleGameOver('infoGameOverCombat');
    }
}

function addLogToCombat(messageKey, params = {}, scroll = false) { // Logica interna + chiamata UI
    const message = getString(messageKey, params);
    console.log("COMBAT LOG:", message);
    combatLog.push(message);
    addLogToUI(message); // Chiama funzione UI per visualizzare
}


// --- Funzioni Gestione Spesa PE (Logica) ---
function changeStatPE(statKey, change) {
    // ... (Logica come nella risposta precedente, chiama updatePESpendingUI) ...
    const isResistance = statKey === 'resistenza';
    const peCost = 1;
    const valueChange = isResistance ? change : change;
    const maxPESpentOnStat = 1;
    const baseValue = initialGameState.stats[statKey];
    if (!tempStats || !peSpent || tempStats[statKey] === undefined || peSpent[statKey] === undefined) { return; }
    const currentValue = tempStats[statKey];
    const newValue = currentValue + valueChange;
    let currentPeSpentOnThis = peSpent[statKey] || 0;
    let peChange = (change > 0) ? peCost : -peCost;
    if (peSpent.total + peChange > initialGameState.stats.puntiEsperienza) { announceMessage(getString('errorPeInsufficient')); return; }
    if (change > 0 && currentPeSpentOnThis >= maxPESpentOnStat) { announceMessage(getString('errorPeMaxStat', {statName: statKey})); return; }
    if (change < 0 && currentPeSpentOnThis <= 0) { return; }
    const maxAllowedValue = isResistance ? baseValue + 3 : baseValue + 1;
    const minAllowedValue = baseValue;
    if (newValue > maxAllowedValue || newValue < minAllowedValue) { return; }
    tempStats[statKey] = newValue;
    peSpent[statKey] += (change > 0 ? 1 : -1);
    peSpent.total += peChange;
    updatePESpendingUI(); // Chiama UI update
}

function handleLanguageSelection(checkbox) { // Handler logico
    // ... (Logica come nella risposta precedente, chiama updatePESpendingUI) ...
    const maxLanguages = 1; const peCost = 1;
     if (checkbox.checked) {
         if (peSpent.total + peCost > initialGameState.stats.puntiEsperienza) { announceMessage(getString('errorPeInsufficient')); checkbox.checked = false; return; }
         if (peSpent.lingua >= maxLanguages) { announceMessage(getString('errorPeMaxLang')); checkbox.checked = false; return; }
         peSpent.total += peCost; peSpent.lingua += 1; tempLang = checkbox.value;
     } else {
         peSpent.total -= peCost; peSpent.lingua -= 1; tempLang = null;
     }
     updatePESpendingUI(); // Chiama UI update
}

function confirmPESpending() { // Handler logico conferma
    if (peSpent.total !== initialGameState.stats.puntiEsperienza) {
        announceMessage(getString('errorPeConfirm')); return;
    }
    // Applica stato temporaneo a gameState
    gameState.stats = { ...tempStats }; gameState.stats.puntiEsperienza = 0;
    gameState.inventory = JSON.parse(JSON.stringify(initialGameState.inventory));
    gameState.lingue = [...initialGameState.lingue];
    gameState.moneteOro = initialGameState.moneteOro;
    gameState.keywords = JSON.parse(JSON.stringify(initialGameState.keywords));
    gameState.gameOver = false;
    if (tempLang) { gameState.lingue.push(tempLang); }

    updateCharacterSheetUI(); // Aggiorna scheda definitiva
    setupInitialItemsUI(); // Chiama funzione UI per passare alla schermata oggetti
    announceMessage(getString('infoConfigPEConfirmed'));
}

// Funzione logica start game (chiamata da main.js dopo click bottone finale)
function startGame() {
    // La validazione dell'esistenza degli elementi UI dovrebbe avvenire in main.js prima di chiamare
    if (!initialItemsOptionsEl || !initItemsSelectionEl) return;

    // Aggiungi oggetti selezionati (logica ora in state.js)
    const selectedItems = initItemsSelectionEl.querySelectorAll('input:checked');
    selectedItems.forEach(itemInput => { addItem(itemInput.value, itemInput.dataset.type); });

    // Nascondi UI init e vai al capitolo 1
    initialItemsOptionsEl.classList.add('hidden');
    gameState.chapter = 1;
    displayChapter(gameState.chapter);
    saveGame(); // Salva stato iniziale completo
    announceMessage(getString('infoAdventureStarted'));
}

// --- Funzione Game Over (Logica + chiamata UI) ---
function handleGameOver(reasonKey, params = {}) {
    if(gameState.gameOver) return;
    gameState.gameOver = true;
    console.log("Game Over:", reasonKey, params);
    // Chiama la funzione UI per mostrare l'overlay
    showGameOverUI(reasonKey, params); // Funzione definita in ui.js
    // Disabilita bottoni Salva/Carica nel contenitore globale
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true);
}


// --- Initial Load & Save on Page Hide ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica dipendenze minimale (oggetti globali principali)
    // Questa verifica ora è meno critica perché tutto è nello stesso file,
    // ma può rimanere come controllo di sanità.
     if (typeof THREE === 'undefined' || typeof uiStrings === 'undefined' || typeof gameData === 'undefined' || typeof initialGameState === 'undefined' || typeof getString !== 'function' || typeof initThree !== 'function' || typeof updateAllUIStrings !== 'function' || typeof displayInitialStateUI !== 'function') {
         console.error("Errore CRITICO: Una o più funzioni/oggetti base non definiti! Controlla l'inclusione degli script.");
         document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico nell'inizializzazione del gioco.</h1>`;
         return;
     }

    console.log("DOM Caricato. Inizializzazione...");
    initThree();
    updateAllUIStrings(); // Imposta testi statici iniziali
    displayInitialStateUI(); // Mostra UI iniziale (Cap 0 o messaggio)

    // Imposta lingua iniziale
    const browserLang = navigator.language.split('-')[0];
    const initialLang = uiStrings[browserLang] ? browserLang : 'it';
    setLanguage(initialLang); // setLanguage è in strings.js, ma getString e updateAllUIStrings sono qui ora
    if(langSelect) langSelect.value = currentLang; // Sincronizza dropdown

    // --- AGGIUNTA DEGLI EVENT LISTENER ---
    console.log("Aggiunta Event Listeners...");
    const saveBtn = document.getElementById('save-button');
    const loadBtn = document.getElementById('load-button');
    const newGameBtn = document.getElementById('new-game-button');

    // Listener per bottoni globali
    if (saveBtn) saveBtn.addEventListener('click', () => { saveGame(); announceMessage(getString('infoGameSaved')); });
    if (loadBtn) loadBtn.addEventListener('click', loadGameAndUpdateUI);
    if (newGameBtn) newGameBtn.addEventListener('click', () => resetGameAndUpdateUI(true));
    // Listener per cambio lingua
    if (langSelect) langSelect.addEventListener('change', (event) => setLanguage(event.target.value));

    // Listener per bottoni/checkbox in #init-options (delegation)
    if (peSpendingOptionsEl) {
        peSpendingOptionsEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.tagName === 'BUTTON' && (target.classList.contains('pe-btn-plus') || target.classList.contains('pe-btn-minus'))) {
                const stat = target.dataset.stat; const change = parseInt(target.dataset.change);
                if (stat && !isNaN(change)) changeStatPE(stat, change);
            } else if (target.id === 'confirm-pe-button') { confirmPESpending(); }
        });
    }
    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') handleLanguageSelection(event.target);
         });
    }
     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') handleInitialItemChange();
         });
     }
     if (startGameButton) startGameButton.addEventListener('click', startGame);

     // Listener per bottone Tira Dadi
     if (rollDiceButton) rollDiceButton.addEventListener('click', resolveSkillCheck);

     // Listener per bottoni combattimento (delegation su #actions)
     if (actionsEl) {
         actionsEl.addEventListener('click', (event) => {
             const target = event.target;
             // Solo se è un bottone, siamo in combattimento, ed è il turno del giocatore
             if (target.tagName === 'BUTTON' && gameState.combat && gameState.combat.turn === 'player') {
                 // Identifica bottone attacco (più robusto con ID se possibile)
                 if (target.id === 'combat-attack-button' || target.textContent.includes(getString('attackButtonLabel'))) {
                      handleCombatActionAttack();
                 }
                 // Aggiungere logica per altri bottoni combattimento (Fuga) qui
             }
         });
     }

     console.log("Gioco pronto e listeners aggiunti.");
    });

    // --- Event Listener Globale (Salvataggio su Chiusura) ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) { saveGame(); console.log("Tentativo salvataggio su visibilitychange (hidden)."); }
        }
    });
    window.addEventListener('pagehide', (event) => {
        if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) { saveGame(); console.log("Tentativo salvataggio su pagehide."); }
    });


// main.js
// Punto di ingresso principale, gestione eventi globali, inizializzazione

// --- Funzioni Helper (definite solo qui se non servono altrove) ---

/**
 * Mostra un messaggio all'utente tramite la regione ARIA live.
 * Usata per feedback non intrusivi (salvataggio, caricamento, errori minori).
 * @param {string} message - Il messaggio da mostrare.
 * @param {string} [politeness='polite'] - Livello ARIA live ('polite' o 'assertive').
 */
function announceMessage(message, politeness = 'polite') {
    // Verifica esistenza dell'elemento target definito in ui.js (o globalmente)
    if (typeof gameMessagesEl !== 'undefined' && gameMessagesEl) {
        gameMessagesEl.setAttribute('aria-live', politeness);
        gameMessagesEl.textContent = message; // Imposta il testo del messaggio
        // Pulisce il messaggio dopo un po' per evitare che rimanga annunciato
        setTimeout(() => { if(gameMessagesEl) gameMessagesEl.textContent = ''; }, 3500);
    } else {
        console.warn("Elemento #game-messages non trovato per announceMessage.");
    }
    // Log sempre in console per debug
    console.log(`Announce (${politeness}): ${message}`);
}

/**
 * Wrapper per chiamare loadGame da state.js e gestire l'aggiornamento UI/messaggi.
 * Chiamata quando l'utente clicca "Carica Partita".
 */
function loadGameAndUpdateUI() {
    // Verifica che le funzioni necessarie siano definite
    if (typeof loadGame !== 'function' || typeof getString !== 'function' || typeof setLanguage !== 'function' || typeof displayInitialStateUI !== 'function' || typeof displayChapter !== 'function' ) {
         console.error("Errore: Funzioni necessarie per loadGameAndUpdateUI non definite!");
         // Mostra un alert generico all'utente in caso di errore grave
         alert(getString('errorGeneric') || "Si è verificato un errore interno.");
         return;
     }

    if (loadGame()) { // loadGame (da state.js) ritorna true se caricato con successo
        announceMessage(getString('infoGameLoaded'), 'assertive'); // Messaggio importante
        setLanguage(currentLang); // Riapplica lingua (che chiama displayChapter o InitialState)
    } else {
        // Se loadGame ritorna false, controlla se era perché non c'era un save
        if (!localStorage.getItem(SAVE_KEY)) {
             announceMessage(getString('infoNoSavedGame'));
             alert(getString('infoNoSavedGame')); // Feedback immediato all'utente
        } else {
             // Se c'era un salvataggio ma loadGame ha fallito (es. dati corrotti)
             announceMessage(getString('errorLoadFailed'), 'assertive');
             alert(getString('errorLoadFailed'));
        }
        displayInitialStateUI(); // Mostra stato iniziale pulito in caso di fallimento caricamento
    }
}

/**
 * Wrapper per chiamare resetGame da state.js e gestire l'aggiornamento UI/messaggi.
 * Chiamata quando l'utente clicca "Nuova Partita".
 * @param {boolean} [confirmReset=true] - Se chiedere conferma all'utente (default: true).
 */
function resetGameAndUpdateUI(confirmReset = true) {
     // Verifica che le funzioni necessarie siano definite
     if (typeof resetGame !== 'function' || typeof getString !== 'function' || typeof showInitScreen !== 'function') {
         console.error("Errore: Funzioni necessarie per resetGameAndUpdateUI non definite!");
         alert(getString('errorGeneric') || "Si è verificato un errore interno.");
         return;
     }

    if (resetGame(confirmReset)) { // resetGame (da state.js) ritorna true se l'utente conferma
        announceMessage(getString('infoNewGame'));
        showInitScreen(); // Chiama funzione da ui.js per mostrare schermata config PE
    } else {
        console.log("Reset annullato dall'utente."); // Nessun messaggio all'utente se annulla
    }
}

// --- Inizializzazione al Caricamento della Pagina ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica rigorosa delle dipendenze prima di procedere
     const dependencies = {
        // Funzioni/Oggetti da altri file .js necessari in questo scope o chiamati da qui
        THREE: typeof THREE,
        SimplexNoise: typeof SimplexNoise,
        uiStrings: typeof uiStrings,
        gameData: typeof gameData,
        initialGameState: typeof initialGameState,
        getString: typeof getString,
        setLanguage: typeof setLanguage,
        updateAllUIStrings: typeof updateAllUIStrings,
        initThree: typeof initThree,
        displayInitialStateUI: typeof displayInitialStateUI,
        showInitScreen: typeof showInitScreen, // Chiamata da resetGameAndUpdateUI
        changeStatPE: typeof changeStatPE, // Chiamata da listener
        handleLanguageSelection: typeof handleLanguageSelection, // Chiamata da listener
        confirmPESpending: typeof confirmPESpending, // Chiamata da listener
        startGame: typeof startGame, // Chiamata da listener
        handleInitialItemChange: typeof handleInitialItemChange, // Chiamata da listener
        resolveSkillCheck: typeof resolveSkillCheck, // Chiamata da listener
        saveGame: typeof saveGame, // Chiamata da listener e pagehide
        loadGame: typeof loadGame, // Usata da loadGameAndUpdateUI
        resetGame: typeof resetGame, // Usata da resetGameAndUpdateUI
        displayChapter: typeof displayChapter // Chiamata indirettamente tramite setLanguage/load
        // Aggiungere qui altre funzioni se diventano necessarie in main.js
     };

     let missingDeps = [];
     for (const dep in dependencies) {
         if (dependencies[dep] === 'undefined') {
             missingDeps.push(dep);
         }
     }

     // Se mancano dipendenze critiche, blocca l'esecuzione e mostra errore
     if (missingDeps.length > 0) {
         console.error("Errore: Una o più dipendenze JS non caricate correttamente o definite!", missingDeps);
         document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico durante il caricamento del gioco (${missingDeps.join(', ')} mancante/i). Controlla la console (F12) e l'ordine degli script in index.html.</h1>`;
         return; // Interrompe l'esecuzione di DOMContentLoaded
     }

    console.log("DOM Caricato e dipendenze verificate. Inizializzazione...");

    // 1. Inizializza Three.js (da three_setup.js)
    initThree();

    // 2. Inizializza stringhe UI statiche (da strings.js e ui.js)
    updateAllUIStrings();

    // 3. Mostra stato iniziale UI (da ui.js)
    displayInitialStateUI();

    // 4. Imposta lingua iniziale (da strings.js)
    const browserLang = navigator.language.split('-')[0];
    const initialLang = uiStrings[browserLang] ? browserLang : 'it';
    setLanguage(initialLang); // Applica lingua e aggiorna UI
    if(langSelect) langSelect.value = currentLang; // Sincronizza dropdown

    // --- AGGIUNTA DEGLI EVENT LISTENER ---
    console.log("Aggiunta Event Listeners...");

    // Bottoni Globali
    const saveBtn = document.getElementById('save-button');
    const loadBtn = document.getElementById('load-button');
    const newGameBtn = document.getElementById('new-game-button');

    if (saveBtn) saveBtn.addEventListener('click', () => {
        saveGame(); // Chiama direttamente da state.js
        announceMessage(getString('infoGameSaved')); // Annuncia qui
    });
    if (loadBtn) loadBtn.addEventListener('click', loadGameAndUpdateUI); // Chiama wrapper definito sopra
    if (newGameBtn) newGameBtn.addEventListener('click', () => resetGameAndUpdateUI(true)); // Chiama wrapper (richiede conferma)

    // Selettore Lingua
    if (langSelect) langSelect.addEventListener('change', (event) => setLanguage(event.target.value)); // setLanguage da strings.js

    // Bottoni Spesa PE (Event delegation su contenitore)
    if (peSpendingOptionsEl) {
        peSpendingOptionsEl.addEventListener('click', (event) => {
            const target = event.target;
            // Gestisce bottoni +/- per stats
            if (target.tagName === 'BUTTON' && (target.classList.contains('pe-btn-plus') || target.classList.contains('pe-btn-minus'))) {
                const stat = target.dataset.stat;
                const change = parseInt(target.dataset.change);
                if (stat && !isNaN(change) && typeof changeStatPE === 'function') {
                    changeStatPE(stat, change); // Chiama funzione da engine.js
                } else { console.warn("Attributi data mancanti o funzione changeStatPE non trovata per il bottone PE."); }
            // Gestisce bottone conferma
            } else if (target.id === 'confirm-pe-button' && typeof confirmPESpending === 'function') {
                confirmPESpending(); // Chiama funzione da engine.js
            }
        });
    } else { console.warn("#pe-spending-options non trovato per aggiungere listener."); }

    // Checkbox Lingua PE (Event delegation)
    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleLanguageSelection === 'function') {
                 handleLanguageSelection(event.target); // Chiama funzione da engine.js
             }
         });
    } else { console.warn("#pe-language-selection non trovato per aggiungere listener."); }


     // Checkbox Oggetti Iniziali (Event delegation)
     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleInitialItemChange === 'function') {
                 handleInitialItemChange(); // Chiama funzione da ui.js
             }
         });
     } else { console.warn("#initial-items-selection non trovato per aggiungere listener."); }

     // Bottone Inizio Avventura (dopo scelta oggetti)
     if (startGameButton && typeof startGame === 'function') {
        startGameButton.addEventListener('click', startGame); // Chiama funzione da engine.js
     } else { console.warn("#start-game-button non trovato o funzione startGame non definita.");}

     // Bottone Tira Dadi (per Skill Check)
     if (rollDiceButton && typeof resolveSkillCheck === 'function') {
         rollDiceButton.addEventListener('click', resolveSkillCheck); // Chiama da engine.js
     } else { console.warn("#roll-dice-button non trovato o funzione resolveSkillCheck non definita."); }

     // Listener per bottoni di combattimento (delegation su #actions)
     if (actionsEl) {
         actionsEl.addEventListener('click', (event) => {
             const target = event.target;
             // Controlla se è stato cliccato un bottone dentro #actions
             if (target.tagName === 'BUTTON') {
                 // Qui identifichiamo quale bottone è stato cliccato se necessario
                 // Per ora, assumiamo che in combat ci sia solo Attacca (o Fuga disabilitato)
                 // Potremmo dare ID specifici ai bottoni creati dinamicamente in ui.js
                 if (gameState.combat && gameState.combat.turn === 'player') { // Esegui solo se è il turno del giocatore
                    if (target.textContent.includes(getString('attackButtonLabel'))) { // Controllo basato sul testo (meno robusto di un ID)
                         if (typeof handleCombatActionAttack === 'function') {
                             handleCombatActionAttack(); // Chiama da engine.js
                         } else { console.error("Funzione handleCombatActionAttack non definita!"); }
                    } else if (target.textContent.includes(getString('fleeButtonLabel').split(' ')[0])) { // Controllo parziale per "Fuggi"
                         // if (typeof handleCombatActionFlee === 'function') handleCombatActionFlee();
                         console.log("Tentativo di fuga (non implementato)");
                    }
                 }
             }
         });
     } else { console.warn("#actions non trovato per aggiungere listener delegato."); }

     console.log("Gioco pronto e listeners aggiunti.");
});

// --- Event Listener Globale (Salvataggio su Chiusura) ---
// Usa 'visibilitychange' e 'pagehide'
document.addEventListener('visibilitychange', () => {
    // Salva se la pagina diventa nascosta E il gioco è in uno stato valido
    if (document.visibilityState === 'hidden') {
         if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) {
             saveGame(); // Funzione da state.js
             console.log("Tentativo di salvataggio su visibilitychange (hidden).");
         }
    }
});
