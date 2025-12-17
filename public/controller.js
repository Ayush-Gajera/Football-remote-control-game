const socket = io();

// Get params
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const player = urlParams.get('player');

if (!roomId || !player) {
    alert("Invalid Room URL!");
}

// Setup UI Theme
const body = document.getElementById('controller-body');
const tag = document.getElementById('player-tag-ctrl');

tag.innerText = `P${player}`;
if (player === '1') {
    body.classList.add('p1-theme');
} else {
    body.classList.add('p2-theme');
}

// Enable Controls / Permission Request
const startOverlay = document.getElementById('start-overlay');
const enableBtn = document.getElementById('enable-btn');

enableBtn.addEventListener('click', async () => {
    // 1. Show UI Immediately (Blocking interaction is bad)
    startOverlay.style.display = 'none';

    // 2. Unlock Audio (iOS requires user interaction to play audio later)
    const unlockAudio = async (id) => {
        const audio = document.getElementById(id);
        if (!audio) return;
        try {
            audio.volume = 0; // Silent unlock
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1.0; // Restore volume
        } catch (e) {
            console.warn(`Audio unlock failed for ${id}:`, e);
        }
    };

    await unlockAudio('win-sound');
    await unlockAudio('lose-sound');

    // 3. Vibration Unlock
    if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) { }
    }

    // 4. Fullscreen (Best Effort)
    try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen(); // Safari/iOS
        } else if (docEl.mozRequestFullScreen) {
            await docEl.mozRequestFullScreen();
        }
    } catch (err) {
        console.log('Fullscreen denied/failed:', err);
    }
});

socket.on('game-over', ({ winner }) => {
    const isWinner = (parseInt(player) === winner);

    // VISUAL FEEDBACK (Critical if sound fails)
    const btnContainer = document.querySelector('.button-container');
    document.body.style.backgroundColor = isWinner ? '#27ae60' : '#c0392b'; // Green/Red

    // AUDIO FEEDBACK
    const audioId = isWinner ? 'win-sound' : 'lose-sound';
    const audio = document.getElementById(audioId);

    if (audio) {
        // Reset and Play
        audio.currentTime = 0;
        audio.volume = 1.0;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Audio playback error:", error);
                // Fallback: simple beep? No simple browser beep exists without AudioContext.
            });
        }
    }

    // VIBRATION
    if (navigator.vibrate) {
        navigator.vibrate(isWinner ? [100, 50, 100, 50, 100] : 500);
    }

    // RESET UI
    setTimeout(() => {
        document.body.style.backgroundColor = '#1a1a1a';
    }, 2000);
});

// Connect
socket.emit('join-room', { roomId, player });

// --- Input Handling ---

// Generic Button Handler
function attachButton(id, onPress, onRelease) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const start = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (onPress) onPress();
    };

    const end = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        if (onRelease) onRelease();
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });

    // Mouse fallback
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
}

// Movement
attachButton('btn-left',
    () => socket.emit('move-start', { roomId, player, direction: -1 }),
    () => socket.emit('move-stop', { roomId, player })
);

attachButton('btn-right',
    () => socket.emit('move-start', { roomId, player, direction: 1 }),
    () => socket.emit('move-stop', { roomId, player })
);

// Actions
attachButton('btn-jump', () => socket.emit('action-jump', { roomId, player }));
attachButton('btn-kick', () => socket.emit('action-kick', { roomId, player }));
attachButton('btn-air', () => socket.emit('action-air-hit', { roomId, player }));


// --- Feedback Handling ---

socket.on('feedback', ({ type, data }) => {
    // Vibration Logic
    if (!navigator.vibrate) return;

    if (type === 'ball-hit') {
        navigator.vibrate(40);
    } else if (type === 'goal') {
        if (data.winner == player) {
            navigator.vibrate([100, 50, 100]);
        } else {
            navigator.vibrate(200);
        }
    }
});
