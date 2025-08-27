import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

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
const auth = getAuth(app);

const ADMIN_UID = "o5wUtjhCLQho3H1zQE3FgZgu3Q93";
const ordersContainer = document.querySelector("#orders-container");
const btnLogout = document.getElementById("btn-logout");

function money(n){ return Number(n).toLocaleString('th-TH', {maximumFractionDigits:0}); }

async function loadOrders(){
  try{
    const q = query(collection(db,"orders"), orderBy("createdAt","desc"));
    const snapshot = await getDocs(q);
    ordersContainer.innerHTML = "";

    if(snapshot.empty){
      ordersContainer.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--muted)">ยังไม่มีคำสั่งซื้อ</td></tr>`;
      return;
    }

    snapshot.docs.forEach((docSnap, index)=>{
      const order = docSnap.data();
      const orderId = docSnap.id;

      const itemsHTML = order.items?.length
        ? order.items.map(i=>`<div><strong>${i.title}</strong> — ฿${money(i.price)} x${i.qty}</div>`).join('')
        : '<div style="color:var(--muted)">ไม่มีสินค้า</div>';

      let statusClass="", statusText="";
      switch(order.status){
        case "approved": statusClass="status-approved"; statusText="เสร็จสิ้น"; break;
        case "pending": statusClass="status-pending"; statusText="รอดำเนินการ"; break;
        case "rejected": statusClass="status-rejected"; statusText="ปฏิเสธ"; break;
        default: statusClass=""; statusText=order.status;
      }

      const totalPrice = order.totalPrice || order.items?.reduce((sum,i)=>sum+i.price*i.qty,0) || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        </td>
        <td data-label="ลำดับ">${index+1}</td>
        <td data-label="ผู้ใช้">${order.email || '-'}</td>
        <td data-label="ชื่อสินค้า">${itemsHTML}</td>
        <td data-label="วันที่สั่งซื้อ">${order.createdAt?new Date(order.createdAt.seconds*1000).toLocaleDateString('th-TH'):'-'}</td>
        <td data-label="ราคา">${money(totalPrice)} บาท</td>
        <td data-label="สถานะ" class="${statusClass}">${statusText}</td>
        <td data-label="การจัดการ">
          ${order.status==="pending" 
            ? `<button class="btn approve">อนุมัติ</button> <button class="btn reject">ปฏิเสธ</button>` 
            : "-"}
        </td>
      `;
      ordersContainer.appendChild(tr);

      // ===== Approve =====
      const btnApprove = tr.querySelector(".approve");
      if(btnApprove){
        btnApprove.addEventListener("click", async ()=>{
          btnApprove.disabled = true;
          const btnReject = tr.querySelector(".reject");
          if(btnReject) btnReject.disabled = true;
          try{
            await updateDoc(doc(db,"orders",orderId), {status:"approved", approvedAt: serverTimestamp()});
            loadOrders();
          }catch(err){
            console.error(err);
            btnApprove.disabled=false; if(btnReject) btnReject.disabled=false;
          }
        });
      }

      // ===== Reject =====
      const btnReject = tr.querySelector(".reject");
      if(btnReject){
        btnReject.addEventListener("click", async ()=>{
          btnReject.disabled = true;
          const btnApprove = tr.querySelector(".approve");
          if(btnApprove) btnApprove.disabled = true;
          try{
            await updateDoc(doc(db,"orders",orderId), {status:"rejected", rejectedAt: serverTimestamp()});
            loadOrders();
          }catch(err){
            console.error(err);
            if(btnApprove) btnApprove.disabled=false; btnReject.disabled=false;
          }
        });
      }

      // ===== Delete from page only =====
      const btnDelete = tr.querySelector(".delete");
      if(btnDelete){
        btnDelete.addEventListener("click", ()=>{
          if(confirm(`คุณต้องการลบคำสั่งซื้อ ${orderId} ออกจากหน้านี้หรือไม่?`)){
            tr.remove();
          }
        });
      }

    });
  }catch(err){
    console.error(err);
    ordersContainer.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger)">เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ</td></tr>`;
  }
}

// ===== Auth Check =====
onAuthStateChanged(auth, user=>{
  if(user){
    if(user.uid!==ADMIN_UID){
      alert("คุณไม่ใช่ Admin!");
      window.location.href="index.html";
      return;
    }
    loadOrders();
  }else{
    alert("โปรดเข้าสู่ระบบก่อน");
    window.location.href="index.html";
  }
});

// ===== Logout =====
btnLogout.addEventListener("click", async ()=>{
  await signOut(auth);
  window.location.href="index.html";
});
