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

// --- AUTHENTIFICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.getElementById('user-display').innerText = user.email;
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
    catch (e) { document.getElementById('login-error').innerText = "Accès refusé."; }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- NAVIGATION ---
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

// --- CHARGEMENT DES DOSSIERS AVEC LES 3 ACTIONS ---
function loadPatients() {
    onSnapshot(collection(db, "patients"), (snap) => {
        const list = document.getElementById('patient-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            if(currentFilter !== 'TOUT' && p.statut !== currentFilter) return;

            list.innerHTML += `<tr>
                <td><b>${p.nom}</b></td>
                <td>${p.diagnostic}</td>
                <td><span class="status ${p.statut === 'Actif' ? 'active-status' : ''}">${p.statut}</span></td>
                <td><small>${p.auteur.split('@')[0]}</small></td>
                <td>
                    <button onclick="window.editP('${d.id}')" class="btn-icon" title="Modifier" style="color:#f39c12;">
                        <span class="material-icons">edit</span>
                    </button>
                    <button onclick="window.toggleArch('${d.id}', '${p.statut}')" class="btn-icon" title="Archiver" style="color:#3498db;">
                        <span class="material-icons">${p.statut === 'Actif' ? 'archive' : 'unarchive'}</span>
                    </button>
                    <button onclick="window.deleteP('${d.id}')" class="btn-icon" title="Supprimer" style="color:#e74c3c;">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            </tr>`;
        });
    });
}

// --- ACTIONS GLOBALES ---
window.toggleArch = async (id, current) => {
    await updateDoc(doc(db, "patients", id), { statut: current === 'Actif' ? 'Archivé' : 'Actif' });
};

window.deleteP = async (id) => {
    if(confirm("Supprimer ce dossier définitivement ?")) await deleteDoc(doc(db, "patients", id));
};

window.editP = (id) => {
    alert("Modification en cours pour : " + id);
    // Ici, on pourrait ouvrir la modale et pré-remplir les champs.
};

// --- SAUVEGARDE ET OCR ---
document.getElementById('save-btn').onclick = async () => {
    await addDoc(collection(db, "patients"), {
        nom: document.getElementById('p-nom').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        statut: "Actif",
        auteur: auth.currentUser.email,
        date: serverTimestamp()
    });
    closeMod();
};

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
    document.getElementById('p-ocr-result').value = "Analyse OCR...";
    const res = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = res.data.text;
};

const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(strm) strm.getTracks().forEach(t => t.stop());
};
document.getElementById('open-modal-btn').onclick = () => document.getElementById('modal-patient').style.display = 'flex';
document.getElementById('close-modal').onclick = closeMod;
