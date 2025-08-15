import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
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
const auth = getAuth(app);

// ===== DOM =====
const cartGrid = document.getElementById('cart-grid');
const totalEl = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout-form');
const emailInput = document.getElementById('checkout-email');
const orderInput = document.getElementById('checkout-order');
const noteInput = document.getElementById('checkout-note');
const toastEl = document.getElementById('toast');
const btnCancel = document.getElementById('btn-cancel');

// ===== Session / Cart =====
const order = JSON.parse(sessionStorage.getItem('buyNow') || '{}');

// ===== Helper =====
function money(n){ return Number(n).toLocaleString('th-TH', {maximumFractionDigits:0}); }
function showToast(msg, type="info"){
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden', 'success', 'error');
  if(type==="success") toastEl.classList.add('success');
  if(type==="error") toastEl.classList.add('error');
  setTimeout(()=>toastEl.classList.add('hidden'), 2200);
}

// ===== Render Cart =====
function renderCart(){
  if(order.items && order.items.length){
    let total = 0;
    cartGrid.innerHTML = '';
    order.items.forEach(item=>{
      total += item.price*item.qty;
      const card = document.createElement('div');
      card.className = 'card glass';
      card.innerHTML = `
        <img class="thumb" src="${item.src}" alt="${item.title}" />
        <div class="meta">
          <div>
            <div class="title">${item.title}</div>
            <div class="price">฿${money(item.price)}</div>
            <div class="qty">จำนวน: ${item.qty}</div>
          </div>
        </div>
      `;
      cartGrid.appendChild(card);
    });
    totalEl.textContent = money(total);
  } else {
    cartGrid.innerHTML = `<p style="text-align:center; color:#94a3b8">ไม่มีสินค้าในคำสั่งซื้อ</p>`;
  }
}
renderCart();

// ===== Copy ปุ่มเลขบัญชี =====
document.querySelectorAll('.copy-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(()=> showToast('คัดลอกเรียบร้อย!', 'success'));
  });
});

// ===== Cancel =====
btnCancel.addEventListener('click', ()=>{
  sessionStorage.removeItem('buyNow');
  window.location.href='index.html';
});

// ===== Submit แจ้งโอน =====
checkoutForm.addEventListener('submit', async e=>{
  e.preventDefault();

  if(!order.items || !order.items.length){
    showToast("ไม่มีสินค้าในคำสั่งซื้อ", 'error');
    return;
  }

  if(!emailInput.value.trim() || !orderInput.value.trim()){
    showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  // ตรวจสอบ Auth
  const user = auth.currentUser;
  if(!user){
    showToast("กรุณาเข้าสู่ระบบก่อนแจ้งโอน", "error");
    return;
  }

  const totalPrice = order.totalPrice || order.items.reduce((sum,i)=>sum+i.price*i.qty,0);

  const paymentData = {
    userId: user.uid,
    email: emailInput.value.trim(),
    orderId: orderInput.value.trim(),
    note: noteInput.value.trim(),
    items: order.items,
    totalPrice,
    status: 'pending',
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "orders"), paymentData);

    showToast('แจ้งโอนสำเร็จ! ✅', 'success');
    sessionStorage.removeItem('buyNow');
    checkoutForm.reset();

    setTimeout(()=>window.location.href='index.html',1200);

  } catch(err){
    console.error("Firestore Error:", err);
    showToast('เกิดข้อผิดพลาด ❌ ตรวจสอบคอนโซล', 'error');
  }
});
