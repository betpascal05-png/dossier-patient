import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "TA_CLE",
  authDomain: "TON_PROJET.firebaseapp.com",
  projectId: "TON_PROJET",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allPatients = [];
let chart;

onAuthStateChanged(auth,user=>{
  if(user){
    document.getElementById("login-overlay").style.display="none";
    document.getElementById("app-container").style.display="flex";
    loadPatients();
  }
});

document.getElementById("login-btn").onclick=()=>{
  signInWithEmailAndPassword(auth,
    login-email.value,login-password.value);
};

document.getElementById("logout-btn").onclick=()=>signOut(auth);

function loadPatients(){
  onSnapshot(collection(db,"patients"),snap=>{
    allPatients=[];
    snap.forEach(d=>allPatients.push(d.data()));
    renderTable();
  });
}

function renderTable(){
  let actif=0, archive=0;
  const list=document.getElementById("patient-list");
  list.innerHTML="";
  allPatients.forEach(p=>{
    if(p.statut==="Actif")actif++; else archive++;
    list.innerHTML+=`
      <tr><td>${p.nom}</td><td>${p.diagnostic}</td>
      <td>${p.statut}</td><td>${p.auteur}</td></tr>`;
  });
  stat-actif.innerText=actif;
  stat-archive.innerText=archive;
  stat-total.innerText=actif+archive;
  drawChart(actif,archive);
}

function drawChart(a,b){
  const ctx=document.getElementById("chart-dossiers");
  if(chart)chart.destroy();
  chart=new Chart(ctx,{type:"doughnut",data:{
    labels:["Actif","Archivé"],datasets:[{data:[a,b]}]
  }});
}

theme-toggle.onclick=()=>document.body.classList.toggle("dark-mode");
export-btn.onclick=()=>{
  const ws=XLSX.utils.json_to_sheet(allPatients);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Patients");
  XLSX.writeFile(wb,"med-archive.xlsx");
};