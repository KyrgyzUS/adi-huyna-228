// app.js

// Пример данных пользователей
const users = [
  { username: 'owner', password: 'ownerpass', role: 'owner' },
  { username: 'seller1', password: 'sellerpass1', role: 'seller' },
  { username: 'seller2', password: 'sellerpass2', role: 'seller' }
];

let debtors = [
  // Структура: { id: number, name: string, debt: number }
  { id: 1, name: 'Иван Петров', debt: 1000 },
  { id: 2, name: 'Мария Сидорова', debt: 2500 },
];

// Пример начальных данных складов и продуктов
let warehouses = [
  { id: 1, name: 'Склад А', description: 'Основной склад', seller: 'seller1' },
  { id: 2, name: 'Склад Б', description: 'Второй склад', seller: 'seller2' }
];

let products = [
  { id: 1, name: 'Товар 1', quantity: 100, price: 10.5, warehouseId: 1 },
  { id: 2, name: 'Товар 2', quantity: 200, price: 20.0, warehouseId: 2 }
];

// Текущий пользователь
let currentUser = null;

// Переменные для сортировки и поиска
let currentSort = {
  field: null,
  direction: 'asc' // 'asc' или 'desc'
};

let currentSearchQuery = '';

// Элементы DOM
const loginForm = document.getElementById('loginForm');
const ownerSection = document.getElementById('ownerSection');
const sellerSection = document.getElementById('sellerSection');
const warehouseDetailSection = document.getElementById('warehouseDetailSection');
const logoutButtons = document.querySelectorAll('#logoutBtn');

// Элементы управления должниками (DOM)
const debtorsBtn = document.getElementById('debtorsBtn');
const debtorsModal = document.getElementById('debtorsModal');
const debtorsClose = document.getElementById('debtorsClose');
const addDebtorBtn = document.getElementById('addDebtorBtn');

const editDebtorModal = document.getElementById('editDebtorModal');
const editDebtorClose = document.getElementById('editDebtorClose');
const editDebtorTitle = document.getElementById('editDebtorTitle');
const editDebtorForm = document.getElementById('editDebtorForm');
const debtorIdInput = document.getElementById('debtorId');
const debtorNameInput = document.getElementById('debtorName');
const debtorDebtInput = document.getElementById('debtorDebt');

// Модальное окно продажи товара
const sellProductModal = document.getElementById('sellProductModal');
const sellProductClose = document.getElementById('sellProductClose');
const sellProductForm = document.getElementById('sellProductForm');
const sellProductId = document.getElementById('sellProductId');
const sellQuantity = document.getElementById('sellQuantity');
const paymentMethod = document.getElementById('paymentMethod');
const debtorSelectContainer = document.getElementById('debtorSelectContainer');
const debtorSelect = document.getElementById('debtorSelect');


// Функции для отображения секций
function showSection(section) {
  loginForm.style.display = 'none';
  ownerSection.style.display = 'none';
  sellerSection.style.display = 'none';
  warehouseDetailSection.style.display = 'none';
  section.style.display = 'block';
}

