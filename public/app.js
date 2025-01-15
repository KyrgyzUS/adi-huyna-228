/****************************************************
 * app.js — Клиентская логика (Front-end)
 * -----------------------------------------------
 * Предполагается, что на сервере у вас есть:
 *   server.js (Express + PostgreSQL),
 *   который обрабатывает /api/... эндпоинты.
 ****************************************************/

// Текущий пользователь (role, username и т.д.)
let currentUser = null;

// Ссылки на элементы DOM
const loginForm = document.getElementById('loginForm');
const ownerSection = document.getElementById('ownerSection');
const sellerSection = document.getElementById('sellerSection');
const warehouseDetailSection = document.getElementById('warehouseDetailSection');

// Кнопки для выхода (logout)
const logoutButtons = document.querySelectorAll('#logoutBtn');

// Прочие элементы (debtors, modals и т.д.)
// — можно также собрать их отдельно

// Функция для отображения нужной секции
function showSection(section) {
  loginForm.style.display = 'none';
  ownerSection.style.display = 'none';
  sellerSection.style.display = 'none';
  warehouseDetailSection.style.display = 'none';
  section.style.display = 'block';
}

// Форма входа
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  // Имитация запроса на сервер для проверки логина/пароля:
  // (В реальном приложении: fetch('/api/login', { method:'POST', body: JSON.stringify({username, password}) }))
  // Здесь упрощённо:
  try {
    const resp = await fetch('/api/users'); 
    const allUsers = await resp.json();
    const found = allUsers.find(u => u.username === username && u.password === password);

    if (!found) {
      alert('Неверный логин или пароль.');
      return;
    }
    currentUser = { username: found.username, role: found.role };
    
    // Упрощённая логика определения роли:
    if (currentUser.role === 'owner') {
      showSection(ownerSection);
      await updateWarehousesTable();
    } else if (currentUser.role === 'seller') {
      showSection(sellerSection);
      await updateWarehouseSelect();
    }
    
    loginForm.reset();
  } catch (err) {
    console.error(err);
    alert('Ошибка при попытке входа.');
  }
});

// Кнопки выхода (logout)
logoutButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentUser = null;
    showSection(loginForm);
  });
});

/*******************************************************
 * Пример: Загрузка/обновление таблицы складов (Owner)
 *******************************************************/
