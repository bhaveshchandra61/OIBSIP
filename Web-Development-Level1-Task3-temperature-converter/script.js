/**
 * ThermoFlux - Interactive Temperature Converter & Scale Visualizer
 * Core Application Engine & Event Handlers
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const tempInput = document.getElementById('tempInput');
    const clearBtn = document.getElementById('clearBtn');
    const inputError = document.getElementById('inputError');
    const convertBtn = document.getElementById('convertBtn');
    const liveConvertToggle = document.getElementById('liveConvertToggle');
    const absoluteZeroAlert = document.getElementById('absoluteZeroAlert');
    const alertMessage = document.getElementById('alertMessage');

    // Output Cards & Values
    const valCelsius = document.getElementById('valCelsius');
    const valFahrenheit = document.getElementById('valFahrenheit');
    const valKelvin = document.getElementById('valKelvin');
    
    const cardCelsius = document.getElementById('cardCelsius');
    const cardFahrenheit = document.getElementById('cardFahrenheit');
    const cardKelvin = document.getElementById('cardKelvin');
    
    // Thermal Visualizer Elements
    const ambientGlow = document.getElementById('ambientGlow');
    const thermalStateBadge = document.getElementById('thermalStateBadge');
    const thermoFill = document.getElementById('thermoFill');
    const thermoBulb = document.getElementById('thermoBulb');
    const thermometerPercent = document.getElementById('thermometerPercent');
    const formulaText = document.getElementById('formulaText');

    // Toast Notification
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    // Preset Chip Buttons
    const presetChips = document.querySelectorAll('.chip');
    const copyBtns = document.querySelectorAll('.copy-btn');

    // State Variables
    let currentInputUnit = 'C';
    let lastCalculatedValues = { celsius: null, fahrenheit: null, kelvin: null };

    // --- Core Thermal Themes Config ---
    const THERMAL_THEMES = {
        absoluteZero: {
            color: '#a855f7',
            glow: 'rgba(168, 85, 247, 0.35)',
            gradient: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
            label: '<i class="fa-solid fa-ban"></i> Violation State',
            name: 'Absolute Zero Violation'
        },
        freezing: {
            color: '#00d2ff',
            glow: 'rgba(0, 210, 255, 0.35)',
            gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
            label: '<i class="fa-solid fa-snowflake"></i> Freezing State',
            name: 'Freezing / Sub-Zero'
        },
        cool: {
            color: '#10b981',
            glow: 'rgba(16, 185, 129, 0.35)',
            gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
            label: '<i class="fa-solid fa-leaf"></i> Mild State',
            name: 'Room Temp / Cool'
        },
        warm: {
            color: '#ffb703',
            glow: 'rgba(255, 183, 3, 0.35)',
            gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            label: '<i class="fa-solid fa-sun"></i> Warm State',
            name: 'Warm / Body Temp'
        },
        hot: {
            color: '#ff416c',
            glow: 'rgba(255, 65, 108, 0.4)',
            gradient: 'linear-gradient(135deg, #ff4b2b 0%, #ff416c 100%)',
            label: '<i class="fa-solid fa-fire-flame-curved"></i> Boiling State',
            name: 'Extreme Heat'
        }
    };

    // --- Initialization ---
    initApp();

    function initApp() {
        bindEvents();
        updateActiveUnitCard();
        processConversion(); // initial state run
    }

    // --- Event Listeners Binding ---
    function bindEvents() {
        // Live Input listener
        tempInput.addEventListener('input', () => {
            toggleClearBtn();
            if (liveConvertToggle.checked) {
                processConversion();
            }
        });

        // Clear Button
        clearBtn.addEventListener('click', () => {
            tempInput.value = '';
            toggleClearBtn();
            resetOutputs();
            tempInput.focus();
        });

        // Unit Radio Buttons
        document.querySelectorAll('input[name="inputUnit"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentInputUnit = e.target.value;
                updateActiveUnitCard();
                processConversion();
            });
        });

        // Convert Button Click
        convertBtn.addEventListener('click', () => {
            processConversion(true);
        });

        // Preset Chips Click
        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const val = chip.getAttribute('data-val');
                const unit = chip.getAttribute('data-unit');
                
                tempInput.value = val;
                currentInputUnit = unit;
                
                // Update Radio Selection
                const targetRadio = document.querySelector(`input[name="inputUnit"][value="${unit}"]`);
                if (targetRadio) targetRadio.checked = true;
                
                toggleClearBtn();
                updateActiveUnitCard();
                processConversion(true);
            });
        });

        // Copy Value Buttons
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetKey = btn.getAttribute('data-copy');
                const valToCopy = lastCalculatedValues[targetKey];
                
                if (valToCopy !== null && !isNaN(valToCopy)) {
                    const unitSymbol = targetKey === 'celsius' ? '°C' : targetKey === 'fahrenheit' ? '°F' : 'K';
                    navigator.clipboard.writeText(`${valToCopy} ${unitSymbol}`).then(() => {
                        showToast(`Copied ${valToCopy} ${unitSymbol} to clipboard!`);
                    }).catch(() => {
                        showToast(`Failed to copy value`);
                    });
                } else {
                    showToast(`No valid output to copy`);
                }
            });
        });
    }

    // --- Toggle Clear Button Visibility ---
    function toggleClearBtn() {
        if (tempInput.value.trim() !== '') {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
    }

    // --- Highlight Active Input Unit Card ---
    function updateActiveUnitCard() {
        [cardCelsius, cardFahrenheit, cardKelvin].forEach(card => card.classList.remove('active-unit'));
        if (currentInputUnit === 'C') cardCelsius.classList.add('active-unit');
        if (currentInputUnit === 'F') cardFahrenheit.classList.add('active-unit');
        if (currentInputUnit === 'K') cardKelvin.classList.add('active-unit');
    }

    // --- Conversion Engine & Input Validation ---
    function processConversion(forceAlertFocus = false) {
        const rawValue = tempInput.value.trim();

        // 1. Check for Empty Input
        if (rawValue === '') {
            clearErrorState();
            resetOutputs();
            return;
        }

        // 2. Validate Numeric Format (Strict Regex: allows optional leading - or +, decimals)
        const numericRegex = /^[-+]?(\d+|\d*\.\d+|\d+\.)$/;
        if (!numericRegex.test(rawValue) || isNaN(Number(rawValue))) {
            showInputError('Invalid input: Please enter a valid number (e.g. 25, -10.5)');
            resetOutputs();
            return;
        }

        // Parse valid number
        const inputNum = parseFloat(rawValue);
        clearInputError();

        // 3. Absolute Zero Violation Check
        // Absolute zero values: C = -273.15, F = -459.67, K = 0
        let isAbsoluteZeroViolation = false;
        let violationMessage = '';

        if (currentInputUnit === 'C' && inputNum < -273.15) {
            isAbsoluteZeroViolation = true;
            violationMessage = `Input (${inputNum}°C) is below absolute zero (-273.15°C).`;
        } else if (currentInputUnit === 'F' && inputNum < -459.67) {
            isAbsoluteZeroViolation = true;
            violationMessage = `Input (${inputNum}°F) is below absolute zero (-459.67°F).`;
        } else if (currentInputUnit === 'K' && inputNum < 0) {
            isAbsoluteZeroViolation = true;
            violationMessage = `Input (${inputNum} K) is below absolute zero (0 K).`;
        }

        if (isAbsoluteZeroViolation) {
            showAbsoluteZeroAlert(violationMessage);
            tempInput.classList.add('has-error');
        } else {
            hideAbsoluteZeroAlert();
            tempInput.classList.remove('has-error');
        }

        // 4. Perform Temperature Conversion Formulas
        let celsiusVal, fahrenheitVal, kelvinVal;

        if (currentInputUnit === 'C') {
            celsiusVal = inputNum;
            fahrenheitVal = (celsiusVal * 9/5) + 32;
            kelvinVal = celsiusVal + 273.15;
        } else if (currentInputUnit === 'F') {
            fahrenheitVal = inputNum;
            celsiusVal = (fahrenheitVal - 32) * 5/9;
            kelvinVal = celsiusVal + 273.15;
        } else if (currentInputUnit === 'K') {
            kelvinVal = inputNum;
            celsiusVal = kelvinVal - 273.15;
            fahrenheitVal = (celsiusVal * 9/5) + 32;
        }

        // Save last calculated values
        lastCalculatedValues = {
            celsius: formatNumber(celsiusVal),
            fahrenheit: formatNumber(fahrenheitVal),
            kelvin: formatNumber(kelvinVal)
        };

        // 5. Update UI Outputs
        valCelsius.textContent = formatNumber(celsiusVal);
        valFahrenheit.textContent = formatNumber(fahrenheitVal);
        valKelvin.textContent = formatNumber(kelvinVal);

        // 6. Update Formula Viewer Breakdown
        updateFormulaText(inputNum, currentInputUnit, celsiusVal, fahrenheitVal, kelvinVal);

        // 7. Update Thermal Meter & Ambient Theme
        updateThermalVisualizer(celsiusVal, isAbsoluteZeroViolation);
    }

    // --- Number Formatting Utility ---
    function formatNumber(num) {
        if (num === null || isNaN(num)) return '--';
        // Round to 2 decimal places if necessary, omit trailing zeros
        return Number(Math.round(num + 'e2') + 'e-2').toLocaleString('en-US', {
            maximumFractionDigits: 2
        });
    }

    // --- Error Display Helpers ---
    function showInputError(msg) {
        inputError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
        inputError.classList.add('visible');
        tempInput.classList.add('has-error');
    }

    function clearInputError() {
        inputError.innerHTML = '';
        inputError.classList.remove('visible');
        tempInput.classList.remove('has-error');
    }

    function clearErrorState() {
        clearInputError();
        hideAbsoluteZeroAlert();
    }

    function showAbsoluteZeroAlert(msg) {
        alertMessage.textContent = `${msg} Temperature cannot exist below absolute zero in standard physics.`;
        absoluteZeroAlert.style.display = 'flex';
    }

    function hideAbsoluteZeroAlert() {
        absoluteZeroAlert.style.display = 'none';
    }

    function resetOutputs() {
        valCelsius.textContent = '--';
        valFahrenheit.textContent = '--';
        valKelvin.textContent = '--';
        lastCalculatedValues = { celsius: null, fahrenheit: null, kelvin: null };
        formulaText.innerHTML = 'Enter a temperature value to see formula equations.';
        updateThermalVisualizer(21, false); // default ambient room temp
    }

    // --- Formula Viewer Breakdown Updater ---
    function updateFormulaText(val, unit, c, f, k) {
        const formattedInput = `${val} ${unit === 'C' ? '°C' : unit === 'F' ? '°F' : 'K'}`;
        let html = '';

        if (unit === 'C') {
            html = `
                <div>• °F = (${val} × 9/5) + 32 = <strong>${formatNumber(f)} °F</strong></div>
                <div>• K = ${val} + 273.15 = <strong>${formatNumber(k)} K</strong></div>
            `;
        } else if (unit === 'F') {
            html = `
                <div>• °C = (${val} - 32) × 5/9 = <strong>${formatNumber(c)} °C</strong></div>
                <div>• K = (${val} - 32) × 5/9 + 273.15 = <strong>${formatNumber(k)} K</strong></div>
            `;
        } else if (unit === 'K') {
            html = `
                <div>• °C = ${val} - 273.15 = <strong>${formatNumber(c)} °C</strong></div>
                <div>• °F = (${val} - 273.15) × 9/5 + 32 = <strong>${formatNumber(f)} °F</strong></div>
            `;
        }

        formulaText.innerHTML = html;
    }

    // --- Update Dynamic Theme & Visual Thermometer ---
    function updateThermalVisualizer(celsiusVal, isViolation) {
        let theme;

        if (isViolation) {
            theme = THERMAL_THEMES.absoluteZero;
        } else if (celsiusVal <= 0) {
            theme = THERMAL_THEMES.freezing;
        } else if (celsiusVal <= 25) {
            theme = THERMAL_THEMES.cool;
        } else if (celsiusVal <= 60) {
            theme = THERMAL_THEMES.warm;
        } else {
            theme = THERMAL_THEMES.hot;
        }

        // Apply theme variables to root
        document.documentElement.style.setProperty('--theme-color', theme.color);
        document.documentElement.style.setProperty('--theme-glow', theme.glow);
        document.documentElement.style.setProperty('--theme-gradient', theme.gradient);

        // Update Thermal State Badge
        thermalStateBadge.innerHTML = theme.label;

        // Calculate Thermometer Height Percentage
        // Scale range: -50°C (0%) to 100°C (100%)
        let minC = -50;
        let maxC = 100;
        let percent = ((celsiusVal - minC) / (maxC - minC)) * 100;

        // Clamp percentage between 5% and 100%
        if (isViolation) percent = 0;
        else percent = Math.min(Math.max(percent, 5), 100);

        thermoFill.style.height = `${percent}%`;
        thermometerPercent.textContent = `${Math.round(percent)}% scale`;
    }

    // --- Toast Notification Helper ---
    function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