// Функция для обновления таблицы складов
function updateWarehousesTable() {
  const tbody = document.querySelector('#warehousesTable tbody');
  tbody.innerHTML = '';
  warehouses.forEach(warehouse => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${warehouse.id}</td>
      <td class="warehouse-name" data-id="${warehouse.id}" style="color: blue; text-decoration: underline; cursor: pointer;">${warehouse.name}</td>
      <td>${warehouse.description}</td>
      <td>${warehouse.seller}</td>
      <td>
        <button class="assignSellerBtn" data-id="${warehouse.id}">Назначить продавца</button>
        <button class="deleteWarehouseBtn" data-id="${warehouse.id}">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Добавляем обработчики событий только к кнопкам внутри #warehousesTable
  const assignSellerButtons = document.querySelectorAll('#warehousesTable .assignSellerBtn');
  assignSellerButtons.forEach(btn => {
    btn.removeEventListener('click', openAssignSellerModal); // Удаляем предыдущие обработчики
    btn.addEventListener('click', openAssignSellerModal);
  });

  const deleteWarehouseButtons = document.querySelectorAll('#warehousesTable .deleteWarehouseBtn');
  deleteWarehouseButtons.forEach(btn => {
    btn.removeEventListener('click', deleteWarehouse); // Удаляем предыдущие обработчики
    btn.addEventListener('click', deleteWarehouse);
  });

  // Добавляем обработчики событий только к названиям складов внутри #warehousesTable
  const warehouseNames = document.querySelectorAll('#warehousesTable .warehouse-name');
  warehouseNames.forEach(nameCell => {
    nameCell.removeEventListener('click', openWarehouseDetail); // Удаляем предыдущие обработчики
    nameCell.addEventListener('click', openWarehouseDetail);
  });
}

// Функция для обновления списка складов в селекте продавца
function updateWarehouseSelect() {
  const warehouseSelect = document.getElementById('warehouseSelect');
  warehouseSelect.innerHTML = '<option value="">-- Выберите склад --</option>';
  warehouses.forEach(warehouse => {
    const option = document.createElement('option');
    option.value = warehouse.id;
    option.textContent = warehouse.name;
    warehouseSelect.appendChild(option);
  });
}

// Функция для обновления таблицы продуктов для продавца
function updateProductsTable() {
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';
  const selectedWarehouseId = parseInt(document.getElementById('warehouseSelect').value);
  const filteredProducts = products.filter(p => p.warehouseId === selectedWarehouseId);

  filteredProducts.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.quantity}</td>
      <td>${product.price.toFixed(2)}</td>
      <td>
        <button class="editProductBtn" data-id="${product.id}">Редактировать</button>
        <button class="deleteProductBtn" data-id="${product.id}">Удалить</button>
        <button class="sellProductBtn" data-id="${product.id}">Продать</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

 

  // Добавляем обработчики событий только к кнопкам внутри #productsTable
  const editProductButtons = document.querySelectorAll('#productsTable .editProductBtn');
  editProductButtons.forEach(btn => {
    btn.removeEventListener('click', openEditProductModal); // Удаляем предыдущие обработчики
    btn.addEventListener('click', openEditProductModal);
  });

  const deleteProductButtons = document.querySelectorAll('#productsTable .deleteProductBtn');
  deleteProductButtons.forEach(btn => {
    btn.removeEventListener('click', deleteProduct); // Удаляем предыдущие обработчики
    btn.addEventListener('click', deleteProduct);
  });

  const sellProductButtons = document.querySelectorAll('#productsTable .sellProductBtn');
  sellProductButtons.forEach(btn => {
    btn.removeEventListener('click', openSellProductModal);
    btn.addEventListener('click', openSellProductModal);
  });
}

// Функция для обновления списка продуктов в модальном окне перемещения
function updateProductSelect() {
  const productSelect = document.getElementById('productSelect');
  productSelect.innerHTML = '<option value="">-- Выберите товар --</option>';
  products.forEach(product => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = product.name;
    productSelect.appendChild(option);
  });
}

// Функция для обновления списка продавцов в модальном окне назначения
function updateSellerSelect() {
  const newSellerSelect = document.getElementById('newSellerSelect');
  newSellerSelect.innerHTML = '<option value="">-- Выберите продавца --</option>';
  users.filter(user => user.role === 'seller').forEach(user => {
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = user.username;
    newSellerSelect.appendChild(option);
  });
}

