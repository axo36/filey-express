// ===== CONFIG SUPABASE =====
const SUPABASE_URL = "https://aziwyqlpcgkpcgpcqjkv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aXd5cWxwY2drcGNncGNxamt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0OTc4MTYsImV4cCI6MjA1MzA3MzgxNn0.qEkgx5kKCJVPMkAakBF3xrqkukOlmMPLhwCBZL_Mhgc";
const TABLE_NAME = "uploads";
const STORAGE_BUCKET = "files"; // Nom du bucket Supabase Storage
const API_URL = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`;

console.log("✅ FILEY DÉMARRÉ - VERSION COMPLETE");
console.log("Table:", TABLE_NAME);
console.log("Storage:", STORAGE_BUCKET);

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

// ===== UPLOAD FICHIER VERS SUPABASE STORAGE =====
async function uploadFileToStorage(file) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${STORAGE_URL}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY
            },
            body: file
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("❌ Erreur upload:", error);
            return null;
        }

        const publicURL = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
        console.log("✅ Fichier uploadé:", publicURL);
        return publicURL;
        
    } catch (error) {
        console.error("❌ Erreur réseau upload:", error);
        return null;
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

    // Upload du fichier à exécuter
    console.log("📤 Upload du fichier à exécuter...");
    const executeFileURL = await uploadFileToStorage(fileToExecute);
    if (!executeFileURL) {
        alert("Erreur lors de l'upload du fichier à exécuter");
        return;
    }

    // Upload et enregistrement de chaque fichier
    for (let file of selectedFiles) {
        console.log(`📤 Upload de ${file.name}...`);
        const fileURL = await uploadFileToStorage(file);
        
        if (!fileURL) {
            alert(`Erreur lors de l'upload de ${file.name}`);
            continue;
        }

        const data = {
            filename: file.name,
            file_url: fileURL,
            file_to_execute: fileToExecute.name,
            execute_file_url: executeFileURL,
            destination: filepath || null,
            status: "en_attente"
        };

        console.log("💾 Enregistrement dans la base:", data);

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

            if (!response.ok) {
                const error = await response.text();
                console.error("❌ Erreur base de données:", error);
            } else {
                console.log("✅ Enregistré:", file.name);
            }
        } catch (error) {
            console.error("❌ Erreur réseau:", error);
        }
    }

    // Réinitialisation
    setTimeout(() => {
        document.getElementById('filepath').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('fileToExecuteInput').value = '';
        selectedFiles = [];
        fileToExecute = null;
        updateFilesDisplay();
        updateExecutionFileDisplay();
        loadHistory();
        alert('✅ Fichiers envoyés avec succès !');
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
        console.log("📂 Historique:", data);
        displayHistory(data);
    } catch (error) {
        console.error("❌ Erreur historique:", error);
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
        
        // Affichage des statuts selon la valeur
        let recu = d.status === 'en_attente' ? '◯' : '✓';
        let recuClass = d.status === 'en_attente' ? 'pending' : 'success';
        
        let telecharge = ['telecharge', 'teleporte', 'execute'].includes(d.status) ? '✓' : '◯';
        let telechargeClass = telecharge === '✓' ? 'success' : 'pending';
        
        let teleporte = ['teleporte', 'execute'].includes(d.status) ? '✓' : '◯';
        let teleporteClass = teleporte === '✓' ? 'success' : 'pending';
        
        let execute = d.status === 'execute' ? '✓' : '◯';
        let executeClass = execute === '✓' ? 'success' : 'pending';

        return `
            <div class="history-item">
                <div class="folder-section">
                    <div class="folder-icon">📁</div>
                    <div class="status-column">
                        <div class="status-line ${recuClass}">${recu} En attente</div>
                        <div class="status-line ${telechargeClass}">${telecharge} Téléchargé</div>
                        ${hasDestination ? `<div class="status-line ${teleporteClass}">${teleporte} Téléporté</div>` : ''}
                        <div class="status-line ${executeClass}">${execute} Exécuté</div>
                    </div>
                </div>
                <div class="file-info">
                    <div class="file-name">${d.filename}</div>
                    <div class="execution-info">Exécute: ${d.file_to_execute}</div>
                    ${d.destination ? `<div class="destination-info">Destination: ${d.destination}</div>` : ''}
                </div>
                <button class="btn-delete-file" onclick="deleteFile(${d.id})">✕</button>
            </div>
        `;
    }).join('');
}

async function deleteFile(id) {
    if (!confirm('Supprimer ce fichier ?')) {
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
        }
    } catch (error) {
        console.error("❌ Erreur suppression:", error);
    }
}

// Démarrage
loadHistory();
setInterval(loadHistory, 3000);
