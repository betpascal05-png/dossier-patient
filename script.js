// Données vides au départ
let patients = JSON.parse(localStorage.getItem('patients_data')) || [];
let currentFilter = 'TOUT';
let stream = null;

const save = () => localStorage.setItem('patients_data', JSON.stringify(patients));

// --- RENDU ---
function render(search = "") {
    const list = document.getElementById('patient-list');
    list.innerHTML = "";

    const filtered = patients.filter(p => {
        const match = (p.nom + p.prenom + p.id).toLowerCase().includes(search.toLowerCase());
        if (!match) return false;
        if (currentFilter === 'ACTIF') return p.statut === 'Actif';
        if (currentFilter === 'ARCHIVE') return p.statut === 'Archivé';
        return true;
    });

    filtered.forEach(p => {
        const isActif = p.statut === 'Actif';
        list.innerHTML += `
            <tr>
                <td><small>${p.id}</small></td>
                <td><b>${p.nom} ${p.prenom}</b></td>
                <td>${p.age} ans</td>
                <td>${p.diagnostic}</td>
                <td><span class="status ${isActif ? 'active-status' : ''}">${p.statut}</span></td>
                <td>
                    <div class="action-btns">
                        <button onclick="editPatient('${p.id}')" class="btn-icon btn-edit"><span class="material-icons">edit</span></button>
                        <button onclick="toggleArchive('${p.id}')" class="btn-icon ${isActif ? 'btn-archive' : 'btn-unarchive'}">
                            <span class="material-icons">${isActif ? 'archive' : 'unarchive'}</span>
                        </button>
                        <button onclick="deletePatient('${p.id}')" class="btn-icon btn-delete" style="padding:5px"><span class="material-icons">delete</span></button>
                    </div>
                </td>
            </tr>`;
    });

    document.getElementById('count-total').innerText = patients.length;
    document.getElementById('count-archived').innerText = patients.filter(p => p.statut === 'Archivé').length;
}

// --- ACTIONS ---
function deletePatient(id) {
    if(confirm("Supprimer ce dossier ?")) { patients = patients.filter(p => p.id !== id); save(); render(); }
}

function toggleArchive(id) {
    const p = patients.find(p => p.id === id);
    if(p) { p.statut = (p.statut === 'Actif' ? 'Archivé' : 'Actif'); save(); render(); }
}

function editPatient(id) {
    const p = patients.find(p => p.id === id);
    if(p) {
        document.getElementById('modal-title').innerText = "Modifier le Dossier";
        document.getElementById('edit-id').value = p.id;
        document.getElementById('p-nom').value = p.nom;
        document.getElementById('p-prenom').value = p.prenom;
        document.getElementById('p-age').value = p.age;
        document.getElementById('p-diag').value = p.diagnostic;
        document.getElementById('p-ocr-result').value = p.ocr_data || "";
        document.getElementById('modal-patient').style.display = 'flex';
    }
}

// --- GESTION FORMULAIRE ---
const form = document.getElementById('patient-form');
form.onsubmit = (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;

    const data = {
        nom: document.getElementById('p-nom').value.toUpperCase(),
        prenom: document.getElementById('p-prenom').value,
        age: document.getElementById('p-age').value,
        diagnostic: document.getElementById('p-diag').value,
        ocr_data: document.getElementById('p-ocr-result').value,
        visite: new Date().toISOString().split('T')[0],
        statut: "Actif"
    };

    if(editId) {
        const index = patients.findIndex(p => p.id === editId);
        patients[index] = { ...patients[index], ...data };
    } else {
        data.id = `PAT-${Math.floor(Math.random()*9000+1000)}`;
        patients.push(data);
    }

    save(); render(); closeMod();
};

// --- CAMERA & OCR ---
const vBox = document.getElementById('video-box');
const video = document.getElementById('video');

document.getElementById('start-camera').onclick = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    vBox.style.display = 'block';
    document.getElementById('capture-ocr').style.display = 'inline-block';
};

document.getElementById('capture-ocr').onclick = async () => {
    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    document.getElementById('p-ocr-result').value = "Analyse en cours...";
    const result = await Tesseract.recognize(canvas, 'fra');
    document.getElementById('p-ocr-result').value = result.data.text;
};

// --- UI ---
const closeMod = () => {
    document.getElementById('modal-patient').style.display = 'none';
    form.reset(); document.getElementById('edit-id').value = "";
    if(stream) stream.getTracks().forEach(t => t.stop());
    vBox.style.display = 'none';
};

document.getElementById('open-modal-btn').onclick = () => {
    document.getElementById('modal-title').innerText = "Nouveau Dossier";
    document.getElementById('modal-patient').style.display = 'flex';
};
document.getElementById('close-modal').onclick = closeMod;
document.getElementById('search-input').oninput = (e) => render(e.target.value);

// NAV
const navs = { 'link-dashboard': 'TOUT', 'link-patients': 'ACTIF', 'link-archives': 'ARCHIVE' };
Object.keys(navs).forEach(id => {
    document.getElementById(id).onclick = function() {
        document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
        this.classList.add('active'); currentFilter = navs[id]; render();
    };
});

render();