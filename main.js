// main.js
// Punto di ingresso principale, gestione eventi globali, inizializzazione

/**
 * Mostra un messaggio all'utente tramite la regione ARIA live.
 * Funzione helper definita qui per essere usata dai wrapper sottostanti.
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
    // Verifica che le funzioni necessarie siano definite globalmente (dagli altri script)
    if (typeof loadGame !== 'function' || typeof getString !== 'function' || typeof setLanguage !== 'function' || typeof displayInitialStateUI !== 'function' || typeof displayChapter !== 'function' || typeof updateCharacterSheetUI !== 'function' || typeof updateAllUIStrings !== 'function' ) {
         console.error("Errore CRITICO: Funzioni necessarie per loadGameAndUpdateUI non definite!");
         alert(getString('errorGeneric') || "Si è verificato un errore interno durante il caricamento.");
         return;
     }

    if (loadGame()) { // loadGame (da state.js) ritorna true se caricato con successo
        announceMessage(getString('infoGameLoaded'), 'assertive'); // Notifica accessibile
        setLanguage(currentLang); // Riapplica lingua corrente (questo chiama displayChapter o InitialState)
        // Assicura che i bottoni globali siano abilitati
        if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false);
    } else {
        // loadGame ritorna false se non c'è save o se c'è errore
        if (!localStorage.getItem(SAVE_KEY)) {
             announceMessage(getString('infoNoSavedGame'));
             alert(getString('infoNoSavedGame'));
        } else {
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
        showInitScreen(); // Chiama funzione da ui.js per mostrare la schermata di configurazione PE
    } else {
        console.log("Reset annullato dall'utente."); // Nessun messaggio UI se l'utente annulla
    }
}


// --- Inizializzazione al Caricamento della Pagina ---
// Attende che l'intero DOM sia caricato e gli script con 'defer' siano stati eseguiti
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento attivato. Inizio inizializzazione...");

    // 1. Cache degli elementi DOM una sola volta (chiamando funzione da ui.js)
    if (typeof cacheDOMElements === 'function') {
        cacheDOMElements();
        console.log("DOMContentLoaded: Caching elementi DOM completato.");
    } else {
        console.error("FATAL: Funzione cacheDOMElements non definita (da ui.js)! Impossibile continuare.");
        document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico nell'inizializzazione UI.</h1>`;
        return; // Blocca l'esecuzione ulteriore
    }

    // 2. Verifica dipendenze critiche (oggetti/funzioni base da altri file)
    // Questa è una verifica di sicurezza aggiuntiva
    const criticalFunctions = [ 'getString', 'setLanguage', 'updateAllUIStrings', 'initThree', 'displayInitialStateUI', 'showInitScreen', 'displayChapter', 'saveGame', 'loadGame', 'resetGame', 'addItem', 'removeItem', 'updateCharacterSheetUI', 'updateCombatUI', 'updateSkillCheckUI', 'applyEffect', 'checkCondition', 'resolveSkillCheck', 'handleCombatActionAttack', 'handleEnemyCombatTurn', 'finalizeCombat', 'addLogToCombat', 'changeStatPE', 'handleLanguageSelection', 'confirmPESpending', 'startGame', 'handleGameOver'];
    let missingDeps = criticalFunctions.filter(fnName => typeof window[fnName] !== 'function' && typeof self[fnName] !== 'function');

     if (missingDeps.length > 0) {
         console.error("Errore CRITICO: Una o più funzioni base mancanti o non definite globalmente!", missingDeps);
         document.body.innerHTML = `<h1 style="color:red; text-align:center;">Errore Inizializzazione Critico (${missingDeps.join(', ')} mancante/i). Controlla console e ordine script.</h1>`;
         return;
     }
     console.log("DOMContentLoaded: Dipendenze base verificate.");


    // 3. Inizializza Three.js (da three_setup.js)
    console.log("DOMContentLoaded: Chiamo initThree...");
    initThree(); // Assume che initThree sia definita globalmente da three_setup.js
    console.log("DOMContentLoaded: initThree chiamata.");

    // 4. Inizializza stringhe UI statiche (da ui.js)
    console.log("DOMContentLoaded: Chiamo updateAllUIStrings...");
    updateAllUIStrings();
    console.log("DOMContentLoaded: updateAllUIStrings chiamata.");

    // 5. Mostra stato iniziale UI (da ui.js)
    console.log("DOMContentLoaded: Chiamo displayInitialStateUI...");
    displayInitialStateUI();
    console.log("DOMContentLoaded: displayInitialStateUI chiamata.");

    // 6. Imposta lingua iniziale (da strings.js)
    console.log("DOMContentLoaded: Imposto lingua iniziale...");
    // Verifica esistenza uiStrings prima di accedere
    const browserLang = navigator.language.split('-')[0];
    const initialLang = (typeof uiStrings !== 'undefined' && uiStrings[browserLang]) ? browserLang : 'it';
    setLanguage(initialLang); // Da strings.js (che chiama funzioni UI)
    if(langSelect) langSelect.value = currentLang; // Sincronizza dropdown
    console.log("DOMContentLoaded: Lingua impostata.");

    // --- 7. AGGIUNTA DEGLI EVENT LISTENER ---
    console.log("DOMContentLoaded: Aggiungo Event Listeners...");

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
    // Listener per Spesa PE
    if (peSpendingOptionsEl) {
        peSpendingOptionsEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.tagName === 'BUTTON' && (target.classList.contains('pe-btn-plus') || target.classList.contains('pe-btn-minus'))) {
                const stat = target.dataset.stat; const change = parseInt(target.dataset.change);
                if (stat && !isNaN(change) && typeof changeStatPE === 'function') changeStatPE(stat, change); else console.warn("Listener PE +/-: func mancante o dati errati", target.dataset);
            } else if (target.id === 'confirm-pe-button' && typeof confirmPESpending === 'function') { confirmPESpending(); }
        });
    } else { console.warn("#pe-spending-options non trovato per delegation."); }

    // Listener per Lingua PE
    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleLanguageSelection === 'function') handleLanguageSelection(event.target);
         });
    } else { console.warn("#pe-language-selection non trovato per delegation."); }

     // Listener per Oggetti Iniziali
     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleInitialItemChange === 'function') handleInitialItemChange();
         });
     } else { console.warn("#initial-items-selection non trovato per delegation."); }

     // Listener per Bottone Inizio Avventura
     if (startGameButton && typeof startGame === 'function') { startGameButton.addEventListener('click', startGame); }
     else { console.warn("#start-game-button non trovato o startGame non definito.");}

     // Listener per Bottone Tira Dadi
     if (rollDiceButton && typeof resolveSkillCheck === 'function') { rollDiceButton.addEventListener('click', resolveSkillCheck); }
     else { console.warn("#roll-dice-button non trovato o resolveSkillCheck non definito."); }

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
             // I bottoni di scelta capitolo normale hanno il loro listener individuale
             // aggiunto dinamicamente da displayChapter (engine.js)
         });
     } else { console.warn("#actions non trovato per aggiungere listener delegato."); }

     console.log("DOMContentLoaded: Event Listeners aggiunti.");
     console.log(">>>> GIOCO PRONTO <<<<");
});

// --- Event Listener Globale (Salvataggio su Chiusura) ---
// Usa 'visibilitychange' e 'pagehide' per maggiore affidabilità
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
         // Salva solo se il gioco è in uno stato valido per essere salvato
         if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
             saveGame();
             console.log("Tentativo di salvataggio su visibilitychange (hidden).");
         }
    }
});

window.addEventListener('pagehide', (event) => {
    // Salva solo se il gioco è in uno stato valido prima che la pagina venga eventualmente scaricata
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') {
        saveGame(); // Funzione da state.js
        console.log("Tentativo di salvataggio su pagehide.");
    }
});

// --- Fine main.js ---
console.log("main.js: Script analizzato.");