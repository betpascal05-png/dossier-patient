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
let currentFilter = 'TOUT';

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
});

document.getElementById('login-btn').onclick = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); }
    catch(e) { alert("Accès refusé"); }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- THEME ---
document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('#theme-toggle span');
    icon.innerText = document.body.classList.contains('dark-theme') ? 'light_mode' : 'dark_mode';
};

// --- APP LOGIC ---
const initApp = () => {
    onSnapshot(collection(db, "patients"), (snap) => {
        allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
    });

    document.getElementById('link-dashboard').onclick = () => setTab('TOUT', 'link-dashboard');
    document.getElementById('link-patients').onclick = () => setTab('Actif', 'link-patients');
    document.getElementById('link-archives').onclick = () => setTab('Archivé', 'link-archives');
};

function setTab(filter, id) {
    currentFilter = filter;
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    render();
}

function render() {
    const list = document.getElementById('patient-list');
    list.innerHTML = "";
    const filtered = allPatients.filter(p => currentFilter === 'TOUT' || p.statut === currentFilter);

    filtered.forEach(p => {
        const date = p.lastUpdate ? p.lastUpdate.toDate().toLocaleDateString() : '-';
        list.innerHTML += `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.diagnostic || '-'}</td>
                <td class="hide-mobile"><span class="status-pill ${p.statut === 'Actif' ? 'status-actif' : 'status-archive'}">${p.statut}</span></td>
                <td class="hide-mobile">${date}</td>
                <td>
                    <button onclick="window.prepareEdit('${p.id}','${p.nom}','${p.diagnostic || ''}')" class="btn-icon"><span class="material-icons">edit</span></button>
                    <button onclick="window.toggleArchive('${p.id}','${p.statut}')" class="btn-icon" title="Archiver/Activer"><span class="material-icons">inventory_2</span></button>
                    <button onclick="window.downloadSingle('${p.id}')" class="btn-icon" style="color:#27ae60"><span class="material-icons">download</span></button>
                    <button onclick="window.deleteP('${p.id}')" class="btn-icon" style="color:#e74c3c"><span class="material-icons">delete</span></button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-total').innerText = allPatients.length;
    document.getElementById('stat-actifs').innerText = allPatients.filter(p => p.statut === 'Actif').length;
    document.getElementById('stat-archives').innerText = allPatients.filter(p => p.statut === 'Archivé').length;
}

// --- ACTIONS EXCEL ---
document.getElementById('export-global-btn').onclick = () => {
    const data = allPatients.map(p => ({ Nom: p.nom, Diagnostic: p.diagnostic, Statut: p.statut, Auteur: p.auteur }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "VisceraCloud_Global.xlsx");
};

window.downloadSingle = (id) => {
    const p = allPatients.find(x => x.id === id);
    const ws = XLSX.utils.json_to_sheet([{ Patient: p.nom, Diagnostic: p.diagnostic, Statut: p.statut, Auteur: p.auteur }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patient");
    XLSX.writeFile(wb, `Fiche_${p.nom}.xlsx`);
};

// --- CRUD ---
window.toggleArchive = async (id, current) => {
    const newStatut = (current === 'Actif') ? 'Archivé' : 'Actif';
    await updateDoc(doc(db, "patients", id), { statut: newStatut });
};

document.getElementById('save-btn').onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const data = { nom: document.getElementById('p-nom').value, diagnostic: document.getElementById('p-diag').value, lastUpdate: serverTimestamp(), auteur: auth.currentUser.email };
    if(id) await updateDoc(doc(db, "patients", id), data);
    else { data.statut = 'Actif'; await addDoc(collection(db, "patients"), data); }
    closeModal();
};

window.prepareEdit = (id, nom, diag) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nom').value = nom;
    document.getElementById('p-diag').value = diag;
    document.getElementById('modal-patient').style.display = 'flex';
};

window.deleteP = async (id) => { if(confirm("Supprimer ?")) await deleteDoc(doc(db, "patients", id)); };

// --- CAMERA ---
let stream;
document.getElementById('start-camera').onclick = async () => {
    const loader = document.getElementById('ocr-loader');
    const video = document.getElementById('video');
    loader.style.display = 'block';
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            loader.style.display = 'none';
            video.style.display = 'block';
            document.getElementById('capture-ocr').style.display = 'flex';
        };
    } catch (e) { loader.style.display = 'none'; alert("Caméra bloquée"); }
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    document.getElementById('p-ocr-result').value = "Analyse...";
    const res = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = res.data.text;
};

// --- UI ---
const closeModal = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(stream) stream.getTracks().forEach(t => t.stop());
};
document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('edit-id').value = ""; document.getElementById('p-nom').value = ""; document.getElementById('p-diag').value = "";
    document.getElementById('modal-patient').style.display = 'flex';
};
document.getElementById('close-modal').onclick = closeModal;
