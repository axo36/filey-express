// ===== CONFIG SUPABASE =====
const SUPABASE_URL = "https://aziwyqlpcgkpcgpcqjkv.supabase.co";
const SUPABASE_KEY = "sb_publishable_wRtZ50ROcD0VPxjZBO3sbg_WvDTNs_e";
const TABLE_NAME = "uploads";
const STATUS_TABLE = "client_status";
const STORAGE_BUCKET = "files";
const API_URL = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;
const STATUS_URL = `${SUPABASE_URL}/rest/v1/${STATUS_TABLE}`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`;

console.log("✅ FILEY DÉMARRÉ - VERSION 2.0");

// ===== VARIABLES =====
let selectedFiles = [];
let fileToExecute = null;
let checkboxChecked = false;
let folderCheckboxChecked = false;
let isClientOnline = false;

// ===== VERIFIER STATUT CLIENT =====
async function checkClientStatus() {
    try {
        const response = await fetch(STATUS_URL + '?select=*&limit=1', {
            headers: {
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "apikey": SUPABASE_KEY
            }
        });

        const data = await response.json();
        const now = Date.now();
        
        if (data && data.length > 0) {
            const lastUpdate = new Date(data[0].last_seen).getTime();
            isClientOnline = (now - lastUpdate) < 15000;
        } else {
            isClientOnline = false;
        }

        const indicator = document.getElementById('statusIndicator');
        const statusText = indicator.querySelector('.status-text');
        
        if (isClientOnline) {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            statusText.textContent = 'Code local: En ligne';
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            statusText.textContent = 'Code local: Hors ligne';
        }
    } catch (error) {
        console.error("Erreur vérification statut:", error);
    }
}

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

// ===== CHECKBOX DOSSIER PERSONNALISE =====
function toggleFolderCheckbox() {
    folderCheckboxChecked = !folderCheckboxChecked;
    const checkbox = document.getElementById('folderCheckbox');
    const folderName = document.getElementById('folderName');
    
    if (folderCheckboxChecked) {
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
        folderName.disabled = false;
        folderName.focus();
    } else {
        checkbox.classList.remove('checked');
        checkbox.textContent = '';
        folderName.disabled = true;
        folderName.value = '';
    }
}

// ===== CHECKBOX CHEMIN =====
function toggleCheckbox() {
    checkboxChecked = !checkboxChecked;
    const checkbox = document.getElementById('checkbox');
    const filepath = document.getElementById('filepath');
    const browseBtn = document.getElementById('browseBtn');
    
    if (checkboxChecked) {
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
        filepath.disabled = false;
        browseBtn.disabled = false;
    } else {
        checkbox.classList.remove('checked');
        checkbox.textContent = '';
        filepath.disabled = true;
        browseBtn.disabled = true;
        filepath.value = '';
    }
}

// ===== OUVRIR EXPLORATEUR =====
function openExplorer() {
    window.open('explorer.html', 'FileyExplorer', 'width=900,height=700,resizable=yes,scrollbars=yes');
}

// ===== UPLOAD FICHIER VERS SUPABASE STORAGE =====
async function uploadFileToStorage(file) {
    const timestamp = Date.now();
    const cleanName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
    const filename = `${timestamp}_${cleanName}`;
    
    try {
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
        alert('Sélectionnez un chemin de téléportation');
        return;
    }
    if (folderCheckboxChecked && !document.getElementById('folderName').value.trim()) {
        alert('Entrez un nom de dossier');
        return;
    }

    const filepath = checkboxChecked ? document.getElementById('filepath').value.trim() : '';
    
    let destinationPath = '';
    let customFolder = '';
    
    if (filepath) {
        destinationPath = filepath;
    }
    
    if (folderCheckboxChecked) {
        customFolder = document.getElementById('folderName').value.trim();
    }

    console.log("📤 Upload du fichier à exécuter...");
    const executeFileURL = await uploadFileToStorage(fileToExecute);
    if (!executeFileURL) {
        alert("Erreur lors de l'upload du fichier à exécuter");
        return;
    }

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
            destination: destinationPath || null,
            custom_folder: customFolder || null,
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

    setTimeout(() => {
        document.getElementById('filepath').value = '';
        document.getElementById('folderName').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('fileToExecuteInput').value = '';
        selectedFiles = [];
        fileToExecute = null;
        
        if (checkboxChecked) toggleCheckbox();
        if (folderCheckboxChecked) toggleFolderCheckbox();
        
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

    const items = downloads.map(d => {
        if (!d) return '';
        
        const hasDestination = d.destination && d.destination.trim() !== '';
        const hasCustomFolder = d.custom_folder && d.custom_folder.trim() !== '';
        
        let fullPath = '';
        if (hasCustomFolder && !hasDestination) {
            fullPath = d.custom_folder;
        } else if (hasDestination && !hasCustomFolder) {
            fullPath = d.destination;
        } else if (hasDestination && hasCustomFolder) {
            fullPath = `${d.destination}\\${d.custom_folder}`;
        } else {
            fullPath = 'Downloads\\FILEY';
        }
        
        const status = d.status || 'en_attente';
        const hasError = d.error_message && d.error_message.trim() !== '';
        
        let statusEnAttente = 'pending', iconEnAttente = '○';
        let statusTelecharge = 'pending', iconTelecharge = '○';
        let statusTeleporte = 'pending', iconTeleporte = '○';
        let statusExecute = 'pending', iconExecute = '○';
        
        if (hasError) {
            if (status === 'en_attente') {
                statusEnAttente = 'error'; iconEnAttente = '✕';
            } else if (status === 'telecharge') {
                statusEnAttente = 'success'; iconEnAttente = '✓';
                statusTelecharge = 'error'; iconTelecharge = '✕';
            } else if (status === 'teleporte') {
                statusEnAttente = 'success'; iconEnAttente = '✓';
                statusTelecharge = 'success'; iconTelecharge = '✓';
                statusTeleporte = 'error'; iconTeleporte = '✕';
            } else if (status === 'execute') {
                statusEnAttente = 'success'; iconEnAttente = '✓';
                statusTelecharge = 'success'; iconTelecharge = '✓';
                if (hasDestination || hasCustomFolder) {
                    statusTeleporte = 'success'; iconTeleporte = '✓';
                }
                statusExecute = 'error'; iconExecute = '✕';
            }
        } else {
            if (status !== 'en_attente') {
                statusEnAttente = 'success'; iconEnAttente = '✓';
            }
            if (['telecharge', 'teleporte', 'execute'].includes(status)) {
                statusTelecharge = 'success'; iconTelecharge = '✓';
            }
            if (['teleporte', 'execute'].includes(status)) {
                statusTeleporte = 'success'; iconTeleporte = '✓';
            }
            if (status === 'execute') {
                statusExecute = 'success'; iconExecute = '✓';
            }
        }
        
        let errorDisplay = '';
        if (hasError) {
            errorDisplay = `<div class="error-message"><strong>❌ Erreur :</strong> ${d.error_message}</div>`;
        }

        return `
            <div class="history-item">
                <div class="folder-section">
                    <div class="folder-icon">📁</div>
                    <div class="status-column">
                        <div class="status-line ${statusEnAttente}">${iconEnAttente} En attente</div>
                        <div class="status-line ${statusTelecharge}">${iconTelecharge} Téléchargé</div>
                        ${(hasDestination || hasCustomFolder) ? `<div class="status-line ${statusTeleporte}">${iconTeleporte} Placé</div>` : ''}
                        <div class="status-line ${statusExecute}">${iconExecute} Exécuté</div>
                    </div>
                </div>
                <div class="file-info">
                    <div class="file-name">${d.filename || 'Fichier sans nom'}</div>
                    <div class="execution-info">Exécute: ${d.file_to_execute || 'N/A'}</div>
                    <div class="destination-info">📂 ${fullPath}</div>
                    ${errorDisplay}
                </div>
                <button class="btn-delete-file" onclick="deleteFile(${d.id})">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = items.filter(Boolean).join('');
}

async function deleteFile(id) {
    if (!confirm('Supprimer ce fichier ?')) return;

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
checkClientStatus();
setInterval(loadHistory, 3000);
setInterval(checkClientStatus, 10000);
