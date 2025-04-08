// ui.js
// Funzioni dedicate alla manipolazione del DOM e aggiornamento dell'interfaccia utente

// --- Riferimenti Elementi UI (Variabili globali per questo modulo/file) ---
// Popolate da cacheDOMElements() chiamata da main.js
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
 * DA CHIAMARE UNA SOLA VOLTA da main.js dopo DOMContentLoaded.
 */
function cacheDOMElements() {
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
    initOptionsEl = document.getElementById('init-options');
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
    gameMessagesEl = document.getElementById('game-messages');
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

    if (!chapterTextEl || !actionsEl || !characterSheetEl || !globalActionsContainer) {
         console.error("FATAL: Elementi UI principali non trovati nel DOM! Controlla index.html.");
         document.body.innerHTML = "<h1>Errore: Interfaccia utente non caricata correttamente.</h1>";
    } else {
        console.log("Elementi DOM Caching completato (da ui.js).");
    }
}


// --- Funzioni UI Pubbliche ---

/**
 * Mostra lo stato iniziale della UI (capitolo 0, nasconde elementi specifici).
 */
function displayInitialStateUI() {
    if (!chapterTextEl || !chapterTitleEl || !actionsEl || !globalActionsContainer) { console.error("displayInitialStateUI: Elementi UI principali non trovati/caricati!"); return; }

    if (typeof gameData !== 'undefined' && typeof getString === 'function' && gameData["0"]) {
         const introChapter = gameData["0"];
         chapterTextEl.innerHTML = introChapter.text ? introChapter.text.replace(/\n/g, '<br>') : getString('loadingText');
         chapterTitleEl.textContent = introChapter.title || '';
         if (introChapter.images && introChapter.images.length > 0 && imageContainer) imageContainer.classList.add('hidden');
    } else {
         chapterTextEl.innerHTML = (typeof getString === 'function') ? getString('loadingText') : 'Loading...';
         chapterTitleEl.textContent = '';
    }
    actionsEl.innerHTML = '';
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden');
    if(initOptionsEl) initOptionsEl.classList.add('hidden');
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');
    updateCharacterSheetUI();
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false);
}

/**
 * Prepara e mostra l'interfaccia per la configurazione iniziale del personaggio (Fase 1: Spesa PE).
 * Chiamata da resetGameAndUpdateUI (in main.js).
 */
function showInitScreen() {
    // Verifica esistenza funzioni/stato base necessari
     if (typeof initialGameState === 'undefined' || typeof gameState === 'undefined' || typeof JSON === 'undefined' || typeof updateAllUIStrings !== 'function' || typeof displayInitialStateUI !== 'function' || typeof setupPESpendingUI !== 'function') {
         console.error("Errore critico: Dipendenze mancanti per showInitScreen!");
         if(chapterTextEl) chapterTextEl.textContent = getString('errorGeneric') || "Errore";
         return;
     }

    console.log("showInitScreen: Avvio configurazione personaggio...");
    // Resetta stato temporaneo per spesa PE (variabili definite in state.js)
    tempStats = JSON.parse(JSON.stringify(initialGameState.stats)); // Copia stats base
    tempLang = null;
    peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

    // Mostra la UI corretta (nasconde gioco/altre init, mostra spesa PE)
    // displayInitialStateUI(); // NON chiamare questo qui, resetterebbe troppo

    // Nascondi elementi non pertinenti e mostra quelli per PE
    if(actionsEl) actionsEl.innerHTML = ''; // Pulisce azioni capitolo
    if(initialItemsOptionsEl) initialItemsOptionsEl.classList.add('hidden'); // Nasconde scelta oggetti
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    if(gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.remove('hidden'); // Mostra sezione PE
    if(initOptionsEl) initOptionsEl.classList.remove('hidden'); // Mostra container genitore se usato


    // Imposta titolo e pulisce testo capitolo
    if(chapterTitleEl) chapterTitleEl.textContent = getString('configTitlePE'); else console.error("Elemento chapterTitleEl non trovato!");
    if(chapterTextEl) chapterTextEl.innerHTML = '';

    // Resetta Checkbox Lingue
    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
    }

    // Aggiorna la UI della spesa PE e le label
    updatePESpendingUI(); // Aggiorna valori e stato bottoni PE
    updateLanguageSelectionLabels(); // Aggiorna testi label lingue
    updateAllUIStrings(); // Aggiorna tutti gli altri testi statici (inclusi titoli sezioni PE)

    // L'handler per confirmPEButton è associato in main.js

    announceMessage(getString('infoConfigStart'));
    if(chapterTitleContainer) chapterTitleContainer.focus(); else console.warn("chapterTitleContainer non trovato per focus.");
}


