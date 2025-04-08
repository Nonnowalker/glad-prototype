// state.js
// Gestione dello stato del gioco e persistenza

// --- Stato Globale del Gioco ---
// Queste variabili sono rese accessibili globalmente implicitamente
// dagli script caricati successivamente con 'defer'.
console.log("state.js: Inizializzazione variabili stato...");

let gameState = {}; // Stato corrente del gioco, inizializzato vuoto all'inizio

// Variabili temporanee usate SOLO durante la configurazione del personaggio (Fase PE Spending)
let tempStats = {};
let tempLang = null;
let peSpent = { total: 0, combattivita: 0, resistenza: 0, mira: 0, movimento: 0, sotterfugio: 0, scassinare: 0, percezione: 0, conoscenzaArcana: 0, lingua: 0 };

// Array per contenere i messaggi di log del combattimento corrente (volatile)
let combatLog = [];

// --- Stato Iniziale Default (Costante) ---
const initialGameState = Object.freeze({
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
 * Salva solo se il gioco è iniziato, non è al capitolo 0, e non è game over.
 */
function saveGame() {
    if (gameState && gameState.stats && gameState.chapter !== 0 && !gameState.gameOver) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            console.log('Partita Salvata (stato attuale).');
            // Notifica gestita da main.js
        } catch (e) {
            console.error("Errore nel salvataggio in localStorage:", e);
            // Notifica gestita da main.js
        }
    } else {
        console.log("Salvataggio non eseguito (stato non idoneo).");
    }
}

/**
 * Carica lo stato del gioco da localStorage in `gameState`.
 * @returns {boolean} True se caricato con successo, False altrimenti.
 */
function loadGame() {
    const savedState = localStorage.getItem(SAVE_KEY);
    if (savedState) {
        try {
            const loadedData = JSON.parse(savedState);
            // Validazione minima struttura
            if (!loadedData.chapter || !loadedData.stats || !loadedData.inventory || !loadedData.lingue || loadedData.moneteOro === undefined || !loadedData.keywords) {
                throw new Error("Dati salvati non validi o struttura incompleta.");
            }
            gameState = loadedData;
            // Resetta stati volatili
            gameState.gameOver = false;
            gameState.combat = null;
            gameState.skillCheck = null;
            combatLog = [];
            console.log('Partita Caricata con successo.');
            return true;
        } catch (e) {
            console.error("Errore nel caricamento da localStorage:", e);
            gameState = {}; // Resetta gameState in caso di errore
            return false;
        }
    } else {
        console.log("Nessuna partita salvata trovata.");
        return false;
    }
}

/**
 * Resetta lo stato del gioco e rimuove il salvataggio.
 * @param {boolean} confirmReset - Se true, chiede conferma.
 * @returns {boolean} True se reset eseguito, False altrimenti.
 */
function resetGame(confirmReset = true) {
    const confirmMessage = (typeof getString === 'function') ? getString('confirmNewGame') : 'Sei sicuro?';
    let doReset = !confirmReset || confirm(confirmMessage);
    if (doReset) {
        localStorage.removeItem(SAVE_KEY);
        gameState = {}; // Pulisce stato attuale
        console.log("Salvataggio rimosso, pronto per nuova partita.");
        return true;
    }
    console.log("Reset annullato.");
    return false;
}


// --- Funzioni di Manipolazione Inventario (manipolano gameState) ---

/**
 * Aggiunge un oggetto all'inventario del giocatore.
 * @param {string} itemName - Nome completo oggetto.
 * @param {string} itemType - Tipo ('Arma', 'Indossato', 'Generico').
 * @returns {boolean} True se aggiunto, False altrimenti.
 */
