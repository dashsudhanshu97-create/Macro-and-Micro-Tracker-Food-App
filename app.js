// ===== Food Database (Loaded from CSV) =====
let FOOD_DB = {};

// All micronutrient keys in CSV column order (after fiber)
const MICRO_CSV_COLS = [
    'vitA','vitB1','vitB2','vitB3','vitB5','vitB6','vitB7','folate','vitB12',
    'vitC','vitD','vitE','vitK',
    'calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium','chromium','iodine',
    'omega3','water'
];

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;
        
        const id = values[0];
        const per100 = {
            calories: parseFloat(values[4]),
            carbs: parseFloat(values[5]),
            protein: parseFloat(values[6]),
            fat: parseFloat(values[7]),
            fiber: parseFloat(values[8])
        };

        // Parse all micronutrient columns dynamically
        MICRO_CSV_COLS.forEach((key, idx) => {
            per100[key] = parseFloat(values[9 + idx]) || 0;
        });

        FOOD_DB[id] = {
            name: values[1],
            emoji: values[2],
            unit: values[3],
            per100
        };
    }
}

// Meal emojis cycle
const MEAL_EMOJIS = ["☀️", "🍛", "🥗", "🌙", "🍽️", "🥘", "🍲", "🌮"];
const MEAL_NAMES_DEFAULT = [
    "Breakfast / Shake",
    "Lunch",
    "Snack",
    "Dinner",
    "Meal 5",
    "Meal 6",
    "Meal 7",
    "Meal 8"
];

// Daily targets for ring progress
const DAILY_TARGETS = {
    calories: 2500,
    protein: 120,
    carbs: 300,
    fat: 80,
    fiber: 30
};

// Recommended Daily Intake for all micronutrients
const MICRO_RDI = {
    // 13 Vitamins
    vitA:       { rdi: 900,   unit: 'mcg', label: 'Vitamin A' },
    vitB1:      { rdi: 1.2,   unit: 'mg',  label: 'Thiamine (B1)' },
    vitB2:      { rdi: 1.3,   unit: 'mg',  label: 'Riboflavin (B2)' },
    vitB3:      { rdi: 16,    unit: 'mg',  label: 'Niacin (B3)' },
    vitB5:      { rdi: 5,     unit: 'mg',  label: 'Pantothenic (B5)' },
    vitB6:      { rdi: 1.3,   unit: 'mg',  label: 'Vitamin B6' },
    vitB7:      { rdi: 30,    unit: 'mcg', label: 'Biotin (B7)' },
    folate:     { rdi: 400,   unit: 'mcg', label: 'Folate (B9)' },
    vitB12:     { rdi: 2.4,   unit: 'mcg', label: 'Vitamin B12' },
    vitC:       { rdi: 90,    unit: 'mg',  label: 'Vitamin C' },
    vitD:       { rdi: 15,    unit: 'mcg', label: 'Vitamin D' },
    vitE:       { rdi: 15,    unit: 'mg',  label: 'Vitamin E' },
    vitK:       { rdi: 120,   unit: 'mcg', label: 'Vitamin K' },
    // 12 Minerals
    calcium:    { rdi: 1000,  unit: 'mg',  label: 'Calcium' },
    iron:       { rdi: 18,    unit: 'mg',  label: 'Iron' },
    magnesium:  { rdi: 420,   unit: 'mg',  label: 'Magnesium' },
    phosphorus: { rdi: 700,   unit: 'mg',  label: 'Phosphorus' },
    potassium:  { rdi: 2600,  unit: 'mg',  label: 'Potassium' },
    sodium:     { rdi: 2300,  unit: 'mg',  label: 'Sodium' },
    zinc:       { rdi: 11,    unit: 'mg',  label: 'Zinc' },
    copper:     { rdi: 0.9,   unit: 'mg',  label: 'Copper' },
    manganese:  { rdi: 2.3,   unit: 'mg',  label: 'Manganese' },
    selenium:   { rdi: 55,    unit: 'mcg', label: 'Selenium' },
    chromium:   { rdi: 35,    unit: 'mcg', label: 'Chromium' },
    iodine:     { rdi: 150,   unit: 'mcg', label: 'Iodine' },
    // Essentials
    omega3:     { rdi: 1.6,   unit: 'g',   label: 'Omega-3' },
    water:      { rdi: 700,   unit: 'ml',  label: 'Water (food)' }
};

