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
let currentFilter = 'TOUT';
let patientsGlobal = [];

// AUTH & NAVIGATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.getElementById('user-display').innerText = "Dr. " + user.email.split('@')[0];
        loadPatients();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { document.getElementById('login-error').innerText = "Erreur de connexion."; }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// RECHERCHE DYNAMIQUE
document.getElementById('search-input').oninput = (e) => {
    renderTable(patientsGlobal.filter(p => 
        p.nom.toLowerCase().includes(e.target.value.toLowerCase()) || 
        p.diagnostic.toLowerCase().includes(e.target.value.toLowerCase())
    ));
};

// NAVIGATION
const navLinks = { 'link-dashboard': 'TOUT', 'link-patients': 'Actif', 'link-archives': 'Archivé' };
Object.keys(navLinks).forEach(id => {
    document.getElementById(id).onclick = function() {
        document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
        this.classList.add('active'); 
        currentFilter = navLinks[id];
        document.getElementById('page-title').innerText = this.innerText;
        loadPatients();
    };
});

// CHARGEMENT ET STATISTIQUES
function loadPatients() {
    onSnapshot(collection(db, "patients"), (snap) => {
        patientsGlobal = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calcul des stats
        document.getElementById('stat-total').innerText = patientsGlobal.length;
        document.getElementById('stat-actifs').innerText = patientsGlobal.filter(p => p.statut === 'Actif').length;
        document.getElementById('stat-archives').innerText = patientsGlobal.filter(p => p.statut === 'Archivé').length;

        const filtered = currentFilter === 'TOUT' ? patientsGlobal : patientsGlobal.filter(p => p.statut === currentFilter);
        renderTable(filtered);
    });
}

function renderTable(data) {
    const list = document.getElementById('patient-list');
    list.innerHTML = "";
    data.forEach(p => {
        const date = p.lastUpdate ? p.lastUpdate.toDate().toLocaleDateString('fr-FR') : '-';
        list.innerHTML += `<tr>
            <td><strong>${p.nom}</strong></td>
            <td>${p.diagnostic}</td>
            <td><span class="status-pill ${p.statut === 'Actif' ? 'status-actif' : 'status-archive'}">${p.statut}</span></td>
            <td>${date}</td>
            <td>
                <button onclick="window.prepareEdit('${p.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.diagnostic.replace(/'/g, "\\'")}', '${p.ocr_data ? p.ocr_data.replace(/'/g, "\\'") : ""}')" class="action-btn btn-edit"><span class="material-icons">edit</span></button>
                <button onclick="window.toggleArch('${p.id}', '${p.statut}')" class="action-btn btn-arch"><span class="material-icons">${p.statut === 'Actif' ? 'archive' : 'unarchive'}</span></button>
                <button onclick="window.deleteP('${p.id}')" class="action-btn btn-del"><span class="material-icons">delete</span></button>
            </td>
        </tr>`;
    });
}

// ACTIONS CORRIGÉES
window.prepareEdit = (id, nom, diag, ocr) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nom').value = nom;
    document.getElementById('p-diag').value = diag;
    document.getElementById('p-ocr-result').value = ocr;
    document.getElementById('modal-title').innerText = "Modifier le Dossier";
    document.getElementById('modal-patient').style.display = 'flex';
};

document.getElementById('save-btn').onclick = async () => {
    const editId = document.getElementById('edit-id').value;
    const patientData = {
        nom: document.getElementById('p-nom').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        lastUpdate: serverTimestamp(),
        auteur: auth.currentUser.email
    };

    if (editId) {
        await updateDoc(doc(db, "patients", editId), patientData);
    } else {
        patientData.statut = "Actif";
        await addDoc(collection(db, "patients"), patientData);
    }
    closeMod();
};

window.toggleArch = async (id, current) => {
    await updateDoc(doc(db, "patients", id), { statut: current === 'Actif' ? 'Archivé' : 'Actif' });
};

window.deleteP = async (id) => {
    if(confirm("Confirmer la suppression ?")) await deleteDoc(doc(db, "patients", id));
};

// OCR & CAMÉRA
let strm;
document.getElementById('start-camera').onclick = async () => {
    strm = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const v = document.getElementById('video');
    v.srcObject = strm; v.style.display = 'block';
    document.getElementById('capture-ocr').style.display = 'inline-block';
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    document.getElementById('p-ocr-result').value = "Analyse en cours...";
    const res = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = res.data.text;
};

// GESTION MODALE
const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(strm) strm.getTracks().forEach(t => t.stop());
};
document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('modal-title').innerText = "Nouveau Dossier Médical";
    document.getElementById('p-nom').value = ""; document.getElementById('p-diag').value = ""; document.getElementById('p-ocr-result').value = "";
    document.getElementById('modal-patient').style.display = 'flex';
};
document.getElementById('close-modal').onclick = closeMod;
