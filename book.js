// book.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { PRODUCTS } from './product.js'; // ดึง PRODUCTS

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// containers
const bookContainer = document.getElementById("book-container");
const btnPrev = document.getElementById("book-prev");
const btnNext = document.getElementById("book-next");

// แปลงตัวเลขเป็นเงินบาท
function money(n) {
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

// เก็บหน้าหนังสือ
let pages = [];
let currentPage = 0;

// สร้าง Book Pages จาก orders
function renderBook(orders) {
  pages = []; // รีเซ็ต

  orders.forEach(order => {
    if (order.status !== "approved") return; // เฉพาะคำสั่งซื้อ approved

    order.items?.forEach(item => {
      // หา product จาก product.js
      const product = PRODUCTS.find(p => p.id === item.id);
      const imageSrc = product?.src || item.url || '';

      const pageHTML = `
        <div class="book-item">
          <img src="${imageSrc}" alt="${item.title}" />
          <div class="book-info">
            <strong>${item.title}</strong><br>
            ราคา: ฿${money(item.price)} x${item.qty}<br>
            วันที่ซื้อ: ${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('th-TH') : '-'}
          </div>
        </div>
      `;

      // แต่ละสินค้า = 1 หน้า
      pages.push(`<div class="book-page-content">${pageHTML}</div>`);
    });
  });

  currentPage = 0;
  updateBookView();
}

// แสดงหน้าหนังสือ
function updateBookView() {
  bookContainer.innerHTML = '';
  if (!pages.length) {
    bookContainer.innerHTML = `<div class="empty-book">คุณยังไม่มี Book Gallery</div>`;
    return;
  }

  const leftPage = pages[currentPage] || '';
  const rightPage = pages[currentPage + 1] || '';

  bookContainer.innerHTML = `
    <div class="book-page left">${leftPage}</div>
    <div class="book-page right">${rightPage}</div>
  `;
}

// ปุ่ม Next / Prev
btnNext.addEventListener("click", () => {
  if (currentPage + 2 < pages.length) {
    currentPage += 2;
    updateBookView();
  }
});
btnPrev.addEventListener("click", () => {
  if (currentPage - 2 >= 0) {
    currentPage -= 2;
    updateBookView();
  }
});

// โหลดคำสั่งซื้อผู้ใช้
async function loadOrders(uid) {
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderBook(orders);
  } catch (err) {
    console.error(err);
    bookContainer.innerHTML = `<div class="empty-book" style="color:red">เกิดข้อผิดพลาดในการโหลด Book Gallery</div>`;
  }
}

// ตรวจสอบผู้ใช้
onAuthStateChanged(auth, user => {
  if (user) loadOrders(user.uid);
  else bookContainer.innerHTML = `<div class="empty-book">โปรดเข้าสู่ระบบเพื่อดู Book Gallery</div>`;
});
