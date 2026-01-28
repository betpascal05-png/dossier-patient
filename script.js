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
let charts = [];

// --- CONNEXION ---
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
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch(e) { document.getElementById('login-error').innerText = "Identifiants incorrects"; }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- NAVIGATION & FILTRES ---
const initApp = () => {
    onSnapshot(collection(db, "patients"), (snap) => {
        allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateDashboard();
    });

    document.getElementById('link-dashboard').onclick = () => switchTab('TOUT', 'link-dashboard');
    document.getElementById('link-patients').onclick = () => switchTab('Actif', 'link-patients');
    document.getElementById('link-archives').onclick = () => switchTab('Archivé', 'link-archives');
};

function switchTab(filter, elementId) {
    currentFilter = filter;
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById(elementId).classList.add('active');
    document.getElementById('page-title').innerText = document.getElementById(elementId).innerText;
    updateDashboard();
}

// --- RENDU DU TABLEAU & STATS ---
function updateDashboard() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const list = document.getElementById('patient-list');
    list.innerHTML = "";

    const filtered = allPatients.filter(p => {
        const matchSearch = p.nom.toLowerCase().includes(search) || (p.diagnostic && p.diagnostic.toLowerCase().includes(search));
        const matchTab = currentFilter === 'TOUT' ? true : p.statut === currentFilter;
        return matchSearch && matchTab;
    });

    filtered.forEach(p => {
        const date = p.lastUpdate ? p.lastUpdate.toDate().toLocaleDateString('fr-FR') : '-';
        const auteur = p.auteur ? p.auteur.split('@')[0] : 'Admin';
        
        list.innerHTML += `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.diagnostic || '-'}</td>
                <td><span class="status-pill ${p.statut === 'Actif' ? 'status-actif' : 'status-archive'}">${p.statut}</span></td>
                <td>${date}</td>
                <td>${auteur}</td>
                <td>
                    <button onclick="window.prepareEdit('${p.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.diagnostic ? p.diagnostic.replace(/'/g, "\\'") : ""}')" class="btn-icon"><span class="material-icons">edit</span></button>
                    <button onclick="window.toggleStatus('${p.id}', '${p.statut}')" class="btn-icon"><span class="material-icons">archive</span></button>
                    <button onclick="window.downloadSingle('${p.id}')" class="btn-icon" style="color: #2ecc71;"><span class="material-icons">download</span></button>
                    <button onclick="window.deletePatient('${p.id}')" class="btn-icon" style="color: #e74c3c;"><span class="material-icons">delete</span></button>
                </td>
            </tr>`;
    });

    // Update Stats & Charts
    const total = allPatients.length;
    const actifs = allPatients.filter(p => p.statut === 'Actif').length;
    const archives = allPatients.filter(p => p.statut === 'Archivé').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-actifs').innerText = actifs;
    document.getElementById('stat-archives').innerText = archives;
    updateMiniCharts([total, actifs, archives]);
}

function updateMiniCharts(vals) {
    const config = (val, color) => ({
        type: 'line',
        data: { labels: [1,2,3,4,5], datasets: [{ data: [val-2, val+1, val-1, val, val], borderColor: color, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, responsive: true, maintainAspectRatio: false }
    });
    if (charts.length === 0) {
        charts.push(new Chart(document.getElementById('miniChart1').getContext('2d'), config(vals[0], '#3f51b5')));
        charts.push(new Chart(document.getElementById('miniChart2').getContext('2d'), config(vals[1], '#1f7a33')));
        charts.push(new Chart(document.getElementById('miniChart3').getContext('2d'), config(vals[2], '#92400e')));
    } else {
        charts.forEach((c, i) => { c.data.datasets[0].data = [vals[i]-2, vals[i]+1, vals[i]-1, vals[i], vals[i]]; c.update(); });
    }
}

document.getElementById('search-input').oninput = updateDashboard;

// --- ACTIONS EXCEL ---
window.downloadSingle = (id) => {
    const p = allPatients.find(x => x.id === id);
    const data = [{ Nom: p.nom, Diagnostic: p.diagnostic, Statut: p.statut, Date: p.lastUpdate?.toDate().toLocaleString(), Auteur: p.auteur }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patient");
    XLSX.writeFile(wb, `Dossier_${p.nom}.xlsx`);
};

document.getElementById('export-global-btn').onclick = () => {
    const data = allPatients.map(p => ({ Nom: p.nom, Diagnostic: p.diagnostic, Statut: p.statut, Date: p.lastUpdate?.toDate().toLocaleString(), Auteur: p.auteur }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archives");
    XLSX.writeFile(wb, "Archives_Globales.xlsx");
};

// --- CRUD ---
document.getElementById('save-btn').onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const data = {
        nom: document.getElementById('p-nom').value,
        diagnostic: document.getElementById('p-diag').value,
        lastUpdate: serverTimestamp(),
        auteur: auth.currentUser.email
    };

    if (id) { await updateDoc(doc(db, "patients", id), data); }
    else { data.statut = 'Actif'; await addDoc(collection(db, "patients"), data); }
    closeModal();
};

window.prepareEdit = (id, nom, diag) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nom').value = nom;
    document.getElementById('p-diag').value = diag;
    openModal();
};

window.toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "patients", id), { statut: current === 'Actif' ? 'Archivé' : 'Actif' });
};

window.deletePatient = async (id) => {
    if (confirm("Supprimer ce dossier définitivement ?")) await deleteDoc(doc(db, "patients", id));
};

// --- CAMERA & OCR (AVEC LOADER) ---
let stream;
document.getElementById('start-camera').onclick = async () => {
    const loader = document.getElementById('ocr-loader');
    const video = document.getElementById('video');
    
    loader.style.display = 'block'; // Afficher le loader
    video.style.display = 'none';

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            loader.style.display = 'none'; // Cacher le loader
            video.style.display = 'block'; // Afficher la vidéo
        };
    } catch (e) {
        loader.style.display = 'none';
        alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
};

// --- UI ---
const openModal = () => {
    document.getElementById('modal-patient').style.display = 'flex';
};
const closeModal = () => {
    document.getElementById('modal-patient').style.display = 'none';
    if(stream) stream.getTracks().forEach(t => t.stop());
    document.getElementById('video').style.display = 'none';
    document.getElementById('ocr-loader').style.display = 'none';
};
document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('p-nom').value = ""; document.getElementById('p-diag').value = "";
    openModal();
};
document.getElementById('close-modal').onclick = closeModal;

document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark-theme');
};
