// engine.js
// Contiene il "motore" del gioco: displayChapter, applyEffect, checkCondition,
// resolveSkillCheck, handleCombatActionAttack, handleEnemyCombatTurn, finalizeCombat, addLogToCombat,
// startGame (logica), confirmPESpending (logica), changeStatPE, handleLanguageSelection

// --- Funzioni Gestione Spesa PE (Logica) ---

/**
 * Gestisce il cambiamento temporaneo di una statistica durante la spesa PE.
 * Valida i limiti di PE e di statistica. Chiamata dai listener in main.js.
 * @param {string} statKey - La chiave della statistica (es. 'combattivita', 'mira').
 * @param {number} change - La variazione da applicare (+1, -1, +3, -3).
 */
function changeStatPE(statKey, change) {
    // Verifica stati e funzioni necessarie
    if (!tempStats || !peSpent || typeof initialGameState === 'undefined' || typeof announceMessage !== 'function' || typeof getString !== 'function' || typeof updatePESpendingUI !== 'function') {
        console.error("Errore: Stato PE temporaneo, initialGameState o funzioni necessarie non definite per changeStatPE!");
        return;
    }

    const isResistance = statKey === 'resistenza';
    const peCost = 1;
    const valueChange = change;
    const maxPESpentOnStat = 1;
    const baseStats = initialGameState.stats;
    if (!baseStats || baseStats[statKey] === undefined) { console.error(`Statistica base non trovata per ${statKey}`); return; }
    const baseValue = baseStats[statKey];
    if (tempStats[statKey] === undefined || peSpent[statKey] === undefined) { console.error("Errore: Stato temp PE non inizializzato per", statKey); return; }

    const currentValue = tempStats[statKey];
    const newValue = currentValue + valueChange;
    let currentPeSpentOnThis = peSpent[statKey] || 0;
    let peChange = (change > 0) ? peCost : -peCost;

    // Validazione
    if (peSpent.total + peChange > baseStats.puntiEsperienza) { announceMessage(getString('errorPeInsufficient')); return; }
    if (change > 0 && currentPeSpentOnThis >= maxPESpentOnStat) { announceMessage(getString('errorPeMaxStat', {statName: statKey})); return; }
    if (change < 0 && currentPeSpentOnThis <= 0) { return; }
    const maxAllowedValue = isResistance ? baseValue + 3 : baseValue + 1;
    const minAllowedValue = baseValue;
    if (newValue > maxAllowedValue || newValue < minAllowedValue) { return; }

    // Applica Modifica Temporanea
    tempStats[statKey] = newValue;
    peSpent[statKey] += (change > 0 ? 1 : -1);
    peSpent.total += peChange;

    updatePESpendingUI(); // Chiama UI update
}

/**
 * Gestisce la selezione/deselezione di una lingua addizionale durante la spesa PE.
 * Chiamata dai listener in main.js.
 * @param {HTMLInputElement} checkbox - L'elemento checkbox della lingua cliccato.
 */
function handleLanguageSelection(checkbox) {
    if (!peSpent || typeof initialGameState === 'undefined' || typeof announceMessage !== 'function' || typeof getString !== 'function' || typeof updatePESpendingUI !== 'function') { console.error("Errore: Stato o funzioni mancanti per handleLanguageSelection"); return; }

    const maxLanguages = 1; const peCost = 1;
    if (checkbox.checked) {
        if (peSpent.total + peCost > initialGameState.stats.puntiEsperienza) { announceMessage(getString('errorPeInsufficient')); checkbox.checked = false; return; }
        if (peSpent.lingua >= maxLanguages) { announceMessage(getString('errorPeMaxLang')); checkbox.checked = false; return; }
        peSpent.total += peCost; peSpent.lingua += 1; tempLang = checkbox.value;
    } else {
        peSpent.total -= peCost; peSpent.lingua -= 1; tempLang = null;
    }
    updatePESpendingUI();
}

/**
 * Conferma la spesa dei PE, applica le modifiche temporanee a gameState,
 * e chiama la UI per passare alla schermata di selezione oggetti.
 * Chiamata dal listener in main.js.
 */
function confirmPESpending() {
    if (typeof peSpent === 'undefined' || typeof initialGameState === 'undefined' || typeof gameState === 'undefined' || typeof updateCharacterSheetUI !== 'function' || typeof setupInitialItemsUI !== 'function' || typeof announceMessage !== 'function' || typeof getString !== 'function') { console.error("Errore: Stato o funzioni mancanti per confirmPESpending"); return; }
    if (peSpent.total !== initialGameState.stats.puntiEsperienza) { announceMessage(getString('errorPeConfirm')); return; }

    gameState.stats = JSON.parse(JSON.stringify(tempStats));
    gameState.stats.puntiEsperienza = 0;
    gameState.inventory = JSON.parse(JSON.stringify(initialGameState.inventory));
    gameState.lingue = [...initialGameState.lingue];
    gameState.moneteOro = initialGameState.moneteOro;
    gameState.keywords = JSON.parse(JSON.stringify(initialGameState.keywords));
    gameState.gameOver = false;
    if (tempLang) { gameState.lingue.push(tempLang); }

    updateCharacterSheetUI();
    setupInitialItemsUI(); // Passa alla UI oggetti
    announceMessage(getString('infoConfigPEConfirmed'));
}

