import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TA CONFIGURATION (Vérifiée sur tes photos)
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

// 1. GESTION DE LA CONNEXION (IMAGE 12)
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
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        document.getElementById('login-error').innerText = "Erreur : Email ou mot de passe invalide.";
        document.getElementById('login-error').style.display = 'block';
    }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// 2. LECTURE DES DONNÉES (FIRESTORE)
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
                <td><span class="status">${p.statut}</span></td>
                <td><small>${p.auteur || 'Inconnu'}</small></td>
                <td>
                    <button onclick="window.deleteP('${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><span class="material-icons">delete</span></button>
                </td>
            </tr>`;
        });
    });
}

// 3. ENREGISTREMENT ET TRACE
document.getElementById('save-btn').onclick = async () => {
    const nom = document.getElementById('p-nom').value;
    if(!nom) return alert("Nom requis");

    await addDoc(collection(db, "patients"), {
        nom: nom,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        statut: "Actif",
        auteur: auth.currentUser.email, // Garde une trace de qui a créé
        date: serverTimestamp()
    });
    closeModal();
};

window.deleteP = async (id) => {
    if(confirm("Supprimer ce dossier ?")) await deleteDoc(doc(db, "patients", id));
};

// 4. CAPTEUR CAMERA & OCR
let stream;
document.getElementById('start-camera').onclick = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = document.getElementById('video');
        v.srcObject = stream;
        v.style.display = 'block';
        document.getElementById('capture-ocr').style.display = 'inline-block';
    } catch (e) { alert("Caméra bloquée. Autorisez le HTTPS sur GitHub."); }
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    document.getElementById('p-ocr-result').value = "Analyse du texte en cours...";
    const result = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = result.data.text;
};

// 5. INTERFACE
const closeModal = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(stream) stream.getTracks().forEach(t => t.stop());
    document.getElementById('video').style.display = 'none';
};
document.getElementById('open-modal-btn').onclick = () => document.getElementById('modal-patient').style.display = 'flex';
document.getElementById('close-modal').onclick = closeModal;