// Функция для обновления таблицы товаров на складе с учётом сортировки и поиска
function updateWarehouseProductsTable() {
  const tbody = document.querySelector('#warehouseProductsTable tbody');
  tbody.innerHTML = '';
  const warehouseId = parseInt(document.getElementById('editWarehouseId').value);
  
  // Фильтрация товаров по складу
  let filteredProducts = products.filter(p => p.warehouseId === warehouseId);
  
  // Фильтрация по поисковому запросу
  if (currentSearchQuery) {
    const query = currentSearchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(query));
  }
  
  // Сортировка
  if (currentSort.field) {
    filteredProducts.sort((a, b) => {
      let fieldA = a[currentSort.field];
      let fieldB = b[currentSort.field];
      
      // Если поле — строка, сравниваем по алфавиту
      if (typeof fieldA === 'string') {
        fieldA = fieldA.toLowerCase();
        fieldB = fieldB.toLowerCase();
        if (fieldA < fieldB) return currentSort.direction === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Если поле — число, сравниваем численно
      return currentSort.direction === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    });
  }
  
  filteredProducts.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.quantity}</td>
      <td>${product.price.toFixed(2)}</td>
      <td>
        <button class="editProductBtn" data-id="${product.id}">Редактировать</button>
        <button class="deleteProductBtn" data-id="${product.id}">Удалить</button>
        <button class="sellProductBtn" data-id="${product.id}">Продать</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Добавляем обработчики событий только к кнопкам внутри #warehouseProductsTable
  const editProductButtons = document.querySelectorAll('#warehouseProductsTable .editProductBtn');
  editProductButtons.forEach(btn => {
    btn.removeEventListener('click', openEditProductModal); // Удаляем предыдущие обработчики
    btn.addEventListener('click', openEditProductModal);
  });

  const sellProductButtons = document.querySelectorAll('#warehouseProductsTable .sellProductBtn');
sellProductButtons.forEach(btn => {
  btn.removeEventListener('click', openSellProductModal);
  btn.addEventListener('click', openSellProductModal);
});

  const deleteProductButtons = document.querySelectorAll('#warehouseProductsTable .deleteProductBtn');
  deleteProductButtons.forEach(btn => {
    btn.removeEventListener('click', deleteProduct); // Удаляем предыдущие обработчики
    btn.addEventListener('click', deleteProduct);
  });
}

// Функция для обработки клика по заголовкам таблицы
function handleSort(event) {
  const th = event.target.closest('th');
  if (!th || !th.dataset.sort) return;
  
  const field = th.dataset.sort;
  
  if (currentSort.field === field) {
    // Если уже сортировано по этому полю, меняем направление
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    // Сортировка по новому полю, направление по умолчанию 'asc'
    currentSort.field = field;
    currentSort.direction = 'asc';
  }
  
  updateWarehouseProductsTable();
  updateProductsTable();
  updateSortIndicators();
}

// Функция для обновления индикаторов сортировки (стрелки)
function updateSortIndicators() {
  const headers = document.querySelectorAll('#warehouseProductsTable th[data-sort]');
  headers.forEach(th => {
    const field = th.dataset.sort;
    if (field === currentSort.field) {
      th.innerHTML = `${th.textContent.split(' ')[0]} ${currentSort.direction === 'asc' ? '&#x25B2;' : '&#x25BC;'}`;
    } else {
      th.innerHTML = `${th.textContent.split(' ')[0]} &#x25B2;&#x25BC;`;
    }
  });
}

// Привязываем обработчик кликов к заголовкам таблицы
document.querySelector('#warehouseProductsTable thead').addEventListener('click', handleSort);

// Инициализируем индикаторы сортировки при загрузке страницы
updateSortIndicators();

// Обработчик события ввода в поле поиска
document.getElementById('searchWarehouseProduct').addEventListener('input', function(e) {
  currentSearchQuery = e.target.value.trim();
  updateWarehouseProductsTable();
  updateProductsTable();
});

/**************************************/
/* Функции для управления должниками */
/**************************************/

