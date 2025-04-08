// three_setup.js
// Contiene l'inizializzazione e l'animazione di Three.js

// --- Variabili Specifiche Modulo Three.js ---
// Accessibili solo all'interno di questo file (o globalmente implicitamente)
let scene, camera, renderer, mesh, noise;
// Riferimento al contenitore HTML (ottenuto quando la funzione init viene chiamata)
let visualsDiv = null;

/**
 * Inizializza la scena 3D, la camera, il renderer, le luci e il terreno.
 * Aggiunge il canvas al div #visuals.
 * Avvia il loop di animazione.
 */
function initThree() {
    visualsDiv = document.getElementById('visuals'); // Ottiene riferimento al div contenitore
    if (!visualsDiv) {
        console.error("Elemento #visuals non trovato nel DOM. Impossibile inizializzare Three.js.");
        return; // Interrompe se manca il contenitore
    }
     try {
        // Verifica che le librerie globali THREE e SimplexNoise siano state caricate
        if (typeof THREE === 'undefined') throw new Error("Libreria THREE non caricata.");
        if (typeof SimplexNoise === 'undefined') throw new Error("Libreria SimplexNoise non caricata.");

        console.log("Inizializzazione Three.js...");

        // 1. Scena: Contiene tutti gli oggetti, luci e camere
        scene = new THREE.Scene();

        // 2. Camera: Punto di vista sulla scena
        camera = new THREE.PerspectiveCamera(
            75, // Campo visivo verticale (in gradi)
            window.innerWidth / window.innerHeight, // Aspect Ratio (larghezza/altezza)
            0.1, // Near clipping plane (oggetti più vicini non vengono renderizzati)
            1000 // Far clipping plane (oggetti più lontani non vengono renderizzati)
        );
        // Imposta posizione iniziale della camera
        camera.position.set(0, 45, 55); // x, y (altezza), z (distanza indietro)
        camera.lookAt(0, 5, 0); // Punto verso cui la camera guarda (leggermente in basso)

        // 3. Renderer: Disegna la scena nel canvas
        renderer = new THREE.WebGLRenderer({
            antialias: true, // Migliora la qualità dei bordi (smussatura)
            alpha: true      // Permette sfondo trasparente per vedere CSS/HTML sottostante
        });
        renderer.setSize(window.innerWidth, window.innerHeight); // Imposta dimensioni iniziali canvas
        renderer.setPixelRatio(window.devicePixelRatio); // Usa risoluzione nativa schermo
        renderer.setClearColor(0x000000, 0); // Sfondo trasparente (si vedrà il CSS)
        visualsDiv.appendChild(renderer.domElement); // Aggiunge il <canvas> al div

        // 4. Luci
        const ambientLight = new THREE.AmbientLight(0xdddddd, 1.0); // Luce soffusa ambientale, più intensa
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Luce direzionale bianca (sole)
        directionalLight.position.set(3, 5, 2).normalize(); // Imposta direzione (da dx-alto-fronte)
        scene.add(directionalLight);
        // Aggiunta luce posteriore per contorni (opzionale)
        const backLight = new THREE.DirectionalLight(0xaaaaee, 0.2); // Luce posteriore bluastra fioca
        backLight.position.set(-3, 2, -3).normalize();
        scene.add(backLight);


        // 5. Nebbia (Atmosfera)
        scene.fog = new THREE.FogExp2(0xd0d8e8, 0.015); // Nebbia esponenziale grigio-azzurra

        // 6. Terreno (Generato proceduralmente)
        console.log("Generazione terreno...");
        noise = new SimplexNoise(); // Inizializza generatore rumore
        const planeWidth = 250; // Larghezza piano
        const planeHeight = 250; // Profondità piano
        const widthSegments = 70; // Numero di suddivisioni orizzontali
        const heightSegments = 70; // Numero di suddivisioni verticali
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, widthSegments, heightSegments);
        const vertices = geometry.attributes.position; // Ottiene i vertici
        const amplitude = 20; // Ampiezza massima montagne
        const frequency = 0.04; // Scala del rumore (valori più bassi = montagne più larghe)

        // Itera su ogni vertice e ne modifica l'altezza (coordinata Z prima della rotazione)
        for (let i = 0; i < vertices.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(vertices, i);
            // Calcola valore di rumore 2D basato su coordinate x, y
            let noiseValue = noise.noise2D(vertex.x * frequency, vertex.y * frequency);
            // Applica ampiezza principale
            let height = noiseValue * amplitude;
            // Aggiungi un po' di rumore più fine per dettagli (frequenza più alta, ampiezza minore)
            height += noise.noise2D(vertex.x * frequency * 4, vertex.y * frequency * 4) * (amplitude * 0.15);
            // Imposta la nuova altezza (coordinata Z) del vertice
            vertices.setZ(i, height);
        }
        geometry.computeVertexNormals(); // FONDAMENTALE: Ricalcola le normali dopo aver modificato i vertici

        // Materiale per il terreno
        const material = new THREE.MeshStandardMaterial({
            color: 0x889988, // Tonalità verde/grigia roccia/muschio
            roughness: 0.9,  // Molto ruvido
            metalness: 0.05, // Poco metallico
        });
        mesh = new THREE.Mesh(geometry, material); // Crea l'oggetto 3D (mesh)
        mesh.rotation.x = -Math.PI / 2.1; // Inclina il piano per vederlo come terreno
        mesh.position.y = -22; // Abbassa leggermente l'intero terreno
        scene.add(mesh); // Aggiunge il terreno alla scena
        console.log("Terreno generato.");

        // 7. Avvia Loop Animazione e Listener Resize
        animate(); // Inizia il rendering continuo
        window.addEventListener('resize', onWindowResize, false); // Aggiorna su resize
        onWindowResize(); // Chiama subito per impostare dimensioni corrette

        console.log("Three.js inizializzato con successo.");

    } catch (error) {
        // Gestisce errori durante l'inizializzazione
        console.error("Three.js initialization failed:", error);
        if(visualsDiv) visualsDiv.innerHTML = "<p style='color: red; text-align: center; margin-top: 50px;'>Errore caricamento grafica 3D.</p>";
        renderer = null; // Impedisce l'avvio di animate() se fallisce
    }
}

/**
 * Aggiorna le dimensioni del renderer e l'aspect ratio della camera
 * quando la finestra del browser viene ridimensionata.
 */
function onWindowResize() {
     // Verifica che camera e renderer siano stati creati
     if (camera && renderer) {
         const w = window.innerWidth;
         const h = window.innerHeight;
         camera.aspect = w / h; // Aggiorna aspect ratio
         camera.updateProjectionMatrix(); // Applica modifiche alla camera
         renderer.setSize(w, h); // Ridimensiona il canvas del renderer
         // console.log("Three.js: Window resized."); // Debug opzionale
     }
 }

/**
 * Loop di animazione principale. Richiede un nuovo frame e renderizza la scena.
 * Questo viene chiamato continuamente dal browser (se renderer è inizializzato).
 */
function animate() {
    // Controlla se renderer esiste prima di continuare
    if (!renderer) return;
    // Richiede al browser di chiamare 'animate' di nuovo al prossimo refresh dello schermo
    requestAnimationFrame(animate);

    // --- Eventuali aggiornamenti animati per frame ---
    // Esempio: if (mesh) mesh.rotation.z += 0.0001;

    // Renderizza la scena attuale dalla prospettiva della camera attuale
    renderer.render(scene, camera);
}

// Non esporta nulla con window. initThree viene chiamato da main.js

// --- Fine three_setup.js ---
console.log("three_setup.js: Script analizzato.");