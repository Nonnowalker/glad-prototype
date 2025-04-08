// main.js
// Punto di ingresso principale, gestione eventi globali, inizializzazione

/**
 * Mostra un messaggio all'utente tramite la regione ARIA live.
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
    if (typeof loadGame !== 'function' || typeof getString !== 'function' || typeof setLanguage !== 'function' || typeof displayInitialStateUI !== 'function' || typeof displayChapter !== 'function' || typeof updateCharacterSheetUI !== 'function' || typeof updateAllUIStrings !== 'function' ) {
         console.error("Errore CRITICO: Funzioni necessarie per loadGameAndUpdateUI non definite!");
         alert(getString('errorGeneric') || "Si è verificato un errore interno durante il caricamento.");
         return;
     }

    if (loadGame()) { // loadGame (da state.js) ritorna true se caricato con successo
        announceMessage(getString('infoGameLoaded'), 'assertive'); // Notifica accessibile
        setLanguage(currentLang); // Riapplica lingua corrente (questo chiama displayChapter o InitialState)
        if(globalActionsContainer) globalActionsContainer.querySelectorAll('button').forEach(b => b.disabled = false); // Riabilita bottoni
    } else {
        // Se loadGame ritorna false, gestisci il motivo
        if (!localStorage.getItem(SAVE_KEY)) {
             announceMessage(getString('infoNoSavedGame'));
             alert(getString('infoNoSavedGame'));
        } else {
             // Errore durante il caricamento
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
        showInitScreen(); // Chiama funzione da ui.js per mostrare schermata config PE
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
        document.body.innerHTML = `<h1 style="color:red; text-align:center; margin-top: 2em;">Errore critico nell'inizializzazione UI (cache).</h1>`;
        return;
    }

    // 2. Verifica dipendenze critiche (oggetti/funzioni base da altri file)
    // Questa è una verifica di sicurezza aggiuntiva
    const criticalFunctions = [ 'getString', 'setLanguage', 'updateAllUIStrings', 'initThree', 'displayInitialStateUI', 'showInitScreen', 'displayChapter', 'saveGame', 'loadGame', 'resetGame', 'addItem', 'removeItem', 'updateCharacterSheetUI', 'updateCombatUI', 'updateSkillCheckUI', 'applyEffect', 'checkCondition', 'resolveSkillCheck', 'handleCombatActionAttack', 'handleGameOver', 'changeStatPE', 'handleLanguageSelection', 'confirmPESpending', 'startGame', 'handleInitialItemChange'];
    let missingDeps = criticalFunctions.filter(fnName => typeof window[fnName] !== 'function' && typeof self[fnName] !== 'function' && typeof window[fnName.split('.')[0]]?.[fnName.split('.')[1]] !== 'function' && typeof self[fnName.split('.')[0]]?.[fnName.split('.')[1]] !== 'function'); // Verifica globale e self

    // Rimuovi dalla verifica le funzioni definite ESPLICITAMENTE in questo file (main.js)
    missingDeps = missingDeps.filter(fnName => fnName !== 'announceMessage' && fnName !== 'loadGameAndUpdateUI' && fnName !== 'resetGameAndUpdateUI');


    if (missingDeps.length > 0) {
         console.error("Errore CRITICO: Una o più funzioni base mancanti o non definite globalmente!", missingDeps);
         // Tenta di fornire un messaggio più utile se getString è disponibile
         const errorMsg = (typeof getString === 'function') ? getString('errorGeneric') : 'Errore inizializzazione';
         document.body.innerHTML = `<h1 style="color:red; text-align:center;">${errorMsg} (${missingDeps.join(', ')} mancante/i).</h1>`;
         return;
     }
     console.log("DOMContentLoaded: Dipendenze base verificate.");


    // 3. Inizializza Three.js (da three_setup.js)
    console.log("DOMContentLoaded: Chiamo initThree...");
    // Verifica esistenza prima di chiamare
    if (typeof initThree === 'function') initThree(); else console.error("initThree non definita!");
    console.log("DOMContentLoaded: initThree chiamata (se definita).");

    // 4. Inizializza stringhe UI statiche (da ui.js)
    console.log("DOMContentLoaded: Chiamo updateAllUIStrings...");
    if (typeof updateAllUIStrings === 'function') updateAllUIStrings(); else console.error("updateAllUIStrings non definita!");
    console.log("DOMContentLoaded: updateAllUIStrings chiamata (se definita).");

    // 5. Mostra stato iniziale UI (da ui.js)
    console.log("DOMContentLoaded: Chiamo displayInitialStateUI...");
    if (typeof displayInitialStateUI === 'function') displayInitialStateUI(); else console.error("displayInitialStateUI non definita!");
    console.log("DOMContentLoaded: displayInitialStateUI chiamata (se definita).");

    // 6. Imposta lingua iniziale (da strings.js)
    console.log("DOMContentLoaded: Imposto lingua iniziale...");
    // Verifica esistenza uiStrings prima di accedere
    const browserLang = navigator.language.split('-')[0];
    const initialLang = (typeof uiStrings !== 'undefined' && uiStrings[browserLang]) ? browserLang : 'it';
    // Verifica esistenza setLanguage
    if (typeof setLanguage === 'function') setLanguage(initialLang); else console.error("setLanguage non definita!");
    if(langSelect) langSelect.value = currentLang; // currentLang da strings.js
    console.log("DOMContentLoaded: Lingua impostata (se possibile).");

    // --- 7. AGGIUNTA DEGLI EVENT LISTENER ---
    console.log("DOMContentLoaded: Aggiungo Event Listeners...");

    // Bottoni Globali
    const saveBtn = document.getElementById('save-button');
    const loadBtn = document.getElementById('load-button');
    const newGameBtn = document.getElementById('new-game-button');
    // Verifica esistenza bottone E funzione prima di aggiungere listener
    if (saveBtn && typeof saveGame === 'function') {
        saveBtn.addEventListener('click', () => { saveGame(); announceMessage(getString('infoGameSaved')); });
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
                // Verifica esistenza funzione prima di chiamare
                if (stat && !isNaN(change) && typeof changeStatPE === 'function') changeStatPE(stat, change); // Da engine.js
            } else if (target.id === 'confirm-pe-button') {
                 // Verifica esistenza funzione prima di chiamare
                 if (typeof confirmPESpending === 'function') confirmPESpending(); // Da engine.js
                 else console.error("Funzione confirmPESpending non trovata!");
            }
        });
    } else { console.warn("#pe-spending-options non trovato per delegation."); }

    if(peLanguageSelectionEl) {
        peLanguageSelectionEl.addEventListener('change', (event) => {
             // Verifica esistenza funzione prima di chiamare
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleLanguageSelection === 'function') handleLanguageSelection(event.target); // Da engine.js
         });
    } else { console.warn("#pe-language-selection non trovato per delegation."); }

     if(initItemsSelectionEl) {
         initItemsSelectionEl.addEventListener('change', (event) => {
             // Verifica esistenza funzione prima di chiamare
             if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox' && typeof handleInitialItemChange === 'function') handleInitialItemChange(); // Da ui.js
         });
     } else { console.warn("#initial-items-selection non trovato per delegation."); }

     if (startGameButton) {
        // Verifica esistenza funzione prima di chiamare
        if (typeof startGame === 'function') startGameButton.addEventListener('click', startGame); // Da engine.js
        else console.error("Funzione startGame non definita per bottone!");
     } else { console.warn("#start-game-button non trovato.");}

     if (rollDiceButton) {
         // Verifica esistenza funzione prima di chiamare
         if (typeof resolveSkillCheck === 'function') rollDiceButton.addEventListener('click', resolveSkillCheck); // Da engine.js
         else console.error("Funzione resolveSkillCheck non definita per bottone!");
     } else { console.warn("#roll-dice-button non trovato."); }

     // Listener per Azioni Combattimento (delegation su #actions)
     if (actionsEl) {
         actionsEl.addEventListener('click', (event) => {
             const target = event.target;
             // Verifica esistenza funzione prima di chiamare
             if (target.tagName === 'BUTTON' && gameState.combat && gameState.combat.turn === 'player' && typeof handleCombatActionAttack === 'function') {
                 if (target.id === 'combat-attack-button' || target.textContent === getString('attackButtonLabel')) { handleCombatActionAttack(); }
                 // else if (target.id === 'combat-flee-button' || ...) { /* handleFlee(); */ }
             }
         });
     } else { console.warn("#actions non trovato per listener delegato."); }

     console.log("DOMContentLoaded: Event Listeners aggiunti.");
     console.log(">>>> GIOCO PRONTO <<<<");
});

// --- Event Listener Globale (Salvataggio su Chiusura) ---
document.addEventListener('visibilitychange', () => {
    // Verifica esistenza funzione saveGame prima di chiamare
    if (document.visibilityState === 'hidden') {
         if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') { saveGame(); console.log("Salvataggio su visibilitychange (hidden)."); }
    }
});
window.addEventListener('pagehide', (event) => {
    // Verifica esistenza funzione saveGame prima di chiamare
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver && typeof saveGame === 'function') { saveGame(); console.log("Salvataggio su pagehide."); }
});

// --- Fine main.js ---
console.log("main.js: Script analizzato.");