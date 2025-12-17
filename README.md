# Football Duel ⚽🎮


## 🕹️ How to Play

1.  **Host the Game**: Open the game URL on a big screen (Laptop, Monitor, or TV).
2.  **Scan & Join**: Two players scan the QR codes displayed on the host screen using their smartphones.
3.  **Fight!**: Use your phone to control your character and score more goals than your opponent before time runs out!

## 📱 Features

*   **Phone as Controller**: Real-time WebSocket connection turns your mobile device into a gamepad.
*   **Haptic Feedback**: Feel the impact! Your phone vibrates on kicks, goals, and wins.
*   **Immersive Audio**: Win/Lose themes play directly from your controller's speaker.
*   **Arcade Physics**: Satisfying ball movement, gravity, and player collisions.
*   **Glassmorphism UI**: A sleek, modern controller interface with neon glows.

## 🎮 Controls

### **Movement**
*   **◀ / ▶ D-Pad**: Move Left and Right.

### **Actions**
*   **🟢 JUMP** (Green): Jump vertically to intercept high balls or play defense.
*   **🔴 KICK** (Red): A powerful ground shot to sneak the ball under the opponent.
*   **🔵 AIR** (Blue): A chip/lob shot to launch the ball over the opponent's head.

> **Pro Tip**: Use the **AIR** button to clear the ball from your side or score spectacular header goals!

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js installed on your machine.

### Local Development
1.  Clone the repository:
    ```bash
    git clone https://github.com/Ayush-Gajera/Football-remote-control-game.git
    cd football-duel
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm start
    ```
4.  Open your browser and navigate to `http://localhost:3000`.

## 🚀 Deployment

This project is ready for **Vercel** serverless deployment.
1.  Push your code to GitHub.
2.  Import the repository into Vercel.
3.  The included `vercel.json` will automatically configure the backend routing.
4.  Deploy and play with friends online!

## 📁 Project Structure

*   `server/`: Node.js + Socket.IO backend.
*   `public/`: Frontend game assets (HTML, CSS, JS, Images).
    *   `game.js`: Core game engine (Canvas API).
    *   `controller.js`: Mobile controller logic.
    *   `style.css`: Styling for both Game and Controller.

---
*Created for the Football Remote Control Game Contribution.*
