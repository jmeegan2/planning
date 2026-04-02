"use strict";
const POMO_STORAGE_KEY = "pomoSettings";
const ROUNDS_BEFORE_LONG = 4;
let workMins = 25;
let shortBreakMins = 5;
let longBreakMins = 15;
// Load saved settings
const savedSettings = localStorage.getItem(POMO_STORAGE_KEY);
if (savedSettings) {
    const s = JSON.parse(savedSettings);
    workMins = s.work || 25;
    shortBreakMins = s.short || 5;
    longBreakMins = s.long || 15;
}
let phase = "work";
let secondsLeft = workMins * 60;
let running = false;
let interval = null;
let round = 1;
// DOM
const timerEl = document.getElementById("pomo-timer");
const timeDisplay = document.getElementById("pomo-time");
const phaseDisplay = document.getElementById("pomo-phase");
const roundDisplay = document.getElementById("pomo-round");
const btnStart = document.getElementById("pomo-start");
const btnReset = document.getElementById("pomo-reset");
const btnSkip = document.getElementById("pomo-skip");
const progressCircle = document.getElementById("pomo-progress");
const settingsPanel = document.getElementById("pomo-settings");
const btnSettingsToggle = document.getElementById("pomo-settings-toggle");
const inputWork = document.getElementById("pomo-work-mins");
const inputShort = document.getElementById("pomo-short-mins");
const inputLong = document.getElementById("pomo-long-mins");
const CIRCUMFERENCE = 2 * Math.PI * 45;
progressCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
// Set input values from saved settings
inputWork.value = String(workMins);
inputShort.value = String(shortBreakMins);
inputLong.value = String(longBreakMins);
function getTotalSeconds() {
    if (phase === "work")
        return workMins * 60;
    if (phase === "short-break")
        return shortBreakMins * 60;
    return longBreakMins * 60;
}
function updateDisplay() {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    timeDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const total = getTotalSeconds();
    const fraction = secondsLeft / total;
    progressCircle.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - fraction)}`;
    phaseDisplay.textContent = phase === "work" ? "Focus" : phase === "short-break" ? "Short Break" : "Long Break";
    roundDisplay.textContent = `#${round}`;
    btnStart.textContent = running ? "Pause" : "Start";
    timerEl.dataset.phase = phase;
}
function tick() {
    if (secondsLeft <= 0) {
        stop();
        notify();
        nextPhase();
        return;
    }
    secondsLeft--;
    updateDisplay();
}
function start() {
    if (running)
        return;
    running = true;
    interval = window.setInterval(tick, 1000);
    updateDisplay();
}
function stop() {
    running = false;
    if (interval !== null)
        clearInterval(interval);
    interval = null;
    updateDisplay();
}
function toggle() {
    if (running)
        stop();
    else
        start();
}
function reset() {
    stop();
    phase = "work";
    round = 1;
    secondsLeft = workMins * 60;
    updateDisplay();
}
function skip() {
    stop();
    nextPhase();
}
function nextPhase() {
    if (phase === "work") {
        if (round % ROUNDS_BEFORE_LONG === 0) {
            phase = "long-break";
            secondsLeft = longBreakMins * 60;
        }
        else {
            phase = "short-break";
            secondsLeft = shortBreakMins * 60;
        }
    }
    else {
        if (phase === "long-break" || phase === "short-break") {
            round++;
        }
        phase = "work";
        secondsLeft = workMins * 60;
    }
    updateDisplay();
}
function playAlert() {
    const ctx = new AudioContext();
    const pattern = [
        { freq: 880, time: 0 },
        { freq: 880, time: 0.15 },
        { freq: 880, time: 0.3 },
        { freq: 0, time: 0.6 },
        { freq: 880, time: 0.8 },
        { freq: 880, time: 0.95 },
        { freq: 880, time: 1.1 },
    ];
    pattern.forEach(({ freq, time }) => {
        if (freq === 0)
            return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.value = 0.4;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.12);
    });
}
function notify() {
    playAlert();
    if ("Notification" in window && Notification.permission === "granted") {
        const msg = phase === "work" ? "Break's over — time to focus!" : "Nice work! Take a break.";
        new Notification("Pomodoro", { body: msg, icon: "icon-192.png" });
    }
}
// Request notification permission
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}
// Settings
btnSettingsToggle.addEventListener("click", () => {
    settingsPanel.style.display = settingsPanel.style.display === "none" ? "table" : "none";
});
function saveSettings() {
    workMins = parseInt(inputWork.value) || 25;
    shortBreakMins = parseInt(inputShort.value) || 5;
    longBreakMins = parseInt(inputLong.value) || 15;
    localStorage.setItem(POMO_STORAGE_KEY, JSON.stringify({ work: workMins, short: shortBreakMins, long: longBreakMins }));
    if (!running) {
        secondsLeft = getTotalSeconds();
        updateDisplay();
    }
}
inputWork.addEventListener("change", saveSettings);
inputShort.addEventListener("change", saveSettings);
inputLong.addEventListener("change", saveSettings);
// Collapse/expand
const btnTogglePomo = document.getElementById("pomo-toggle");
btnTogglePomo.addEventListener("click", () => {
    timerEl.classList.toggle("collapsed");
});
btnStart.addEventListener("click", toggle);
btnReset.addEventListener("click", reset);
btnSkip.addEventListener("click", skip);
updateDisplay();