// Функция для обновления таблицы должников
function updateDebtorsTable() {
  const tbody = document.querySelector('#debtorsTable tbody');
  tbody.innerHTML = '';
  
  debtors.forEach(debtor => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${debtor.id}</td>
      <td>${debtor.name}</td>
      <td>${debtor.debt}</td>
      <td>
        <button class="editDebtorBtn" data-id="${debtor.id}">Редактировать</button>
        <button class="deleteDebtorBtn" data-id="${debtor.id}">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Привязка событий редактирования и удаления
  document.querySelectorAll('.editDebtorBtn').forEach(btn => {
    btn.addEventListener('click', openEditDebtorModal);
  });
  document.querySelectorAll('.deleteDebtorBtn').forEach(btn => {
    btn.addEventListener('click', deleteDebtor);
  });
}

// Функция открытия модального окна с должниками
function openDebtorsModal() {
  updateDebtorsTable();
  debtorsModal.style.display = 'block';
}

// Функция закрытия окна должников
function closeDebtorsModal() {
  debtorsModal.style.display = 'none';
}

// Функция открытия модального окна для добавления/редактирования должника
function openEditDebtorModal(e) {
  editDebtorModal.style.display = 'block';
  const debtorId = e.target.dataset.id;
  if (debtorId) {
    // Редактирование существующего должника
    const debtor = debtors.find(d => d.id === parseInt(debtorId));
    if (debtor) {
      editDebtorTitle.textContent = 'Редактировать должника';
      debtorIdInput.value = debtor.id;
      debtorNameInput.value = debtor.name;
      debtorDebtInput.value = debtor.debt;
    }
  } else {
    // Добавление нового должника
    editDebtorTitle.textContent = 'Добавить должника';
    debtorIdInput.value = '';         // Пустое значение
    debtorNameInput.value = '';       // Пустое значение
    debtorDebtInput.value = '';       // Пустое значение
  }
}

// Функция закрытия окна редактирования должника
function closeEditDebtorModal() {
  editDebtorModal.style.display = 'none';
}

// Функция удаления должника
function deleteDebtor(e) {
  const debtorId = parseInt(e.target.dataset.id);
  if (confirm('Вы действительно хотите удалить должника?')) {
    debtors = debtors.filter(d => d.id !== debtorId);
    updateDebtorsTable();
  }
}

/**************************************/
/* Обработчики событий для должников */
/**************************************/

// Открываем окно должников по клику
debtorsBtn.addEventListener('click', openDebtorsModal);

// Закрываем окно должников по клику на "крестик"
debtorsClose.addEventListener('click', closeDebtorsModal);

// Закрываем окно должников по клику вне модального окна
window.addEventListener('click', (event) => {
  if (event.target === debtorsModal) {
    closeDebtorsModal();
  }
});

// Добавление нового должника (кнопка "Добавить должника")
addDebtorBtn.addEventListener('click', openEditDebtorModal);

// Закрытие модального окна редактирования
editDebtorClose.addEventListener('click', closeEditDebtorModal);

window.addEventListener('click', (event) => {
  if (event.target === editDebtorModal) {
    closeEditDebtorModal();
  }
});

// Обработка формы добавления/редактирования должника
editDebtorForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const id = debtorIdInput.value ? parseInt(debtorIdInput.value) : null;
  const name = debtorNameInput.value.trim();
  const debt = parseFloat(debtorDebtInput.value);

  if (!name) {
    alert('Имя должника не может быть пустым.');
    return;
  }
  if (isNaN(debt) || debt < 0) {
    alert('Введите корректную сумму долга.');
    return;
  }

  if (id) {
    // Редактирование
    const debtor = debtors.find(d => d.id === id);
    if (debtor) {
      debtor.name = name;
      debtor.debt = debt;
    }
  } else {
    // Генерация нового ID (упрощённо)
    const newId = debtors.length ? debtors[debtors.length - 1].id + 1 : 1;
    const newDebtor = {
      id: newId,
      name,
      debt
    };
    debtors.push(newDebtor);
  }

  // Обновляем таблицу и закрываем окно
  updateDebtorsTable();
  closeEditDebtorModal();
});

function openSellProductModal(event) {
  const productId = parseInt(event.target.dataset.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    alert('Товар не найден!');
    return;
  }

  // Сохраняем ID товара в скрытое поле
  sellProductId.value = product.id;
  
  // Сбрасываем форму
  sellQuantity.value = '';
  paymentMethod.value = '';
  debtorSelect.value = '';
  debtorSelectContainer.style.display = 'none';  // Скрываем блок выбора должников

  // Открываем модальное окно
  sellProductModal.style.display = 'block';
}

