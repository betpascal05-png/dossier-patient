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

// AUTHENTIFICATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.getElementById('user-display').innerText = user.email.split('@')[0];
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
    catch (e) { alert("Accès non autorisé."); }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// CHARGEMENT ET ACTIONS (CORRIGÉ)
function loadPatients() {
    onSnapshot(collection(db, "patients"), (snap) => {
        const list = document.getElementById('patient-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            if(currentFilter !== 'TOUT' && p.statut !== currentFilter) return;

            list.innerHTML += `<tr>
                <td><b>${p.nom}</b></td>
                <td>${p.diagnostic || '-'}</td>
                <td><span class="status ${p.statut === 'Actif' ? 'active-status' : ''}">${p.statut}</span></td>
                <td><small>${p.auteur ? p.auteur.split('@')[0] : 'Admin'}</small></td>
                <td>
                    <button onclick="window.prepareEdit('${d.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.diagnostic ? p.diagnostic.replace(/'/g, "\\'") : ""}', '${p.ocr_data ? p.ocr_data.replace(/'/g, "\\'") : ""}')" class="btn-icon" style="color:#f39c12;">
                        <span class="material-icons">edit</span>
                    </button>
                    <button onclick="window.toggleArch('${d.id}', '${p.statut}')" class="btn-icon" style="color:#3498db;">
                        <span class="material-icons">${p.statut === 'Actif' ? 'archive' : 'unarchive'}</span>
                    </button>
                    <button onclick="window.deleteP('${d.id}')" class="btn-icon" style="color:#e74c3c;">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            </tr>`;
        });
    });
}

// MISE À JOUR ET SAUVEGARDE
window.prepareEdit = (id, nom, diag, ocr) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nom').value = nom;
    document.getElementById('p-diag').value = diag;
    document.getElementById('p-ocr-result').value = ocr;
    document.getElementById('modal-title').innerText = "Modifier Dossier";
    document.getElementById('modal-patient').style.display = 'flex';
};

document.getElementById('save-btn').onclick = async () => {
    const editId = document.getElementById('edit-id').value;
    const data = {
        nom: document.getElementById('p-nom').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        auteur: auth.currentUser.email,
        lastUpdate: serverTimestamp()
    };
    if (editId) { await updateDoc(doc(db, "patients", editId), data); } 
    else { data.statut = "Actif"; await addDoc(collection(db, "patients"), data); }
    closeMod();
};

window.toggleArch = async (id, stat) => {
    await updateDoc(doc(db, "patients", id), { statut: stat === 'Actif' ? 'Archivé' : 'Actif' });
};

window.deleteP = async (id) => { if(confirm("Supprimer ?")) await deleteDoc(doc(db, "patients", id)); };

// INTERFACE MODALE ET CAMERA
document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('modal-title').innerText = "Nouveau Dossier";
    document.getElementById('p-nom').value = ""; document.getElementById('p-diag').value = "";
    document.getElementById('modal-patient').style.display = 'flex';
};

let strm;
document.getElementById('start-camera').onclick = async () => {
    strm = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    document.getElementById('video').srcObject = strm; document.getElementById('video').style.display = 'block';
    document.getElementById('capture-ocr').style.display = 'inline-block';
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const res = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = res.data.text;
};

const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(strm) strm.getTracks().forEach(t => t.stop());
};
document.getElementById('close-modal').onclick = closeMod;
