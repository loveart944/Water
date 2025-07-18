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
    const waterChartCanvas = document.getElementById('waterChart');
    let waterChart; // Variable to hold the Chart.js instance

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
                let prevDayFormatted = getFormattedDate(new Date(lastAccessDate));
                let prevDayRecordIndex = dailyRecords.findIndex(record => record.date === prevDayFormatted);
                if (prevDayRecordIndex !== -1) {
                    // Update existing record for previous day
                    dailyRecords[prevDayRecordIndex].totalAmount = consumedAmount;
                    dailyRecords[prevDayRecordIndex].goalMet = consumedAmount >= dailyGoal;
                } else {
                    // Create new record for previous day if it somehow wasn't there
                    // but user had a goal. So we should at least add a record with 0 if no drinks.
                    dailyRecords.push({
                        date: prevDayFormatted,
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
        const rootStyles = getComputedStyle(document.documentElement);
        if (percentage >= 100) {
            progressFill.style.backgroundColor = rootStyles.getPropertyValue('--success-color');
            progressText.style.color = rootStyles.getPropertyValue('--success-color');
        } else if (percentage >= 75) {
            progressFill.style.backgroundColor = rootStyles.getPropertyValue('--warning-color');
            progressText.style.color = rootStyles.getPropertyValue('--warning-color');
        } else {
            progressFill.style.backgroundColor = rootStyles.getPropertyValue('--primary-color');
            progressText.style.color = rootStyles.getPropertyValue('--primary-color');
        }
        goalAmountDisplay.style.color = (percentage >= 100) ? rootStyles.getPropertyValue('--success-color') : rootStyles.getPropertyValue('--primary-color');

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
        let todayRecordIndex = dailyRecords.findIndex(record => record.date === todayFormatted);
        if (todayRecordIndex !== -1) {
            dailyRecords[todayRecordIndex].totalAmount = consumedAmount;
            dailyRecords[todayRecordIndex].goalMet = consumedAmount >= dailyGoal;
        } else {
            dailyRecords.push({
                date: todayFormatted,
                totalAmount: consumedAmount,
                goalMet: consumedAmount >= dailyGoal
            });
        }
        // Sort dailyRecords by date to keep them organized
        dailyRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

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

        // --- Chart Rendering ---
        const ctx = waterChartCanvas.getContext('2d');
        const rootStyles = getComputedStyle(document.documentElement);
        const chartGridColor = rootStyles.getPropertyValue('--chart-grid-color');
        const chartTextColor = rootStyles.getPropertyValue('--chart-text-color');
        const primaryColor = rootStyles.getPropertyValue('--primary-color');
        const successColor = rootStyles.getPropertyValue('--success-color');
        const dangerColor = rootStyles.getPropertyValue('--danger-color');

        const labels = []; // Days of the month
        const data = [];   // Water consumed for each day
        const backgroundColors = []; // Colors for bars
        const borderColor = []; // Border for bars
        const goalData = []; // Line for daily goal

        const numberOfDaysInMonth = new Date(currentHistoryDate.getFullYear(), currentHistoryDate.getMonth() + 1, 0).getDate();
        const today = new Date();
        const todayFormatted = getFormattedDate(today);

        for (let i = 1; i <= numberOfDaysInMonth; i++) {
            const dayDate = new Date(currentHistoryDate.getFullYear(), currentHistoryDate.getMonth(), i);
            const dayFormatted = getFormattedDate(dayDate);
            labels.push(i); // Day number as label

            let totalAmountForDay = 0;
            let barColor = primaryColor; // Default color

            // Check if the day is today, and get current day's consumed amount
            if (dayFormatted === todayFormatted &&
                currentHistoryDate.getMonth() === today.getMonth() &&
                currentHistoryDate.getFullYear() === today.getFullYear()) {
                totalAmountForDay = consumedAmount;
                if (consumedAmount >= dailyGoal) {
                    barColor = successColor;
                } else {
                    barColor = primaryColor;
                }
            } else {
                // For past days, get from dailyRecords
                const record = dailyRecords.find(r => r.date === dayFormatted);
                if (record) {
                    totalAmountForDay = record.totalAmount;
                    if (record.goalMet) {
                        barColor = successColor;
                    } else {
                        barColor = dangerColor; // If goal not met, use danger color
                    }
                } else {
                    // If no record for a past day, it means 0 water was logged
                    // Or it's a future day, show 0 or blank
                    totalAmountForDay = 0;
                    if (dayDate < today) { // Past day with no record
                        barColor = dangerColor; // Indicate goal not met (0 water)
                    } else { // Future day
                        barColor = chartGridColor; // Lighter color for future
                    }
                }
            }

            data.push(convertAmount(totalAmountForDay, 'ml', settings.unit));
            backgroundColors.push(barColor);
            borderColor.push(barColor); // Border same as fill for solid look
            goalData.push(convertAmount(dailyGoal, 'ml', settings.unit));
        }

        if (waterChart) {
            waterChart.destroy(); // Destroy previous chart instance
        }



          waterChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Water Intake (${settings.unit})`,
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColor,
                        borderWidth: 1,
                        borderRadius: 5, // Rounded corners for bars
                    },
                    {
                        type: 'line', // Goal line
                        label: `Daily Goal (${settings.unit})`,
                        data: goalData,
                        borderColor: primaryColor,
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0, // No points on the line
                        tension: 0.1, // Smooth line
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: chartTextColor,
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 15
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += `${context.parsed.y} ${settings.unit}`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month',
                            color: chartTextColor
                        },
                        ticks: {
                            color: chartTextColor
                        },
                        grid: {
                            color: chartGridColor,
                            drawBorder: false
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `Amount (${settings.unit})`,
                            color: chartTextColor
                        },
                        ticks: {
                            color: chartTextColor,
                            beginAtZero: true,
                            callback: function(value) {
                                return `${value} ${settings.unit}`;
                            }
                        },
                        grid: {
                            color: chartGridColor,
                            drawBorder: false
                        }
                    }
                }
            }
        });

        // --- Weekly Completion ---
        weeklyCompletionContainer.innerHTML = '';
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const todayDisplay = new Date();
        const startOfWeek = new Date(currentHistoryDate);
        // Adjust startOfWeek to be the Sunday of the week containing currentHistoryDate
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

            if (day.toDateString() === todayDisplay.toDateString() && currentHistoryDate.toDateString() === todayDisplay.toDateString()) {
                // Current day in the currently viewed month
                circle.classList.add('today');
                circle.innerHTML = '<i class="fas fa-play"></i>'; // Use a play icon for today
                dayName.textContent = 'Today'; // Change label for today
            } else if (day > todayDisplay) {
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
                // Past days with no data (implies 0 water, so not met)
                circle.classList.add('not-met');
                circle.innerHTML = '<i class="fas fa-times"></i>';
                dayName.textContent = weekDays[i];
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

        // Weekly Average calculation based on the 7 days displayed in weekly completion
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
            } else if (day <= todayDisplay) { // Count past days without records as 0 intake days for averaging
                 daysInWeekWithData++;
            }
        }
        const weeklyAvg = daysInWeekWithData > 0 ? (totalAmountWeek / daysInWeekWithData) : 0;


        weeklyAvgDisplay.textContent = `${convertAmount(weeklyAvg, 'ml', settings.unit)} ${settings.unit} / day`;
        monthlyAvgDisplay.textContent = `${convertAmount(monthlyAvg, 'ml', settings.unit)} ${settings.unit} / day`;

        const totalCompletedDaysAllTime = dailyRecords.filter(record => record.goalMet).length;
        const totalDaysWithRecords = dailyRecords.length; // Number of days for which we have records
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
        renderHistoryPage(); // Re-render to ensure current view is month
    });
    yearViewBtn.addEventListener('click', () => {
        yearViewBtn.classList.add('active');
        monthViewBtn.classList.remove('active');
        // You would typically re-render chart/data specific to year view here
        // For year view, you might want to show bars for each month's average.
        // This would require more complex data aggregation.
        // For now, it will just switch the active class.
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
        // Ensure chart theme updates
        if (waterChart) {
            waterChart.options.scales.x.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color');
            waterChart.options.scales.x.grid.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid-color');
            waterChart.options.scales.y.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color');
            waterChart.options.scales.y.grid.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid-color');
            waterChart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color');

            // Re-evaluate bar colors based on current theme and completion status
            const rootStyles = getComputedStyle(document.documentElement);
            const primaryColor = rootStyles.getPropertyValue('--primary-color');
            const successColor = rootStyles.getPropertyValue('--success-color');
            const dangerColor = rootStyles.getPropertyValue('--danger-color');
            const chartGridColor = rootStyles.getPropertyValue('--chart-grid-color');

            const today = new Date();
            const todayFormatted = getFormattedDate(today);

            waterChart.data.datasets[0].backgroundColor = waterChart.data.labels.map((dayNum, index) => {
                const dayDate = new Date(currentHistoryDate.getFullYear(), currentHistoryDate.getMonth(), dayNum);
                const dayFormatted = getFormattedDate(dayDate);

                if (dayFormatted === todayFormatted &&
                    currentHistoryDate.getMonth() === today.getMonth() &&
                    currentHistoryDate.getFullYear() === today.getFullYear()) {
                    return consumedAmount >= dailyGoal ? successColor : primaryColor;
                } else {
                    const record = dailyRecords.find(r => r.date === dayFormatted);
                    if (record) {
                        return record.goalMet ? successColor : dangerColor;
                    } else {
                        return dayDate < today ? dangerColor : chartGridColor; // Past day no record or future day
                    }
                }
            });
            waterChart.data.datasets[0].borderColor = waterChart.data.datasets[0].backgroundColor; // Border same as fill
            waterChart.data.datasets[1].borderColor = primaryColor; // Goal line color

            waterChart.update();
        }
        renderHistoryPage(); // Re-render history to reflect unit changes and ensure chart updates properly
    }

    // Settings Change Listeners
    settingsIntakeGoalInput.addEventListener('change', function() {
        const newGoal = parseInt(this.value);
        if (!isNaN(newGoal) && newGoal >= 250) {
            dailyGoal = newGoal;
            // Update current day's record if it exists
            const todayFormatted = getFormattedDate(new Date());
            let todayRecordIndex = dailyRecords.findIndex(record => record.date === todayFormatted);
            if(todayRecordIndex !== -1) {
                dailyRecords[todayRecordIndex].goalMet = consumedAmount >= dailyGoal;
            }
            updateDisplay();
            renderHistoryPage(); // Update history chart with new goal line
            saveToStorage();
        } else {
            alert("Please enter a valid goal (minimum 250ml).");
            this.value = dailyGoal; // Revert to old value
        }
    });

    themeToggle.addEventListener('change', function() {
        settings.theme = this.checked ? 'dark' : 'light';
        themeText.textContent = this.checked ? 'Dark' : 'Light';
        applySettings(); // This will call renderHistoryPage, updating the chart
        saveToStorage();
    });

    unitSelect.addEventListener('change', function() {
        settings.unit = this.value;
        applySettings(); // This will call renderHistoryPage, updating chart units
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
        renderHistoryPage(); // Update history chart with new goal line
        saveToStorage();
    });

    decreaseGoalBtn.addEventListener('click', function() {
        if (dailyGoal > 250) {
            dailyGoal -= 250;
            updateDisplay();
            renderHistoryPage(); // Update history chart with new goal line
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


                            