paymentMethod.addEventListener('change', () => {
  if (paymentMethod.value === 'debtor') {
    debtorSelectContainer.style.display = 'block';
    // Заполняем список должников
    updateDebtorSelect();
  } else {
    debtorSelectContainer.style.display = 'none';
  }
});

function updateDebtorSelect() {
  // Очищаем список
  debtorSelect.innerHTML = '<option value="">-- Выберите должника --</option>';
  debtors.forEach(debtor => {
    const option = document.createElement('option');
    option.value = debtor.id;
    option.textContent = `${debtor.name} (долг: ${debtor.debt})`;
    debtorSelect.appendChild(option);
  });
}

sellProductForm.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const productId = parseInt(sellProductId.value);
  const product = products.find(p => p.id === productId);
  if (!product) {
    alert('Товар не найден!');
    return;
  }

  const quantityToSell = parseInt(sellQuantity.value);
  if (isNaN(quantityToSell) || quantityToSell <= 0) {
    alert('Введите корректное количество.');
    return;
  }

  if (product.quantity < quantityToSell) {
    alert('Недостаточное количество товара на складе.');
    return;
  }

  // 1) Считываем скидку из поля sellDiscount
  const sellDiscountInput = document.getElementById('sellDiscount');
  let discountValue = parseFloat(sellDiscountInput.value);
  if (isNaN(discountValue) || discountValue < 0) {
    alert('Введите корректную скидку (сумму).');
    return;
  }

  // 2) Считаем итоговую стоимость
  const totalCostBeforeDiscount = (product.price - discountValue)  * quantityToSell;
  let totalCost = totalCostBeforeDiscount - 0;

  // Гарантируем, что итоговая цена не ушла в минус из-за слишком большой скидки
  if (totalCost < 0) {
    totalCost = 0;
  }

  // 3) Способ оплаты
  if (paymentMethod.value === 'debtor') {
    const debtorId = parseInt(debtorSelect.value);
    if (!debtorId) {
      alert('Выберите должника!');
      return;
    }
    // Находим должника
    const debtor = debtors.find(d => d.id === debtorId);
    if (!debtor) {
      alert('Должник не найден!');
      return;
    }
    // Увеличиваем долг должника
    debtor.debt += totalCost;
    alert(`Товар продан должнику "${debtor.name}". Его долг теперь: ${debtor.debt}.`);
  } else if (paymentMethod.value === 'mbank') {
    alert(`Товар продан через Мбанк на сумму: ${totalCost}.`);
  } else if (paymentMethod.value === 'cash') {
    alert(`Товар продан за наличные на сумму: ${totalCost}.`);
  } else {
    alert('Выберите способ оплаты.');
    return;
  }

  // 4) Уменьшаем количество на складе
  product.quantity -= quantityToSell;

  // 5) Закрываем окно, обновляем таблицы
  sellProductModal.style.display = 'none';
  updateWarehouseProductsTable();
  updateProductsTable();
});


// Обработчик формы входа
loginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    currentUser = user;
    if (user.role === 'owner') {
      showSection(ownerSection);
      updateWarehousesTable();
    } else if (user.role === 'seller') {
      showSection(sellerSection);
      updateWarehouseSelect();
    }
    loginForm.reset();
  } else {
    alert('Неверный логин или пароль.');
  }
});

// Обработчики кнопок выхода
logoutButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentUser = null;
    showSection(loginForm);
  });
});

// Обработчик формы добавления склада
document.getElementById('addWarehouseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('warehouseName').value.trim();
  const description = document.getElementById('warehouseDescription').value.trim();
  
  const newWarehouse = {
    id: warehouses.length ? warehouses[warehouses.length - 1].id + 1 : 1,
    name,
    description,
    seller: '' // Изначально без продавца
  };
  
  warehouses.push(newWarehouse);
  updateWarehousesTable();
  this.reset();
});

// Обработчик изменения выбора склада для продавца
document.getElementById('warehouseSelect').addEventListener('change', updateProductsTable);

