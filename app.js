// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = "https://aziwyqlpcgkpcgpcqjkv.supabase.co";
const SUPABASE_KEY = "sb_publishable_wRtZ50ROcD0VPxjZBO3sbg_WvDTNs_e";
const API_URL = `${SUPABASE_URL}/rest/v1/file_downloads`;

console.log("✅ app.js CHARGÉ CORRECTEMENT");
console.log("URL:", API_URL);

// ===== VARIABLES GLOBALES =====
let selectedFiles = [];
let fileToExecute = null;
let checkboxChecked = false;

// ===== GESTION DES FICHIERS À DÉPOSER =====
document.getElementById('fileInput').addEventListener('change', function(e) {
    const newFiles = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFilesDisplay();
});

function updateFilesDisplay() {
    const container = document.getElementById('filesContainer');
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-item-name">📄 ${file.name}</span>
            <button class="btn-remove" onclick="removeFile(${index})">✕</button>
        </div>
    `).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFilesDisplay();
}

// ===== GESTION DU FICHIER À EXÉCUTER =====
document.getElementById('fileToExecuteInput').addEventListener('change', function(e) {
    fileToExecute = e.target.files[0];
    updateExecutionFileDisplay();
});

function updateExecutionFileDisplay() {
    const container = document.getElementById('executionFileContainer');
    if (!fileToExecute) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="file-item">
            <span class="file-item-name">⚙️ ${fileToExecute.name}</span>
            <button class="btn-remove" onclick="removeExecutionFile()">✕</button>
        </div>
    `;
}

function removeExecutionFile() {
    fileToExecute = null;
    document.getElementById('fileToExecuteInput').value = '';
    updateExecutionFileDisplay();
}

// ===== GESTION DE LA COCHE DU CHEMIN =====
function toggleCheckbox() {
    checkboxChecked = !checkboxChecked;
    const checkbox = document.getElementById('checkbox');
    const filepath = document.getElementById('filepath');
    
    if (checkboxChecked) {
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
        filepath.disabled = false;
        filepath.focus();
    } else {
        checkbox.classList.remove('checked');
        checkbox.textContent = '';
        filepath.disabled = true;
        filepath.value = '';
    }
}

// ===== VALIDATION ET ENVOI =====
async function validerTeleportation() {
    // Vérifications
    if (selectedFiles.length === 0) {
        alert('Sélectionnez au moins un fichier à déposer');
        return;
    }

    if (!fileToExecute) {
        alert('Sélectionnez un fichier à exécuter');
        return;
    }

    // Si coche activée, vérifier le chemin
    if (checkboxChecked) {
        const filepath = document.getElementById('filepath').value.trim();
        if (!filepath) {
            alert('Entrez un chemin valide');
            return;
        }
    }

    const filepath = checkboxChecked ? document.getElementById('filepath').value.trim() : '';

    // Envoyer chaque fichier
    for (let file of selectedFiles) {
        const data = {
            filename: file.name,
            fileToExecute: fileToExecute.name,
            destination: filepath || null,
            status: "telecharge"
        };

        console.log("Données à envoyer:", data);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "apikey": SUPABASE_KEY
                },
                body: JSON.stringify(data)
            });

            const responseText = await response.text();
            console.log("Réponse:", response.status, responseText);

            if (!response.ok) {
                console.error("Erreur Supabase:", responseText);
            } else {
                console.log("✅ Succès:", file.name);
            }
        } catch (error) {
            console.error('Erreur réseau:', error);
        }
    }

    // Réinitialiser après envoi
    setTimeout(() => {
        document.getElementById('filepath').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('fileToExecuteInput').value = '';
        selectedFiles = [];
        fileToExecute = null;
        updateFilesDisplay();
        updateExecutionFileDisplay();
        loadHistory();
    }, 500);
}

// ===== CHARGER ET AFFICHER L'HISTORIQUE =====
async function loadHistory() {
    try {
        const response = await fetch(API_URL + '?order=id.desc&limit=20', {
            headers: {
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "apikey": SUPABASE_KEY
            }
        });

        const downloads = await response.json();
        displayHistory(downloads);
    } catch (error) {
        console.error('Erreur historique:', error);
    }
}

function displayHistory(downloads) {
    const container = document.getElementById('historyContainer');
    
    if (!downloads || downloads.length === 0) {
        container.innerHTML = '<div class="empty">Aucun fichier pour l\'instant</div>';
        return;
    }

    container.innerHTML = downloads.map(d => {
        // Déterminer les statuts
        const telechargeOk = d.status === 'telecharge' && !d.erreur;
        const teleporteOk = d.teleporte && !d.erreur;
        const lanceOk = d.lance && !d.erreur;
        
        // Déterminer s'il y a une erreur et sa source
        let erreurDisplay = '';
        if (d.erreur) {
            erreurDisplay = `<div class="error-badge">⚠️ Erreur (${d.erreurSource})</div>`;
        }

        return `
            <div class="history-item">
                <div class="folder-icon">📁</div>
                <div class="file-info">
                    <div class="file-name">${d.filename}</div>
                    <div class="execution-info">Exécute: ${d.fileToExecute}</div>
                    ${d.destination ? `<div class="destination-info">Destination: ${d.destination}</div>` : ''}
                </div>
                <div class="status-badges">
                    <div class="badge telecharge">
                        <div class="badge-icon ${telechargeOk ? 'checked' : ''}">✓</div>
                        <span>Téléchargé</span>
                    </div>
                    <div class="badge teleporte">
                        <div class="badge-icon ${teleporteOk ? 'checked' : ''}">○</div>
                        <span>Teleporté</span>
                    </div>
                    <div class="badge lance">
                        <div class="badge-icon ${lanceOk ? 'checked' : ''}">●</div>
                        <span>Lancé</span>
                    </div>
                </div>
                ${erreurDisplay}
            </div>
        `;
    }).join('');
}

// ===== INITIALISATION =====
loadHistory();
setInterval(loadHistory, 2000);
