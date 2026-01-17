// ===== CONFIG SUPABASE =====
const SUPABASE_URL = "https://aziwyqlpcgkpcgpcqjkv.supabase.co";
const SUPABASE_KEY = "sb_publishable_wRtZ50ROcD0VPxjZBO3sbg_WvDTNs_e";
const TABLE_NAME = "uploads"; // NOUVELLE TABLE
const API_URL = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;

console.log("✅ FILEY DÉMARRÉ");
console.log("Table:", TABLE_NAME);

// ===== VARIABLES =====
let selectedFiles = [];
let fileToExecute = null;
let checkboxChecked = false;

// ===== GESTION FICHIERS À DÉPOSER =====
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

// ===== GESTION FICHIER À EXÉCUTER =====
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

// ===== CHECKBOX CHEMIN =====
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

// ===== VALIDER ET ENVOYER =====
async function validerTeleportation() {
    if (selectedFiles.length === 0) {
        alert('Sélectionnez au moins un fichier');
        return;
    }
    if (!fileToExecute) {
        alert('Sélectionnez un fichier à exécuter');
        return;
    }
    if (checkboxChecked && !document.getElementById('filepath').value.trim()) {
        alert('Entrez un chemin');
        return;
    }

    const filepath = checkboxChecked ? document.getElementById('filepath').value.trim() : '';

    for (let file of selectedFiles) {
        const data = {
            filename: file.name,
            file_to_execute: fileToExecute.name,
            destination: filepath || null,
            status: "téléchargé"
        };

        console.log("Envoi:", data);

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
                console.error("❌ Erreur:", responseText);
            } else {
                console.log("✅ OK:", file.name);
            }
        } catch (error) {
            console.error("❌ Erreur réseau:", error);
        }
    }

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

// ===== CHARGER HISTORIQUE =====
async function loadHistory() {
    try {
        const response = await fetch(API_URL + '?order=id.desc', {
            headers: {
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "apikey": SUPABASE_KEY
            }
        });

        const data = await response.json();
        console.log("Historique:", data);
        displayHistory(data);
    } catch (error) {
        console.error("Erreur historique:", error);
    }
}

function displayHistory(downloads) {
    const container = document.getElementById('historyContainer');
    
    if (!downloads || downloads.length === 0) {
        container.innerHTML = '<div class="empty">Aucun fichier</div>';
        return;
    }

    container.innerHTML = downloads.map(d => {
        const hasDestination = d.destination && d.destination.trim() !== '';
        
        // Déterminer les statuts
        let recu = '✓'; // Toujours reçu s'il est dans la base
        let telecharge = d.status === 'téléchargé' ? '✓' : (d.status === 'téléchargement' ? '◐' : '✕');
        let teleporte = hasDestination ? (d.status === 'téléporté' ? '✓' : (d.status === 'téléportation' ? '◐' : '✕')) : null;
        let execute = d.status === 'exécuté' ? '✓' : (d.status === 'exécution' ? '◐' : '✕');

        return `
            <div class="history-item">
                <div class="folder-icon">📁</div>
                <div class="file-info">
                    <div class="file-name">${d.filename}</div>
                    <div class="execution-info">Exécute: ${d.file_to_execute}</div>
                    ${d.destination ? `<div class="destination-info">Destination: ${d.destination}</div>` : ''}
                </div>
                <div class="status-column">
                    <div class="status-line" title="Reçu">${recu} Reçu</div>
                    <div class="status-line" title="Téléchargé">${telecharge} Téléchargé</div>
                    ${teleporte !== null ? `<div class="status-line" title="Teleporté">${teleporte} Teleporté</div>` : ''}
                    <div class="status-line" title="Exécuté">${execute} Exécuté</div>
                </div>
                <button class="btn-delete-file" onclick="deleteFile(${d.id})">✕</button>
            </div>
        `;
    }).join('');
}

async function deleteFile(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier?')) {
        return;
    }

    try {
        const response = await fetch(API_URL + '?id=eq.' + id, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "apikey": SUPABASE_KEY
            }
        });

        if (response.ok) {
            console.log("✅ Fichier supprimé");
            loadHistory();
        } else {
            console.error("❌ Erreur suppression");
        }
    } catch (error) {
        console.error("Erreur:", error);
    }
}

loadHistory();
setInterval(loadHistory, 3000);
