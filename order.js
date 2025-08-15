// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyCHq_JNCPMJJOQbC5wyvsEguII3y8TjYJA",
  authDomain: "pixora-e368a.firebaseapp.com",
  projectId: "pixora-e368a",
  storageBucket: "pixora-e368a.firebasestorage.app",
  messagingSenderId: "1020139140385",
  appId: "1:1020139140385:web:402852a38f3dc7e23eba60",
  measurementId: "G-PDQQ3YJENR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// ===== DOM Elements =====
const ordersGrid = document.getElementById('orders-grid');

// ===== Helper =====
function money(n){ return Number(n).toLocaleString('th-TH', {maximumFractionDigits:0}); }

// ===== Render Orders =====
function renderOrders(orders){
  ordersGrid.innerHTML = '';

  if(!orders.length){
    ordersGrid.innerHTML = `<p style="text-align:center; color:#94a3b8">ยังไม่มีคำสั่งซื้อ</p>`;
    return;
  }

  orders.forEach(order=>{
    order.items.forEach(item=>{
      const card = document.createElement('div');
      card.className = 'card glass';
      card.innerHTML = `
        <img class="thumb" src="${item.src}" alt="${item.title}" />
        <div class="meta">
          <h3>${item.title}</h3>
          <p>ราคา: ฿${money(item.price)}</p>
          <p>จำนวน: ${item.qty}</p>
          <p>สถานะ: ${order.status}</p>
          <div class="buttons">
            ${order.status==="approved" ? `<a href="${item.url}" target="_blank" class="btn buy-now">ดาวน์โหลด</a>` : ''}
          </div>
        </div>
      `;
      ordersGrid.appendChild(card);
    });
  });
}

// ===== Load Orders from Firestore =====
async function loadOrders(uid){
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc=>({ id: doc.id, ...doc.data() }));

    renderOrders(orders);
  } catch(err){
    console.error("Firestore Error:", err);
    ordersGrid.innerHTML = `<p style="text-align:center; color:#ef4444">เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ</p>`;
  }
}

// ===== Firebase Auth: ตรวจสอบผู้ใช้ปัจจุบัน =====
onAuthStateChanged(auth, user=>{
  const uid = user ? user.uid : "guest";
  loadOrders(uid);
});