function addItem(itemName, itemType) {
    if (!gameState || !gameState.inventory) { console.error("addItem: gameState.inventory non definito!"); return false; }
    let added = false;
    const maxArmi = 3; const maxZaino = 8;
    const cleanItemName = itemName.split('/')[0].trim();
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');
    const alreadyHas = gameState.inventory.armi.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.indossati.some(i=>i.startsWith(cleanItemName)) || gameState.inventory.zaino.some(i=>i.startsWith(cleanItemName));

    if (alreadyHas) { console.warn(`Duplicato non aggiunto: ${itemName}`); return false; }

    if (itemType === 'Arma' && gameState.inventory.armi.length < maxArmi) { gameState.inventory.armi.push(itemName); added = true; }
    else if (itemType === 'Generico' && gameState.inventory.hasZaino && gameState.inventory.zaino.length < maxZaino) { gameState.inventory.zaino.push(itemName); added = true; }
    else if (itemType === 'Indossato') { /* TODO: subtype checks */ gameState.inventory.indossati.push(itemName); added = true; }

    if(added) {
        console.log(`Aggiunto: ${itemName} (${itemType})`);
        // Verifica esistenza funzioni prima di chiamare
        if (typeof announceMessage === 'function' && typeof getString === 'function') announceMessage(getString('infoItemAdded', { itemName: getString('item_' + itemKey) || cleanItemName }));
        if (typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI();
        else console.error("updateCharacterSheetUI non definita dopo addItem!");
    } else {
         let reason = "Limite raggiunto o tipo non valido";
         if (itemType === 'Generico' && !gameState.inventory.hasZaino) reason = "Zaino mancante";
         console.warn(`Impossibile aggiungere ${itemName} (${itemType}) - ${reason}`);
         if (typeof announceMessage === 'function' && typeof getString === 'function') announceMessage(getString('infoCantTakeItem', { itemName: getString('item_' + itemKey) || cleanItemName }));
    }
    return added;
}

/**
 * Rimuove un oggetto dall'inventario del giocatore.
 * @param {string} itemNameToRemove - Nome oggetto (match parziale iniziale, case-insensitive).
 * @returns {boolean} True se rimosso, False altrimenti.
 */
function removeItem(itemNameToRemove) {
     if (!gameState || !gameState.inventory) { console.error("removeItem: gameState.inventory non definito!"); return false; }
    let removed = false;
    const lowerItemName = itemNameToRemove.toLowerCase();
    const cleanItemName = itemNameToRemove.split('/')[0].trim();
    const itemKey = cleanItemName.toLowerCase().replace(/\s+/g, '_');

    if (cleanItemName.toLowerCase() === "zaino") { // Caso speciale Zaino
         if(gameState.inventory.hasZaino) {
             gameState.inventory.hasZaino = false; gameState.inventory.zaino = []; removed = true;
             console.log("Zaino e contenuto rimossi");
             if (typeof announceMessage === 'function' && typeof getString === 'function') announceMessage(getString('infoItemRemoved', {itemName: getString('backpackStatusLabel')}));
         }
     } else { // Cerca nelle liste
         const lists = ['zaino', 'armi', 'indossati'];
         for (const listName of lists) {
             if (!gameState.inventory[listName]) continue; // Salta se lista non esiste
             const index = gameState.inventory[listName].findIndex(item => item.toLowerCase().startsWith(cleanItemName.toLowerCase()));
             if (index !== -1) {
                 const removedItemFullName = gameState.inventory[listName].splice(index, 1)[0]; removed = true;
                 console.log(`${removedItemFullName} rimosso da ${listName}`);
                 if (typeof announceMessage === 'function' && typeof getString === 'function') announceMessage(getString('infoItemRemoved', { itemName: removedItemFullName.split('/')[0] }));
                 break;
             }
         }
     }
    if(removed) {
        if (typeof updateCharacterSheetUI === 'function') updateCharacterSheetUI();
        else console.error("updateCharacterSheetUI non definita dopo removeItem!");
    } else { console.warn(`Oggetto non trovato per rimozione: ${itemNameToRemove}`); }
    return removed;
}

// Non esporta nulla con window. Le funzioni saranno accessibili implicitamente
// dagli script caricati dopo con defer.

// --- Fine state.js ---
console.log("state.js: Script analizzato.");