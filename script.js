import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURATION FIREBASE (Tes clés)
const firebaseConfig = {
  apiKey: "AIzaSyAfORG83-_T4LP18oayAva3uS0nPCFPZcM",
  authDomain: "med-archive-41eaf.firebaseapp.com",
  projectId: "med-archive-41eaf",
  storageBucket: "med-archive-41eaf.firebasestorage.app",
  messagingSenderId: "529667535982",
  appId: "1:529667535982:web:508f1525d641e75c4ba27f",
  measurementId: "G-1CQH5TGT4Y"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const patientsCol = collection(db, "patients");

let allPatients = [];
let currentFilter = 'TOUT';
let stream = null;

// --- 1. ÉCOUTE DE LA BASE DE DONNÉES (Temps réel) ---
onSnapshot(patientsCol, (snapshot) => {
    allPatients = [];
    snapshot.forEach(doc => allPatients.push({ id_db: doc.id, ...doc.data() }));
    render();
});

// --- 2. AFFICHAGE DE LA LISTE ---
function render() {
    const list = document.getElementById('patient-list');
    const search = document.getElementById('search-input').value.toLowerCase();
    list.innerHTML = "";
    
    const filtered = allPatients.filter(p => {
        const matchSearch = (p.nom + p.prenom).toLowerCase().includes(search);
        if (currentFilter === 'ACTIF') return matchSearch && p.statut === 'Actif';
        if (currentFilter === 'ARCHIVE') return matchSearch && p.statut === 'Archivé';
        return matchSearch;
    });

    filtered.forEach(p => {
        const isActif = p.statut === 'Actif';
        list.innerHTML += `<tr>
            <td><small>${p.id}</small></td>
            <td><b>${p.nom} ${p.prenom}</b></td>
            <td>${p.age} ans</td>
            <td>${p.diagnostic}</td>
            <td><span class="status ${isActif ? 'active-status' : ''}">${p.statut}</span></td>
            <td>
                <button onclick="editPatient('${p.id_db}')" class="btn-icon btn-edit"><span class="material-icons">edit</span></button>
                <button onclick="toggleArchive('${p.id_db}', '${p.statut}')" class="btn-icon ${isActif ? 'btn-archive' : 'btn-unarchive'}">
                    <span class="material-icons">${isActif ? 'archive' : 'unarchive'}</span>
                </button>
                <button onclick="deletePatient('${p.id_db}')" class="btn-icon btn-delete"><span class="material-icons">delete</span></button>
            </td>
        </tr>`;
    });
    document.getElementById('count-total').innerText = allPatients.length;
}

// --- 3. ACTIONS GLOBALES (Rattachées à window pour le HTML) ---

window.deletePatient = async (id) => { 
    if(confirm("Supprimer ce dossier définitivement ?")) await deleteDoc(doc(db, "patients", id)); 
};

window.toggleArchive = async (id, stat) => { 
    const newStatut = (stat === 'Actif' ? 'Archivé' : 'Actif');
    await updateDoc(doc(db, "patients", id), { statut: newStatut }); 
};

window.editPatient = (id_db) => {
    const p = allPatients.find(item => item.id_db === id_db);
    if(p) {
        document.getElementById('edit-id').value = p.id_db;
        document.getElementById('p-nom').value = p.nom;
        document.getElementById('p-prenom').value = p.prenom;
        document.getElementById('p-age').value = p.age;
        document.getElementById('p-diag').value = p.diagnostic;
        document.getElementById('p-ocr-result').value = p.ocr_data || "";
        document.getElementById('modal-patient').style.display = 'flex';
    }
};

// --- 4. GESTION DU FORMULAIRE ---
const form = document.getElementById('patient-form');
form.onsubmit = async (e) => {
    e.preventDefault();
    const eid = document.getElementById('edit-id').value;
    const data = {
        nom: document.getElementById('p-nom').value.toUpperCase(),
        prenom: document.getElementById('p-prenom').value,
        age: document.getElementById('p-age').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value
    };

    if(eid) {
        await updateDoc(doc(db, "patients", eid), data);
    } else {
        data.id = `PAT-${Math.floor(Math.random()*9000+1000)}`;
        data.statut = "Actif";
        await addDoc(patientsCol, data);
    }
    closeMod();
};

// --- 5. CAMÉRA ET SCANNER ---
document.getElementById('start-camera').onclick = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        document.getElementById('video').srcObject = stream;
        document.getElementById('video-box').style.display = 'block';
        document.getElementById('capture-ocr').style.display = 'inline-block';
    } catch(e) { alert("Erreur caméra : " + e); }
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    const v = document.getElementById('video');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    document.getElementById('p-ocr-result').value = "Analyse en cours...";
    const res = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = res.data.text;
};

// --- 6. NAVIGATION ET INTERFACE ---
const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    form.reset(); 
    document.getElementById('edit-id').value = "";
    if(stream) {
        stream.getTracks().forEach(t => t.stop());
        document.getElementById('video-box').style.display = 'none';
    }
};

document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('modal-patient').style.display = 'flex';
};

document.getElementById('close-modal').onclick = closeMod;
document.getElementById('search-input').oninput = render;

// Gestion des clics sur le menu de gauche (Sidebar)
const navLinks = { 
    'link-dashboard': 'TOUT', 
    'link-patients': 'ACTIF', 
    'link-archives': 'ARCHIVE' 
};

Object.keys(navLinks).forEach(id => {
    document.getElementById(id).onclick = function() {
        document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
        this.classList.add('active'); 
        currentFilter = navLinks[id];
        
        // Mise à jour du titre
        const titles = { 'TOUT': 'Tableau de Bord', 'ACTIF': 'Dossiers Actifs', 'ARCHIVE': 'Archives' };
        document.getElementById('page-title').innerText = titles[currentFilter];
        
        render();
    };
});