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

    // Verifica elementi critici per l'UI base
    if (!chapterTextEl || !actionsEl || !characterSheetEl || !globalActionsContainer) {
         console.error("FATAL: Elementi UI principali non trovati nel DOM! Controlla index.html.");
         // Potrebbe essere utile bloccare qui o mostrare un errore all'utente
         // document.body.innerHTML = "<h1>Errore: Interfaccia utente non caricata correttamente.</h1>";
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

    // Mostra testo capitolo 0 o messaggio di default
    // Verifica che gameData e getString siano disponibili
    if (typeof gameData !== 'undefined' && typeof getString === 'function' && gameData["0"]) {
         const introChapter = gameData["0"];
         chapterTextEl.innerHTML = introChapter.text ? introChapter.text.replace(/\n/g, '<br>') : getString('loadingText');
         chapterTitleEl.textContent = introChapter.title || '';
         if (introChapter.images && introChapter.images.length > 0 && imageContainer) {
             imageContainer.classList.add('hidden');
         }
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

    updateCharacterSheetUI(); // Aggiorna per mostrare vuoto/default
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false);
}

/**
 * Prepara la UI per la schermata di spesa PE.
 */
function setupPESpendingUI() {
     if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !chapterTextEl || !confirmPEButton) { console.error("Errore: Elementi UI per spesa PE mancanti!"); return; }
     peSpendingOptionsEl.classList.remove('hidden');
     initialItemsOptionsEl.classList.add('hidden');
     // if(initOptionsEl) initOptionsEl.classList.remove('hidden'); // Rimuovi se initOptionsEl non è più usato come contenitore separato

     chapterTitleEl.textContent = getString('configTitlePE');
     chapterTextEl.innerHTML = '';

     if(peLanguageSelectionEl) {
         peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
     }
     updatePESpendingUI();
     updateLanguageSelectionLabels();
}

/**
 * Prepara la UI per la schermata di scelta oggetti iniziali.
 */
function setupInitialItemsUI() {
    if (!peSpendingOptionsEl || !initialItemsOptionsEl || !chapterTitleEl || !initItemsSelectionEl || !startGameButton) { console.error("Errore: Elementi UI per scelta oggetti mancanti!"); return; }
    peSpendingOptionsEl.classList.add('hidden');
    initialItemsOptionsEl.classList.remove('hidden');
    // if(initOptionsEl) initOptionsEl.classList.remove('hidden');

    chapterTitleEl.textContent = getString('configTitleItems'); // Usa chiave corretta

    if(initItemsSelectionEl) {
         initItemsSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = false; });
          handleInitialItemChange();
    }
     updateInitialItemLabels();
}


/**
 * Aggiorna la UI durante la spesa dei PE (valori temp, PE rimasti, stato bottoni).
 * Legge dalle variabili globali tempStats e peSpent (da state.js).
 */
function updatePESpendingUI() {
    if (!peRemainingEl || !confirmPEButton || typeof initialGameState === 'undefined' || !initialGameState.stats || typeof peSpent === 'undefined' || typeof tempStats === 'undefined') { return; }
    const peLeft = initialGameState.stats.puntiEsperienza - peSpent.total;
    peRemainingEl.textContent = peLeft;

    for (const statKey in tempStats) {
        if (!tempStats.hasOwnProperty(statKey) || tempStats[statKey] === undefined) continue;
        const statEl = document.getElementById(`temp-stat-${statKey}`);
        if (statEl) statEl.textContent = tempStats[statKey];
        const peSpentEl = document.getElementById(`pe-spent-${statKey}`);
        if (peSpentEl) peSpentEl.textContent = peSpent[statKey] !== undefined ? peSpent[statKey] : 0;
    }
    const peSpentLangEl = document.getElementById('pe-spent-lingua');
    if(peSpentLangEl) peSpentLangEl.textContent = peSpent.lingua !== undefined ? peSpent.lingua : 0;

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

        let canIncrement = canAffordMorePE && currentPeSpentOnThis < maxPESpentOnStat;
        if (statKey === 'resistenza' && currentValue >= baseStats.resistenza + 3) canIncrement = false;
        if (statKey !== 'resistenza' && currentValue >= baseStats[statKey] + 1) canIncrement = false;
        plusButton.disabled = !canIncrement;

        minusButton.disabled = currentPeSpentOnThis <= 0;
    });

     const canAffordLanguage = peLeft > 0;
     if(peLanguageSelectionEl) { peLanguageSelectionEl.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.disabled = (peSpent.lingua >= 1 && !cb.checked) || (!canAffordLanguage && peSpent.lingua < 1); }); }
    confirmPEButton.disabled = peSpent.total !== initialGameState.stats.puntiEsperienza;
}

