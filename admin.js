import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

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
const auth = getAuth(app);

// ===== Admin UID =====
const ADMIN_UID = "o5wUtjhCLQho3H1zQE3FgZgu3Q93";

// ===== DOM Elements =====
const ordersGrid = document.getElementById('admin-orders-grid');
const toastEl = document.getElementById('toast');
const btnLogout = document.getElementById('btn-logout');

// ===== Helper =====
function showToast(msg, type="info"){
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden', 'success', 'error');
  if(type==="success") toastEl.classList.add('success');
  if(type==="error") toastEl.classList.add('error');
  setTimeout(()=>toastEl.classList.add('hidden'), 2200);
}

function money(n){ return Number(n).toLocaleString('th-TH', {maximumFractionDigits:0}); }

// ===== Load Pending Orders =====
async function loadOrders(){
  try {
    const q = query(collection(db, "orders"), where("status","==","pending"));
    const snapshot = await getDocs(q);
    ordersGrid.innerHTML = '';

    if(snapshot.empty){
      ordersGrid.innerHTML = `<p style="text-align:center; color:#94a3b8">ไม่มีคำสั่งซื้อรออนุมัติ</p>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const order = docSnap.data();
      const orderId = docSnap.id;

      const card = document.createElement('div');
      card.className = 'card glass';

      // แยก package กับสินค้าปกติ
      let itemsHtml = '';
      if(order.items && order.items.length){
        order.items.forEach(item=>{
          if(item.isPackage){
            itemsHtml += `
              <div class="package-item">
                <div class="title">แพ็กเกจ: ${item.title}</div>
                <div class="price">฿${money(item.price)}</div>
                <div class="qty">จำนวน: ${item.qty}</div>
              </div>
            `;
          } else {
            itemsHtml += `
              <div class="product-item">
                <img class="thumb" src="${item.src}" alt="${item.title}" />
                <div class="meta">
                  <div class="title">${item.title}</div>
                  <div class="price">฿${money(item.price)}</div>
                  <div class="qty">จำนวน: ${item.qty}</div>
                </div>
              </div>
            `;
          }
        });
      }

      card.innerHTML = `
        <div class="meta">
          <div>
            <h3>Order: ${orderId}</h3>
            <p>ผู้สั่งซื้อ: ${order.email}</p>
            <p>รวม: ฿${money(order.totalPrice)}</p>
            <p>หมายเหตุ: ${order.note || "-"}</p>
            ${itemsHtml}
            <div class="buttons">
              <button class="btn primary btn-approve">Approve</button>
              <button class="btn danger btn-reject">Reject</button>
            </div>
            <p class="order-status" style="margin-top:0.5rem; font-weight:600;"></p>
          </div>
        </div>
      `;
      ordersGrid.appendChild(card);

      const btnApprove = card.querySelector('.btn-approve');
      const btnReject = card.querySelector('.btn-reject');
      const statusEl = card.querySelector('.order-status');

      // ===== Approve =====
      btnApprove.addEventListener('click', async ()=>{
        btnApprove.disabled = true;
        btnReject.disabled = true;
        try {
          // อัปเดต order
          await updateDoc(doc(db, "orders", orderId), {
            status: "approved",
            approvedAt: serverTimestamp()
          });

          // อัปเดต level ของผู้ใช้ถ้ามี package
          if(order.userId && order.items){
            const packageItem = order.items.find(i=>i.isPackage);
            if(packageItem){
              const userRef = doc(db, 'users', order.userId);
              await setDoc(userRef, { level: packageItem.title }, { merge: true });
            }
          }

          showToast(`Order ${orderId} อนุมัติแล้ว`, 'success');
          statusEl.textContent = "Status: Approved ✅";

          // แสดงลิงก์ดาวน์โหลดสินค้าปกติ
          const productItems = order.items.filter(i=>!i.isPackage);
          if(productItems.length){
            const links = productItems.map(i=>i.url).join("\n");
            alert(`ลิงก์ดาวน์โหลดสำหรับลูกค้า:\n${links}`);
          }
        } catch(err){
          console.error("Approve Error:", err);
          showToast("เกิดข้อผิดพลาดในการอนุมัติ", 'error');
          btnApprove.disabled = false;
          btnReject.disabled = false;
        }
      });

      // ===== Reject =====
      btnReject.addEventListener('click', async ()=>{
        btnApprove.disabled = true;
        btnReject.disabled = true;
        try {
          await updateDoc(doc(db, "orders", orderId), {
            status: "rejected",
            rejectedAt: serverTimestamp()
          });
          showToast(`Order ${orderId} ถูกปฏิเสธ`, 'error');
          statusEl.textContent = "Status: Rejected ❌";
        } catch(err){
          console.error("Reject Error:", err);
          showToast("เกิดข้อผิดพลาดในการปฏิเสธ", 'error');
          btnApprove.disabled = false;
          btnReject.disabled = false;
        }
      });
    });

  } catch(err){
    console.error("Load Orders Error:", err);
    ordersGrid.innerHTML = `<p style="text-align:center; color:#ef4444">เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ</p>`;
  }
}

// ===== Auth Check =====
onAuthStateChanged(auth, user=>{
  if(user){
    if(user.uid !== ADMIN_UID){
      alert("คุณไม่ใช่ Admin!");
      window.location.href = "index.html";
      return;
    }
    loadOrders();
  } else {
    alert("โปรดเข้าสู่ระบบก่อน");
    window.location.href = "index.html";
  }
});

// ===== Logout =====
btnLogout.addEventListener('click', async ()=>{
  await signOut(auth);
  window.location.href = "index.html";
});
