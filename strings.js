// strings.js
// Contiene l'oggetto con le stringhe UI multilingua e le funzioni per gestirle.

const uiStrings = {
    // Italiano (Default)
    it: {
        // Titoli e Label
        gameTitle: "Il Passo della Morte",
        chapterLabel: "Capitolo",
        configTitle: "Configurazione Personaggio",
        configTitlePE: "Spendi Punti Esperienza",
        configItemsTitle: "Scegli Oggetti Iniziali", // Chiave corretta
        configPointsRemain: "PE Rimanenti:",
        configPointsLabel: "Punti Esperienza da spendere",
        configPointsHelp: "Regole Spesa: 1 PE per +1 C o Abilità Generica (max +1 per Abilità), 1 PE per +3 R, 1 PE per 1 Lingua Addizionale (max 1). Limiti iniziali: C max 6, R max 33, Abilità Generiche max 1.",
        configItemsLegend: "Oggetti Aggiuntivi",
        configItemsLabel: "Scegli 3 oggetti iniziali aggiuntivi:",
        configItemsNote: "Nota: Limite armi: 3. Limite zaino: 8 oggetti generici.",
        confirmPEButton: "Conferma Abilità",
        startGameButton: "Inizia l'Avventura",
        charSheetTitle: "Scheda Personaggio",
        abilitiesLabel: "Abilità",
        combatAbilitiesLabel: "Abilità di Combattimento",
        genericAbilitiesLabel: "Abilità Generiche (Base 0)",
        languagesLabel: "Lingue",
        additionalLanguageLabel: "Lingua Addizionale (Costo 1 PE, Max 1)",
        goldLabel: "Monete d'Oro",
        equipmentLabel: "Equipaggiamento",
        backpackStatusLabel: "Zaino:",
        weaponsLabel: "Armi (Max 3)",
        wornItemsLabel: "Oggetti Indossati",
        backpackItemsLabel: "Zaino",
        keywordsLabel: "Parole Chiave",
        currentKeywordsLabel: "Attuali",
        permanentKeywordsLabel: "Permanenti",
        saveButton: "Salva Partita",
        loadButton: "Carica Partita",
        newGameButton: "Nuova Partita",
        actionsNavLabel: "Azioni del capitolo",
        combatHeading: "Combattimento!",
        attackButtonLabel: "Attacca",
        fleeButtonLabel: "Fuggi (Non implementato)",
        enemyTurnLabel: "Turno dei nemici...",
        skillCheckRollPrompt: "Prova di {skillName} (Obiettivo: {targetValue}+)",
        rollDiceButton: "Tira 2 Dadi",
        gameOverTitle: "Game Over",
        gameOverReloadButton: "Ricarica o Nuova Partita",
        loadingText: "Caricamento...",
        skipLinkText: "Salta al contenuto principale",
        confirmNewGame: "Sei sicuro di voler iniziare una nuova partita? I progressi non salvati verranno persi.",

        // Messaggi di Stato / Log / Errori
        errorChapterNotFound: "Errore: Capitolo {chapterId} mancante.",
        errorDataLoadFailed: "Errore critico: Dati del gioco non caricati o capitolo {chapterId} mancante.",
        errorSaveFailed: "Impossibile salvare la partita. Spazio esaurito?",
        errorLoadFailed: "Impossibile caricare la partita salvata. Dati corrotti?",
        errorGeneric: "Si è verificato un errore.",
        errorPeInsufficient: "Punti Esperienza insufficienti!",
        errorPeMaxStat: "Massimo 1 PE spendibile per {statName}.",
        errorPeMaxLang: "Puoi scegliere solo una lingua addizionale.",
        errorPeConfirm: "Devi spendere esattamente 3 Punti Esperienza.",
        infoNoSavedGame: "Nessuna partita salvata trovata.",
        infoGameSaved: "Partita salvata.",
        infoGameLoaded: "Partita caricata.",
        infoNewGame: "Nuova partita iniziata.",
        infoItemAdded: "Ottenuto: {itemName}",
        infoItemRemoved: "{itemName} rimosso.",
        infoCantTakeItem: "Impossibile prendere {itemName}. Limite raggiunto, zaino mancante o già posseduto?",
        infoNoActions: "Nessuna azione trovata.",
        infoNoMoreActions: "Nessuna azione definita per questo capitolo.",
        infoGameOverReason: "L'avventura è terminata.",
        infoGameOverDesc: "Resistenza esaurita!",
        infoGameOverCombat: "Resistenza esaurita in combattimento!",
        infoConfigStart: "Inizia la configurazione del personaggio.",
        infoConfigPEConfirmed: "Abilità confermate. Scegli gli oggetti iniziali.",
        infoAdventureStarted: "Avventura iniziata!",
        logPlayerAttack: "Attacchi {targetName} per {damage} danni. (Tiro: {roll})",
        logPlayerMiss: "Attacchi {targetName} ma manchi! (Tiro: {roll})",
        logEnemyDefeated: "{enemyName} sconfitto!",
        logEnemyAttack: "{enemyName} ti attacca per {damage} danni. (Tiro: {roll})",
        logEnemyMiss: "{enemyName} ti attacca ma manca! (Tiro: {roll})",
        logEnemyNoDamage: "{enemyName} ti attacca ma non fa danni. (Tiro: {roll})",
        logArmorSave: "Il Corpetto di Cuoio ti salva! Viene distrutto, Resistenza a 1.",
        logVictory: "Vittoria!",
        logDefeat: "Sei stato sconfitto!",
        diceResultFormat: "Tiro ({roll1}+{roll2}) + {skillName} ({skillValue}) = {finalScore}. Obiettivo {targetValue}+. Risultato: {resultText}",
        diceSuccess: "Successo!",
        diceFailure: "Fallimento.",
        buttonTakeItem: "Prendi {itemName}",
        buttonTakeItemTaken: "{itemName} (Preso)",
        buttonTakeItemCant: "Prendi {itemName} (Impossibile)",
        buttonChapterTarget: "Capitolo {target}",

        // Nomi Oggetti
        item_spada_aggiuntiva: "Spada Aggiuntiva",
        item_chiodi_roccia: "Chiodi da Roccia",
        item_corda: "Corda",
        item_cuneo_legno: "Cuneo di Legno",
        item_lanterna: "Lanterna",
        item_piede_porco: "Piede di Porco",
        item_tenda_smontabile: "Tenda Smontabile",
        item_pozione_guaritrice: "Pozione Guaritrice",
        // Nomi Lingue
        lang_adunaico: "Adunaico",
        lang_esterling: "Esterling",
        lang_linguaggio_nero: "Linguaggio Nero",
        lang_nahaiduk: "Nahaiduk",
        lang_orchesco: "Orchesco",
        lang_quenya: "Quenya",
        lang_segnali_naturali: "Segnali Naturali",
        lang_sindarin: "Sindarin",
    },

    // English Translations
    en: {
        // Titles and Labels
        gameTitle: "The Death Pass",
        chapterLabel: "Chapter",
        configTitle: "Character Setup",
        configTitlePE: "Spend Experience Points",
        configItemsTitle: "Choose Starting Items", // Chiave corretta
        configPointsRemain: "XP Remaining:",
        configPointsLabel: "Experience Points to spend",
        configPointsHelp: "Spending Rules: 1 XP for +1 C or Generic Skill (max +1 per Skill), 1 XP for +3 R, 1 XP for 1 Additional Language (max 1). Initial limits: C max 6, R max 33, Generic Skills max 1.",
        configItemsLegend: "Additional Items",
        configItemsLabel: "Choose 3 additional starting items:",
        configItemsNote: "Note: Weapon limit: 3. Backpack limit: 8 generic items.",
        confirmPEButton: "Confirm Abilities",
        startGameButton: "Start Adventure",
        charSheetTitle: "Character Sheet",
        abilitiesLabel: "Abilities",
        combatAbilitiesLabel: "Combat Abilities",
        genericAbilitiesLabel: "Generic Abilities (Base 0)",
        languagesLabel: "Languages",
        additionalLanguageLabel: "Additional Language (Cost 1 XP, Max 1)",
        goldLabel: "Gold Coins",
        equipmentLabel: "Equipment",
        backpackStatusLabel: "Backpack:",
        weaponsLabel: "Weapons (Max 3)",
        wornItemsLabel: "Worn Items",
        backpackItemsLabel: "Backpack",
        keywordsLabel: "Keywords",
        currentKeywordsLabel: "Current",
        permanentKeywordsLabel: "Permanent",
        saveButton: "Save Game",
        loadButton: "Load Game",
        newGameButton: "New Game",
        actionsNavLabel: "Chapter Actions",
        combatHeading: "Combat!",
        attackButtonLabel: "Attack",
        fleeButtonLabel: "Flee (Not implemented)",
        enemyTurnLabel: "Enemies' turn...",
        skillCheckRollPrompt: "Test {skillName} (Target: {targetValue}+)",
        rollDiceButton: "Roll 2 Dice",
        gameOverTitle: "Game Over",
        gameOverReloadButton: "Reload or New Game",
        loadingText: "Loading...",
        skipLinkText: "Skip to main content",
        confirmNewGame: "Are you sure you want to start a new game? Unsaved progress will be lost.",

        // Status Messages / Logs / Errors
        errorChapterNotFound: "Error: Chapter {chapterId} not found.",
        errorDataLoadFailed: "Critical Error: Game data not loaded or chapter {chapterId} missing.",
        errorSaveFailed: "Could not save game. Storage full?",
        errorLoadFailed: "Could not load saved game. Data corrupted?",
        errorGeneric: "An error occurred.",
        errorPeInsufficient: "Insufficient Experience Points!",
        errorPeMaxStat: "Maximum 1 XP spendable for {statName}.",
        errorPeMaxLang: "You can only choose one additional language.",
        errorPeConfirm: "You must spend exactly 3 Experience Points.",
        infoNoSavedGame: "No saved game found.",
        infoGameSaved: "Game saved.",
        infoGameLoaded: "Game loaded.",
        infoNewGame: "New game started.",
        infoItemAdded: "Obtained: {itemName}",
        infoItemRemoved: "{itemName} removed.",
        infoCantTakeItem: "Cannot take {itemName}. Limit reached, backpack missing, or already owned?",
        infoNoActions: "No actions found.",
        infoNoMoreActions: "No actions defined for this chapter.",
        infoGameOverReason: "The adventure has ended.",
        infoGameOverDesc: "Endurance depleted!",
        infoGameOverCombat: "Endurance depleted in combat!",
        infoConfigStart: "Begin character setup.",
        infoConfigPEConfirmed: "Abilities confirmed. Choose starting items.",
        infoAdventureStarted: "Adventure started!",
        logPlayerAttack: "You attack {targetName} for {damage} damage. (Roll: {roll})",
        logPlayerMiss: "You attack {targetName} but miss! (Roll: {roll})",
        logEnemyDefeated: "{enemyName} defeated!",
        logEnemyAttack: "{enemyName} attacks you for {damage} damage. (Roll: {roll})",
        logEnemyMiss: "{enemyName} attacks you but misses! (Roll: {roll})",
        logEnemyNoDamage: "{enemyName} attacks you but deals no damage. (Roll: {roll})",
        logArmorSave: "The Leather Armor saves you! It is destroyed, Endurance set to 1.",
        logVictory: "Victory!",
        logDefeat: "You have been defeated!",
        diceResultFormat: "Roll ({roll1}+{roll2}) + {skillName} ({skillValue}) = {finalScore}. Target {targetValue}+. Result: {resultText}",
        diceSuccess: "Success!",
        diceFailure: "Failure.",
        buttonTakeItem: "Take {itemName}",
        buttonTakeItemTaken: "{itemName} (Taken)",
        buttonTakeItemCant: "Take {itemName} (Cannot take)",
        buttonChapterTarget: "Chapter {target}",

        // Item Names
        item_spada_aggiuntiva: "Additional Sword",
        item_chiodi_roccia: "Rock Nails",
        item_corda: "Rope",
        item_cuneo_legno: "Wood Wedge",
        item_lanterna: "Lantern",
        item_piede_porco: "Crowbar",
        item_tenda_smontabile: "Portable Tent",
        item_pozione_guaritrice: "Healing Potion",
        // Language Names
         lang_adunaico: "Adunaic",
         lang_esterling: "Easterling",
         lang_linguaggio_nero: "Black Speech",
         lang_nahaiduk: "Nahaiduk",
         lang_orchesco: "Orkish",
         lang_quenya: "Quenya",
         lang_segnali_naturali: "Natural Signals",
         lang_sindarin: "Sindarin",
    }
    // --- Aggiungi qui altre lingue ---
};

