# Echoes of the Mind 🧠👽

An original real-time multiplayer deduction game for **exactly three players**, each on a separate browser/device. One player is the **Logic Engine**, one is the **Emotional Core**, and one is the **Corrupted File** (secret saboteur).

## Play

1. One player opens the site, enters a callsign and selects **Create Neural Link**.
2. Share the invite link or 6-character room code with two other players. They join from other devices; the host can cast their screen to a TV.
3. The host starts once exactly three players are connected. Roles are randomized each round. **Keep your personal role panel private**.
4. All players see a surreal shared dream collage and selectable answers. The Logic Engine privately sees three reliable facts and sends preset commands. The Emotional Core privately sees the memory's emotion and sends coded sound/vibration pulses. The Corrupted File secretly sees a false story, may distort the signal three times, and can change shared selections.
5. Cooperate to choose **WHO, WHERE, WHAT HAPPENED and HOW IT FELT** within 3 minutes. Any player can change selections or lock them in.
6. All **four answers** must match to restore the memory (cooperative team wins). A wrong submission or expired timer means the Corrupted File wins. Everyone's role is revealed after each round.

**Note:** The person who is secretly assigned Corrupted File can submit a false answer deliberately, so the game works best among friends agreeing to give one another a chance to reason and discuss. For stricter competition a future version could add voting and submit restrictions.

## Run locally

Install Node.js 20+ and then:

```bash
npm install
npm start
```

Open `http://localhost:3000`. Other devices on the same network can use `http://YOUR_COMPUTER_LAN_IP:3000` if firewall rules allow.

## Deploy on Render

1. Create a public GitHub repository and upload `package.json`, `server.js`, `README.md`, and the complete `public/` folder.
2. In [Render](https://render.com/), select **New → Web Service**, and connect the repository.
3. Runtime: **Node**; branch: `main`; root directory: blank; build command: `npm install`; start command: `npm start`.
4. Choose the **Free** tier if offered; be sure a paid tier isn't selected unintentionally.
5. Click **Deploy Web Service**. Share the public `https://...onrender.com` URL after it reports Live.
6. Join on three devices to test. No API key or database required.

## Technical architecture

- HTML/CSS/vanilla JS responsive UI; Node.js HTTP server and `ws` WebSockets.
- Server-authoritative game state, randomized roles, room IDs, three-minute deadline, shared selections, messages and signals.
- Five handcrafted dream collages (emoji-based), no AI image-generation API needed. Abstract, predesigned visuals are an intentional cost-free alternative.
- No player accounts, analytics, storage or uploaded content.

## Browser/device notes

- Audio begins after interacting with the page, subject to browser restrictions.
- `navigator.vibrate` does **not** work on iPhones; audio pulses are the fallback.
- WebSocket games require a running server; GitHub Pages alone cannot host this project.
- Rooms live **only in server memory**. A restart or a sleeping free service loses rooms. Use one service instance; horizontal scaling requires shared room state.
- Disconnecting a player ends the ongoing round, and the remaining players can wait for someone else to join for another round. Rejoin isn't supported within the same player identity yet.

## Portfolio

Built as a creative example of real-time networking, asymmetric information, role-based UI, cooperative deduction, adversarial gameplay, cloud deployment, and event-driven JavaScript.
