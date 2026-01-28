import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfORG83-_T4LP18oayAva3uS0nPCFPZcM",
  authDomain: "med-archive-41eaf.firebaseapp.com",
  projectId: "med-archive-41eaf",
  storageBucket: "med-archive-41eaf.firebasestorage.app",
  messagingSenderId: "529667535982",
  appId: "1:529667535982:web:508f1525d641e75c4ba27f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allPatients = [];
let currentTab = 'TOUT'; 

// --- GESTION DE LA NAVIGATION (CORRIGÉ) ---
const setupNavigation = () => {
    const navs = {
        'link-dashboard': 'TOUT',
        'link-patients': 'Actif',
        'link-archives': 'Archivé'
    };

    Object.keys(navs).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = () => {
                // Style actif
                document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
                el.classList.add('active');
                
                // Filtrage
                currentTab = navs[id];
                document.getElementById('page-title').innerText = el.innerText;
                applyFilters();
            };
        }
    });
};

// --- EXPORT EXCEL INDIVIDUEL (NOUVEAU) ---
window.exportSingle = (id) => {
    const p = allPatients.find(item => item.id === id);
    if (!p) return;

    const data = [{
        "Nom du Patient": p.nom,
        "Diagnostic": p.diagnostic,
        "Statut": p.statut,
        "Dernière Modification": p.lastUpdate ? p.lastUpdate.toDate().toLocaleString() : 'N/A',
        "Auteur": p.auteur,
        "Données OCR": p.ocr_data || "Aucune"
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fiche Patient");
    XLSX.writeFile(wb, `Dossier_${p.nom.replace(/\s+/g, '_')}.xlsx`);
};

// --- MISE À JOUR DU TABLEAU ---
function renderTable(data) {
    const list = document.getElementById('patient-list');
    list.innerHTML = "";
    
    data.forEach(p => {
        const dateStr = p.lastUpdate ? p.lastUpdate.toDate().toLocaleDateString('fr-FR') : '-';
        const auteurShort = p.auteur ? p.auteur.split('@')[0] : 'Inconnu';

        list.innerHTML += `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.diagnostic || '-'}</td>
                <td><span class="status-pill ${p.statut === 'Actif' ? 'status-actif' : 'status-archive'}">${p.statut}</span></td>
                <td>${dateStr}</td>
                <td>${auteurShort}</td>
                <td>
                    <button onclick="window.prepareEdit('${p.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.diagnostic ? p.diagnostic.replace(/'/g, "\\'") : ""}')" class="btn-icon"><span class="material-icons">edit</span></button>
                    <button onclick="window.toggleArch('${p.id}', '${p.statut}')" class="btn-icon"><span class="material-icons">${p.statut === 'Actif' ? 'archive' : 'unarchive'}</span></button>
                    <button onclick="window.exportSingle('${p.id}')" class="btn-icon" style="color: #27ae60;"><span class="material-icons">download</span></button>
                    <button onclick="window.deleteP('${p.id}')" class="btn-icon"><span class="material-icons">delete</span></button>
                </td>
            </tr>`;
    });
}

// --- LOGIQUE DE FILTRAGE ---
function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allPatients.filter(p => {
        const matchSearch = p.nom.toLowerCase().includes(search) || (p.diagnostic && p.diagnostic.toLowerCase().includes(search));
        const matchTab = currentTab === 'TOUT' ? true : p.statut === currentTab;
        return matchSearch && matchTab;
    });
    
    renderTable(filtered);
}

// --- INITIALISATION FIREBASE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        setupNavigation();
        
        onSnapshot(collection(db, "patients"), (snap) => {
            allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateStats(); // Fonction de stats à garder de la version précédente
            applyFilters();
        });
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
});

// Relier la recherche au filtre
document.getElementById('search-input').oninput = applyFilters;

// ... (Gardez les fonctions de login, stats, save, delete et OCR de la version précédente) ...