async function updateWarehousesTable() {
  try {
    const resp = await fetch('/api/warehouses', {
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    const warehouses = await resp.json();

    const tbody = document.querySelector('#warehousesTable tbody');
    tbody.innerHTML = '';
    warehouses.forEach(wh => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${wh.id}</td>
        <td class="warehouse-name" data-id="${wh.id}" style="cursor: pointer; color:blue; text-decoration:underline;">${wh.name}</td>
        <td>${wh.description || ''}</td>
        <td>${wh.seller || ''}</td>
        <td>
          <button class="assignSellerBtn" data-id="${wh.id}">Назначить продавца</button>
          <button class="deleteWarehouseBtn" data-id="${wh.id}">Удалить</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Привязка событий
    const assignBtns = document.querySelectorAll('#warehousesTable .assignSellerBtn');
    assignBtns.forEach(btn => {
      btn.addEventListener('click', openAssignSellerModal);
    });

    const deleteBtns = document.querySelectorAll('#warehousesTable .deleteWarehouseBtn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', deleteWarehouse);
    });

    const nameCells = document.querySelectorAll('#warehousesTable .warehouse-name');
    nameCells.forEach(cell => {
      cell.addEventListener('click', openWarehouseDetail);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки складов.');
  }
}

// Пример удаления склада
async function deleteWarehouse(e) {
  const whId = e.target.dataset.id;
  if (!confirm('Удалить склад?')) return;
  try {
    const resp = await fetch(`/api/warehouses/${whId}`, {
      method: 'DELETE',
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    if (!resp.ok) {
      const text = await resp.text();
      alert(`Ошибка при удалении: ${text}`);
      return;
    }
    alert('Склад удалён успешно.');
    await updateWarehousesTable();
  } catch (err) {
    console.error(err);
    alert('Ошибка при удалении склада.');
  }
}

// Пример открытия деталей склада
async function openWarehouseDetail(e) {
  const whId = e.target.dataset.id;
  try {
    // Получить склад с /api/warehouses/:id (если есть эндпоинт) или 
    // просто держать id и отобразить секцию
    document.getElementById('editWarehouseId').value = whId;
    // ... загрузка данных склада ...

    showSection(warehouseDetailSection);
    // updateWarehouseProductsTable();
  } catch (err) {
    console.error(err);
    alert('Ошибка открытия деталей склада.');
  }
}

// Форма добавления склада (пример)
document.getElementById('addWarehouseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('warehouseName').value.trim();
  const description = document.getElementById('warehouseDescription').value.trim();
  
  try {
    const resp = await fetch('/api/warehouses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': currentUser?.username || 'anonymous'
      },
      body: JSON.stringify({ name, description })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Ошибка добавления склада: ${txt}`);
      return;
    }
    const newWarehouse = await resp.json();
    alert(`Склад "${newWarehouse.name}" добавлен.`);
    e.target.reset();
    await updateWarehousesTable();
  } catch (err) {
    console.error(err);
    alert('Ошибка при добавлении склада.');
  }
});

/*******************************************************
 * Пример: Секция Продавца, Загрузка Складов, Продуктов
 *******************************************************/
async function updateWarehouseSelect() {
  const warehouseSelect = document.getElementById('warehouseSelect');
  warehouseSelect.innerHTML = '<option value="">-- Выберите склад --</option>';
  try {
    const resp = await fetch('/api/warehouses', {
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    const list = await resp.json();
    list.forEach(wh => {
      const opt = document.createElement('option');
      opt.value = wh.id;
      opt.textContent = wh.name;
      warehouseSelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке списка складов для продавца.');
  }
}

document.getElementById('warehouseSelect').addEventListener('change', updateProductsTable);

// Пример загрузки продуктов для выбранного склада (Seller)
async function updateProductsTable() {
  const whId = parseInt(document.getElementById('warehouseSelect').value);
  if (!whId) {
    // Нет склада
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    return;
  }
  try {
    // Сначала получим все продукты
    const resp = await fetch('/api/products', {
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    const allProducts = await resp.json();

    // Фильтруем по warehouseId
    const filtered = allProducts.filter(p => p.warehouse_id === whId);

    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    filtered.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.id}</td>
        <td>${prod.name}</td>
        <td>${prod.quantity}</td>
        <td>${Number(prod.price).toFixed(2)}</td>
        <td>
          <button class="editProductBtn" data-id="${prod.id}">Редактировать</button>
          <button class="deleteProductBtn" data-id="${prod.id}">Удалить</button>
          <button class="sellProductBtn" data-id="${prod.id}">Продать</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Привязка событий
    const editBtns = document.querySelectorAll('#productsTable .editProductBtn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', openEditProductModal);
    });
    const delBtns = document.querySelectorAll('#productsTable .deleteProductBtn');
    delBtns.forEach(btn => {
      btn.addEventListener('click', deleteProduct);
    });
    const sellBtns = document.querySelectorAll('#productsTable .sellProductBtn');
    sellBtns.forEach(btn => {
      btn.addEventListener('click', openSellProductModal);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке продуктов.');
  }
}

/*******************************************************
 * Пример: Продажа товара
 *******************************************************/
function openSellProductModal(e) {
  const productId = e.target.dataset.id;
  // Сохраняем productId в скрытое поле формы
  document.getElementById('sellProductId').value = productId;

  // Сбрасываем форму
  document.getElementById('sellQuantity').value = '';
  document.getElementById('sellDiscount').value = 0;
  document.getElementById('paymentMethod').value = '';
  document.getElementById('debtorSelectContainer').style.display = 'none';

  // Показываем модалку продажи
  document.getElementById('sellProductModal').style.display = 'block';
}

// Если "Должник" — показать выбор должника
document.getElementById('paymentMethod').addEventListener('change', (e) => {
  const val = e.target.value;
  const container = document.getElementById('debtorSelectContainer');
  if (val === 'debtor') {
    container.style.display = 'block';
    updateDebtorSelect();
  } else {
    container.style.display = 'none';
  }
});

// Пример заполнения списка должников
async function updateDebtorSelect() {
  try {
    const resp = await fetch('/api/debtors', {
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    const all = await resp.json();
    const sel = document.getElementById('debtorSelect');
    sel.innerHTML = '<option value="">-- Выберите должника --</option>';
    all.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (долг: ${d.debt})`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке должников.');
  }
}

// Сама форма продажи
document.getElementById('sellProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const productId = parseInt(document.getElementById('sellProductId').value);
  const quantity = parseInt(document.getElementById('sellQuantity').value);
  const discount = parseFloat(document.getElementById('sellDiscount').value);
  const payment = document.getElementById('paymentMethod').value;
  const debtorId = parseInt(document.getElementById('debtorSelect').value) || null;

  // Проверки...
  if (!productId || !quantity || quantity <= 0) {
    alert('Введите корректное количество.');
    return;
  }

  try {
    const resp = await fetch('/api/products/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': currentUser?.username || 'anonymous'
      },
      body: JSON.stringify({
        productId, quantity, discount, paymentMethod: payment, debtorId
      })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Ошибка продажи: ${txt}`);
      return;
    }
    const data = await resp.json();
    alert(`Товар продан успешно, сумма: ${data.totalCost}`);

    // Закрываем окно
    document.getElementById('sellProductModal').style.display = 'none';
    await updateProductsTable(); // Обновляем таблицу
  } catch (err) {
    console.error(err);
    alert('Ошибка при продаже.');
  }
});

// Закрытие окна продажи
document.getElementById('sellProductClose').addEventListener('click', () => {
  document.getElementById('sellProductModal').style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === document.getElementById('sellProductModal')) {
    document.getElementById('sellProductModal').style.display = 'none';
  }
});

/*******************************************************
 * Прочие функции: редактирование товара, должников и т.д.
 * (В том же духе, используя fetch на /api/... )
 *******************************************************/

function openEditProductModal(e) {
  const productId = e.target.dataset.id;
  alert(`Открыть окно редактирования для товара #${productId}...`);
  // Реализуйте логику
}
async function deleteProduct(e) {
  const productId = e.target.dataset.id;
  if (!confirm('Удалить товар?')) return;
  try {
    const resp = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: { 'X-Username': currentUser?.username || 'anonymous' }
    });
    if (!resp.ok) {
      const text = await resp.text();
      alert(`Ошибка при удалении товара: ${text}`);
      return;
    }
    alert('Товар удалён успешно.');
    await updateProductsTable();
  } catch (err) {
    console.error(err);
    alert('Ошибка удаления товара.');
  }
}

// Аналогично — assignSellerModal, перемещения товаров и т.д.

/*******************************************************
 * Инициализация (при загрузке страницы)
 *******************************************************/
function init() {
  // Изначально показываем форму входа
  showSection(loginForm);
}

// Запускаем
init();
