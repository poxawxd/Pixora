// app.js (ES Modules)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { PRODUCTS } from './product.js';

// ================= Firebase =================
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

// ================= Helpers =================
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const toast = msg => {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', bottom: '16px', left: '50%',
    transform: 'translateX(-50%)', padding: '.6rem 1rem',
    borderRadius: '12px', border: '1px solid rgba(255,255,255,.18)',
    zIndex: 9999
  });
  el.className = 'glass';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
};

// ================= State =================
const state = { user: null, cart: [] };
let filteredResults = [];

// ================= Elements =================
const grid = $('#grid'), search = $('#search'), category = $('#category'), sort = $('#sort');
const cartBtn = $('#btn-cart'), cartCount = $('#cart-count'), cartItems = $('#cart-items'), cartTotal = $('#cart-total'), btnCheckout = $('#btn-checkout');
const userLevelEl = $('#user-level'), paginationEl = $('#pagination');
const btnLogin = $('#btn-login'), btnRegister = $('#btn-register'), userMenu = $('#user-menu');
const userName = $('#user-name'), userAvatar = $('#user-avatar'), btnLogout = $('#btn-logout');
let adminBtn = $('#btn-admin');
const loginModal = $('#login-modal'), formLogin = $('#form-login'), loginEmail = $('#login-email'), loginPassword = $('#login-password'), loginMessage = $('#login-message');
const registerModal = $('#register-modal'), formRegister = $('#form-register'), registerEmail = $('#register-email'), registerPassword = $('#register-password'), registerMessage = $('#register-message');
const howModal = $('#how-modal'), btnHow = $('#btn-how');
const lightboxModal = $('#lightbox-modal'), lightboxImg = $('#lightbox-img');
$('#year').textContent = new Date().getFullYear();

// ================= Modal Functions =================
const openModal = modal => { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); };
const closeModal = modal => { modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); };
$$('.close').forEach(btn => btn.addEventListener('click', e => closeModal(btn.closest('.modal'))));
$$('.modal-backdrop').forEach(back => back.addEventListener('click', e => closeModal(back.closest('.modal'))));
document.addEventListener('keydown', e => { if(e.key==='Escape') $$('div.modal').forEach(m => !m.classList.contains('hidden') && closeModal(m)); });
btnHow.addEventListener('click', () => openModal(howModal));

// ================= Detail Modal =================
const detailModal = document.createElement('div');
detailModal.className = 'modal hidden';
detailModal.innerHTML = `
  <div class="modal-backdrop"></div>
  <div class="modal-content glass">
    <span class="close">✕</span>
    <h2 id="detail-title"></h2>
    <img id="detail-img"/>
    <p id="detail-text"></p>
  </div>`;
document.body.appendChild(detailModal);

const detailTitle = $('#detail-title', detailModal);
const detailImg = $('#detail-img', detailModal);
const detailText = $('#detail-text', detailModal);

detailModal.querySelector('.close').addEventListener('click', () => closeModal(detailModal));
detailModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(detailModal));

const showDetailModal = product => {
  detailTitle.textContent = product.title;
  detailImg.src = product.src;
  detailText.textContent = product.detail || 'ไม่มีรายละเอียดเพิ่มเติม';
  openModal(detailModal);
};