const MICRO_KEYS = Object.keys(MICRO_RDI);

// Build a zero-object for all tracked nutrients
function emptyNutrients() {
    const obj = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
    MICRO_KEYS.forEach(k => { obj[k] = 0; });
    return obj;
}

// ===== State =====
let meals = [];
let mealIdCounter = 0;

// ===== DOM References =====
const mealsGrid = document.getElementById('meals-grid');
const btnAddMeal = document.getElementById('btn-add-meal');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('foods.csv');
        if (response.ok) {
            const csvText = await response.text();
            parseCSV(csvText);
        } else {
            console.error("Failed to load foods.csv");
            showToast("Failed to load food database.");
        }
    } catch (e) {
        console.error("Error loading CSV:", e);
    }

    // Load from localStorage
    loadState();

    if (meals.length === 0) {
        // Start with one default meal
        addMeal();
    } else {
        renderAllMeals();
    }

    updateDailySummary();

    // Start micronutrients expanded
    const section = document.getElementById('micro-section');
    if (section) section.classList.add('expanded');
});

btnAddMeal.addEventListener('click', () => addMeal());

// ===== Meal Management =====
function addMeal() {
    const mealIndex = meals.length;
    const meal = {
        id: ++mealIdCounter,
        name: MEAL_NAMES_DEFAULT[mealIndex] || `Meal ${mealIndex + 1}`,
        emoji: MEAL_EMOJIS[mealIndex % MEAL_EMOJIS.length],
        foods: [{ foodKey: '', qty: '' }],
        expanded: true
    };
    meals.push(meal);
    renderMealCard(meal);
    updateDailySummary();
    saveState();

    // Scroll to the new card
    setTimeout(() => {
        const card = document.querySelector(`[data-meal-id="${meal.id}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function deleteMeal(mealId) {
    meals = meals.filter(m => m.id !== mealId);
    const card = document.querySelector(`[data-meal-id="${mealId}"]`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-16px) scale(0.97)';
        setTimeout(() => {
            card.remove();
            updateDailySummary();
            if (meals.length === 0) renderEmptyState();
        }, 300);
    }
    saveState();
}

// ===== Rendering =====
function renderAllMeals() {
    mealsGrid.innerHTML = '';
    if (meals.length === 0) {
        renderEmptyState();
        return;
    }
    meals.forEach(meal => renderMealCard(meal));
}

function renderEmptyState() {
    mealsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🍽️</div>
            <p>No meals yet. Tap <strong>Add Meal</strong> to start tracking!</p>
        </div>
    `;
}

function renderMealCard(meal) {
    // Remove empty state if present
    const emptyState = mealsGrid.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const card = document.createElement('div');
    card.className = `meal-card ${meal.expanded ? 'expanded' : ''}`;
    card.dataset.mealId = meal.id;
    card.style.animationDelay = `${meals.indexOf(meal) * 0.06}s`;

    card.innerHTML = buildMealCardHTML(meal);
    mealsGrid.appendChild(card);

    // Bind events
    bindMealCardEvents(card, meal);
}

function buildMealCardHTML(meal) {
    const macros = calcMealMacros(meal);
    const foodItemsHTML = meal.foods.map((food, idx) => buildFoodRowHTML(food, idx)).join('');

    return `
        <div class="meal-header" data-action="toggle">
            <div class="meal-header-left">
                <div class="meal-emoji">${meal.emoji}</div>
                <div class="meal-title-group">
                    <span class="meal-title">${meal.name}</span>
                    <span class="meal-subtitle">${meal.foods.filter(f => f.foodKey).length} item${meal.foods.filter(f => f.foodKey).length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="meal-header-right">
                <span class="meal-kcal-badge">${macros.calories.toFixed(0)} kcal</span>
                <svg class="meal-toggle-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        </div>
        <div class="meal-body">
            <div class="meal-body-inner">
                <div class="food-items-list" data-role="food-list">
                    ${foodItemsHTML}
                </div>
                <button class="btn-add-food" data-action="add-food">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    Add Food
                </button>
                <div class="meal-macros-breakdown">
                    <div class="macro-stat stat-calories">
                        <span class="macro-stat-value" data-macro="calories">${macros.calories.toFixed(1)}</span>
                        <span class="macro-stat-label">Calories</span>
                    </div>
                    <div class="macro-stat stat-protein">
                        <span class="macro-stat-value" data-macro="protein">${macros.protein.toFixed(1)}g</span>
                        <span class="macro-stat-label">Protein</span>
                    </div>
                    <div class="macro-stat stat-carbs">
                        <span class="macro-stat-value" data-macro="carbs">${macros.carbs.toFixed(1)}g</span>
                        <span class="macro-stat-label">Carbs</span>
                    </div>
                    <div class="macro-stat stat-fat">
                        <span class="macro-stat-value" data-macro="fat">${macros.fat.toFixed(1)}g</span>
                        <span class="macro-stat-label">Fat</span>
                    </div>
                    <div class="macro-stat stat-fiber">
                        <span class="macro-stat-value" data-macro="fiber">${macros.fiber.toFixed(1)}g</span>
                        <span class="macro-stat-label">Fiber</span>
                    </div>
                </div>
                <div class="meal-actions">
                    <button class="btn-delete-meal" data-action="delete-meal">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Delete Meal
                    </button>
                </div>
            </div>
        </div>
    `;
}

function buildFoodRowHTML(food, idx) {
    const selectedFood = food.foodKey && FOOD_DB[food.foodKey] ? FOOD_DB[food.foodKey] : null;
    const unitLabel = selectedFood ? selectedFood.unit : 'g';

    const triggerContent = selectedFood
        ? `<span class="trigger-emoji">${selectedFood.emoji}</span><span class="trigger-text">${selectedFood.name}</span>`
        : `<span class="trigger-placeholder">Select food...</span>`;

    const optionsHTML = Object.entries(FOOD_DB).map(([key, f]) =>
        `<div class="dropdown-option ${food.foodKey === key ? 'selected' : ''}" data-food-key="${key}">
            <span class="option-emoji">${f.emoji}</span>
            <span class="option-name">${f.name}</span>
            <span class="option-unit">${f.unit}</span>
        </div>`
    ).join('');

    return `
        <div class="food-item-row" data-food-idx="${idx}">
            <div class="food-select-wrap" data-idx="${idx}">
                <div class="custom-dropdown-trigger" data-action="dropdown-toggle" data-idx="${idx}">
                    ${triggerContent}
                    <svg class="trigger-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="custom-dropdown-menu" data-idx="${idx}">
                    <div class="dropdown-search-wrap">
                        <svg class="dropdown-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                            <path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="text" class="dropdown-search" placeholder="Search foods..." data-action="dropdown-search">
                    </div>
                    <div class="dropdown-options">
                        ${optionsHTML}
                    </div>
                </div>
            </div>
            <input type="number" class="food-qty-input" data-action="food-qty" data-idx="${idx}" 
                   placeholder="0" value="${food.qty}" min="0" step="1">
            <span class="food-unit-label">${unitLabel}</span>
            <button class="btn-remove-food" data-action="remove-food" data-idx="${idx}" title="Remove food">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
        </div>
    `;
}

// ===== Custom Dropdown Logic =====
function openDropdown(wrap) {
    const trigger = wrap.querySelector('.custom-dropdown-trigger');
    const menu = wrap.querySelector('.custom-dropdown-menu');
    const search = menu.querySelector('.dropdown-search');

    // Close all other dropdowns first
    closeAllDropdowns();

    trigger.classList.add('open');
    menu.classList.add('open');

    // Focus search
    setTimeout(() => search.focus(), 50);
}

function closeDropdown(wrap) {
    const trigger = wrap.querySelector('.custom-dropdown-trigger');
    const menu = wrap.querySelector('.custom-dropdown-menu');
    const search = menu.querySelector('.dropdown-search');

    trigger.classList.remove('open');
    menu.classList.remove('open');
    search.value = '';

    // Reset filtered options
    menu.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.style.display = '';
    });
    const noResults = menu.querySelector('.dropdown-no-results');
    if (noResults) noResults.remove();
}

function closeAllDropdowns() {
    document.querySelectorAll('.food-select-wrap').forEach(w => closeDropdown(w));
}

// Global click-outside handler
document.addEventListener('click', (e) => {
    if (!e.target.closest('.food-select-wrap')) {
        closeAllDropdowns();
    }
});

// ===== Event Binding =====
function bindMealCardEvents(card, meal) {
    card.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        if (action === 'toggle') {
            meal.expanded = !meal.expanded;
            card.classList.toggle('expanded', meal.expanded);
            saveState();
        }

        if (action === 'add-food') {
            meal.foods.push({ foodKey: '', qty: '' });
            refreshMealCard(card, meal);
            saveState();
        }

        if (action === 'remove-food') {
            const idx = parseInt(target.dataset.idx);
            if (meal.foods.length > 1) {
                meal.foods.splice(idx, 1);
                refreshMealCard(card, meal);
                updateDailySummary();
                saveState();
            } else {
                showToast("A meal needs at least one food item");
            }
        }

        if (action === 'delete-meal') {
            deleteMeal(meal.id);
        }

        // Custom dropdown toggle
        if (action === 'dropdown-toggle') {
            e.stopPropagation();
            const wrap = target.closest('.food-select-wrap');
            const menu = wrap.querySelector('.custom-dropdown-menu');
            if (menu.classList.contains('open')) {
                closeDropdown(wrap);
            } else {
                openDropdown(wrap);
            }
        }
    });

    // Dropdown option selection
    card.addEventListener('click', (e) => {
        const option = e.target.closest('.dropdown-option');
        if (!option) return;
        e.stopPropagation();

        const wrap = option.closest('.food-select-wrap');
        const idx = parseInt(wrap.dataset.idx);
        const foodKey = option.dataset.foodKey;

        meal.foods[idx].foodKey = foodKey;

        // Update trigger display
        const food = FOOD_DB[foodKey];
        const trigger = wrap.querySelector('.custom-dropdown-trigger');
        trigger.innerHTML = `
            <span class="trigger-emoji">${food.emoji}</span>
            <span class="trigger-text">${food.name}</span>
            <svg class="trigger-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Update unit label
        const row = wrap.closest('.food-item-row');
        const unitLabel = row.querySelector('.food-unit-label');
        unitLabel.textContent = food.unit;

        // Mark selected
        wrap.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');

        closeDropdown(wrap);
        updateMealMacroDisplay(card, meal);
        updateDailySummary();
        saveState();
    });

    // Dropdown search filtering
    card.addEventListener('input', (e) => {
        const target = e.target;

        if (target.dataset.action === 'dropdown-search') {
            const query = target.value.toLowerCase().trim();
            const menu = target.closest('.custom-dropdown-menu');
            const options = menu.querySelectorAll('.dropdown-option');
            let visibleCount = 0;

            options.forEach(opt => {
                const name = opt.querySelector('.option-name').textContent.toLowerCase();
                const match = name.includes(query);
                opt.style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            // Show/hide no results
            let noResults = menu.querySelector('.dropdown-no-results');
            if (visibleCount === 0) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'dropdown-no-results';
                    noResults.textContent = 'No foods found';
                    menu.querySelector('.dropdown-options').appendChild(noResults);
                }
            } else if (noResults) {
                noResults.remove();
            }
        }

        if (target.dataset.action === 'food-qty') {
            const idx = parseInt(target.dataset.idx);
            meal.foods[idx].qty = target.value;
            updateMealMacroDisplay(card, meal);
            updateDailySummary();
            saveState();
        }
    });

    // Prevent search clicks from closing dropdown
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-search')) {
            e.stopPropagation();
        }
    });
}

function refreshMealCard(card, meal) {
    const newCard = document.createElement('div');
    newCard.className = `meal-card ${meal.expanded ? 'expanded' : ''}`;
    newCard.dataset.mealId = meal.id;
    newCard.innerHTML = buildMealCardHTML(meal);
    card.replaceWith(newCard);
    bindMealCardEvents(newCard, meal);
}

// ===== Macro Calculations =====
function calcFoodMacros(foodKey, qty) {
    if (!foodKey || !qty || !FOOD_DB[foodKey]) {
        return emptyNutrients();
    }
    const per100 = FOOD_DB[foodKey].per100;
    const factor = parseFloat(qty) / 100;
    const result = {
        calories: per100.calories * factor,
        carbs: per100.carbs * factor,
        protein: per100.protein * factor,
        fat: per100.fat * factor,
        fiber: per100.fiber * factor
    };
    MICRO_KEYS.forEach(k => { result[k] = (per100[k] || 0) * factor; });
    return result;
}

function calcMealMacros(meal) {
    const totals = emptyNutrients();
    meal.foods.forEach(food => {
        const m = calcFoodMacros(food.foodKey, food.qty);
        totals.calories += m.calories;
        totals.carbs += m.carbs;
        totals.protein += m.protein;
        totals.fat += m.fat;
        totals.fiber += m.fiber;
        MICRO_KEYS.forEach(k => { totals[k] += m[k]; });
    });
    return totals;
}

function updateMealMacroDisplay(card, meal) {
    const macros = calcMealMacros(meal);

    // Update badge
    const badge = card.querySelector('.meal-kcal-badge');
    if (badge) badge.textContent = `${macros.calories.toFixed(0)} kcal`;

    // Update subtitle
    const subtitle = card.querySelector('.meal-subtitle');
    if (subtitle) {
        const count = meal.foods.filter(f => f.foodKey).length;
        subtitle.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }

    // Update breakdown stats
    const statMap = {
        calories: card.querySelector('.stat-calories .macro-stat-value'),
        protein: card.querySelector('.stat-protein .macro-stat-value'),
        carbs: card.querySelector('.stat-carbs .macro-stat-value'),
        fat: card.querySelector('.stat-fat .macro-stat-value'),
        fiber: card.querySelector('.stat-fiber .macro-stat-value')
    };

    if (statMap.calories) statMap.calories.textContent = macros.calories.toFixed(1);
    if (statMap.protein) statMap.protein.textContent = macros.protein.toFixed(1) + 'g';
    if (statMap.carbs) statMap.carbs.textContent = macros.carbs.toFixed(1) + 'g';
    if (statMap.fat) statMap.fat.textContent = macros.fat.toFixed(1) + 'g';
    if (statMap.fiber) statMap.fiber.textContent = macros.fiber.toFixed(1) + 'g';
}

// ===== Daily Summary =====
function updateDailySummary() {
    const totals = emptyNutrients();

    meals.forEach(meal => {
        const m = calcMealMacros(meal);
        totals.calories += m.calories;
        totals.carbs += m.carbs;
        totals.protein += m.protein;
        totals.fat += m.fat;
        totals.fiber += m.fiber;
        MICRO_KEYS.forEach(k => { totals[k] += m[k]; });
    });

    // Animate values
    animateValue('total-calories', totals.calories, 0);
    animateValue('total-protein', totals.protein, 1, 'g');
    animateValue('total-carbs', totals.carbs, 1, 'g');
    animateValue('total-fat', totals.fat, 1, 'g');
    animateValue('total-fiber', totals.fiber, 1, 'g');

    // Update rings
    updateRing('calories', totals.calories, DAILY_TARGETS.calories);
    updateRing('protein', totals.protein, DAILY_TARGETS.protein);
    updateRing('carbs', totals.carbs, DAILY_TARGETS.carbs);
    updateRing('fat', totals.fat, DAILY_TARGETS.fat);
    updateRing('fiber', totals.fiber, DAILY_TARGETS.fiber);

    // Update micronutrients panel
    updateMicronutrients(totals);
}

function animateValue(elementId, targetValue, decimals = 0, suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;
    const display = decimals > 0 ? targetValue.toFixed(decimals) : Math.round(targetValue);
    el.textContent = display + suffix;
}

function updateRing(macro, value, target) {
    const circumference = 2 * Math.PI * 52; // r=52
    const progress = Math.min(value / target, 1);
    const offset = circumference - (progress * circumference);

    const ring = document.querySelector(`.ring-fill[data-macro="${macro}"]`);
    if (ring) {
        ring.style.strokeDashoffset = offset;
    }
}

// ===== Micronutrients =====
let microExpanded = true;

function updateMicronutrients(totals) {
    let scoreParts = 0;
    let scoreTotal = 0;

    MICRO_KEYS.forEach(key => {
        const rdiInfo = MICRO_RDI[key];
        const value = totals[key] || 0;
        const pct = Math.min((value / rdiInfo.rdi) * 100, 100);

        // Update value label
        const valEl = document.getElementById(`micro-${key}`);
        if (valEl) {
            const dec = value < 1 ? 3 : (value < 10 ? 2 : (value < 100 ? 1 : 0));
            valEl.innerHTML = `${value.toFixed(dec)} <small>${rdiInfo.unit}</small>`;
        }

        // Update bar fill with smooth transition
        const barEl = document.getElementById(`bar-${key}`);
        if (barEl) {
            barEl.style.width = `${pct}%`;
        }

        // Update percentage label
        const pctEl = document.getElementById(`pct-${key}`);
        if (pctEl) {
            pctEl.textContent = `${Math.round(pct)}%`;
            // Color code: green >= 80%, yellow 40-79%, red < 40%
            if (key === 'sodium') {
                // Sodium is reverse: lower is better
                pctEl.className = 'micro-bar-pct' + (pct > 90 ? ' pct-over' : pct > 60 ? ' pct-warn' : ' pct-good');
            } else {
                pctEl.className = 'micro-bar-pct' + (pct >= 80 ? ' pct-good' : pct >= 40 ? ' pct-warn' : ' pct-low');
            }
        }

        // Score calculation (sodium excluded for overall score)
        if (key !== 'sodium' && key !== 'water') {
            scoreTotal++;
            scoreParts += Math.min(pct / 100, 1);
        }
    });

    // Update overall score badge
    const scoreBadge = document.getElementById('micro-score-badge');
    if (scoreBadge && scoreTotal > 0) {
        const overallPct = Math.round((scoreParts / scoreTotal) * 100);
        scoreBadge.textContent = `${overallPct}% RDI`;
        scoreBadge.className = 'micro-badge' + (overallPct >= 70 ? ' badge-good' : overallPct >= 35 ? ' badge-warn' : ' badge-low');
    }
}

// Toggle micronutrients panel
document.addEventListener('click', (e) => {
    const toggleTarget = e.target.closest('[data-action="toggle-micro"]');
    if (toggleTarget) {
        microExpanded = !microExpanded;
        const section = document.getElementById('micro-section');
        section.classList.toggle('expanded', microExpanded);
    }
});

// ===== Toast =====
let toastTimeout = null;
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2500);
}

// ===== Persistence =====
function saveState() {
    const stateToSave = meals.map(m => ({
        id: m.id,
        name: m.name,
        emoji: m.emoji,
        foods: m.foods,
        expanded: m.expanded
    }));
    localStorage.setItem('nutritrack_meals', JSON.stringify(stateToSave));
    localStorage.setItem('nutritrack_mealIdCounter', mealIdCounter);
}

function loadState() {
    try {
        const saved = localStorage.getItem('nutritrack_meals');
        const savedCounter = localStorage.getItem('nutritrack_mealIdCounter');
        if (saved) {
            meals = JSON.parse(saved);
        }
        if (savedCounter) {
            mealIdCounter = parseInt(savedCounter);
        }
    } catch (e) {
        meals = [];
        mealIdCounter = 0;
    }
}
