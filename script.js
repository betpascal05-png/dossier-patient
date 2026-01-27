import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const patientsCol = collection(db, "patients");

let allPatients = [];
let currentFilter = 'TOUT';
let currentCameraStream = null; // Renommé pour éviter les conflits

// --- 0. GESTION DE L'AUTHENTIFICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.getElementById('user-email').innerText = user.email;
        // Charger les patients seulement si l'utilisateur est connecté
        listenToPatients(); 
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDisplay = document.getElementById('login-error');
    errorDisplay.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorDisplay.innerText = "Erreur de connexion : " + error.message;
        errorDisplay.style.display = 'block';
    }
};

document.getElementById('logout-btn').onclick = async () => {
    await signOut(auth);
};

// --- 1. ÉCOUTE DE LA BASE DE DONNÉES (Temps réel) ---
function listenToPatients() {
    onSnapshot(patientsCol, (snapshot) => {
        allPatients = [];
        snapshot.forEach(doc => allPatients.push({ id_db: doc.id, ...doc.data() }));
        render();
    });
}


// --- 2. AFFICHAGE DE LA LISTE ---
function render() {
    const list = document.getElementById('patient-list');
    const search = document.getElementById('search-input').value.toLowerCase();
    list.innerHTML = "";
    
    const filtered = allPatients.filter(p => {
        const matchSearch = (p.nom + p.prenom + p.id).toLowerCase().includes(search);
        if (currentFilter === 'ACTIF') return matchSearch && p.statut === 'Actif';
        if (currentFilter === 'ARCHIVE') return matchSearch && p.statut === 'Archivé';
        return matchSearch;
    });

    filtered.forEach(p => {
        const isActif = p.statut === 'Actif';
        // Formater la date pour l'affichage
        const dateModif = p.dateModif ? new Date(p.dateModif.seconds * 1000).toLocaleDateString('fr-FR') : 'N/A';

        list.innerHTML += `<tr>
            <td><small>${p.id}</small></td>
            <td><b>${p.nom} ${p.prenom}</b></td>
            <td>${p.age} ans</td>
            <td>${p.diagnostic}</td>
            <td><span class="status ${isActif ? 'active-status' : ''}">${p.statut}</span></td>
            <td>${p.modifiePar || 'Inconnu'}</td> <td>${dateModif}</td> <td>
                <button onclick="window.editPatient('${p.id_db}')" class="btn-icon btn-edit"><span class="material-icons">edit</span></button>
                <button onclick="window.toggleArchive('${p.id_db}', '${p.statut}')" class="btn-icon ${isActif ? 'btn-archive' : 'btn-unarchive'}">
                    <span class="material-icons">${isActif ? 'archive' : 'unarchive'}</span>
                </button>
                <button onclick="window.deletePatient('${p.id_db}')" class="btn-icon btn-delete"><span class="material-icons">delete</span></button>
            </td>
        </tr>`;
    });
    document.getElementById('count-total').innerText = allPatients.length;
}

// --- 3. ACTIONS GLOBALES (Rattachées à window pour le HTML) ---

window.deletePatient = async (id) => { 
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
    if(confirm("Supprimer ce dossier définitivement ?")) {
        await deleteDoc(doc(db, "patients", id)); 
    }
};

window.toggleArchive = async (id, stat) => { 
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
    const newStatut = (stat === 'Actif' ? 'Archivé' : 'Actif');
    await updateDoc(doc(db, "patients", id), { 
        statut: newStatut,
        modifiePar: auth.currentUser.email,
        dateModif: serverTimestamp()
    }); 
};

window.editPatient = (id_db) => {
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
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
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; } // Vérif connexion
    
    const eid = document.getElementById('edit-id').value;
    const data = {
        nom: document.getElementById('p-nom').value.toUpperCase(),
        prenom: document.getElementById('p-prenom').value,
        age: document.getElementById('p-age').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        modifiePar: auth.currentUser.email, // Qui a modifié
        dateModif: serverTimestamp() // Quand a été modifié
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

// --- 5. CAMÉRA ET SCANNER (OCR) ---
document.getElementById('start-camera').onclick = async () => {
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
    try {
        if (currentCameraStream) { // Arrête l'ancienne piste si elle existe
            currentCameraStream.getTracks().forEach(track => track.stop());
        }
        const video = document.getElementById('video');
        currentCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = currentCameraStream;
        document.getElementById('video-box').style.display = 'block';
        document.getElementById('capture-ocr').style.display = 'inline-block';
        video.play(); // Assure que la vidéo joue
    } catch(e) { 
        alert("Erreur caméra : Vérifiez les permissions du navigateur et assurez-vous d'être sur HTTPS (votre lien GitHub.io). Message: " + e.message); 
        console.error("Erreur d'accès caméra:", e);
    }
};

document.getElementById('capture-ocr').onclick = async () => {
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
    const canvas = document.getElementById('canvas');
    const v = document.getElementById('video');
    
    // Vérifier si la vidéo a une taille valide
    if (v.videoWidth === 0 || v.videoHeight === 0) {
        alert("La caméra n'est pas encore active ou n'a pas pu démarrer correctement. Réessayez.");
        return;
    }

    canvas.width = v.videoWidth; 
    canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
    
    document.getElementById('p-ocr-result').value = "Analyse OCR en cours...";
    try {
        const res = await Tesseract.recognize(canvas, 'fra');
        document.getElementById('p-ocr-result').value = res.data.text;
    } catch (e) {
        alert("Erreur OCR : " + e.message + " Assurez-vous d'être en ligne et sur HTTPS.");
        console.error("Erreur Tesseract OCR:", e);
        document.getElementById('p-ocr-result').value = "Erreur lors de l'analyse OCR.";
    }
};

// --- 6. NAVIGATION ET INTERFACE ---
const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    form.reset(); 
    document.getElementById('edit-id').value = "";
    document.getElementById('p-ocr-result').value = ""; // Vider le résultat OCR
    if(currentCameraStream) {
        currentCameraStream.getTracks().forEach(track => track.stop());
        document.getElementById('video-box').style.display = 'none';
        document.getElementById('capture-ocr').style.display = 'none';
    }
};

document.getElementById('open-modal-btn').onclick = () => {
    if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
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
    const element = document.getElementById(id);
    if (element) {
        element.onclick = function() {
            if(!auth.currentUser) { alert("Veuillez vous connecter."); return; }
            document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');