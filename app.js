// app.js (ES Modules)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { PRODUCTS } from './product.js';

// ===== Firebase =====
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
const auth = getAuth(app);
const db = getFirestore(app);
auth.languageCode = 'th';

// ===== Helpers =====
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const toast = msg => {
  const el = document.createElement('div');
  el.className = 'glass';
  el.style.position = 'fixed';
  el.style.bottom = '16px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.padding = '.6rem 1rem';
  el.style.borderRadius = '12px';
  el.style.border = '1px solid rgba(255,255,255,.18)';
  el.style.zIndex = 9999;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
};

// ===== State =====
const state = { user: null, cart: [] };

// ===== Elements =====
const grid = $('#grid');
const search = $('#search');
const category = $('#category');
const sort = $('#sort');
const cartBtn = $('#btn-cart');
const userLevelEl = $('#user-level');
$('#year').textContent = new Date().getFullYear();

// Auth elements
const btnLogin = $('#btn-login');
const btnRegister = $('#btn-register');
const userMenu = $('#user-menu');
const userName = $('#user-name');
const userAvatar = $('#user-avatar');
const btnLogout = $('#btn-logout');

// Admin button
let adminBtn = $('#btn-admin');

// Login/Register Modals
const loginModal = $('#login-modal');
const formLogin = $('#form-login');
const loginEmail = $('#login-email');
const loginPassword = $('#login-password');
const loginMessage = $('#login-message');

const registerModal = $('#register-modal');
const formRegister = $('#form-register');
const registerEmail = $('#register-email');
const registerPassword = $('#register-password');
const registerMessage = $('#register-message');

// How-to Modal
const howModal = $('#how-modal');
const btnHow = $('#btn-how');

// Cart elements
const cartCount = $('#cart-count');
const cartItems = $('#cart-items');
const cartTotal = $('#cart-total');
const btnCheckout = $('#btn-checkout');

// Lightbox
const lightboxModal = $('#lightbox-modal');
const lightboxImg = $('#lightbox-img');

