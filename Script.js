// --- PAGE LOAD SECURITY & SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    const isMainPage = document.getElementById('main-dashboard');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    // If on main page but NOT logged in, redirect to login
    if (isMainPage && isLoggedIn !== 'true') {
        window.location.href = 'login.html';
    } 
    // If logged in and on the main page, load their data
    else if (isMainPage && isLoggedIn === 'true') {
        const userName = localStorage.getItem('agro_user_name') || 'Farmer';
        const userEmail = localStorage.getItem('agro_user_email') || '';
        
        document.getElementById('displayUserName').innerText = userName.split(" ")[0];
        document.getElementById('infoModalName').innerText = userName;
        document.getElementById('infoModalEmail').innerText = userEmail;
        
        initWeather();
    }
});

// --- DATA STORAGE ---
let searchHistory = [];

// --- AUTHENTICATION LOGIC ---
function handleAuth(event, mode) {
    event.preventDefault(); 
    
    if (mode === 'register') {
        const userName = document.getElementById('regName').value;
        const userEmail = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        localStorage.setItem('agro_user_email', userEmail);
        localStorage.setItem('agro_user_name', userName);
        localStorage.setItem('agro_user_pass', password);
        localStorage.setItem('isLoggedIn', 'true');
        
        window.location.href = 'index.html'; // Redirect to App
        
    } else if (mode === 'login') {
        const userEmail = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        const savedEmail = localStorage.getItem('agro_user_email');
        const savedPass = localStorage.getItem('agro_user_pass');
        
        if (userEmail === savedEmail && password === savedPass) {
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'index.html'; // Redirect to App
        } else if (savedEmail) {
            alert("Incorrect email or password!");
        } else {
            alert("Account not found. Please Sign Up first.");
            window.location.href = 'signup.html';
        }
    }
}

function logoutApp() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// --- LIVE WEATHER WIDGET ---
async function fetchWeather(lat, lon, cityName) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const response = await fetch(url);
        const data = await response.json();
        
        document.getElementById('weatherTemp').innerText = `${data.current_weather.temperature}°C`;
        document.getElementById('weatherCity').innerText = `📍 ${cityName}`;
        document.getElementById('weatherDesc').innerText = "Live Farm Conditions";
    } catch (err) {
        document.getElementById('weatherCity').innerText = "📍 Weather Offline";
    }
}

function initWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => fetchWeather(position.coords.latitude, position.coords.longitude, "Local Farm"),
            (error) => fetchWeather(12.9716, 77.5946, "Bengaluru (Default)")
        );
    } else {
        fetchWeather(12.9716, 77.5946, "Bengaluru (Default)");
    }
}

// --- MENU & MODAL LOGIC ---
function toggleProfileMenu(event) {
    event.stopPropagation();
    document.getElementById('profileMenu').classList.toggle('show');
}
window.onclick = function(event) {
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu && !event.target.closest('.user-profile')) {
        profileMenu.classList.remove('show');
    }
}
function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

// --- HISTORY LOGIC ---
function addSearchToHistory(type, query) {
    const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    searchHistory.unshift({ type: type, query: query, time: timeString });
    
    const list = document.getElementById('historyList');
    if(list) {
        list.innerHTML = searchHistory.map(item => `
            <div class="history-item">
                <span class="history-time">${item.time}</span>
                <strong>${item.type}:</strong> ${item.query}
            </div>
        `).join('');
    }
}

// --- VOICE ASSISTANT ---
let recognition;
let isListening = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function() {
        isListening = true;
        document.getElementById('micBtn').classList.add('recording');
    };
    recognition.onresult = function(event) {
        document.getElementById('chatInput').value = event.results[0][0].transcript;
    };
    recognition.onerror = function(event) {
        alert("Microphone Error: " + event.error + "\n\nFix: Ensure you are using Google Chrome and running a Local Server, and clicked 'Allow' for the mic.");
        stopListening();
    };
    recognition.onend = function() { stopListening(); };
}

function toggleVoice() {
    if (!recognition) return alert("Your browser does not support the microphone feature.");
    if (isListening) {
        recognition.stop();
    } else {
        const lang = document.getElementById('langSelect').value;
        recognition.lang = lang === 'Hindi' ? 'hi-IN' : lang === 'Kannada' ? 'kn-IN' : 'en-IN'; 
        recognition.start();
    }
}