// Обработчик кнопки добавления продукта
document.getElementById('addProductBtn').addEventListener('click', () => {
  const warehouseId = parseInt(document.getElementById('warehouseSelect').value);
  if (!warehouseId) {
    alert('Пожалуйста, выберите склад.');
    return;
  }
  
  const productName = prompt('Введите название продукта:');
  if (!productName) {
    alert('Название продукта не может быть пустым.');
    return;
  }
  
  const productQuantity = parseInt(prompt('Введите количество продукта:'));
  if (isNaN(productQuantity) || productQuantity < 0) {
    alert('Неверное количество.');
    return;
  }
  
  const productPrice = parseFloat(prompt('Введите цену продукта:'));
  if (isNaN(productPrice) || productPrice < 0) {
    alert('Неверная цена.');
    return;
  }
  
  // Проверка существования товара на складе
  const existingProduct = products.find(p => p.warehouseId === warehouseId && p.name.toLowerCase() === productName.toLowerCase());
  if (existingProduct) {
    alert('Товар с таким названием уже существует на складе.');
    return;
  }
  
  const newProduct = {
    id: products.length ? products[products.length - 1].id + 1 : 1,
    name: productName,
    quantity: productQuantity,
    price: productPrice,
    warehouseId
  };
  
  products.push(newProduct);
  updateProductsTable();
});

// Функции для работы с модальными окнами

// Перемещение товара
const moveProductModal = document.getElementById('moveProductModal');
const moveProductClose = document.getElementById('moveProductClose');

document.getElementById('moveProductBtn').addEventListener('click', () => {
  if (warehouses.length < 2) {
    alert('Необходимо как минимум два склада для перемещения товара.');
    return;
  }
  updateProductSelect();
  const fromWarehouseSelect = document.getElementById('fromWarehouse');
  const toWarehouseSelect = document.getElementById('toWarehouse');
  
  fromWarehouseSelect.innerHTML = '<option value="">-- Выберите исходный склад --</option>';
  toWarehouseSelect.innerHTML = '<option value="">-- Выберите целевой склад --</option>';
  
  warehouses.forEach(warehouse => {
    const option1 = document.createElement('option');
    option1.value = warehouse.id;
    option1.textContent = warehouse.name;
    fromWarehouseSelect.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = warehouse.id;
    option2.textContent = warehouse.name;
    toWarehouseSelect.appendChild(option2);
  });
  
  moveProductModal.style.display = 'block';
});

moveProductClose.addEventListener('click', () => {
  moveProductModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === moveProductModal) {
    moveProductModal.style.display = 'none';
  }
});

// Обработчик формы перемещения товара
document.getElementById('moveProductForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productId = parseInt(document.getElementById('productSelect').value);
  const fromWarehouseId = parseInt(document.getElementById('fromWarehouse').value);
  const toWarehouseId = parseInt(document.getElementById('toWarehouse').value);
  const moveQuantity = parseInt(document.getElementById('moveQuantity').value);
  
  if (fromWarehouseId === toWarehouseId) {
    alert('Исходный и целевой склады должны быть разными.');
    return;
  }
  
  const product = products.find(p => p.id === productId && p.warehouseId === fromWarehouseId);
  if (!product) {
    alert('Товар не найден на исходном складе.');
    return;
  }
  
  if (product.quantity < moveQuantity) {
    alert('Недостаточное количество товара на исходном складе.');
    return;
  }
  
  // Уменьшаем количество на исходном складе
  product.quantity -= moveQuantity;
  
  // Находим или создаём товар на целевом складе
  let targetProduct = products.find(p => p.name === product.name && p.warehouseId === toWarehouseId);
  if (targetProduct) {
    targetProduct.quantity += moveQuantity;
  } else {
    targetProduct = {
      id: products.length ? products[products.length - 1].id + 1 : 1,
      name: product.name,
      quantity: moveQuantity,
      price: product.price,
      warehouseId: toWarehouseId
    };
    products.push(targetProduct);
  }
  
  updateProductsTable();
  moveProductModal.style.display = 'none';
  alert('Товар успешно перемещён.');
});