// ===== Modal Functions =====
function openModal(modal){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
function closeModal(modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

$$('.close').forEach(btn => btn.addEventListener('click', e => closeModal(btn.closest('.modal'))));
$$('.modal-backdrop').forEach(back => back.addEventListener('click', e => closeModal(back.closest('.modal'))));
document.addEventListener('keydown', e => {
  if(e.key==='Escape') $$('div.modal').forEach(m=>{if(!m.classList.contains('hidden')) closeModal(m)});
});

// How modal
btnHow.addEventListener('click', ()=>openModal(howModal));

// ===== Detail Modal =====
const detailModal = document.createElement('div');
detailModal.className = 'modal hidden';
detailModal.innerHTML = `
  <div class="modal-backdrop" style="position:fixed; inset:0; background:rgba(0,0,0,.5);"></div>
  <div class="modal-content glass" style="padding:1rem; max-width:400px; margin:10vh auto; border-radius:12px; position:relative;">
    <span class="close" style="position:absolute; top:8px; right:8px; cursor:pointer;">✕</span>
    <h2 id="detail-title"></h2>
    <img id="detail-img" style="width:100%; margin:8px 0;" />
    <p id="detail-text"></p>
  </div>
`;
document.body.appendChild(detailModal);
const detailTitle = $('#detail-title', detailModal);
const detailImg = $('#detail-img', detailModal);
const detailText = $('#detail-text', detailModal);

// ปุ่ม close และ backdrop
detailModal.querySelector('.close').addEventListener('click', () => closeModal(detailModal));
detailModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(detailModal));

function showDetailModal(product){
  detailTitle.textContent = product.title;
  detailImg.src = product.src;
  detailText.textContent = product.detail || 'ไม่มีรายละเอียดเพิ่มเติม';
  openModal(detailModal);
}

// ===== Render Products =====
function render(products){
  grid.innerHTML = '';
  const userLevel = state.user?.level || 'Basic';
  const filtered = products.filter(p => {
    if(p.requiredMembership === 'Basic') return true;
    if(p.requiredMembership === 'Standard') return ['Standard','SpecialList'].includes(userLevel);
    if(p.requiredMembership === 'SpecialList') return userLevel === 'SpecialList';
    return false;
  });

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card glass';
    card.innerHTML = `
      <span class="tag">${p.category}</span>
      <div class="thumb-wrapper" style="position:relative;">
        <img class="thumb" src="${p.src}" alt="${p.title}" loading="lazy" />
        <button class="btn detail-btn" style="
          position:absolute;
          top:8px;
          right:8px;
          padding:.3rem .5rem;
          font-size:.75rem;
          border:none;
          border-radius:6px;
          background:rgba(0,0,0,.6);
          color:white;
          cursor:pointer;
        ">ดูรายละเอียด</button>
      </div>
      <div class="meta">
        <div>
          <div class="title">${p.title}</div>
          <div class="muted">฿${money(p.price)}</div>
        </div>
        <div class="buttons">
          <button class="btn primary" data-buy="${p.id}">สั่งซื้อเลย</button>
          <button class="btn outline" data-add="${p.id}">เพิ่มลงตะกร้า</button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    card.querySelector('.detail-btn').addEventListener('click', () => {
      showDetailModal(p);
    });
  });
}

// ===== Filters/Search =====
function applyFilters(){
  let results = [...PRODUCTS];
  const q = (search.value || '').toLowerCase().trim();
  const cat = category.value;
  const sortBy = sort.value;

  if(q) results = results.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  if(cat!=='all') results = results.filter(p => p.category.toLowerCase()===cat.toLowerCase());

  if(sortBy==='price-asc') results.sort((a,b)=>a.price-b.price);
  if(sortBy==='price-desc') results.sort((a,b)=>b.price-a.price);

  render(results);
}
[search, category, sort].forEach(el=>el.addEventListener('input',applyFilters));

// ===== Cart Functions =====
function updateCartUI(){
  cartCount.textContent = state.cart.reduce((sum,i)=>sum+i.qty,0);
  cartItems.innerHTML = '';
  let total = 0;
  state.cart.forEach(item=>{
    total += item.price * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    const imgHTML = item.isPackage ? '' : `<img src="${item.src}" alt="${item.title}" />`;
    row.innerHTML = `
      ${imgHTML}
      <div class="cart-title">${item.title}${item.isPackage?' (แพ็กเกจ)':''}</div>
      <div class="cart-price">฿${money(item.price * item.qty)}</div>
      <button class="cart-remove" data-remove="${item.id}">ลบ</button>
    `;
    cartItems.appendChild(row);
  });
  cartTotal.textContent = money(total);
}

function addToCart(id){
  const product = PRODUCTS.find(p=>p.id===id);
  if(!product) return;
  const existing = state.cart.find(i=>i.id===id);
  if(existing) existing.qty+=1; else state.cart.push({...product, qty:1, isPackage:false});
  updateCartUI();
  toast('เพิ่มลงตะกร้าแล้ว');
}

// ===== Buy/Add Buttons =====
document.addEventListener('click', e=>{
  const addId = e.target.getAttribute('data-add');
  const removeId = e.target.getAttribute('data-remove');
  const buyId = e.target.getAttribute('data-buy');
  const packageBtn = e.target.getAttribute('data-package');

  if(addId){
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนเพิ่มสินค้า'; return; }
    addToCart(addId);
  }

  if(removeId){
    state.cart = state.cart.filter(i=>i.id!==removeId);
    updateCartUI();
  }

  if(buyId){
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนสั่งซื้อ'; return; }
    const product = PRODUCTS.find(p => p.id === buyId);
    if(!product) return;
    const orderData = { items: [{...product, qty:1, isPackage:false}], totalPrice: product.price };
    sessionStorage.setItem('buyNow', JSON.stringify(orderData));
    window.location.href = 'payment.html';
  }

  if(packageBtn){
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนซื้อแพ็กเกจ'; return; }
    let price = 0;
    if(packageBtn==='Standard') price=100;
    if(packageBtn==='SpecialList') price=500;
    if(packageBtn==='Enterprise'){ window.open("https://t.me/ShiroiKJP", "_blank"); return; }

    const orderData = {
      items:[{ id:packageBtn, title:packageBtn, qty:1, price, isPackage:true }],
      totalPrice: price
    };
    sessionStorage.setItem('buyNow', JSON.stringify(orderData));
    window.location.href='payment.html';
  }
});

// Cart modal
cartBtn.addEventListener('click', ()=>openModal($('#cart-modal')));
btnCheckout.addEventListener('click', ()=>{
  if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนชำระเงิน'; return; }
  if(state.cart.length===0){ toast('ตะกร้าว่าง'); return; }
  const orderData = {
    items: state.cart.map(i => ({...i})),
    totalPrice: state.cart.reduce((sum,i)=>sum+i.price*i.qty,0)
  };
  sessionStorage.setItem('buyNow', JSON.stringify(orderData));
  window.location.href='payment.html';
});

// ===== Header Auth Buttons =====
btnLogin.addEventListener('click', ()=>openModal(loginModal));
btnRegister.addEventListener('click', ()=>openModal(registerModal));

// ===== Login/Register =====
formLogin.addEventListener('submit', async e=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    loginMessage.textContent = '';
    toast('เข้าสู่ระบบสำเร็จ');
    closeModal(loginModal);
  }catch(err){
    console.log(err);
    loginMessage.textContent = 'รหัสผ่านผิดหรืออีเมลไม่ถูกต้อง โปรดลองใหม่';
    toast('รหัสผ่านผิดหรืออีเมลไม่ถูกต้อง โปรดลองใหม่');
  }
});

formRegister.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if(!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)){
    registerMessage.textContent = 'โปรดใช้ Gmail ในการสมัครเท่านั้น';
    return;
  }

  try{
    await createUserWithEmailAndPassword(auth, email, password);
    registerMessage.textContent = '';
    toast('สมัครสมาชิกสำเร็จ');
    closeModal(registerModal);
    openModal(loginModal);
  }catch(err){
    registerMessage.textContent = err.message;
  }
});

// ===== Logout =====
btnLogout.addEventListener('click', async ()=>{
  try{
    await signOut(auth);
    state.user=null;
    userMenu.classList.add('hidden');
    if(adminBtn) adminBtn.classList.add('hidden');
    btnLogin.classList.remove('hidden');
    btnRegister.classList.remove('hidden');
    userLevelEl.textContent = 'Basic';
    applyFilters();
    toast('ออกจากระบบเรียบร้อยแล้ว');
  }catch(err){ console.error(err); toast('เกิดข้อผิดพลาดในการออกจากระบบ'); }
});

// ===== Auth State Observer =====
onAuthStateChanged(auth, async user=>{
  state.user = user || null;

  if(user){
    btnLogin.classList.add('hidden');
    btnRegister.classList.add('hidden');
    userMenu.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
    userAvatar.src = user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user.email)}`;

    try{
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      state.user.level = docSnap.exists() ? docSnap.data().level || 'Basic' : 'Basic';
    }catch(err){ console.error(err); state.user.level='Basic'; }

    userLevelEl.textContent = state.user.level;

    if(user.uid === 'o5wUtjhCLQho3H1zQE3FgZgu3Q93'){
      adminBtn.classList.remove('hidden');
      if(!adminBtn.dataset.listener){
        adminBtn.addEventListener('click', () => window.location.href='admin.html');
        adminBtn.dataset.listener="true";
      }
    } else adminBtn.classList.add('hidden');
  } else {
    btnLogin.classList.remove('hidden');
    btnRegister.classList.remove('hidden');
    userMenu.classList.add('hidden');
    adminBtn.classList.add('hidden');
    userLevelEl.textContent = 'Basic';
  }

  applyFilters();
});