/**
 * Funzione logica chiamata dopo la selezione degli oggetti per avviare il gioco.
 * Chiamata dal listener in main.js.
 */
function startGame() {
    if (!initialItemsOptionsEl || !initItemsSelectionEl || typeof addItem !== 'function' || typeof displayChapter !== 'function' || typeof saveGame !== 'function' || typeof announceMessage !== 'function' || typeof getString !== 'function' ) { console.error("Errore: Elementi UI o funzioni mancanti per startGame!"); return; }

    const selectedItems = initItemsSelectionEl.querySelectorAll('input:checked');
    selectedItems.forEach(itemInput => { addItem(itemInput.value, itemInput.dataset.type); }); // addItem da state.js

    initialItemsOptionsEl.classList.add('hidden');
    if(peSpendingOptionsEl) peSpendingOptionsEl.classList.add('hidden');
    if(initOptionsEl) initOptionsEl.classList.add('hidden');

    gameState.chapter = 1;
    displayChapter(gameState.chapter); // Chiama displayChapter da questo file
    saveGame();
    announceMessage(getString('infoAdventureStarted'));
}


// --- Core Game Loop: displayChapter ---
/**
 * Visualizza il capitolo specificato, processando i dati e chiamando le funzioni UI.
 * @param {number | string} chapterId - L'ID del capitolo da visualizzare.
 */
function displayChapter(chapterId) {
    // Verifica esistenza stato, dati e funzioni UI base
    if (gameState.gameOver) { console.log("Game is over."); return; }
    if (typeof gameState === 'undefined' || typeof gameData === 'undefined' || typeof chapterTextEl === 'undefined' || typeof actionsEl === 'undefined' || typeof updateCharacterSheetUI !== 'function') { console.error("Errore critico: Stato, dati o elementi/funzioni UI base mancanti!"); return; }
    if (!gameData[chapterId]) { console.error(`Capitolo ${chapterId} non trovato!`); chapterTextEl.innerHTML = getString('errorChapterNotFound', { chapterId: chapterId }); actionsEl.innerHTML = ''; return; }
    if (!gameState.stats && chapterId !== 0) { console.log("Stato non inizializzato."); if(typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("displayInitialStateUI non def!"); return; }

    gameState.chapter = chapterId;
    const chapter = gameData[chapterId];
    console.log(`--- Caricamento Capitolo ${chapterId} ('${chapter.title || ''}') ---`);

    // Reset UI elements
    actionsEl.innerHTML = '';
    if(combatInfoEl) combatInfoEl.classList.add('hidden');
    if(diceRollEl) diceRollEl.classList.add('hidden');
    if(imageContainer) imageContainer.classList.add('hidden');
    // Resetta stati interni motore
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
        imageEl.src = imageData.src; imageEl.alt = imageData.alt; // !!! MIGLIORA ALT TEXT !!!
        imageContainer.classList.remove('hidden');
    }

    // Impostare Testo e Titolo
    chapterTextEl.innerHTML = chapter.text ? chapter.text.replace(/\n/g, '<br>') : '';
    chapterTitleEl.textContent = chapterId === 0 ? "" : chapter.title || `${getString('chapterLabel')} ${chapterId}`;

    // Impostare Combattimento o Skill Check
    if (chapter.combat && !gameState.skillCheck) {
         gameState.combat = JSON.parse(JSON.stringify(chapter.combat));
         if(gameState.combat.enemies && Array.isArray(gameState.combat.enemies)) { gameState.combat.enemies.forEach(e => { if(e.initialR === undefined) e.initialR = e.R; }); } else { gameState.combat.enemies = []; }
         gameState.combat.turn = 'player';
         if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non definita!");
    } else if (chapter.skillCheck && !gameState.combat) {
         gameState.skillCheck = { ...chapter.skillCheck };
         if(typeof updateSkillCheckUI === 'function') updateSkillCheckUI(gameState.skillCheck); else console.error("updateSkillCheckUI non definita!");
    } else { // Nasconde UI specifiche se non attive
         if(combatInfoEl) combatInfoEl.classList.add('hidden');
         if(diceRollEl) diceRollEl.classList.add('hidden');
     }

    // Render Buttons
    if (!gameState.combat && !gameState.skillCheck && chapterId !== 0) {
        actionsEl.innerHTML = ''; // Assicura sia pulito
        let itemsOffered = [];
        // Cerca oggetti offerti esplicitamente (da compile_chapters)
        if (chapter.itemsOffered && Array.isArray(chapter.itemsOffered)) { itemsOffered = chapter.itemsOffered; }
        else { /* Fallback cerca "Puoi prendere" se necessario */ }

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

    // Check Morte
    if (gameState.stats && gameState.stats.resistenza <= 0 && !gameState.combat && !gameState.gameOver) { handleGameOver('infoGameOverDesc'); }

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
            case 'STAT_CHANGE': /* ... come prima ... */ break;
            case 'KEYWORD_ADD': /* ... come prima ... */ break;
            case 'ITEM_ADD': /* ... come prima (chiama addItem) ... */ break;
            case 'ITEM_REMOVE': /* ... come prima (chiama removeItem) ... */ break;
            case 'COMBAT_MOD': /* ... come prima ... */ break;
            default: console.warn(`Unknown effect type: ${effect.type}`);
        }
    } catch (e) { console.error("Error applying effect:", effect, e); }
}

