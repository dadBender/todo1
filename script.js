// Состояние приложения
let state = {
    rating: 100,
    categories: [],
    todos: [],
    activePage: 'home', // home, categories, focus
    activeTimerId: null
};

// Загрузка данных из localStorage
function loadState() {
    const saved = localStorage.getItem('focusAppState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.rating = parsed.rating || 100;
        state.categories = parsed.categories || [];
        state.todos = parsed.todos || [];
        
        // Восстановление таймеров
        state.todos.forEach(todo => {
            if (todo.timerActive && todo.timeLeft > 0) {
                startTimer(todo.id);
            }
        });
    }
}

// Сохранение данных в localStorage
function saveState() {
    localStorage.setItem('focusAppState', JSON.stringify({
        rating: state.rating,
        categories: state.categories,
        todos: state.todos.map(todo => ({
            ...todo,
            timerActive: false // Не сохраняем активные таймеры
        }))
    }));
}

// Инициализация
loadState();

// Утилиты для работы со временем
function parseTime(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(seconds) {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60;
}

// Управление рейтингом
function updateRating(delta) {
    state.rating = Math.max(0, Math.min(100, state.rating + delta));
    updateRatingDisplay();
    saveState();
}

function getRatingText(rating) {
    if (rating >= 90) return 'Отлично!';
    if (rating >= 70) return 'Хорошо';
    if (rating >= 50) return 'Нормально';
    if (rating >= 30) return 'Плохо';
    if (rating >= 10) return 'Очень плохо';
    return 'Критично';
}

function updateRatingDisplay() {
    const ratingValue = document.getElementById('ratingValue');
    const ratingText = document.getElementById('ratingText');
    const ratingCircle = document.getElementById('ratingCircle');
    
    if (ratingValue) ratingValue.textContent = state.rating;
    if (ratingText) ratingText.textContent = getRatingText(state.rating);
    
    // Обновление цвета круга в зависимости от рейтинга
    if (ratingCircle) {
        if (state.rating >= 80) {
            ratingCircle.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)';
        } else if (state.rating >= 60) {
            ratingCircle.style.background = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)';
        } else if (state.rating >= 40) {
            ratingCircle.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)';
        } else {
            ratingCircle.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)';
        }
    }
}

// Навигация
function setActivePage(page) {
    state.activePage = page;
    
    const homePage = document.getElementById('homePage');
    const categoriesPage = document.getElementById('categoriesPage');
    const focusPage = document.getElementById('focusPage');
    const pageTitle = document.getElementById('pageTitle');
    const navItems = document.querySelectorAll('.nav-item');
    const navSlider = document.getElementById('navSlider');
    
    // Скрыть все страницы
    if (homePage) homePage.classList.add('hidden');
    if (categoriesPage) categoriesPage.classList.add('hidden');
    if (focusPage) focusPage.classList.add('hidden');
    
    // Показать нужную страницу и обновить навигацию
    if (page === 'home') {
        if (homePage) homePage.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Главная';
        if (navSlider) navSlider.style.left = '4px';
    } else if (page === 'categories') {
        if (categoriesPage) categoriesPage.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Категории';
        if (navSlider) navSlider.style.left = 'calc(33.333% + 2px)';
    } else if (page === 'focus') {
        if (focusPage) focusPage.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Фокус';
        if (navSlider) navSlider.style.left = 'calc(66.666% + 2px)';
    }
    
    navItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    updateTodosDisplay();
    updateCategorySelects();
}

// Управление категориями
function addCategory(name) {
    if (!name.trim()) return;
    
    const category = {
        id: 'cat-' + Date.now(),
        name: name.trim(),
        createdAt: new Date().toISOString()
    };
    
    state.categories.push(category);
    saveState();
    updateCategoriesDisplay();
    updateCategorySelects();
    updateStats();
}

function deleteCategory(categoryId) {
    state.categories = state.categories.filter(cat => cat.id !== categoryId);
    state.todos = state.todos.filter(todo => todo.categoryId !== categoryId);
    saveState();
    updateCategoriesDisplay();
    updateCategorySelects();
    updateTodosDisplay();
    updateStats();
}

