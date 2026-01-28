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
let patients = [];
let charts = [];

// 1. GESTION DU THÈME
document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('#theme-toggle span');
    icon.innerText = document.body.classList.contains('dark-theme') ? 'light_mode' : 'dark_mode';
};

// 2. AUTHENTIFICATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadData();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); } 
    catch(e) { document.getElementById('login-error').innerText = "Erreur de connexion"; }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// 3. CHARGEMENT & STATS & CHARTS
function loadData() {
    onSnapshot(collection(db, "patients"), (snap) => {
        patients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        renderTable(patients);
    });
}

function updateStats() {
    const actifs = patients.filter(p => p.statut === 'Actif').length;
    const arch = patients.filter(p => p.statut === 'Archivé').length;
    
    document.getElementById('stat-total').innerText = patients.length;
    document.getElementById('stat-actifs').innerText = actifs;
    document.getElementById('stat-archives').innerText = arch;
    
    updateMiniCharts([patients.length, actifs, arch]);
}

function updateMiniCharts(vals) {
    const config = (val, color) => ({
        type: 'line',
        data: { labels: [1,2,3,4,5], datasets: [{ data: [val-2, val+1, val-1, val, val], borderColor: color, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
    
    if (charts.length === 0) {
        charts.push(new Chart(document.getElementById('miniChart1'), config(vals[0], '#3b82f6')));
        charts.push(new Chart(document.getElementById('miniChart2'), config(vals[1], '#10b981')));
        charts.push(new Chart(document.getElementById('miniChart3'), config(vals[2], '#f59e0b')));
    }
}

// 4. RECHERCHE & FILTRES
const filterData = () => {
    const search = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    
    const filtered = patients.filter(p => {
        const matchSearch = p.nom.toLowerCase().includes(search) || p.diagnostic.toLowerCase().includes(search);
        const matchStatus = status === 'TOUT' || p.statut === status;
        return matchSearch && matchStatus;
    });
    renderTable(filtered);
};

document.getElementById('search-input').oninput = filterData;
document.getElementById('filter-status').onchange = filterData;

// 5. EXPORT EXCEL
document.getElementById('export-btn').onclick = () => {
    const dataToExport = patients.map(p => ({ Nom: p.nom, Diagnostic: p.diagnostic, Statut: p.statut, Auteur: p.auteur }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
    XLSX.writeFile(workbook, "Dossiers_Patients.xlsx");
};

// 6. RENDER TABLE
function renderTable(data) {
    const list = document.getElementById('patient-list');
    list.innerHTML = "";
    data.forEach(p => {
        list.innerHTML += `<tr>
            <td><strong>${p.nom}</strong></td>
            <td>${p.diagnostic}</td>
            <td><span class="status-pill">${p.statut}</span></td>
            <td>${p.lastUpdate ? p.lastUpdate.toDate().toLocaleDateString() : '-'}</td>
            <td>
                <button onclick="window.prepareEdit('${p.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.diagnostic.replace(/'/g, "\\'")}')" class="btn-icon"><span class="material-icons">edit</span></button>
                <button onclick="window.toggleArch('${p.id}', '${p.statut}')" class="btn-icon"><span class="material-icons">archive</span></button>
                <button onclick="window.deleteP('${p.id}')" class="btn-icon"><span class="material-icons">delete</span></button>
            </td>
        </tr>`;
    });
}

// 7. ACTIONS CRUD
window.prepareEdit = (id, nom, diag) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nom').value = nom;
    document.getElementById('p-diag').value = diag;
    document.getElementById('modal-patient').style.display = 'flex';
};

document.getElementById('save-btn').onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const data = { nom: document.getElementById('p-nom').value, diagnostic: document.getElementById('p-diag').value, lastUpdate: serverTimestamp(), auteur: auth.currentUser.email };
    
    if(id) { await updateDoc(doc(db, "patients", id), data); }
    else { data.statut = "Actif"; await addDoc(collection(db, "patients"), data); }
    document.getElementById('modal-patient').style.display = 'none';
};

window.toggleArch = async (id, current) => {
    await updateDoc(doc(db, "patients", id), { statut: current === 'Actif' ? 'Archivé' : 'Actif' });
};

window.deleteP = async (id) => { if(confirm("Supprimer ?")) await deleteDoc(doc(db, "patients", id)); };

// MODAL
document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('p-nom').value = ""; document.getElementById('p-diag').value = "";
    document.getElementById('modal-patient').style.display = 'flex';
};
document.getElementById('close-modal').onclick = () => document.getElementById('modal-patient').style.display = 'none';