// ================= Render Products =================
const render = products => {
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
      <div class="thumb-wrapper">
        <img class="thumb" src="${p.src}" alt="${p.title}" loading="lazy"/>
        <button class="btn detail-btn">ดูรายละเอียด</button>
      </div>
      <div class="meta">
        <div><div class="title">${p.title}</div><div class="muted">฿${money(p.price)}</div></div>
        <div class="buttons">
          <button class="btn primary" data-buy="${p.id}">สั่งซื้อเลย</button>
          <button class="btn outline" data-add="${p.id}">เพิ่มลงตะกร้า</button>
        </div>
      </div>`;
    grid.appendChild(card);

    card.querySelector('.detail-btn').addEventListener('click', () => showDetailModal(p));
  });
};

// ================= Pagination =================
const renderPage = page => {
  const perPage = 8;
  const start = (page-1)*perPage;
  render(filteredResults.slice(start, start+perPage));

  paginationEl.innerHTML = '';
  const totalPages = Math.ceil(filteredResults.length / perPage);
  for(let i=1;i<=totalPages;i++){
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.disabled = i===page;
    btn.addEventListener('click', ()=>renderPage(i));
    paginationEl.appendChild(btn);
  }
};

// ================= Filters/Search =================
const applyFilters = () => {
  filteredResults = [...PRODUCTS];
  const q = (search.value || '').toLowerCase().trim();
  const cat = category.value;
  const sortBy = sort.value;

  if(q) filteredResults = filteredResults.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  if(cat !== 'all') filteredResults = filteredResults.filter(p => p.category.toLowerCase() === cat.toLowerCase());

  if(sortBy === 'price-asc') filteredResults.sort((a,b)=>a.price-b.price);
  if(sortBy === 'price-desc') filteredResults.sort((a,b)=>b.price-a.price);

  renderPage(1);
};
[search, category, sort].forEach(el => el.addEventListener('input', applyFilters));

// ================= Cart =================
const updateCartUI = () => {
  cartCount.textContent = state.cart.reduce((sum,i)=>sum+i.qty,0);
  cartItems.innerHTML = '';
  let total = 0;
  state.cart.forEach(item => {
    total += item.price * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `${!item.isPackage? `<img src="${item.src}" alt="${item.title}"/>` : '' }
      <div class="cart-title">${item.title}${item.isPackage?' (แพ็กเกจ)':''}</div>
      <div class="cart-price">฿${money(item.price*item.qty)}</div>
      <button class="cart-remove" data-remove="${item.id}">ลบ</button>`;
    cartItems.appendChild(row);
  });
  cartTotal.textContent = money(total);
};

const addToCart = id => {
  const product = PRODUCTS.find(p=>p.id===id);
  if(!product) return;
  const existing = state.cart.find(i=>i.id===id);
  existing ? existing.qty++ : state.cart.push({...product, qty:1, isPackage:false});
  updateCartUI();
  toast('เพิ่มลงตะกร้าแล้ว');
};

// ================= Buy/Add Buttons =================
document.addEventListener('click', e => {
  const addId = e.target.dataset.add;
  const removeId = e.target.dataset.remove;
  const buyId = e.target.dataset.buy;
  const packageBtn = e.target.dataset.package;

  if(addId){
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนเพิ่มสินค้า'; return; }
    addToCart(addId);
  }
  if(removeId){ state.cart = state.cart.filter(i=>i.id!==removeId); updateCartUI(); }
  if(buyId){ 
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนสั่งซื้อ'; return; }
    const product = PRODUCTS.find(p=>p.id===buyId);
    if(!product) return;
    sessionStorage.setItem('buyNow', JSON.stringify({items:[{...product, qty:1, isPackage:false}], totalPrice:product.price}));
    window.location.href='payment.html';
  }
  if(packageBtn){
    if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนซื้อแพ็กเกจ'; return; }
    let price = packageBtn==='Standard'?100:packageBtn==='SpecialList'?500:0;
    if(packageBtn==='Enterprise'){ window.open("https://t.me/ShiroiKJP", "_blank"); return; }
    sessionStorage.setItem('buyNow', JSON.stringify({items:[{id:packageBtn,title:packageBtn,qty:1,price,isPackage:true}], totalPrice:price}));
    window.location.href='payment.html';
  }
});

// Cart modal
cartBtn.addEventListener('click', ()=>openModal($('#cart-modal')));
btnCheckout.addEventListener('click', ()=>{
  if(!state.user){ openModal(loginModal); loginMessage.textContent='โปรดเข้าสู่ระบบก่อนชำระเงิน'; return; }
  if(state.cart.length===0){ toast('ตะกร้าว่าง'); return; }
  sessionStorage.setItem('buyNow', JSON.stringify({items:state.cart,totalPrice:state.cart.reduce((sum,i)=>sum+i.price*i.qty,0)}));
  window.location.href='payment.html';
});

// ================= Header Auth =================
btnLogin.addEventListener('click', ()=>openModal(loginModal));
btnRegister.addEventListener('click', ()=>openModal(registerModal));

// Login/Register
const clearAuthForms = () => {
  [loginEmail, loginPassword].forEach(i=>i.value=''); loginMessage.textContent='';
  [registerEmail, registerPassword].forEach(i=>i.value=''); registerMessage.textContent='';
};

formLogin.addEventListener('submit', async e=>{
  e.preventDefault();
  try{ await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value); toast('เข้าสู่ระบบสำเร็จ'); closeModal(loginModal); clearAuthForms(); }
  catch(err){ loginMessage.textContent='รหัสผ่านผิดหรืออีเมลไม่ถูกต้อง'; toast('รหัสผ่านผิดหรืออีเมลไม่ถูกต้อง'); }
});

formRegister.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = registerEmail.value.trim(); const password = registerPassword.value;
  if(!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)){ registerMessage.textContent='โปรดใช้ Gmail ในการสมัครเท่านั้น'; return; }
  try{ await createUserWithEmailAndPassword(auth,email,password); toast('สมัครสมาชิกสำเร็จ'); closeModal(registerModal); openModal(loginModal); clearAuthForms(); }
  catch(err){ registerMessage.textContent=err.message; }
});

// Logout
btnLogout.addEventListener('click', async ()=>{
  try{ await signOut(auth); state.user=null; clearAuthForms(); userMenu.classList.add('hidden'); btnLogin.classList.remove('hidden'); btnRegister.classList.remove('hidden'); userLevelEl.textContent='Basic'; if(adminBtn) adminBtn.classList.add('hidden'); applyFilters(); toast('ออกจากระบบเรียบร้อยแล้ว'); }
  catch(err){ console.error(err); toast('เกิดข้อผิดพลาดในการออกจากระบบ'); }
});

// ================= Auth State =================
onAuthStateChanged(auth, async user=>{
  state.user = user || null;
  if(user){
    btnLogin.classList.add('hidden'); btnRegister.classList.add('hidden'); userMenu.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
    userAvatar.src = user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user.email)}`;

    try{
      const docRef = doc(db,'users',user.uid);
      const docSnap = await getDoc(docRef);
      state.user.level = docSnap.exists()? docSnap.data().level || 'Basic' : 'Basic';
    } catch { state.user.level='Basic'; }

    userLevelEl.textContent = state.user.level;

    if(user.uid==='o5wUtjhCLQho3H1zQE3FgZgu3Q93' && adminBtn){ adminBtn.classList.remove('hidden'); if(!adminBtn.dataset.listener){ adminBtn.addEventListener('click',()=>window.location.href='admin.html'); adminBtn.dataset.listener='true'; } }
    else if(adminBtn) adminBtn.classList.add('hidden');
  } else { btnLogin.classList.remove('hidden'); btnRegister.classList.remove('hidden'); userMenu.classList.add('hidden'); if(adminBtn) adminBtn.classList.add('hidden'); userLevelEl.textContent='Basic'; }
  applyFilters();
});