function updateCategoriesDisplay() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (state.categories.length === 0) {
        list.innerHTML = '<li class="empty-state">📁 Пока нет категорий</li>';
        return;
    }
    
    state.categories.forEach(category => {
        const todosInCategory = state.todos.filter(t => t.categoryId === category.id);
        const completedTodos = todosInCategory.filter(t => t.completed);
        const totalTime = todosInCategory.reduce((sum, todo) => sum + (todo.time || 0), 0);
        const progress = todosInCategory.length > 0 
            ? Math.round((completedTodos.length / todosInCategory.length) * 100) 
            : 0;
        
        const li = document.createElement('li');
        li.className = 'category-item';
        li.innerHTML = `
            <div class="category-header">
                <div>
                    <div class="category-title">${category.name}</div>
                    <div class="category-time">⏱️ ${Math.round(totalTime / 60)} мин.</div>
                </div>
                <div class="category-actions">
                    <button class="btn btn-success" onclick="setActivePage('focus'); setFilterCategory('${category.id}')">Старт</button>
                    <button class="btn btn-danger" onclick="deleteCategory('${category.id}')">🗑️</button>
                </div>
            </div>
            ${todosInCategory.length > 0 ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-stats">
                    <span>Прогресс: ${progress}%</span>
                    <span>${completedTodos.length} из ${todosInCategory.length} задач</span>
                </div>
            ` : ''}
        `;
        list.appendChild(li);
    });
}

function updateCategorySelects() {
    const todoSelect = document.getElementById('todoCategorySelect');
    const filterSelect = document.getElementById('filterCategorySelect');
    
    if (todoSelect) {
        todoSelect.innerHTML = '<option value="">Выберите категорию</option>';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            todoSelect.appendChild(option);
        });
    }
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Все категории</option>';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            filterSelect.appendChild(option);
        });
    }
}

function updateStats() {
    const totalCategories = document.getElementById('totalCategories');
    const totalTasks = document.getElementById('totalTasks');
    const completedTasks = document.getElementById('completedTasks');
    
    if (totalCategories) totalCategories.textContent = state.categories.length;
    if (totalTasks) totalTasks.textContent = state.todos.length;
    if (completedTasks) {
        completedTasks.textContent = state.todos.filter(t => t.completed).length;
    }
}

// Управление задачами
function addTodo(text, timeStr, categoryId) {
    if (!text.trim() || !categoryId || !timeStr) return;
    
    const timeSeconds = timeToSeconds(timeStr);
    if (timeSeconds === 0) return;
    
    const todo = {
        id: 'todo-' + Date.now(),
        text: text.trim(),
        time: timeSeconds,
        timeLeft: timeSeconds,
        timeSpent: 0,
        categoryId: categoryId,
        completed: false,
        timerActive: false,
        startedAt: null
    };
    
    state.todos.push(todo);
    saveState();
    updateTodosDisplay();
    updateStats();
    
    // Очистка формы
    document.getElementById('todoTextInput').value = '';
    document.getElementById('todoTimeInput').value = '00:00';
}

function deleteTodo(todoId) {
    stopTimer(todoId);
    state.todos = state.todos.filter(t => t.id !== todoId);
    saveState();
    updateTodosDisplay();
    updateStats();
}

function toggleComplete(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Если задача уже завершена, просто возобновляем её
    if (todo.completed) {
        todo.completed = false;
        saveState();
        updateTodosDisplay();
        updateStats();
        return;
    }
    
    // Если таймер активен, останавливаем его (это прерывание - снимаем баллы)
    if (todo.timerActive) {
        stopTimer(todoId);
    }
    
    // Завершаем задачу
    todo.completed = true;
    saveState();
    updateTodosDisplay();
    updateStats();
}

let timerIntervals = {};

function startTimer(todoId) {
    // Остановить все другие таймеры
    if (state.activeTimerId && state.activeTimerId !== todoId) {
        stopTimer(state.activeTimerId);
    }
    
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo || todo.completed || todo.timeLeft <= 0) return;
    
    todo.timerActive = true;
    todo.startedAt = Date.now();
    state.activeTimerId = todoId;
    
    if (timerIntervals[todoId]) {
        clearInterval(timerIntervals[todoId]);
    }
    
    timerIntervals[todoId] = setInterval(() => {
        const currentTodo = state.todos.find(t => t.id === todoId);
        if (!currentTodo || !currentTodo.timerActive) {
            clearInterval(timerIntervals[todoId]);
            delete timerIntervals[todoId];
            return;
        }
        
        currentTodo.timeLeft--;
        currentTodo.timeSpent++;
        
        if (currentTodo.timeLeft <= 0) {
            // Таймер дошел до конца - начисляем +10 баллов
            currentTodo.timeLeft = 0;
            currentTodo.timerActive = false;
            currentTodo.completed = true;
            state.activeTimerId = null;
            clearInterval(timerIntervals[todoId]);
            delete timerIntervals[todoId];
            
            updateRating(10);
            saveState();
            updateTodosDisplay();
            updateStats();
        } else {
            saveState();
            updateTodosDisplay();
        }
    }, 1000);
    
    saveState();
    updateTodosDisplay();
}

function stopTimer(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo || !todo.timerActive) return;
    
    const wasRunning = todo.timerActive && todo.timeLeft > 0 && todo.startedAt;
    
    todo.timerActive = false;
    state.activeTimerId = null;
    
    if (timerIntervals[todoId]) {
        clearInterval(timerIntervals[todoId]);
        delete timerIntervals[todoId];
    }
    
    // Если таймер был прерван (не дошел до конца), снимаем -10 баллов
    if (wasRunning && todo.timeLeft > 0) {
        updateRating(-10);
    }
    
    saveState();
    updateTodosDisplay();
}

function toggleTimer(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo || todo.completed) return;
    
    if (todo.timerActive) {
        stopTimer(todoId);
    } else {
        startTimer(todoId);
    }
}

let filterCategoryId = '';

function setFilterCategory(categoryId) {
    filterCategoryId = categoryId;
    const select = document.getElementById('filterCategorySelect');
    if (select) select.value = categoryId;
    updateTodosDisplay();
}

function updateTodosDisplay() {
    const list = document.getElementById('todosList');
    if (!list) return;
    
    list.innerHTML = '';
    
    let filteredTodos = state.todos;
    if (filterCategoryId) {
        filteredTodos = state.todos.filter(t => t.categoryId === filterCategoryId);
    }
    
    if (filteredTodos.length === 0) {
        list.innerHTML = '<li class="empty-state">📝 Задач нет</li>';
        return;
    }
    
    filteredTodos.forEach(todo => {
        const category = state.categories.find(c => c.id === todo.categoryId);
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="todo-header">
                <div class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</div>
                <div class="todo-status ${todo.completed ? 'completed' : 'pending'}">
                    ${todo.completed ? '✅ Выполнено' : '⏳ В процессе'}
                </div>
            </div>
            <div class="todo-details">
                <div class="time-info">
                    <span class="time-label">⏱️ Вы потратили:</span>
                    <span class="time-value">${formatTime(todo.timeSpent)}</span>
                </div>
                <div class="time-info">
                    <span class="time-label">⏱️ Оставшееся время:</span>
                    <span class="time-value">${formatTime(todo.timeLeft)}</span>
                </div>
                <div class="timer-status ${todo.timerActive ? 'active' : 'inactive'}">
                    ${todo.timerActive ? '⏰ Таймер активен' : '⏸️ Таймер остановлен'}
                </div>
            </div>
            <div class="todo-actions">
                <button class="btn ${todo.timerActive ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleTimer('${todo.id}')" 
                        ${todo.completed ? 'disabled' : ''}>
                    ${todo.timerActive ? '⏸️ Остановить' : '▶️ Старт'}
                </button>
                <button class="btn btn-secondary" onclick="toggleComplete('${todo.id}')">
                    ${todo.completed ? '↶ Возобновить' : '✓ Завершить'}
                </button>
                <button class="btn btn-danger" onclick="deleteTodo('${todo.id}')">🗑️ Удалить</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            setActivePage(item.dataset.page);
        });
    });
    
    // Добавление категории
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('categoryInput');
            if (input) {
                addCategory(input.value);
                input.value = '';
            }
        });
    }
    
    // Добавление задачи
    const addTodoForm = document.getElementById('addTodoForm');
    if (addTodoForm) {
        addTodoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const textInput = document.getElementById('todoTextInput');
            const timeInput = document.getElementById('todoTimeInput');
            const categorySelect = document.getElementById('todoCategorySelect');
            
            if (textInput && timeInput && categorySelect) {
                addTodo(textInput.value, timeInput.value, categorySelect.value);
            }
        });
    }
    
    // Фильтр категорий
    const filterSelect = document.getElementById('filterCategorySelect');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            setFilterCategory(e.target.value);
        });
    }
    
    // Инициализация отображения
    updateRatingDisplay();
    updateCategoriesDisplay();
    updateCategorySelects();
    updateTodosDisplay();
    updateStats();
    setActivePage(state.activePage);
});

// Экспорт функций для использования в onclick
window.setActivePage = setActivePage;
window.deleteCategory = deleteCategory;
window.deleteTodo = deleteTodo;
window.toggleComplete = toggleComplete;
window.toggleTimer = toggleTimer;
window.setFilterCategory = setFilterCategory;

