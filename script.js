// Keeping a reference to the wake lock so we can release it later if needed
let wakeLock = null;

// When the page loads, attach the timer functionality to the root node
window.addEventListener("DOMContentLoaded", () => {
  const node = document.getElementById("root");
  attachTimer(node);
});

// Re-request the wake lock if the page becomes visible again after being hidden
// (e.g., user switches tabs or locks/unlocks the screen)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    requestWakeLock();
  }
});

function attachTimer(node) {
  const display = node.querySelector(".timer__time");
  const startButton = node.querySelector(".timer__start-button");
  const stopButton = node.querySelector(".timer__stop-button");
  const resetButton = node.querySelector(".timer__reset-button");

  let timer;
  let seconds = 0;

  // Populate the display with the initial time
  display.textContent = "00:00:00";

  // Set up the audio context
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Start the timer
  startButton.onclick = () => {
    if (!timer) {
      timer = setInterval(updateTime, 1000);
      // Request a wake lock to keep the screen on during the meditation session
      requestWakeLock();

      // Play a shorter and lower bell sound immediately when starting the timer
      playMeditativeBell(98, 3);
    }
  };

  // Stop the timer
  stopButton.onclick = () => {
    clearInterval(timer);
    timer = null;

    // Release the wake lock when the timer is stopped
    releaseWakeLock();
  };

  // Reset everything
  resetButton.onclick = () => {
    clearInterval(timer);
    timer = null;
    seconds = 0;
    display.textContent = "00:00:00";

    // Release the wake lock on reset
    releaseWakeLock();
  };

  function updateTime() {
    seconds++;
    let hrs = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    let mins = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    let secs = (seconds % 60).toString().padStart(2, "0");
    display.innerText = `${hrs}:${mins}:${secs}`;

    // Play a sound on every 1 and 5 minutes
    if (mins % 5 === 0 && secs === "00") {
      playMeditativeBell();
      // Every 5 minutes, play a more meditative bell sound
    } else if (secs === "00") {
      // Every 1 minute, play a shorter and lower bell sound
      playMeditativeBell(98, 3);
    }
  }

  function playMeditativeBell(
    fundamental = 130.81 /* C3 note - a deep, calming bell */,
    duration = 6 /* Long, lingering tail */,
  ) {
    const now = audioCtx.currentTime;

    // We use a few partials that are "close" but not perfect to create warmth
    const partials = [
      { ratio: 1.0, volume: 0.4, detune: 0 },
      { ratio: 1.0, volume: 0.2, detune: 1.5 }, // Slightly detuned for "shimmer"
      { ratio: 2.01, volume: 0.1, detune: 0 },
      { ratio: 3.0, volume: 0.05, detune: 0 },
    ];

    partials.forEach((p) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(fundamental * p.ratio, now);
      osc.detune.setValueAtTime(p.detune, now);

      // --- The Meditative Envelope ---
      gain.gain.setValueAtTime(0, now);
      // Soft attack: fades in over 0.03s to sound like a soft mallet
      gain.gain.linearRampToValueAtTime(p.volume, now + 0.03);
      // Very slow decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // --- Lowpass Filter (To keep it warm) ---
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, now);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 1);
    });
  }
}

async function requestWakeLock() {
  // Only request if we don't already have an active lock
  if (wakeLock !== null && !wakeLock.released) {
    console.log("Wake lock is already active. Skipping request.");
    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("New Wake Lock acquired!");

    // Reset the variable if the system releases it
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      console.log("Wake Lock released.");
    });
  } catch (err) {
    console.error(err);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null; // Clean up your reference
      console.log("Wake Lock manually released");
    });
  }
}
