document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    // Home Page
    const goalAmountDisplay = document.getElementById('goal-amount');
    const increaseGoalBtn = document.getElementById('increase-goal');
    const decreaseGoalBtn = document.getElementById('decrease-goal');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const consumedDisplay = document.getElementById('consumed');
    const goalTotalDisplay = document.getElementById('goal');
    const waterButtons = document.querySelectorAll('.water-btn');
    const customAmountInput = document.getElementById('custom-amount');
    const addCustomButton = document.getElementById('add-custom');
    const homeHistoryList = document.getElementById('history-list');
    const homeEmptyHistoryMessage = document.getElementById('empty-history');
    const resetButton = document.getElementById('reset-day');

    // Navigation
    const navButtons = document.querySelectorAll('.nav-button');
    const pages = document.querySelectorAll('.page');

    // History Page
    const currentMonthYearDisplay = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const monthViewBtn = document.getElementById('month-view-btn');
    const yearViewBtn = document.getElementById('year-view-btn');
    const weeklyCompletionContainer = document.getElementById('weekly-completion-container');
    const weeklyAvgDisplay = document.getElementById('weekly-avg');
    const monthlyAvgDisplay = document.getElementById('monthly-avg');
    const avgCompletionDisplay = document.getElementById('avg-completion');
    const drinkFrequencyDisplay = document.getElementById('drink-frequency');

    // Settings Page
    const settingsIntakeGoalInput = document.getElementById('settings-intake-goal');
    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const unitSelect = document.getElementById('unit-select');
    const furtherReminderToggle = document.getElementById('further-reminder-toggle');
    const genderSelect = document.getElementById('gender-select');
    const weightInput = document.getElementById('weight-input');

    // --- State Variables ---
    let dailyGoal = 2000;
    let consumedAmount = 0; // Current day's consumed amount
    let todayIndividualDrinks = []; // For home page's "Today's Intake History"
    let dailyRecords = []; // Stores aggregated data for each past day: [{date: 'YYYY-MM-DD', totalAmount: NNNN, goalMet: boolean}]
    let lastAccessDate = ''; // Date string of last time the app was accessed/loaded

    // History Page navigation
    let currentHistoryDate = new Date(); // Tracks the date being viewed on the history page

    // Settings state
    let settings = {
        theme: 'light', // 'light' or 'dark'
        unit: 'ml',     // 'ml' or 'oz'
        furtherReminder: false,
        gender: 'male',
        weight: 70      // in kg
    };


    // --- Helper Functions ---

    function getTodayDateString() {
        return new Date().toDateString();
    }

    function getFormattedDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`; // YYYY-MM-DD for consistent storage
    }

    // Utility function to convert ml to oz and vice-versa
    function convertAmount(amount, fromUnit, toUnit) {
        if (fromUnit === toUnit) {
            return Math.round(amount);
        }
        const mlToOzFactor = 0.033814; // 1 ml = 0.033814 oz
        if (fromUnit === 'ml' && toUnit === 'oz') {
            return Math.round(amount * mlToOzFactor);
        } else if (fromUnit === 'oz' && toUnit === 'ml') {
            return Math.round(amount / mlToOzFactor);
        }
        return Math.round(amount); // Fallback
    }




    // --- Local Storage Functions ---

    function loadFromStorage() {
        const savedData = localStorage.getItem('waterTrackerData');
        if (savedData) {
            const data = JSON.parse(savedData);
            dailyGoal = data.goal || 2000;
            consumedAmount = data.consumed || 0;
            todayIndividualDrinks = data.todayIndividualDrinks || []; // Load today's individual drinks
            dailyRecords = data.dailyRecords || []; // Load daily summaries
            lastAccessDate = data.lastAccessDate || '';
        }

        const savedSettings = localStorage.getItem('waterTrackerSettings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) }; // Merge saved settings
        }

        const todayStr = getTodayDateString();

        if (lastAccessDate !== todayStr) {
            // It's a new day!
            console.log("New day detected. Processing previous day's data and resetting for today.");

            // Find or create record for the *previous* day (lastAccessDate)
            if (lastAccessDate) { // Only if there was a previous access date
                let prevDayRecordIndex = dailyRecords.findIndex(record => record.date === getFormattedDate(new Date(lastAccessDate)));
                if (prevDayRecordIndex !== -1) {
                    // Update existing record for previous day
                    dailyRecords[prevDayRecordIndex].totalAmount = consumedAmount;
                    dailyRecords[prevDayRecordIndex].goalMet = consumedAmount >= dailyGoal;
                } else {
                    // Create new record for previous day if it somehow wasn't there
                    dailyRecords.push({
                        date: getFormattedDate(new Date(lastAccessDate)),
                        totalAmount: consumedAmount,
                        goalMet: consumedAmount >= dailyGoal
                    });
                }
            }

            // Reset for the new day
            consumedAmount = 0;
            todayIndividualDrinks = [];
            lastAccessDate = todayStr;
            saveToStorage(); // Save the new state with updated dailyRecords and reset current day
        } else {
            // It's still the same day, just ensure internal consistency
            // Ensure consumedAmount reflects todayIndividualDrinks
            consumedAmount = todayIndividualDrinks.reduce((sum, drink) => sum + drink.amount, 0);
            saveToStorage(); // Just to ensure latest states are saved on every load
        }

        applySettings(); // Apply theme, unit, etc.
        updateDisplay();
        renderHomeHistory();
        renderHistoryPage(); // Update history page on load
        renderSettingsPage(); // Update settings page on load
    }

    function saveToStorage() {
        const data = {
            goal: dailyGoal,
            consumed: consumedAmount,
            todayIndividualDrinks: todayIndividualDrinks, // Save individual drinks for current day
            dailyRecords: dailyRecords, // Save aggregated daily records
            lastAccessDate: getTodayDateString() // Always save current access date
        };
        localStorage.setItem('waterTrackerData', JSON.stringify(data));
        localStorage.setItem('waterTrackerSettings', JSON.stringify(settings));
    }

    // --- General UI Update Functions ---

    function updateDisplay() {
        // Home page goal and consumed
        goalAmountDisplay.textContent = dailyGoal;
        goalTotalDisplay.textContent = `${convertAmount(consumedAmount, 'ml', settings.unit)} / ${convertAmount(dailyGoal, 'ml', settings.unit)} ${settings.unit}`;
        consumedDisplay.textContent = convertAmount(consumedAmount, 'ml', settings.unit);

        const percentage = Math.min(Math.round((consumedAmount / dailyGoal) * 100), 100);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;

        // Color changes for progress bar and text
        if (percentage >= 100) {
            progressFill.style.backgroundColor = 'var(--success-color)';
            progressText.style.color = 'var(--success-color)';
        } else if (percentage >= 75) {
            progressFill.style.backgroundColor = 'var(--warning-color)';
            progressText.style.color = 'var(--warning-color)';
        } else {
            progressFill.style.backgroundColor = 'var(--primary-color)';
            progressText.style.color = 'var(--primary-color)';
        }
        goalAmountDisplay.style.color = (percentage >= 100) ? 'var(--success-color)' : 'var(--primary-color)';

        // Update settings page intake goal to reflect current goal
        settingsIntakeGoalInput.value = dailyGoal;
    }

    // --- Home Page Functions ---

    function renderHomeHistory() {
        homeHistoryList.innerHTML = '';

        if (todayIndividualDrinks.length === 0) {
            homeEmptyHistoryMessage.style.display = 'block';
            return;
        }

        homeEmptyHistoryMessage.style.display = 'none';

        // Sort by most recent first
        const sortedDrinks = [...todayIndividualDrinks].sort((a, b) => new Date(b.time) - new Date(a.time));

        sortedDrinks.forEach(item => {
            const li = document.createElement('li');
            const date = new Date(item.time);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            li.innerHTML = `
                <span>${timeString}</span>
                <span>+${convertAmount(item.amount, 'ml', settings.unit)}${settings.unit}</span>
            `;
            homeHistoryList.appendChild(li);
        });
    }

    function addWater(amount) {
        if (amount <= 0 || isNaN(amount)) {
            alert("Please enter a valid amount greater than 0.");
            return;
        }

        consumedAmount += amount;
        todayIndividualDrinks.push({
            amount: amount, // Always store in ml internally
            time: new Date().toISOString()
        });

        // Update today's record in dailyRecords
        const todayFormatted = getFormattedDate(new Date());
        let todayRecord = dailyRecords.find(record => record.date === todayFormatted);
        if (todayRecord) {
            todayRecord.totalAmount = consumedAmount;
            todayRecord.goalMet = consumedAmount >= dailyGoal;
        } else {
            dailyRecords.push({
                date: todayFormatted,
                totalAmount: consumedAmount,
                goalMet: consumedAmount >= dailyGoal
            });
        }

        updateDisplay();
        renderHomeHistory();
        renderHistoryPage(); // Update history page as well
        saveToStorage();

        // Animation feedback
        progressFill.style.transform = 'scale(1.01)';
        setTimeout(() => {
            progressFill.style.transform = 'scale(1)';
        }, 100);
    }

    function resetDay() {
        if (confirm('Are you sure you want to reset ALL of today\'s water intake? This cannot be undone.')) {
            consumedAmount = 0;
            todayIndividualDrinks = [];

            // Remove today's record from dailyRecords
            const todayFormatted = getFormattedDate(new Date());
            dailyRecords = dailyRecords.filter(record => record.date !== todayFormatted);

            lastAccessDate = getTodayDateString(); // Reset logic for current day
            updateDisplay();
            renderHomeHistory();
            renderHistoryPage(); // Update history page
            saveToStorage();
        }
    }

    // --- Navigation Functions ---

    function showPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        navButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.page === pageId) {
                button.classList.add('active');
            }
        });

        // Update specific page content when shown
        if (pageId === 'history-page') {
            renderHistoryPage();
        } else if (pageId === 'settings-page') {
            renderSettingsPage();
        } else if (pageId === 'home-page') {
            renderHomeHistory(); // Re-render home history in case of changes
        }
    }


    // --- History Page Functions ---
    function renderHistoryPage() {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        currentMonthYearDisplay.textContent = `${monthNames[currentHistoryDate.getMonth()]} ${currentHistoryDate.getFullYear()}`;

        // --- Weekly Completion ---
        weeklyCompletionContainer.innerHTML = '';
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const today = new Date();
        // Get the start of the current week (Sunday) based on currentHistoryDate
        const startOfWeek = new Date(currentHistoryDate);
        startOfWeek.setDate(currentHistoryDate.getDate() - currentHistoryDate.getDay());
        startOfWeek.setHours(0,0,0,0); // Normalize to start of day

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayFormatted = getFormattedDate(day);

            const dayElement = document.createElement('div');
            dayElement.classList.add('weekly-completion-day');

            const circle = document.createElement('div');
            circle.classList.add('weekly-completion-circle');

            const dayName = document.createElement('span');
            dayName.textContent = weekDays[i];

            let dayRecord = dailyRecords.find(record => record.date === dayFormatted);

            if (day.toDateString() === today.toDateString() && currentHistoryDate.toDateString() === today.toDateString()) {
                // Current day in the currently viewed month
                circle.classList.add('today');
                circle.textContent = '>';
                dayName.textContent = 'Today'; // Change label for today
            } else if (day > today) {
                // Future days
                circle.classList.add('future');
                circle.textContent = weekDays[i].charAt(0);
            } else if (dayRecord) {
                // Past days with data
                if (dayRecord.goalMet) {
                    circle.classList.add('completed');
                    circle.innerHTML = '<i class="fas fa-check"></i>';
                } else {
                    circle.classList.add('not-met');
                    circle.innerHTML = '<i class="fas fa-times"></i>';
                }
                dayName.textContent = weekDays[i]; // Keep original day name for past days
            } else {
                // Past days with no data
                circle.classList.add('future'); // Use future style for no data
                circle.textContent = weekDays[i].charAt(0);
            }

            dayElement.appendChild(circle);
            dayElement.appendChild(dayName);
            weeklyCompletionContainer.appendChild(dayElement);
        }

        // --- Drink Water Report ---
        const monthStart = new Date(currentHistoryDate.getFullYear(), currentHistoryDate.getMonth(), 1);
        const monthEnd = new Date(currentHistoryDate.getFullYear(), currentHistoryDate.getMonth() + 1, 0);

        let totalAmountMonth = 0;
        let daysInMonthWithData = 0;
        let monthCompletedDays = 0;

        const recordsInCurrentMonth = dailyRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= monthStart && recordDate <= monthEnd;
        });

        recordsInCurrentMonth.forEach(record => {
            totalAmountMonth += record.totalAmount;
            daysInMonthWithData++;
            if (record.goalMet) {
                monthCompletedDays++;
            }
        });

        const monthlyAvg = daysInMonthWithData > 0 ? (totalAmountMonth / daysInMonthWithData) : 0;

        // Weekly Average (last 7 days of currentHistoryDate's context)
        let totalAmountWeek = 0;
        let daysInWeekWithData = 0;

        for(let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayFormatted = getFormattedDate(day);
            const record = dailyRecords.find(r => r.date === dayFormatted);
            if (record) {
                totalAmountWeek += record.totalAmount;
                daysInWeekWithData++;
            }
        }
        const weeklyAvg = daysInWeekWithData > 0 ? (totalAmountWeek / daysInWeekWithData) : 0;


        weeklyAvgDisplay.textContent = `${convertAmount(weeklyAvg, 'ml', settings.unit)} ${settings.unit} / day`;
        monthlyAvgDisplay.textContent = `${convertAmount(monthlyAvg, 'ml', settings.unit)} ${settings.unit} / day`;

        const totalCompletedDaysAllTime = dailyRecords.filter(record => record.goalMet).length;
        const totalDaysWithRecords = dailyRecords.length;
        const avgCompletion = totalDaysWithRecords > 0 ? ((totalCompletedDaysAllTime / totalDaysWithRecords) * 100) : 0;
        avgCompletionDisplay.textContent = `${avgCompletion.toFixed(0)}%`;

        // Drink Frequency for current day (on history page, this is still today's individual drinks)
        const todayEntries = todayIndividualDrinks; // Use today's individual drinks for this
        drinkFrequencyDisplay.textContent = `${todayEntries.length} times / day`;
    }


    // History Month Navigation
    prevMonthBtn.addEventListener('click', () => {
        currentHistoryDate.setMonth(currentHistoryDate.getMonth() - 1);
        renderHistoryPage();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentHistoryDate.setMonth(currentHistoryDate.getMonth() + 1);
        renderHistoryPage();
    });

    // History View Toggle (placeholder for actual data filtering/display changes)
    monthViewBtn.addEventListener('click', () => {
        monthViewBtn.classList.add('active');
        yearViewBtn.classList.remove('active');
        // You would typically re-render chart/data specific to month view here
    });
    yearViewBtn.addEventListener('click', () => {
        yearViewBtn.classList.add('active');
        monthViewBtn.classList.remove('active');
        // You would typically re-render chart/data specific to year view here
    });

    // --- Settings Page Functions ---

    function renderSettingsPage() {
        settingsIntakeGoalInput.value = dailyGoal;
        themeToggle.checked = settings.theme === 'dark';
        themeText.textContent = settings.theme === 'dark' ? 'Dark' : 'Light';
        unitSelect.value = settings.unit;
        furtherReminderToggle.checked = settings.furtherReminder;
        genderSelect.value = settings.gender;
        weightInput.value = settings.weight;
    }

    function applySettings() {
        // Apply Theme
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Update unit displays across relevant parts
        updateDisplay();
        renderHomeHistory();
        renderHistoryPage(); // History page also needs to reflect unit changes
    }

   // Settings Change Listeners
    settingsIntakeGoalInput.addEventListener('change', function() {
        const newGoal = parseInt(this.value);
        if (!isNaN(newGoal) && newGoal >= 250) {
            dailyGoal = newGoal;
            // Update current day's record if it exists
            const todayFormatted = getFormattedDate(new Date());
            let todayRecord = dailyRecords.find(record => record.date === todayFormatted);
            if(todayRecord) {
                todayRecord.goalMet = consumedAmount >= dailyGoal;
            }
            updateDisplay();
            saveToStorage();
        } else {
            alert("Please enter a valid goal (minimum 250ml).");
            this.value = dailyGoal; // Revert to old value
        }
    });

    themeToggle.addEventListener('change', function() {
        settings.theme = this.checked ? 'dark' : 'light';
        themeText.textContent = this.checked ? 'Dark' : 'Light';
        applySettings();
        saveToStorage();
    });

    unitSelect.addEventListener('change', function() {
        settings.unit = this.value;
        applySettings();
        saveToStorage();
    });

    furtherReminderToggle.addEventListener('change', function() {
        settings.furtherReminder = this.checked;
        saveToStorage();
    });
    genderSelect.addEventListener('change', function() {
        settings.gender = this.value;
        saveToStorage();
    });
    weightInput.addEventListener('change', function() {
        const newWeight = parseInt(this.value);
        if (!isNaN(newWeight) && newWeight >= 1) {
            settings.weight = newWeight;
            saveToStorage();
        } else {
            alert("Please enter a valid weight.");
            this.value = settings.weight;
        }
    });

    // --- Event Listeners (retained and updated) ---
    increaseGoalBtn.addEventListener('click', function() {
        dailyGoal += 250;
        updateDisplay();
        saveToStorage();
    });

    decreaseGoalBtn.addEventListener('click', function() {
        if (dailyGoal > 250) {
            dailyGoal -= 250;
            updateDisplay();
            saveToStorage();
        }
    });

    waterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = parseInt(button.dataset.amount);
            addWater(amount);
        });
    });

    addCustomButton.addEventListener('click', function() {
        const amount = parseInt(customAmountInput.value);
        addWater(amount);
        customAmountInput.value = '';
    });

    customAmountInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const amount = parseInt(customAmountInput.value);
            addWater(amount);
            customAmountInput.value = '';
        }
    });

    resetButton.addEventListener('click', resetDay);

    // Navigation button event listeners
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            showPage(this.dataset.page);
        });
    });

    // --- Initial Load ---
    loadFromStorage();
    showPage('home-page'); // Always start on home
});




