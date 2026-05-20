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

/* 
  Main function to attach timer 
  functionality to the given DOM node
*/
function attachTimer(node) {
  const startButton = node.querySelector(".timer__start-button");
  const stopButton = node.querySelector(".timer__stop-button");
  const resetButton = node.querySelector(".timer__reset-button");

  let timer;
  let seconds = 0;

  // Populate the display with the initial time
  renderTime("00", "00", "00");

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

      // Go Fullscreen for a more immersive experience
      enterFullscreen();
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
    renderTime("00", "00", "00");

    // Release the wake lock on reset
    releaseWakeLock();
  };

  // Function to update the timer display every second
  function updateTime() {
    seconds++;
    let hrs = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    let mins = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    let secs = (seconds % 60).toString().padStart(2, "0");
    renderTime(hrs, mins, secs);

    // Play a sound on every 1 and 5 minutes
    if (mins % 5 === 0 && secs === "00") {
      playMeditativeBell();
      // Every 5 minutes, play a more meditative bell sound
    } else if (secs === "00") {
      // Every 1 minute, play a shorter and lower bell sound
      playMeditativeBell(98, 3);
    }
  }

  function renderTime(hrs, mins, secs) {
    const displayHours = node.querySelector(".timer__hours");
    const displayMinutes = node.querySelector(".timer__minutes");
    const displaySeconds = node.querySelector(".timer__seconds");

    displayHours.textContent = hrs;
    displayMinutes.textContent = mins;
    displaySeconds.textContent = secs;
  }

  // Function to play a meditative bell sound using the Web Audio API
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

// Function to request a wake lock to keep the screen on during meditation sessions
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

// Function to manually release the wake lock when the timer is stopped or reset
function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null; // Clean up your reference
      console.log("Wake Lock manually released");
    });
  }
}

// Fullscreen function to enhance the meditation experience by hiding distractions
function enterFullscreen() {
  const elem = document.documentElement;

  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }

  // Adding a class for CSS adjustments in fullscreen mode
  elem.classList.add("fullscreen");

  // Listen for changes to exit fullscreen and remove the class accordingly
  elem.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      // Remove the fullscreen class when exiting fullscreen mode
      document.documentElement.classList.remove("fullscreen");
    }
  });
}

// Exit fullscreen
function exitFullscreen() {
  if (!document.fullscreenElement) {
    return; // Not in fullscreen, no need to exit
  }

  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}