// --- Funzione Controllo Condizioni (DA COMPLETARE CON TUTTE LE CONDIZIONI) ---
function checkCondition(conditionText) {
    if (!gameState || !gameState.inventory || !conditionText) return true;
    const lowerCond = conditionText.toLowerCase().trim();
    if (lowerCond.startsWith("possiedi ")) { /* ... check item ... */ return true/false; }
    if (lowerCond.startsWith("conosci ") || lowerCond.startsWith("comprendi ")) { /* ... check lingua ... */ return true/false; }
    if (lowerCond.startsWith("keyword attuale ")) { /* ... check kw attuale ... */ return true/false; }
    if (lowerCond.startsWith("keyword permanente ")) { /* ... check kw permanente ... */ return true/false;}
    const statCheckMatch = lowerCond.match(/^(\w+)\s*([><=!]+)\s*(\d+)$/); if (statCheckMatch) { /* ... check stats ... */ return true/false;}
    console.warn(`Condizione non implementata: "${conditionText}" -> TRUE`); return true;
}


// --- Funzioni Skill Check ---
function resolveSkillCheck() {
    if (!gameState.skillCheck) return;
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
     if (!gameState.combat || gameState.combat.turn !== 'player' || gameState.gameOver) return;
     const activeEnemies = gameState.combat.enemies.filter(e => e.R > 0); if (activeEnemies.length === 0) { finalizeCombat(true); return; }
     const targetEnemy = activeEnemies[0]; const playerRoll1=Math.floor(Math.random()*6)+1, playerRoll2=Math.floor(Math.random()*6)+1, playerTotalRoll=playerRoll1+playerRoll2;
     let playerDamage = playerTotalRoll + gameState.stats.combattivita - targetEnemy.C;
     if (gameState.combat.doublePlayerDamage) playerDamage *= 2;
     if (playerTotalRoll === 2) { playerDamage = 0; addLogToCombat('logPlayerMiss',{targetName:targetEnemy.name,roll:playerTotalRoll},true); }
     else { if (playerTotalRoll === 12) playerDamage = Math.max(2, playerDamage); playerDamage = Math.max(0, playerDamage); targetEnemy.R -= playerDamage; addLogToCombat('logPlayerAttack',{targetName:targetEnemy.name,damage:playerDamage,roll:playerTotalRoll},true); }
     if (targetEnemy.R <= 0) addLogToCombat('logEnemyDefeated',{enemyName:targetEnemy.name},true);
     if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non def!");
     if(typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI(); else console.error("updateCharacterSheetUI non def!");
     if (gameState.combat.enemies.every(e => e.R <= 0)) { finalizeCombat(true); return; }
     gameState.combat.turn = 'enemy'; if(typeof updateCombatUI === 'function') updateCombatUI(); setTimeout(handleEnemyCombatTurn, 1200);
}

function handleEnemyCombatTurn() {
     if (gameState.gameOver || !gameState.combat || gameState.combat.turn !== 'enemy') return;
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
        if(typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI(); else console.error("updateCharacterSheetUI non def!");
        if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non def!");
     });
     if (playerDefeated) { finalizeCombat(false); return; }
     gameState.combat.turn = 'player'; if(typeof updateCombatUI === 'function') updateCombatUI(); else console.error("updateCombatUI non def!");
}

function finalizeCombat(playerWon) {
    const victoryChapter = gameState.combat?.victoryChapter;
    gameState.combat = null;
    if (playerWon) {
        addLogToCombat('logVictory', {}, true); console.log("Combattimento vinto!");
        setTimeout(() => displayChapter(victoryChapter || gameState.chapter + 1), 1500); saveGame();
    } else { console.log("Combattimento perso!"); handleGameOver('infoGameOverCombat'); }
}

function addLogToCombat(messageKey, params = {}, scroll = false) {
    if(typeof getString !== 'function' || typeof addLogToUI !== 'function') { console.error("getString o addLogToUI non definite!"); return; }
    const message = getString(messageKey, params); console.log("COMBAT LOG:", message); combatLog.push(message); addLogToUI(message);
}

// --- Funzione Game Over (Logica + chiamata UI) ---
function handleGameOver(reasonKey, params = {}) {
    if(gameState.gameOver) return;
    gameState.gameOver = true;
    console.log("Game Over:", reasonKey, params);
    if(typeof showGameOverUI === 'function') showGameOverUI(reasonKey, params); else console.error("Funzione showGameOverUI non definita!");
    if(globalActionsContainer) globalActionsContainer.querySelectorAll('button:not(#new-game-button)').forEach(b => b.disabled = true);
}

// --- Fine engine.js ---
console.log("engine.js: Script analizzato.");