function stopListening() {
    isListening = false;
    const micBtn = document.getElementById('micBtn');
    if(micBtn) micBtn.classList.remove('recording');
}

function speakAIResponse(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const lang = document.getElementById('langSelect').value;
    utterance.lang = lang === 'Hindi' ? 'hi-IN' : lang === 'Kannada' ? 'kn-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
}

// --- AI LOGIC ---
// REPLACE THIS WITH YOUR REAL API KEY!
const API_KEY = "YOUR_API_KEY_HERE"; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ mimeType: file.type, data: reader.result.split(',')[1] });
        reader.onerror = error => reject(error);
    });
}

async function analyzeImage() {
    const fileInput = document.getElementById('leafImage');
    const resultDiv = document.getElementById('visionResult');
    const loadingText = document.getElementById('visionLoading');
    const btn = document.getElementById('visionBtn');
    const selectedLang = document.getElementById('langSelect').value;

    if (!fileInput.files[0]) return alert("Please select an image file first!");
    addSearchToHistory("Image Upload", fileInput.files[0].name);

    loadingText.style.display = 'block'; resultDiv.style.display = 'none'; btn.disabled = true;

    try {
        const imageInfo = await getBase64(fileInput.files[0]);
        const payload = {
            contents: [{
                parts: [
                    { text: `You are AGRO-GPT. Identify the crop, detect diseases, and suggest treatment. IMPORTANT: You must reply entirely in ${selectedLang} language.` },
                    { inline_data: { mime_type: imageInfo.mimeType, data: imageInfo.data } }
                ]
            }]
        };

        const response = await fetch(GEMINI_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) {
            resultDiv.innerHTML = `<span style="color:red;">API Error: ${data.error.message}</span>`;
        } else {
            let aiText = data.candidates[0].content.parts[0].text;
            resultDiv.innerHTML = aiText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            speakAIResponse(aiText); 
        }
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.innerHTML = `<span style="color:red;">Error connecting to AI: ${error.message}</span>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingText.style.display = 'none'; btn.disabled = false;
    }
}

function fillChat(text) {
    document.getElementById('chatInput').value = text;
    sendMessage();
}

async function sendMessage() {
    const inputField = document.getElementById('chatInput');
    const chatBox = document.getElementById('chatBox');
    const loadingText = document.getElementById('chatLoading');
    const btn = document.getElementById('chatBtn');
    const message = inputField.value.trim();
    const selectedLang = document.getElementById('langSelect').value;

    if (!message) return;

    addSearchToHistory("Chat", message);

    const userDiv = document.createElement('div');
    userDiv.className = 'message user-msg';
    userDiv.textContent = message;
    chatBox.appendChild(userDiv);
    
    inputField.value = ''; chatBox.scrollTop = chatBox.scrollHeight;
    loadingText.style.display = 'block'; btn.disabled = true; document.getElementById('micBtn').disabled = true;

    try {
        const payload = {
            contents: [{
                parts: [
                    { text: `You are AGRO-GPT, an expert AI agent for farmers. Give concise advice. User question: ${message}. IMPORTANT: You must reply entirely in ${selectedLang} language.` }
                ]
            }]
        };

        const response = await fetch(GEMINI_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-msg';
        
        if (data.error) {
            botDiv.innerHTML = `<span style="color:red;">API Error: ${data.error.message}</span>`;
        } else {
            let aiText = data.candidates[0].content.parts[0].text;
            botDiv.innerHTML = aiText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            speakAIResponse(aiText); 
        }
        chatBox.appendChild(botDiv);
    } catch (error) {
        const errDiv = document.createElement('div');
        errDiv.className = 'message bot-msg';
        errDiv.innerHTML = `<span style="color:red;">Error: Could not connect to AI.</span>`;
        chatBox.appendChild(errDiv);
    } finally {
        loadingText.style.display = 'none'; btn.disabled = false; document.getElementById('micBtn').disabled = false;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function handleEnter(event) { if (event.key === 'Enter') sendMessage(); }
function updateLanguage() { /* Placeholder for future advanced UI translations */ }