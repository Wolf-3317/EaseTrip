// manage client interactions

// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initAlerts();
    initDateInputs();
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');

    if (mobileBtn && nav) {
        mobileBtn.addEventListener('click', function () {
            nav.classList.toggle('active');
        });
    }
}

// Auto-dismiss alerts after 5 seconds
function initAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function (alert) {
        setTimeout(function () {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(function () {
                alert.remove();
            }, 300);
        }, 5000);
    });
}

// Set minimum date for date inputs (today)
function initDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    const checkInInputs = document.querySelectorAll('input[name="check_in"], #checkIn');
    const checkOutInputs = document.querySelectorAll('input[name="check_out"], #checkOut');

    checkInInputs.forEach(function (input) {
        input.setAttribute('min', today);
        input.addEventListener('change', function () {
            const checkOut = this.closest('form').querySelector('input[name="check_out"], #checkOut');
            if (checkOut) {
                checkOut.setAttribute('min', this.value);
                if (checkOut.value && checkOut.value < this.value) {
                    checkOut.value = this.value;
                }
            }
        });
    });

    checkOutInputs.forEach(function (input) {
        input.setAttribute('min', today);
    });
}

// Toggle Favorite
async function toggleFavorite(button, listingId) {
    try {
        const response = await fetch('/api/favorites/toggle/' + listingId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            const icon = button.querySelector('i');
            if (data.favorited) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                button.classList.add('active');
                button.style.color = 'var(--primary)';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('active');
                button.style.color = '';
            }
        } else if (response.status === 401) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Weather Popup Functions
function showWeatherPopup(city) {
    const popup = document.getElementById('weatherPopup');
    const checkInInput = document.getElementById('checkIn');
    const date = checkInInput ? checkInInput.value : '';

    popup.classList.add('active');
    document.getElementById('weatherCity').textContent = city;

    // Always fully reset all three panels on every open
    document.getElementById('weatherLoading').style.display = 'none';
    document.getElementById('weatherData').classList.remove('active');
    const unavailableEl = document.getElementById('weatherUnavailable');
    unavailableEl.classList.remove('active');

    if (!date) {
        document.getElementById('weatherDate').textContent = '';
        unavailableEl.innerHTML = '<i class="fas fa-calendar-alt"></i><p>Please select a check-in date to view the weather forecast.</p>';
        unavailableEl.classList.add('active');
        return;
    }

    document.getElementById('weatherDate').textContent = formatDate(date);
    unavailableEl.innerHTML = '<i class="fas fa-calendar-times"></i><p>Weather data is not available for this date.</p>';
    document.getElementById('weatherLoading').style.display = 'block';
    fetchWeather(city, date);
}

function closeWeatherPopup() {
    const popup = document.getElementById('weatherPopup');
    popup.classList.remove('active');
}

async function fetchWeather(city, date) {
    try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}&date=${date}`);
        const data = await response.json();

        // Always reset all panels before showing result
        document.getElementById('weatherLoading').style.display = 'none';
        document.getElementById('weatherData').classList.remove('active');
        document.getElementById('weatherUnavailable').classList.remove('active');
        if (data.available) {
            document.getElementById('tempHigh').textContent = data.temperature.high != null ? Math.round(data.temperature.high) : '--';
            document.getElementById('tempLow').textContent = data.temperature.low != null ? Math.round(data.temperature.low) : '--';
            document.getElementById('weatherCondition').textContent = data.description || data.condition;
            document.getElementById('morningForecast').textContent = data.morning || 'No data';
            document.getElementById('afternoonForecast').textContent = data.afternoon || 'No data';
            document.getElementById('nightForecast').textContent = data.night || 'No data';
            updateWeatherIcon(data.condition);
            document.getElementById('weatherData').classList.add('active');
        } else {
            const unavailableEl = document.getElementById('weatherUnavailable');
            unavailableEl.innerHTML = '<i class="fas fa-calendar-times"></i><p>' + (data.message || 'Weather data is not available for this date.') + '</p>';
            unavailableEl.classList.add('active');
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('weatherLoading').style.display = 'none';
        document.getElementById('weatherData').classList.remove('active');
        const unavailableEl = document.getElementById('weatherUnavailable');
        unavailableEl.innerHTML = '<i class="fas fa-calendar-times"></i><p>Unable to load weather data. Please try again.</p>';
        unavailableEl.classList.add('active');
    }
}

function updateWeatherIcon(condition) {
    const iconElement = document.querySelector('#weatherIcon i');
    const iconMap = {
        'Clear': 'fa-sun',
        'Clouds': 'fa-cloud',
        'Rain': 'fa-cloud-rain',
        'Drizzle': 'fa-cloud-rain',
        'Thunderstorm': 'fa-bolt',
        'Snow': 'fa-snowflake',
        'Mist': 'fa-smog',
        'Fog': 'fa-smog'
    };

    iconElement.className = 'fas ' + (iconMap[condition] || 'fa-sun');
}

function formatDate(dateString) {
    if (!dateString) return 'Select a date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Close weather popup when clicking overlay
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('weather-popup-overlay')) {
        closeWeatherPopup();
    }
});

// Close weather popup on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeWeatherPopup();
    }
});

// Image preview for file inputs
function previewImages(input) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;

    preview.innerHTML = '';

    if (input.files) {
        Array.from(input.files).forEach(function (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100px';
                img.style.height = '75px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
}