// compile_chapters.js
// Script Node.js per leggere i file .md dalla cartella 'story'
// e generare l'oggetto gameData in 'gameData.js'

const fs = require('fs'); // File System module di Node.js
const path = require('path'); // Path module per gestire percorsi file

// Definisce le directory di input e output relative alla posizione dello script
const storyDir = path.join(__dirname, 'story');
const outputFile = path.join(__dirname, 'gameData.js');
const imageDir = path.join(__dirname, 'images'); // Per verifica opzionale esistenza immagini

let gameData = {}; // Oggetto che conterrà tutti i dati dei capitoli

console.log(`--- Inizio Compilazione Capitoli ---`);
console.log(`Lettura file Markdown da: ${storyDir}`);

try {
    // Legge tutti i file nella directory 'story'
    const files = fs.readdirSync(storyDir)
        // Filtra mantenendo solo i file che terminano con .md
        .filter(file => file.endsWith('.md'));

    console.log(`Trovati ${files.length} file .md`);

    // Itera su ogni file .md trovato
    files.forEach(file => {
        const filePath = path.join(storyDir, file);
        const content = fs.readFileSync(filePath, 'utf-8'); // Legge il contenuto del file

        // Variabili per contenere i dati estratti da questo capitolo
        let chapterId = null;
        let title = ''; // Inizializza vuoto, verrà impostato da marcatore o default
        let mainText = '';
        const images = []; // Array per le immagini del capitolo {src, alt}
        const choices = []; // Array per le scelte {text, target, condition}
        const effects = []; // Array per gli effetti {type, details, keywordType, keywordName}
        let combat = null; // Oggetto per i dati di combattimento
        let skillCheck = null; // Oggetto per i dati di skill check

        // --- Parsing dei Metadati all'inizio del file (usando commenti HTML) ---
        // Estrae l'ID del capitolo
        const idMatch = content.match(/<!--CHAPTER_ID:(\d+)-->/);
        if (idMatch) {
            chapterId = parseInt(idMatch[1]);
        } else {
            // Se manca il marcatore ID, prova a dedurlo dal nome del file (es. "123.md")
            const filenameMatch = file.match(/^(\d+)\.md$/);
            if (filenameMatch) {
                chapterId = parseInt(filenameMatch[1]);
            } else {
                // Se non si riesce a determinare l'ID, salta il file
                console.warn(`ATTENZIONE: Saltando file ${file}: Impossibile determinare l'ID del capitolo.`);
                return; // Continua con il prossimo file nell'iterazione forEach
            }
        }

        // Imposta un titolo di default, che può essere sovrascritto dal marcatore TITLE
        title = `Capitolo ${chapterId}`;
        const titleMatch = content.match(/<!--TITLE:(.*?)-->/);
        if (titleMatch) {
            title = titleMatch[1].trim(); // Usa il titolo specificato nel marcatore
        }

        // --- Parsing del Contenuto riga per riga ---
        const lines = content.split('\n'); // Divide il contenuto in righe
        let parsingChoices = false; // Flag per indicare se stiamo analizzando la sezione CHOICES
        let parsingCombat = false; // Flag per indicare se stiamo analizzando la sezione COMBAT
        let currentCombat = null; // Oggetto temporaneo per costruire i dati di combattimento
        let textContent = []; // Array per accumulare le righe di testo narrativo

        lines.forEach(line => {
            // Cerca i marcatori speciali in ogni riga
            const imageMatch = line.match(/<!--IMAGE:(.*?)(?:\|(.*?)?)?-->/); // Formato: <!--IMAGE:path/to/img.jpg|Testo Alt opzionale-->
            const effectMatch = line.match(/<!--EFFECT:(.*?)\|(.*?)-->/); // Formato: <!--EFFECT:TIPO_EFFETTO|dettagli_effetto-->
            const keywordMatch = line.match(/<!--KEYWORD:(.*?)\|(.*?)-->/); // Formato: <!--KEYWORD:TIPO_KW|NOME_KW-->
            const combatStartMatch = line.match(/<!--COMBAT_START-->/);
            const combatEndMatch = line.match(/<!--COMBAT_END-->/);
            const combatEnemyMatch = line.match(/<!--COMBAT_ENEMY:(.*?)\|(\d+)\|(\d+)-->/); // Formato: <!--COMBAT_ENEMY:Nome Nemico|Combattività|Resistenza-->
            const combatVictoryMatch = line.match(/<!--COMBAT_VICTORY:(\d+)-->/); // Formato: <!--COMBAT_VICTORY:CapitoloVittoria-->
            const skillCheckMatch = line.match(/<!--SKILL_CHECK:(.*?)\|(\d+)\|(\d+)\|(\d+)-->/); // Formato: <!--SKILL_CHECK:NomeSkill|ValoreTarget|CapSuccesso|CapFallimento-->
            const choicesStartLine1 = line.trim() === '---'; // Separatore standard
            const choicesStartLine2 = line.trim().toLowerCase() === 'choices:'; // Label esplicita (opzionale)

            // Analizza la riga in base ai marcatori trovati
            if (imageMatch) {
                images.push({
                    src: imageMatch[1].trim(),
                    alt: imageMatch[2] ? imageMatch[2].trim() : `Illustrazione per ${title}` // Usa Alt fornito o genera default
                });
            } else if (effectMatch) {
                effects.push({ type: effectMatch[1].trim().toUpperCase(), details: effectMatch[2].trim() }); // Tipo effetto in maiuscolo per consistenza
            } else if (keywordMatch) {
                // Tratta KEYWORD come un tipo speciale di EFFECT per semplicità
                effects.push({ type: 'KEYWORD_ADD', keywordType: keywordMatch[1].trim().toUpperCase(), keywordName: keywordMatch[2].trim().toUpperCase() }); // Anche tipo e nome KW in maiuscolo
            } else if (combatStartMatch) {
                parsingCombat = true; // Inizia a parsare dati combattimento
                currentCombat = { enemies: [], victoryChapter: null }; // Inizializza oggetto combattimento
            } else if (combatEndMatch) {
                if (parsingCombat && currentCombat) {
                    combat = { ...currentCombat }; // Salva i dati del combattimento completato
                    parsingCombat = false; // Fine parsing combattimento
                }
            } else if (parsingCombat && combatEnemyMatch && currentCombat) {
                // Aggiunge nemico all'oggetto combattimento corrente
                const resistance = parseInt(combatEnemyMatch[3]);
                currentCombat.enemies.push({
                    name: combatEnemyMatch[1].trim(),
                    C: parseInt(combatEnemyMatch[2]),
                    R: resistance,
                    initialR: resistance // Salva resistenza iniziale
                });
            } else if (parsingCombat && combatVictoryMatch && currentCombat) {
                // Imposta capitolo di vittoria
                currentCombat.victoryChapter = parseInt(combatVictoryMatch[1]);
            } else if (skillCheckMatch) {
                // Salva dati skill check
                skillCheck = {
                    skill: skillCheckMatch[1].trim(),
                    target: parseInt(skillCheckMatch[2]),
                    successChapter: parseInt(skillCheckMatch[3]),
                    failureChapter: parseInt(skillCheckMatch[4])
                };
            } else if (choicesStartLine1 || choicesStartLine2) {
                parsingChoices = true; // Inizia a parsare scelte dopo il separatore o label
            } else if (parsingChoices && line.trim().startsWith('-')) {
                // Parsa una riga di scelta (formato - text: Testo | target: N | condition: Condizione)
                const textMatch = line.match(/- text: (.*?)(?:\s*$|\s+target:|\s+condition:)/);
                const targetMatch = line.match(/target: (\d+)/);
                const conditionMatch = line.match(/condition: (.*?)(\s*$|\s+target:)/);

                if (textMatch && targetMatch) {
                    choices.push({
                        text: textMatch[1].trim(), // Testo del bottone/scelta
                        target: parseInt(targetMatch[1]), // Capitolo di destinazione
                        condition: conditionMatch ? conditionMatch[1].trim() : null // Condizione (stringa) o null
                    });
                } else {
                     console.warn(`[${chapterId}] Formato scelta non valido: ${line.trim()}`);
                 }
            } else if (!line.startsWith('<!--') && !parsingCombat && !parsingChoices && !choicesStartLine1 && !choicesStartLine2) {
                // Se non è un marcatore speciale, non stiamo parsando combat/choices, e non è la riga di inizio scelte,
                // allora è testo narrativo da accumulare.
                textContent.push(line);
            }
        }); // Fine iterazione righe

        // Unisce le righe di testo narrativo accumulate
        mainText = textContent.join('\n').trim();

        // Aggiunge i dati del capitolo processato all'oggetto gameData generale
        gameData[chapterId] = {
            id: chapterId,
            title: title,
            text: mainText,
            images: images,
            choices: choices,
            effects: effects,
            combat: combat, // Sarà null se non c'era marcatore COMBAT
            skillCheck: skillCheck // Sarà null se non c'era marcatore SKILL_CHECK
        };

        console.log(`  > Capitolo ${chapterId} ('${title}') compilato con successo.`);
    }); // Fine iterazione file

    // --- Scrittura File Output ---
    // Formatta l'oggetto gameData come stringa JSON leggibile (pretty-print con 4 spazi)
    const outputJsonString = JSON.stringify(gameData, null, 4);
    // Prepara il contenuto finale del file .js, definendo la costante gameData
    const outputContent = `// Generated by compile_chapters.js @ ${new Date().toISOString()} - Do not edit manually!\nconst gameData = ${outputJsonString};`;

    // Scrive il contenuto nel file di output (sovrascrivendolo se esiste)
    fs.writeFileSync(outputFile, outputContent, 'utf-8');

    console.log(`\n--- Compilazione Terminata ---`);
    console.log(`Compilati con successo ${files.length} capitoli in: ${outputFile}`);

} catch (err) {
    // Gestisce eventuali errori durante la lettura/scrittura dei file
    console.error("\n!!! ERRORE durante la compilazione dei capitoli !!!");
    console.error(err);
    process.exit(1); // Esce con codice di errore
}