// --- Funzioni Gestione Lingua ---
let currentLang = 'it'; // Lingua di default

/**
 * Ottiene una stringa localizzata dalla chiave specificata.
 * @param {string} key - La chiave della stringa (es. 'gameTitle', 'errorPeInsufficient').
 * @param {object} [params={}] - Un oggetto con coppie chiave-valore per sostituire i placeholder (es. {chapterId: 10}).
 * @returns {string} La stringa localizzata o la chiave tra parentesi quadre se non trovata.
 */
function getString(key, params = {}) {
    let langStrings = uiStrings[currentLang] || uiStrings.it;
    let str = langStrings[key];
    if (str === undefined) {
        console.warn(`String key "${key}" not found in lang "${currentLang}", fallback 'it'.`);
        langStrings = uiStrings.it; str = langStrings[key];
    }
    if (str === undefined) { console.error(`String key "${key}" not found in 'it'.`); return `[[${key}]]`; }
    for (const paramKey in params) { str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]); }
    return str;
}

/**
 * Imposta la lingua corrente e aggiorna l'interfaccia utente.
 * @param {string} langCode - Il codice della lingua (es. 'it', 'en').
 */
function setLanguage(langCode) {
    if (uiStrings[langCode]) {
        currentLang = langCode;
        console.log(`Language set to: ${langCode}`);
        // Chiama le funzioni UI globali definite altrove (in ui.js)
        // Verifica l'esistenza prima di chiamare per sicurezza
        if (typeof updateAllUIStrings === 'function') updateAllUIStrings();
        else console.error("setLanguage Error: updateAllUIStrings non definita!");

         // Ricarica stato corrente UI o capitolo (Verifica esistenza gameState e funzioni)
         if (typeof gameState !== 'undefined' && gameState && gameState.chapter !== undefined && !gameState.gameOver) {
            const peOptionsVisible = typeof peSpendingOptionsEl !== 'undefined' && peSpendingOptionsEl && !peSpendingOptionsEl.classList.contains('hidden');
            const itemOptionsVisible = typeof initialItemsOptionsEl !== 'undefined' && initialItemsOptionsEl && !initialItemsOptionsEl.classList.contains('hidden');

            if (gameState.chapter === 0 && peOptionsVisible) { if(typeof updatePESpendingUI === 'function') updatePESpendingUI(); else console.error("setLanguage Error: updatePESpendingUI non def!"); }
            else if (gameState.chapter === 0 && itemOptionsVisible) { if(typeof updateInitialItemLabels === 'function') updateInitialItemLabels(); else console.error("setLanguage Error: updateInitialItemLabels non def!"); if(typeof handleInitialItemChange === 'function') handleInitialItemChange(); else console.error("setLanguage Error: handleInitialItemChange non def!"); }
            else if (gameState.chapter !== 0) { if(typeof displayChapter === 'function') displayChapter(gameState.chapter); else console.error("setLanguage Error: displayChapter non def!"); }
            else { if(typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("setLanguage Error: displayInitialStateUI non def!"); }
         } else if (typeof gameState !== 'undefined' && gameState.gameOver) { if(typeof updateGameOverUI === 'function') updateGameOverUI(); else console.error("setLanguage Error: updateGameOverUI non def!"); }
         else { if(typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("setLanguage Error: displayInitialStateUI non def!"); }
    } else {
        console.warn(`Language code "${langCode}" not found in uiStrings.`);
    }
}

// Non esporta nulla con window. Le funzioni getString e setLanguage saranno
// accessibili implicitamente dagli altri script caricati dopo con defer.
// Se questo dovesse causare problemi, si potrebbero aggiungere:
// window.getString = getString;
// window.setLanguage = setLanguage;
// Ma proviamo prima senza.

console.log("strings.js: Script analizzato.");