// ===== Lightbox =====
document.addEventListener('click', e => {
  if(e.target.classList.contains('thumb')){
    const src = e.target.src;
    lightboxImg.src = src;
    openModal(lightboxModal);
  }
});

// ===== Initialize =====
applyFilters();

// ===== Jigsaw Puzzle (Desktop + Mobile Touch) =====
document.addEventListener('DOMContentLoaded', () => {

  // ===== Elements =====
  const menuPuzzleBtn = document.getElementById('btn-puzzle');
  const puzzleContainer = document.getElementById("puzzle-container");
  const puzzle = document.getElementById("puzzle");
  const message = document.getElementById("message");
  const puzzleOverlay = document.getElementById("puzzle-overlay");
  const puzzleCloseBtn = document.getElementById("puzzle-close");
  const menuOptions = document.getElementById("menu-options");

  const PUZZLE_IMG = "https://i.postimg.cc/8CsyBgL9/427265a82192.gif";
  const ROWS = 3;
  const COLS = 3;
  const PIECE_SIZE = 100;

  let dragged = null;
  let touchDragged = null;

  // ===== Open / Close Puzzle =====
  function openPuzzle() {
    puzzleOverlay.classList.remove("hidden");
    puzzleContainer.classList.remove("hidden");
    menuOptions.classList.add("hidden");
    initPuzzle();
  }

  function closePuzzle() {
    puzzleOverlay.classList.add("hidden");
    puzzleContainer.classList.add("hidden");
    puzzle.innerHTML = "";
    message.textContent = "";
  }

  // Events
  menuPuzzleBtn.addEventListener("click", openPuzzle);
  puzzleCloseBtn.addEventListener("click", closePuzzle);

  // คลิกรอบนอก overlay ปิด puzzle
  puzzleOverlay.addEventListener("click", e => {
     if(e.target === puzzleOverlay) closePuzzle();
  });

  // ===== Menu Toggle =====
  const menuToggle = document.getElementById('menu-toggle');
  menuToggle.addEventListener("click", () => menuOptions.classList.toggle("hidden"));

  // ===== Init Puzzle =====
  function initPuzzle() {
    puzzle.innerHTML = "";
    const pieces = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const div = document.createElement("div");
        div.classList.add("piece");
        div.style.width = `${PIECE_SIZE}px`;
        div.style.height = `${PIECE_SIZE}px`;
        div.style.backgroundImage = `url(${PUZZLE_IMG})`;
        div.style.backgroundSize = `${COLS*PIECE_SIZE}px ${ROWS*PIECE_SIZE}px`;
        div.style.backgroundPosition = `-${c*PIECE_SIZE}px -${r*PIECE_SIZE}px`;
        div.dataset.correct = r * COLS + c;
        div.dataset.index = r * COLS + c;
        div.style.touchAction = "none";
        pieces.push(div);
      }
    }

    // สุ่มตำแหน่ง
    pieces.sort(() => Math.random() - 0.5);
    pieces.forEach((p, i) => { 
      p.dataset.index = i; 
      puzzle.appendChild(p); 
    });

    // Desktop drag
    pieces.forEach(p => {
      p.draggable = true;
      p.addEventListener("dragstart", e => dragged = p);
      p.addEventListener("dragover", e => e.preventDefault());
      p.addEventListener("drop", e => {
        if(dragged && dragged !== p){
          swapPieces(dragged, p);
          checkPuzzleWin();
        }
      });
    });

    // Mobile touch
    pieces.forEach(p => {
      p.addEventListener("touchstart", e => { touchDragged = e.target; });
      p.addEventListener("touchmove", e => e.preventDefault());
      p.addEventListener("touchend", e => {
        if(!touchDragged) return;
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if(target && target.classList.contains("piece") && target !== touchDragged){
          swapPieces(touchDragged, target);
          checkPuzzleWin();
        }
        touchDragged = null;
      });
    });
  }

  // ===== Swap & Check =====
  function swapPieces(a, b) {
    const tempBg = a.style.backgroundPosition;
    a.style.backgroundPosition = b.style.backgroundPosition;
    b.style.backgroundPosition = tempBg;

    const tempIdx = a.dataset.index;
    a.dataset.index = b.dataset.index;
    b.dataset.index = tempIdx;
  }

  function checkPuzzleWin() {
    const pieces = puzzle.querySelectorAll(".piece");
    const won = [...pieces].every(p => p.dataset.index === p.dataset.correct);
    message.textContent = won ? "🎉 ถูกต้อง! คุณชนะแล้ว!" : "";
  }

});