/**
 * Aggiorna la visualizzazione della scheda personaggio nel DOM.
 * Legge i dati dalla variabile globale gameState (definita in state.js).
 */
function updateCharacterSheetUI() {
    const stats = gameState && gameState.stats ? gameState.stats : { combattivita: 0, resistenza: 0, resistenzaMax: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0 };
    const inventory = gameState && gameState.inventory ? gameState.inventory : { armi: [], indossati: [], zaino: [], hasZaino: false };
    const languages = gameState && gameState.lingue ? gameState.lingue : [];
    const gold = gameState && gameState.moneteOro !== undefined ? gameState.moneteOro : 0;
    const keywords = gameState && gameState.keywords ? gameState.keywords : { attuali: [], permanenti: [] };

    // Aggiorna elementi DOM (con controlli esistenza per robustezza)
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


/**
 * Aggiorna la UI per mostrare lo stato del combattimento.
 * Legge i dati da gameState.combat.
 */
function updateCombatUI() {
    if (!gameState.combat || !combatInfoEl || !combatEnemiesEl || !combatLogEl || !actionsEl) { if(combatInfoEl) combatInfoEl.classList.add('hidden'); return; }
    combatInfoEl.classList.remove('hidden');
    actionsEl.innerHTML = '';
    if(diceRollEl) diceRollEl.classList.add('hidden');
    combatEnemiesEl.innerHTML = '';
    if (Array.isArray(gameState.combat.enemies)) { gameState.combat.enemies.forEach(enemy => { combatEnemiesEl.innerHTML += `<li>${enemy.name} (C: ${enemy.C}, R: ${Math.max(0, enemy.R)}/${enemy.initialR || enemy.R})</li>`; }); }
    combatLogEl.innerHTML = ''; combatLog.forEach(msg => { combatLogEl.innerHTML += `<p>${msg}</p>`; }); scrollToCombatLogBottom();
    if (gameState.combat.turn === 'player') {
        const attackButton = document.createElement('button'); attackButton.textContent = getString('attackButtonLabel'); attackButton.id = "combat-attack-button"; actionsEl.appendChild(attackButton);
        const fleeButton = document.createElement('button'); fleeButton.textContent = getString('fleeButtonLabel'); fleeButton.disabled = true; fleeButton.id = "combat-flee-button"; actionsEl.appendChild(fleeButton);
    } else { actionsEl.innerHTML = `<p><i>${getString('enemyTurnLabel')}</i></p>`; }
}

/**
 * Prepara la UI per uno skill check.
 * @param {object} skillCheckData - L'oggetto gameState.skillCheck.
 */
function updateSkillCheckUI(skillCheckData) {
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
    if (combatLogEl && combatInfoEl && !combatInfoEl.classList.contains('hidden')) {
        const logP = document.createElement('p'); logP.textContent = message; combatLogEl.appendChild(logP); scrollToCombatLogBottom();
    }
}

/**
 * Scorre il div del log di combattimento fino in fondo.
 */
function scrollToCombatLogBottom() { if (combatLogEl) combatLogEl.scrollTop = combatLogEl.scrollHeight; }

/**
 * Mostra la schermata di Game Over (overlay).
 * @param {string} reasonKey - La chiave della stringa per il motivo.
 * @param {object} [params={}] - Parametri opzionali per la stringa.
 */
function showGameOverUI(reasonKey, params = {}) {
    if (!gameOverOverlay || !gameOverReasonEl) { console.error("Elementi UI Game Over mancanti!"); alert(`${getString('gameOverTitle')}: ${getString(reasonKey, params) || getString('infoGameOverReason')}`); return; }
    gameOverOverlay.classList.remove('hidden');
    gameOverReasonEl.textContent = getString(reasonKey, params) || getString('infoGameOverReason');
    updateGameOverUI(); // Aggiorna titolo/bottone overlay
}

/**
 * Gestisce l'aggiornamento dell'abilitazione/disabilitazione dei checkbox oggetti iniziali.
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
 * Aggiorna tutte le stringhe statiche con data-string-key.
 */
function updateAllUIStrings() {
    console.log("Updating all UI strings for language:", currentLang); // currentLang da strings.js
    document.querySelectorAll('[data-string-key]').forEach(element => {
        const key = element.dataset.stringKey;
        // Salta elementi gestiti specificamente
        if(element.closest('#initial-items-selection span') || element.closest('#pe-language-selection span')) return;
        if(element.id === 'chapter-title') return;

        const text = getString(key); // getString da strings.js

        if (element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit'))) { element.textContent = text; }
        else if (element.tagName === 'SPAN' || element.tagName === 'P' || element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3' || element.tagName === 'H4' || element.tagName === 'LEGEND' || element.tagName === 'A' || element.tagName === 'STRONG' || element.tagName === 'SMALL' || element.tagName === 'DIV' || element.tagName === 'LABEL') {
             if (!element.children.length || Array.from(element.childNodes).every(node => node.nodeType === Node.TEXT_NODE)) { element.textContent = text; }
             else if (element.tagName === 'LABEL' && !element.querySelector('span[data-string-key]')) { element.textContent = text; }
        }
    });
    document.title = getString('gameTitle');
    const skipLink = document.getElementById('skip-link'); if(skipLink) skipLink.textContent = getString('skipLinkText');
    updateInitialItemLabels(); updateLanguageSelectionLabels();
    if (gameOverOverlay && !gameOverOverlay.classList.contains('hidden')) { updateGameOverUI(); }
}

/**
 * Aggiorna le label degli oggetti nella schermata init.
 */
function updateInitialItemLabels() {
    if (!initItemsSelectionEl) return;
     initItemsSelectionEl.querySelectorAll('label').forEach(label => {
         const span = label.querySelector('span[data-string-key]'); if (span && span.dataset.stringKey) { span.textContent = getString(span.dataset.stringKey); }
     });
     const itemsTitle = initialItemsOptionsEl?.querySelector('h3[data-string-key="configItemsTitle"]'); if(itemsTitle) itemsTitle.textContent = getString('configItemsTitle');
     const itemsLegend = initialItemsOptionsEl?.querySelector('legend[data-string-key="configItemsLegend"]'); if(itemsLegend) itemsLegend.textContent = getString('configItemsLegend');
     const itemsLabel = initialItemsOptionsEl?.querySelector('p[data-string-key="configItemsLabel"]'); if(itemsLabel) itemsLabel.textContent = getString('configItemsLabel');
     const itemsNote = initialItemsOptionsEl?.querySelector('small[data-string-key="configItemsNote"]'); if(itemsNote) itemsNote.textContent = getString('configItemsNote');
 }

/**
 * Aggiorna le label delle lingue nella schermata PE.
 */
function updateLanguageSelectionLabels() {
    if (!peLanguageSelectionEl) return;
     peLanguageSelectionEl.querySelectorAll('label').forEach(label => {
         const span = label.querySelector('span[data-string-key]'); if (span && span.dataset.stringKey) { span.textContent = getString(span.dataset.stringKey); }
     });
     const langTitle = peSpendingOptionsEl?.querySelector('h4[data-string-key="additionalLanguageLabel"]'); if (langTitle) langTitle.textContent = getString('additionalLanguageLabel');
     const combatAbilitiesTitle = peSpendingOptionsEl?.querySelector('h4[data-string-key="combatAbilitiesLabel"]'); if (combatAbilitiesTitle) combatAbilitiesTitle.textContent = getString('combatAbilitiesLabel');
     const genericAbilitiesTitle = peSpendingOptionsEl?.querySelector('h4[data-string-key="genericAbilitiesLabel"]'); if (genericAbilitiesTitle) genericAbilitiesTitle.textContent = getString('genericAbilitiesLabel');
 }

 /**
 * Aggiorna i testi statici della schermata di Game Over.
 */
 function updateGameOverUI() {
    if (!gameOverOverlay) return;
    const title = gameOverOverlay.querySelector('h2[data-string-key="gameOverTitle"]'); if (title) title.textContent = getString('gameOverTitle');
    const button = gameOverOverlay.querySelector('button[data-string-key="gameOverReloadButton"]'); if (button) button.textContent = getString('gameOverReloadButton');
 }

// --- Fine ui.js ---
console.log("ui.js: Script analizzato.");