/**
 * Prepara la UI per la schermata di scelta oggetti iniziali.
 */
function setupInitialItemsUI() {
    if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !initItemsSelectionEl || !startGameButton) { console.error("Errore UI Oggetti mancanti!"); return; }
    peSpendingOptionsEl.classList.add('hidden');
    initialItemsOptionsEl.classList.remove('hidden');
    if(initOptionsEl) initOptionsEl.classList.remove('hidden');
    chapterTitleEl.textContent = getString('configItemsTitle');
    if(initItemsSelectionEl) {
         initItemsSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
          handleInitialItemChange(); // Aggiorna stato bottone Start
    }
     updateInitialItemLabels(); // Assicura che le label siano tradotte
     // L'handler per startGameButton è in main.js
}


/**
 * Aggiorna la UI durante la spesa dei PE (valori temp, PE rimasti, stato bottoni).
 * Legge dalle variabili globali tempStats e peSpent (da state.js).
 */
function updatePESpendingUI() {
    // Verifica esistenza elementi e stato prima di aggiornare
    if (!peRemainingEl || !confirmPEButton || typeof initialGameState === 'undefined' || !initialGameState.stats || typeof peSpent === 'undefined' || typeof tempStats === 'undefined') { return; }
    const peLeft = initialGameState.stats.puntiEsperienza - peSpent.total;
    peRemainingEl.textContent = peLeft;
    for (const statKey in tempStats) { /* ... aggiorna stats temp e PE spesi ... */ } // Come prima
    const peSpentLangEl = document.getElementById('pe-spent-lingua'); if(peSpentLangEl) peSpentLangEl.textContent = peSpent.lingua !== undefined ? peSpent.lingua : 0;
    const baseStats = initialGameState.stats;
    document.querySelectorAll('.pe-stat-row').forEach(row => { /* ... logica abilita/disabilita +/- ... */ }); // Come prima
    const canAffordLanguage = peLeft > 0;
    if(peLanguageSelectionEl) { peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.disabled = (peSpent.lingua >= 1 && !cb.checked) || (!canAffordLanguage && peSpent.lingua < 1); }); }
    confirmPEButton.disabled = peSpent.total !== initialGameState.stats.puntiEsperienza;
}

/**
 * Aggiorna la visualizzazione della scheda personaggio nel DOM.
 * Legge i dati dalla variabile globale gameState (definita in state.js).
 */
function updateCharacterSheetUI() {
    // ... (Logica updateCharacterSheetUI completa come nella risposta precedente) ...
     const stats = gameState && gameState.stats ? gameState.stats : { /*...*/ };
     const inventory = gameState && gameState.inventory ? gameState.inventory : { /*...*/ };
     // ... (Aggiorna tutti gli elementi della scheda con controlli if(elemento)... ) ...
}


/**
 * Aggiorna la UI per mostrare lo stato del combattimento.
 * Legge i dati da gameState.combat.
 */
function updateCombatUI() {
    // ... (Logica updateCombatUI completa come nella risposta precedente) ...
    if (!gameState.combat || !combatInfoEl || !combatEnemiesEl || !combatLogEl || !actionsEl) { if(combatInfoEl) combatInfoEl.classList.add('hidden'); return; }
    combatInfoEl.classList.remove('hidden'); actionsEl.innerHTML = ''; if(diceRollEl) diceRollEl.classList.add('hidden');
    combatEnemiesEl.innerHTML = ''; if (Array.isArray(gameState.combat.enemies)) { gameState.combat.enemies.forEach(enemy => { combatEnemiesEl.innerHTML += `<li>...</li>`; }); }
    combatLogEl.innerHTML = ''; combatLog.forEach(msg => { combatLogEl.innerHTML += `<p>${msg}</p>`; }); scrollToCombatLogBottom();
    if (gameState.combat.turn === 'player') { /* ... crea bottoni Attacca/Fuga ... */ } else { actionsEl.innerHTML = `<p><i>${getString('enemyTurnLabel')}</i></p>`; }
}

/**
 * Prepara la UI per uno skill check.
 * @param {object} skillCheckData - L'oggetto gameState.skillCheck.
 */
function updateSkillCheckUI(skillCheckData) {
    // ... (Logica updateSkillCheckUI completa come nella risposta precedente) ...
    if (!skillCheckData || !diceRollEl || !skillCheckPromptEl || !diceResultEl || !rollDiceButton || !actionsEl) { console.error("Errore UI Skill Check mancanti!"); if(diceRollEl) diceRollEl.classList.add('hidden'); return; }
    skillCheckPromptEl.textContent = getString('skillCheckRollPrompt', { skillName: skillCheckData.skill, targetValue: skillCheckData.target });
    diceResultEl.textContent = ``; rollDiceButton.disabled = false;
    diceRollEl.classList.remove('hidden'); actionsEl.innerHTML = ''; if(combatInfoEl) combatInfoEl.classList.add('hidden');
}