// Назначение продавца
const assignSellerModal = document.getElementById('assignSellerModal');
const assignSellerClose = document.getElementById('assignSellerClose');

function openAssignSellerModal(event) {
  const warehouseId = parseInt(event.target.dataset.id);
  document.getElementById('assignWarehouseId').value = warehouseId;
  updateSellerSelect();
  assignSellerModal.style.display = 'block';
}

assignSellerClose.addEventListener('click', () => {
  assignSellerModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === assignSellerModal) {
    assignSellerModal.style.display = 'none';
  }
});

// Обработчик формы назначения продавца
document.getElementById('assignSellerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const warehouseId = parseInt(document.getElementById('assignWarehouseId').value);
  const newSeller = document.getElementById('newSellerSelect').value;
  
  const warehouse = warehouses.find(w => w.id === warehouseId);
  if (warehouse) {
    warehouse.seller = newSeller;
    updateWarehousesTable();
    assignSellerModal.style.display = 'none';
    alert('Продавец успешно назначен.');
  } else {
    alert('Склад не найден.');
  }
});

// Редактирование продукта
const editProductModal = document.getElementById('editProductModal');
const editProductClose = document.getElementById('editProductClose');

function openEditProductModal(event) {
  const productId = parseInt(event.target.dataset.id);
  const product = products.find(p => p.id === productId);
  if (product) {
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductQuantity').value = product.quantity;
    document.getElementById('editProductPrice').value = product.price;
    editProductModal.style.display = 'block';
  }
}

editProductClose.addEventListener('click', () => {
  editProductModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === editProductModal) {
    editProductModal.style.display = 'none';
  }
});

// Обработчик формы редактирования продукта
document.getElementById('editProductForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productId = parseInt(document.getElementById('editProductId').value);
  const productName = document.getElementById('editProductName').value.trim();
  const productQuantity = parseInt(document.getElementById('editProductQuantity').value);
  const productPrice = parseFloat(document.getElementById('editProductPrice').value);
  
  const product = products.find(p => p.id === productId);
  if (product) {
    product.name = productName;
    product.quantity = productQuantity;
    product.price = productPrice;
    updateProductsTable();
    updateWarehouseProductsTable(); // Обновляем таблицу товаров на складе
    editProductModal.style.display = 'none'; // Закрываем модальное окно
    alert('Продукт успешно обновлён.');
  } else {
    alert('Продукт не найден.');
  }
});

// Удаление склада
function deleteWarehouse(event) {
  const warehouseId = parseInt(event.target.dataset.id);
  const hasProducts = products.some(p => p.warehouseId === warehouseId);
  if (hasProducts) {
    alert('Невозможно удалить склад с существующими продуктами.');
    return;
  }
  warehouses = warehouses.filter(w => w.id !== warehouseId);
  updateWarehousesTable();
  alert('Склад успешно удалён.');
}

// Удаление продукта
function deleteProduct(event) {
  const productId = parseInt(event.target.dataset.id);
  products = products.filter(p => p.id !== productId);
  updateProductsTable();
  updateWarehouseProductsTable(); // Обновляем таблицу товаров на складе
  alert('Товар успешно удалён.');
}

// Обработчик кнопки "Назад к складам"
document.getElementById('backToOwnerBtn').addEventListener('click', () => {
  showSection(ownerSection);
  updateWarehousesTable();
});

// Функция для открытия секции деталей склада
function openWarehouseDetail(event) {
  const warehouseId = parseInt(event.target.dataset.id);
  const warehouse = warehouses.find(w => w.id === warehouseId);
  if (warehouse) {
    document.getElementById('editWarehouseId').value = warehouse.id;
    document.getElementById('editWarehouseName').value = warehouse.name;
    document.getElementById('editWarehouseDescription').value = warehouse.description;
    populateEditWarehouseSellerSelect(warehouse.seller);
    showSection(warehouseDetailSection);
    updateWarehouseProductsTable();
    updateProductsTable();
  }
}

