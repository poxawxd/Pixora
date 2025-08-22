import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCHq_JNCPMJJOQbC5wyvsEguII3y8TjYJA",
  authDomain: "pixora-e368a.firebaseapp.com",
  projectId: "pixora-e368a",
  storageBucket: "pixora-e368a.appspot.com",
  messagingSenderId: "1020139140385",
  appId: "1:1020139140385:web:402852a38f3dc7e23eba60",
  measurementId: "G-PDQQ3YJENR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const ordersContainer = document.querySelector("#orders-container tbody");

// ฟังก์ชันแปลงตัวเลขเป็นรูปแบบเงินไทย
function money(n) { 
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 }); 
}

// แสดงคำสั่งซื้อใน table
function renderOrders(orders) {
  ordersContainer.innerHTML = '';

  if (!orders.length) {
    ordersContainer.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--muted)">ยังไม่มีคำสั่งซื้อ</td></tr>`;
    return;
  }

  orders.forEach((order, index) => {
    // สร้าง HTML ของรายการสินค้า (ไม่มีปุ่มดาวน์โหลด)
    const itemsHTML = order.items && order.items.length > 0
      ? order.items.map(item => `<div><strong>${item.title}</strong> — ฿${money(item.price)} x${item.qty}</div>`).join('')
      : '<div style="color:var(--muted)">ไม่มีสินค้าภายในคำสั่งซื้อนี้</div>';

    // สร้างปุ่มดาวน์โหลดในคอลัมน์ดาวน์โหลดเท่านั้น
    const downloadHTML = order.status === "approved" && order.items && order.items.length > 0
      ? order.items.map(i => i.url ? `<a class="btn buy-now" href="${i.url}" download>ดาวน์โหลด</a>` : "-").join('<br>')
      : "-";

    // กำหนดสีและข้อความของสถานะ
    let statusClass = '', statusText = '';
    switch(order.status) {
      case "approved": statusClass='status-approved'; statusText='เสร็จสิ้น'; break;
      case "pending": statusClass='status-pending'; statusText='รอดำเนินการ'; break;
      case "rejected": statusClass='status-rejected'; statusText='ล้มเหลว'; break;
      default: statusClass=''; statusText=order.status;
    }

    // ใช้ totalPrice จาก Firestore หรือรวมจาก items หากไม่มี
    const totalPrice = order.totalPrice || order.items?.reduce((sum, i) => sum + i.price * i.qty, 0) || 0;

    // สร้างแถว table
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="ลำดับ">${index + 1}</td>
      <td data-label="ชื่อสินค้า">${itemsHTML}</td>
      <td data-label="วันที่สั่งซื้อ">${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('th-TH') : '-'}</td>
      <td data-label="ราคา">${money(totalPrice)} บาท</td>
      <td data-label="สถานะ" class="${statusClass}">${statusText}</td>
      <td data-label="ดาวน์โหลด">${downloadHTML}</td>
    `;
    ordersContainer.appendChild(tr);
  });
}

// โหลดคำสั่งซื้อของผู้ใช้
async function loadOrders(uid) {
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderOrders(orders);
  } catch (err) {
    console.error(err);
    ordersContainer.innerHTML = `<tr><td colspan="6" style="color:var(--danger); text-align:center">เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ</td></tr>`;
  }
}

// ตรวจสอบสถานะผู้ใช้งาน
onAuthStateChanged(auth, user => {
  if (user) loadOrders(user.uid);
  else ordersContainer.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--muted)">โปรดเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</td></tr>`;
});