/**
 * Aggiunge un messaggio al log di combattimento visualizzato nella UI.
 * @param {string} message - Il messaggio da aggiungere.
 */
function addLogToUI(message) {
    // ... (Logica addLogToUI completa come nella risposta precedente) ...
    if (combatLogEl && combatInfoEl && !combatInfoEl.classList.contains('hidden')) { /* ... aggiunge <p> e scrolla ... */ }
}

/**
 * Scorre il div del log di combattimento fino in fondo.
 */
function scrollToCombatLogBottom() { if (combatLogEl) combatLogEl.scrollTop = combatLogEl.scrollHeight; }

/**
 * Mostra la schermata di Game Over (overlay).
 * @param {string} reasonKey - La chiave della stringa per il motivo del game over.
 * @param {object} [params={}] - Parametri opzionali per la stringa del motivo.
 */
function showGameOverUI(reasonKey, params = {}) {
    // ... (Logica showGameOverUI completa come nella risposta precedente) ...
    if (!gameOverOverlay || !gameOverReasonEl) { console.error("Elementi UI Game Over mancanti!"); alert(`${getString('gameOverTitle')}: ${getString(reasonKey, params) || getString('infoGameOverReason')}`); return; }
    gameOverOverlay.classList.remove('hidden'); gameOverReasonEl.textContent = getString(reasonKey, params) || getString('infoGameOverReason'); updateGameOverUI();
}

/**
 * Gestisce l'aggiornamento dell'abilitazione/disabilitazione dei checkbox
 * durante la selezione degli oggetti iniziali. (Logica UI)
 */
function handleInitialItemChange() {
    if (!initItemsSelectionEl || !startGameButton) return;
    const checkedCount = initItemsSelectionEl.querySelectorAll('input:checked').length;
    const checkboxes = initItemsSelectionEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.disabled = checkedCount >= 3 && !cb.checked; });
    startGameButton.disabled = checkedCount !== 3;
}


// --- Funzioni per aggiornare testi statici (Definite qui) ---

/**
 * Aggiorna tutte le stringhe statiche nell'interfaccia che usano l'attributo data-string-key.
 */
function updateAllUIStrings() {
    // ... (Logica updateAllUIStrings completa come nella risposta precedente) ...
     console.log("Updating all UI strings for language:", currentLang);
     document.querySelectorAll('[data-string-key]').forEach(element => { /* ... aggiorna elementi ... */ });
     document.title = getString('gameTitle'); const skipLink = document.getElementById('skip-link'); if(skipLink) skipLink.textContent = getString('skipLinkText');
     updateInitialItemLabels(); updateLanguageSelectionLabels();
     if (gameOverOverlay && !gameOverOverlay.classList.contains('hidden')) { updateGameOverUI(); }
}

/**
 * Aggiorna specificamente le label degli oggetti nella schermata di configurazione iniziale.
 */
function updateInitialItemLabels() {
    // ... (Logica updateInitialItemLabels completa come nella risposta precedente) ...
     if (!initItemsSelectionEl) return;
      initItemsSelectionEl.querySelectorAll('label').forEach(label => { /* ... aggiorna span interni ... */ });
      const itemsTitle = initialItemsOptionsEl?.querySelector('h3[data-string-key="configItemsTitle"]'); if(itemsTitle) itemsTitle.textContent = getString('configItemsTitle');
      // ... aggiorna legend, label, note ...
 }

/**
 * Aggiorna specificamente le label delle lingue nella schermata di spesa PE.
 */
function updateLanguageSelectionLabels() {
    // ... (Logica updateLanguageSelectionLabels completa come nella risposta precedente) ...
     if (!peLanguageSelectionEl) return;
      peLanguageSelectionEl.querySelectorAll('label').forEach(label => { /* ... aggiorna span interni ... */ });
      // ... aggiorna titoli sezioni PE ...
 }

 /**
 * Aggiorna i testi statici della schermata di Game Over.
 */
 function updateGameOverUI() {
    // ... (Logica updateGameOverUI completa come nella risposta precedente) ...
     if (!gameOverOverlay) return;
     const title = gameOverOverlay.querySelector('h2[data-string-key="gameOverTitle"]'); if (title) title.textContent = getString('gameOverTitle');
     const button = gameOverOverlay.querySelector('button[data-string-key="gameOverReloadButton"]'); if (button) button.textContent = getString('gameOverReloadButton');
 }


// Non esporta nulla con window. Le funzioni saranno chiamate da main.js o engine.js

// --- Fine ui.js ---
console.log("ui.js: Script analizzato.");