// Функция для заполнения селекта продавцов в форме редактирования склада
function populateEditWarehouseSellerSelect(currentSeller) {
  const editWarehouseSeller = document.getElementById('editWarehouseSeller');
  editWarehouseSeller.innerHTML = '<option value="">-- Выберите продавца --</option>';
  users.filter(user => user.role === 'seller').forEach(user => {
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = user.username;
    if (user.username === currentSeller) {
      option.selected = true;
    }
    editWarehouseSeller.appendChild(option);
  });
}

// Обработчик формы редактирования склада
document.getElementById('editWarehouseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const warehouseId = parseInt(document.getElementById('editWarehouseId').value);
  const warehouseName = document.getElementById('editWarehouseName').value.trim();
  const warehouseDescription = document.getElementById('editWarehouseDescription').value.trim();
  const warehouseSeller = document.getElementById('editWarehouseSeller').value;

  const warehouse = warehouses.find(w => w.id === warehouseId);
  if (warehouse) {
    warehouse.name = warehouseName;
    warehouse.description = warehouseDescription;
    warehouse.seller = warehouseSeller;
    updateWarehousesTable();
    showSection(ownerSection);
    alert('Склад успешно обновлён.');
  } else {
    alert('Склад не найден.');
  }
});

// Обработчик кнопки "Добавить товар" на странице деталей склада
document.getElementById('addProductToWarehouseBtn').addEventListener('click', () => {
  const warehouseId = parseInt(document.getElementById('editWarehouseId').value);
  if (!warehouseId) {
    alert('Склад не выбран.');
    return;
  }
  
  // Открываем модальное окно для добавления товара
  const addProductToWarehouseModal = document.getElementById('addProductToWarehouseModal');
  addProductToWarehouseModal.style.display = 'block';
});

// Обработчик закрытия модального окна добавления товара на склад
const addProductToWarehouseClose = document.getElementById('addProductToWarehouseClose');
addProductToWarehouseClose.addEventListener('click', () => {
  const addProductToWarehouseModal = document.getElementById('addProductToWarehouseModal');
  addProductToWarehouseModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  const addProductToWarehouseModal = document.getElementById('addProductToWarehouseModal');
  if (event.target === addProductToWarehouseModal) {
    addProductToWarehouseModal.style.display = 'none';
  }
});

// Обработчик формы добавления товара на склад
document.getElementById('addProductToWarehouseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const warehouseId = parseInt(document.getElementById('editWarehouseId').value);
  const productName = document.getElementById('newProductName').value.trim();
  const productQuantity = parseInt(document.getElementById('newProductQuantity').value);
  const productPrice = parseFloat(document.getElementById('newProductPrice').value);
  
  if (!productName) {
    alert('Название товара не может быть пустым.');
    return;
  }
  
  if (isNaN(productQuantity) || productQuantity <= 0) {
    alert('Количество должно быть положительным числом.');
    return;
  }
  
  if (isNaN(productPrice) || productPrice < 0) {
    alert('Цена должна быть неотрицательной.');
    return;
  }
  
  // Проверка наличия товара с таким же названием на складе
  const existingProduct = products.find(p => p.warehouseId === warehouseId && p.name.toLowerCase() === productName.toLowerCase());
  if (existingProduct) {
    alert('Товар с таким названием уже существует на складе.');
    return;
  }
  
  const newProduct = {
    id: products.length ? products[products.length - 1].id + 1 : 1,
    name: productName,
    quantity: productQuantity,
    price: productPrice,
    warehouseId
  };
  
  products.push(newProduct);
  updateWarehouseProductsTable();
  updateProductsTable(); // Обновляем основную таблицу продуктов, если необходимо
  this.reset();
  
  // Закрываем модальное окно
  const addProductToWarehouseModal = document.getElementById('addProductToWarehouseModal');
  addProductToWarehouseModal.style.display = 'none';
  
  alert('Товар успешно добавлен на склад.');
});

// Инициализация
showSection(loginForm);
