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
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card glass';
    orderCard.innerHTML = `<h3>Order: ${order.id}</h3>
                           <p>สถานะ: ${order.status}</p>
                           <p>หมายเหตุ: ${order.note || '-'}</p>`;

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';

    order.items.forEach(item=>{
      const card = document.createElement('div');
      card.className = 'card glass';

      if(item.isPackage){
        // แสดงแพ็กเกจ ไม่โชว์รูป
        card.innerHTML = `
          <div class="meta">
            <div class="title">แพ็กเกจ: ${item.title}</div>
            <div class="price">ราคา: ฿${money(item.price)}</div>
            <div class="qty">จำนวน: ${item.qty}</div>
          </div>
        `;
      } else {
        // สินค้าปกติ
        card.innerHTML = `
          <img class="thumb" src="${item.src}" alt="${item.title}" />
          <div class="meta">
            <h4>${item.title}</h4>
            <p>ราคา: ฿${money(item.price)}</p>
            <p>จำนวน: ${item.qty}</p>
            ${order.status === "approved" ? `<a href="${item.url}" target="_blank" class="btn buy-now">ดาวน์โหลด</a>` : ''}
          </div>
        `;
      }

      itemsContainer.appendChild(card);
    });

    orderCard.appendChild(itemsContainer);
    ordersGrid.appendChild(orderCard);
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
  if(user){
    loadOrders(user.uid);
  } else {
    ordersGrid.innerHTML = `<p style="text-align:center; color:#94a3b8">โปรดเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</p>`;
  }
});