// ================= Lightbox =================
document.addEventListener('click', e=>{
  if(e.target.classList.contains('thumb')){ lightboxImg.src=e.target.src; openModal(lightboxModal); }
});

// ================= Initialize =================
applyFilters();

// ================= Jigsaw Puzzle =================
document.addEventListener('DOMContentLoaded', () => {
  const menuPuzzleBtn = $('#btn-puzzle'),
        puzzleContainer = $('#puzzle-container'),
        puzzle = $('#puzzle'),
        message = $('#message'),
        puzzleOverlay = $('#puzzle-overlay'),
        puzzleCloseBtn = $('#puzzle-close'),
        menuOptions = $('#menu-options');

  const PUZZLE_IMG = "https://i.postimg.cc/8CsyBgL9/427265a82192.gif",
        ROWS = 3,
        COLS = 3,
        PIECE_SIZE = 100;

  let dragged = null, touchStartPiece = null;

  // คำนวณตำแหน่ง background จาก tile id
  const posFromId = (id) => {
    const r = Math.floor(id / COLS);
    const c = id % COLS;
    return `-${c * PIECE_SIZE}px -${r * PIECE_SIZE}px`;
  };

  const openPuzzle = () => {
    puzzleOverlay.classList.remove('hidden');
    puzzleContainer.classList.remove('hidden');
    menuOptions.classList.add('hidden');
    initPuzzle();
  };

  const closePuzzle = () => {
    puzzleOverlay.classList.add('hidden');
    puzzleContainer.classList.add('hidden');
    puzzle.innerHTML = "";
    message.textContent = "";
  };

  menuPuzzleBtn.addEventListener('click', openPuzzle);
  puzzleCloseBtn.addEventListener('click', closePuzzle);
  puzzleOverlay.addEventListener('click', e => { if (e.target === puzzleOverlay) closePuzzle(); });

  $('#menu-toggle').addEventListener('click', () => menuOptions.classList.toggle('hidden'));

  const initPuzzle = () => {
    puzzle.innerHTML = "";
    const cells = [];

    // สร้าง "ช่อง" แบบคงที่ (ไม่สลับ DOM) เพื่อให้ตรวจ win ได้ถูกต้อง
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.classList.add('piece');
        Object.assign(cell.style, {
          width: `${PIECE_SIZE}px`,
          height: `${PIECE_SIZE}px`,
          backgroundImage: `url(${PUZZLE_IMG})`,
          backgroundSize: `${COLS * PIECE_SIZE}px ${ROWS * PIECE_SIZE}px`,
          touchAction: 'none'
        });
        // ตำแหน่งที่ "ถูกต้อง" สำหรับช่องนี้ (อิงตามลำดับ DOM)
        cell.dataset.correct = r * COLS + c;
        // จะกำหนด tile ปัจจุบัน (index) ทีหลังตอนสุ่ม
        cell.dataset.index = cell.dataset.correct;
        cells.push(cell);
        puzzle.appendChild(cell);
      }
    }

    // สุ่ม tile ids แล้วใส่ลงในแต่ละช่อง
    const tileIds = [...Array(ROWS * COLS).keys()].sort(() => Math.random() - 0.5);
    cells.forEach((cell, i) => {
      const id = tileIds[i];
      cell.dataset.index = id;
      cell.style.backgroundPosition = posFromId(id);
    });

    // Events ต่อช่อง
    cells.forEach(cell => {
      // Desktop Drag & Drop
      cell.draggable = true;
      cell.addEventListener('dragstart', () => dragged = cell);
      cell.addEventListener('dragover', e => e.preventDefault());
      cell.addEventListener('drop', () => {
        if (dragged && dragged !== cell) {
          swapPieces(dragged, cell);
          checkPuzzleWin();
        }
      });

      // Mobile Touch
      cell.addEventListener('touchstart', e => {
        touchStartPiece = e.target.closest('.piece');
      }, { passive: true });

      // ต้อง passive:false เพื่อให้ preventDefault มีผลบน iOS
      cell.addEventListener('touchmove', e => {
        e.preventDefault();
      }, { passive: false });

      cell.addEventListener('touchend', e => {
        if (!touchStartPiece) return;
        const t = e.changedTouches[0];
        const targetEl = document.elementFromPoint(t.clientX, t.clientY);
        const targetPiece = targetEl ? targetEl.closest('.piece') : null;
        if (targetPiece && targetPiece !== touchStartPiece) {
          swapPieces(touchStartPiece, targetPiece);
          checkPuzzleWin();
        }
        touchStartPiece = null;
      });
    });
  };

  // สลับ tile ระหว่าง "ช่อง" สองอัน (สลับเฉพาะ index และภาพ)
  const swapPieces = (a, b) => {
    const tmpIndex = a.dataset.index;
    a.dataset.index = b.dataset.index;
    b.dataset.index = tmpIndex;

    a.style.backgroundPosition = posFromId(Number(a.dataset.index));
    b.style.backgroundPosition = posFromId(Number(b.dataset.index));
  };

  // ชนะเมื่อ tile id ในแต่ละช่อง ตรงกับตำแหน่งที่ถูกต้องของช่องนั้น
  const checkPuzzleWin = () => {
    const cells = [...puzzle.querySelectorAll('.piece')];
    const won = cells.every(cell => Number(cell.dataset.index) === Number(cell.dataset.correct));
    message.textContent = won ? "🎉 ถูกต้อง! คุณชนะแล้ว!" : "";
  };
});


// ================= Disable Right Click =================
document.addEventListener("contextmenu", e=>{ e.preventDefault(); alert("ห้ามคลิกขวา!"); });
