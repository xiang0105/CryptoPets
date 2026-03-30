<template>
  <div class="app-shell">
    <div class="game-ui">
      <!-- Top Navigation -->
      <header class="topbar">
        <div class="nav-group left-nav">
          <button class="icon-home">⌂</button>

          <button
            v-for="item in navItems"
            :key="item"
            class="nav-btn"
            :class="{ active: item === 'Expeditions' }"
          >
            {{ item }}
          </button>
        </div>

        <div class="title-badge">
          <div class="capy-head">
            <span class="ear left"></span>
            <span class="ear right"></span>
            <span class="face"></span>
          </div>
          <span class="title-text">CAPY'S BIG ADVENTURE LOG</span>
        </div>

        <div class="nav-group right-tools">
          <button v-for="tool in tools" :key="tool" class="tool-btn">
            {{ tool }}
          </button>
        </div>
      </header>

      <!-- Main panel -->
      <main class="content-frame">
        <!-- decorative sides -->
        <div class="side-decor left">
          <div class="fruit yuzu"></div>
          <div class="flower orange"></div>
          <div class="dot"></div>
          <button class="side-arrow">‹</button>
          <div class="flower orange"></div>
          <div class="flower blue"></div>
          <div class="fruit yuzu"></div>
        </div>

        <div class="side-decor right">
          <div class="fruit yuzu"></div>
          <div class="flower orange"></div>
          <button class="side-arrow">›</button>
          <div class="flower blue"></div>
          <div class="flower pink"></div>
          <div class="fruit mixed"></div>
        </div>

        <section class="main-board">
          <!-- top split -->
          <div class="top-panels">
            <!-- left expedition scene -->
            <section class="scene-panel">
              <div class="scene-header">
                <span class="scene-title">ACTIVE EXPEDITION: Ancient Forest Mission</span>
                <div class="scene-actions">
                  <button>👥</button>
                  <button>⚙</button>
                  <button>↕</button>
                </div>
              </div>

              <div class="forest-scene">
                <div class="sky-glow"></div>
                <div class="castle"></div>

                <div class="tree left-tree"></div>
                <div class="tree right-tree"></div>
                <div class="tree mid-tree"></div>

                <div class="path"></div>
                <div class="river"></div>

                <div class="mushrooms left-mushrooms"></div>
                <div class="mushrooms right-mushrooms"></div>
                <div class="stone stone-1"></div>
                <div class="stone stone-2"></div>

                <div class="capy-group">
                  <div class="capy samurai">
                    <span class="fruit-top"></span>
                  </div>
                  <div class="capy leader">
                    <span class="fruit-top yuzu-mini"></span>
                  </div>
                  <div class="capy scout"></div>
                  <div class="capy bath"></div>
                </div>
              </div>

              <div class="scene-footer">
                <div class="footer-block progress-block">
                  <div class="footer-label">PROGRESS: Day 7/14</div>
                  <div class="progress-bar">
                    <div class="progress-fill"></div>
                  </div>
                </div>

                <div class="footer-block">
                  <div class="footer-label">NEXT EVENT:</div>
                  <div class="footer-sub">Find the Gigantic Yuzu! (1h 12m)</div>
                </div>

                <div class="footer-block">
                  <div class="footer-label">GOAL:</div>
                  <div class="footer-sub">Golden Pompon (7 days left)</div>
                </div>
              </div>
            </section>

            <!-- right log -->
            <section class="status-panel">
              <div class="status-header">Current Status</div>

              <div class="log-paper">
                <div class="paper-rings">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div class="paper-title">EXPEDITION LOG</div>

                <div class="log-lines">
                  <div v-for="(item, index) in logs" :key="index" class="log-item">
                    <span class="time">{{ item.time }}</span>
                    <span class="text">{{ item.text }}</span>
                    <span v-if="item.highlight" class="highlight">{{ item.highlight }}</span>
                  </div>
                </div>

                <div class="paper-corner"></div>
              </div>
            </section>
          </div>

          <!-- divider title -->
          <div class="section-title-wrap">
            <div class="section-line"></div>
            <div class="section-title">PET PARTY STATS &amp; OVERVIEW</div>
            <div class="section-line"></div>
          </div>

          <!-- cards -->
          <section class="cards-grid">
            <article
              v-for="pet in pets"
              :key="pet.name"
              class="pet-card"
              :class="pet.theme"
            >
              <div class="pet-card-header">
                <div class="pet-mini-icon">{{ pet.emoji }}</div>
                <div class="pet-name-wrap">
                  <div class="pet-name">{{ pet.name }}</div>
                  <div class="pet-role">{{ pet.role }}</div>
                </div>
              </div>

              <div class="pet-main">
                <div class="pet-portrait" :class="pet.theme">
                  <div class="portrait-capy">{{ pet.portrait }}</div>
                </div>

                <div class="pet-basic">
                  <div class="lv">Lv. {{ pet.level }}</div>

                  <div class="bar-row" v-for="bar in pet.bars" :key="bar.label">
                    <span class="bar-label">{{ bar.label }}</span>
                    <div class="stat-bar">
                      <div class="stat-bar-fill" :class="bar.type" :style="{ width: bar.percent + '%' }"></div>
                      <span class="bar-value">{{ bar.value }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pet-info">
                <div class="stats-box">
                  <div>ATK: <b>{{ pet.stats.atk }}</b></div>
                  <div>DEF: <b>{{ pet.stats.def }}</b></div>
                  <div>SPD: <b>{{ pet.stats.spd }}</b></div>
                </div>

                <div class="stats-box">
                  <div>LUK: <b>{{ pet.stats.luk }}</b></div>
                  <div>INT: <b>{{ pet.stats.int }}</b></div>
                  <div class="skills-title">SKILLS</div>
                  <div class="skills-list">
                    <div v-for="skill in pet.skills" :key="skill" class="skill-item">
                      <span class="skill-icon">✦</span>
                      <span>{{ skill }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pet-bottom-icons">
                <span v-for="(tag, i) in pet.tags" :key="i" class="bottom-icon">{{ tag }}</span>
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
const navItems = ['Home', 'Pets', 'Expeditions', 'Inventory']
const tools = ['🐹', '🐾', '🍃', '⚓', '?', '✕']

const logs = [
  { time: '08:15 -', text: 'Found a very large Yuzu', highlight: '(+5 Chill)' },
  { time: '12:30 -', text: 'Napped with a friendly ladybug!' },
  { time: '16:45 -', text: 'Path: Pompom Meadow.' }
]

const pets = [
  {
    name: 'CAPY-SAN',
    role: '(Leader capybara)',
    emoji: '🐹',
    portrait: '🦌',
    theme: 'green',
    level: 24,
    bars: [
      { label: 'HP', value: '100/100', percent: 100, type: 'hp' },
      { label: 'MP', value: '30/30', percent: 100, type: 'mp' },
      { label: 'EXP', value: '880/1200', percent: 73, type: 'exp' }
    ],
    stats: { atk: 75, def: 60, spd: 55, luk: 8, int: 4 },
    skills: ['Nap Attack', 'Bash'],
    tags: ['🗡', '🛡']
  },
  {
    name: 'YUZU-BOY',
    role: '(Fire soul)',
    emoji: '🔥',
    portrait: '🍊',
    theme: 'orange',
    level: 22,
    bars: [
      { label: 'HP', value: '95/95', percent: 100, type: 'hp' },
      { label: 'MP', value: '70/70', percent: 100, type: 'mp' }
    ],
    stats: { atk: 85, def: 40, spd: 65, luk: 1, int: 0 },
    skills: ['Yuzu Toss', 'Warmth'],
    tags: ['🍊', '🔥']
  },
  {
    name: 'KOKO',
    role: '(Frosty paws capybara)',
    emoji: '❄',
    portrait: '🧣',
    theme: 'blue',
    level: 23,
    bars: [
      { label: 'HP', value: '90/90', percent: 100, type: 'hp' },
      { label: 'MP', value: '90/90', percent: 100, type: 'mp' }
    ],
    stats: { atk: 55, def: 70, spd: 80, luk: 12, int: 0 },
    skills: ['Ice Poke', 'Float on River'],
    tags: ['❄', '🌊']
  },
  {
    name: 'BOBO',
    role: '(Tank capybara)',
    emoji: '🛁',
    portrait: '🧼',
    theme: 'pink',
    level: 25,
    bars: [
      { label: 'HP', value: '120/120', percent: 100, type: 'hp' },
      { label: 'MP', value: '20/20', percent: 100, type: 'mp' }
    ],
    stats: { atk: 90, def: 85, spd: 30, luk: 16, int: 0 },
    skills: ['Relax Shield', 'Gurgle'],
    tags: ['🌀', '🫧']
  }
]
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: "Trebuchet MS", "Verdana", sans-serif;
  background: linear-gradient(180deg, #9ed8d7 0%, #7bc6cb 100%);
}

.app-shell {
  min-height: 100vh;
  padding: 18px;
  background: linear-gradient(180deg, #9dd9d7 0%, #7ec8cb 100%);
}

.game-ui {
  width: 100%;
  max-width: 1680px;
  margin: 0 auto;
  border: 4px solid #2b8d9f;
  border-radius: 18px;
  background: #f5ead5;
  box-shadow:
    inset 0 0 0 4px #9ad6d8,
    0 10px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* topbar */
.topbar {
  height: 72px;
  background: linear-gradient(180deg, #8ad1d3 0%, #73c0c7 100%);
  border-bottom: 4px solid #2f8395;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.icon-home,
.nav-btn,
.tool-btn,
.side-arrow,
.scene-actions button {
  border: none;
  outline: none;
  cursor: pointer;
  font-weight: 900;
}

.icon-home {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  font-size: 28px;
  color: #6b4d27;
  background: linear-gradient(180deg, #ffd9a6 0%, #f0b97a 100%);
  border: 3px solid #956a35;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.5);
}

.nav-btn {
  height: 52px;
  padding: 0 18px;
  font-size: 26px;
  color: #ebf7f8;
  background: transparent;
  border-radius: 16px 16px 0 0;
  text-shadow:
    -2px -2px 0 #396f84,
    2px -2px 0 #396f84,
    -2px 2px 0 #396f84,
    2px 2px 0 #396f84;
}

.nav-btn.active {
  background: #f6eed2;
  color: #efe6be;
  border: 4px solid #327f91;
  border-bottom: none;
  text-shadow:
    -2px -2px 0 #567081,
    2px -2px 0 #567081,
    -2px 2px 0 #567081,
    2px 2px 0 #567081;
  box-shadow: 0 -2px 0 rgba(255,255,255,0.45) inset;
}

.title-badge {
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  height: 62px;
  min-width: 590px;
  border-radius: 28px;
  border: 4px solid #4d7e94;
  background: linear-gradient(180deg, #73c5da 0%, #67b5cb 100%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px 0 18px;
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.45),
    0 4px 0 rgba(0,0,0,0.12);
}

.capy-head {
  width: 56px;
  height: 42px;
  background: #bf7d4f;
  border: 3px solid #7f4c2e;
  border-radius: 46% 54% 50% 50%;
  position: relative;
  flex-shrink: 0;
}

.capy-head .ear {
  position: absolute;
  top: -8px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #bf7d4f;
  border: 3px solid #7f4c2e;
}

.capy-head .ear.left {
  left: 6px;
}

.capy-head .ear.right {
  right: 6px;
}

.capy-head .face {
  position: absolute;
  right: 10px;
  top: 13px;
  width: 16px;
  height: 12px;
  border-right: 3px solid #5f3620;
  border-radius: 50%;
}

.title-text {
  font-size: 28px;
  font-weight: 900;
  white-space: nowrap;
  color: #ffd575;
  letter-spacing: 0.5px;
  text-shadow:
    -3px -3px 0 #73492d,
    3px -3px 0 #73492d,
    -3px 3px 0 #73492d,
    3px 3px 0 #73492d;
}

.right-tools {
  gap: 8px;
}

.tool-btn {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 3px solid #496b76;
  background: linear-gradient(180deg, #7ac7d7 0%, #67b1c3 100%);
  color: #ffdf84;
  font-size: 25px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.4);
}

/* content */
.content-frame {
  position: relative;
  padding: 18px 34px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1)),
    #f9f1dd;
}

.main-board {
  border: 4px solid #c2ab83;
  border-radius: 16px;
  background: #fbf4e3;
  padding: 18px 18px 22px;
  min-height: 860px;
}

.top-panels {
  display: grid;
  grid-template-columns: 2.15fr 1fr;
  gap: 14px;
}

/* side decor */
.side-decor {
  position: absolute;
  top: 30px;
  bottom: 24px;
  width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
  justify-content: space-between;
}

.side-decor.left {
  left: 8px;
}

.side-decor.right {
  right: 8px;
}

.fruit {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  position: relative;
  border: 4px solid #b76f24;
  background: radial-gradient(circle at 35% 30%, #ffd777 0%, #ffb53e 55%, #ea8f20 100%);
}

.fruit::before {
  content: "";
  position: absolute;
  width: 20px;
  height: 10px;
  background: #69b24a;
  border-radius: 14px 14px 4px 14px;
  left: 10px;
  top: -8px;
  transform: rotate(-18deg);
  border: 2px solid #4c8a39;
}

.fruit.mixed {
  background:
    radial-gradient(circle at 30% 30%, #ffdd79 0%, #ffbe47 45%, #f08a28 70%),
    radial-gradient(circle at 70% 70%, #ff7f80 0%, #db5a63 40%, transparent 42%);
}

.flower {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  position: relative;
  background:
    radial-gradient(circle at center, #ffe9aa 0 23%, transparent 25%),
    radial-gradient(circle at 50% 0%, #f5b060 0 30%, transparent 32%),
    radial-gradient(circle at 100% 50%, #f5b060 0 30%, transparent 32%),
    radial-gradient(circle at 50% 100%, #f5b060 0 30%, transparent 32%),
    radial-gradient(circle at 0% 50%, #f5b060 0 30%, transparent 32%),
    radial-gradient(circle at 18% 18%, #f5b060 0 24%, transparent 26%),
    radial-gradient(circle at 82% 18%, #f5b060 0 24%, transparent 26%),
    radial-gradient(circle at 18% 82%, #f5b060 0 24%, transparent 26%),
    radial-gradient(circle at 82% 82%, #f5b060 0 24%, transparent 26%);
}

.flower.blue {
  background:
    radial-gradient(circle at center, #fff0bf 0 23%, transparent 25%),
    radial-gradient(circle at 50% 0%, #a8dcea 0 30%, transparent 32%),
    radial-gradient(circle at 100% 50%, #a8dcea 0 30%, transparent 32%),
    radial-gradient(circle at 50% 100%, #a8dcea 0 30%, transparent 32%),
    radial-gradient(circle at 0% 50%, #a8dcea 0 30%, transparent 32%),
    radial-gradient(circle at 18% 18%, #a8dcea 0 24%, transparent 26%),
    radial-gradient(circle at 82% 18%, #a8dcea 0 24%, transparent 26%),
    radial-gradient(circle at 18% 82%, #a8dcea 0 24%, transparent 26%),
    radial-gradient(circle at 82% 82%, #a8dcea 0 24%, transparent 26%);
}

.flower.pink {
  background:
    radial-gradient(circle at center, #fff0bf 0 23%, transparent 25%),
    radial-gradient(circle at 50% 0%, #f3b5c9 0 30%, transparent 32%),
    radial-gradient(circle at 100% 50%, #f3b5c9 0 30%, transparent 32%),
    radial-gradient(circle at 50% 100%, #f3b5c9 0 30%, transparent 32%),
    radial-gradient(circle at 0% 50%, #f3b5c9 0 30%, transparent 32%),
    radial-gradient(circle at 18% 18%, #f3b5c9 0 24%, transparent 26%),
    radial-gradient(circle at 82% 18%, #f3b5c9 0 24%, transparent 26%),
    radial-gradient(circle at 18% 82%, #f3b5c9 0 24%, transparent 26%),
    radial-gradient(circle at 82% 82%, #f3b5c9 0 24%, transparent 26%);
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f1cf68;
  border: 3px solid #caa34a;
}

.side-arrow {
  width: 42px;
  height: 92px;
  border-radius: 24px;
  border: 4px solid #3f91a5;
  background: linear-gradient(180deg, #8cdae2 0%, #6bc5d1 100%);
  color: white;
  font-size: 52px;
  line-height: 1;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.45);
}

/* scene panel */
.scene-panel,
.status-panel {
  border: 4px solid #8b7e51;
  border-radius: 18px;
  overflow: hidden;
  background: #f6ead0;
}

.scene-panel {
  min-height: 470px;
}

.scene-header {
  height: 48px;
  background: linear-gradient(180deg, #2f3938 0%, #414747 100%);
  color: #ffe180;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-weight: 900;
  font-size: 24px;
  text-shadow:
    -2px -2px 0 rgba(0,0,0,0.45),
    2px -2px 0 rgba(0,0,0,0.45),
    -2px 2px 0 rgba(0,0,0,0.45),
    2px 2px 0 rgba(0,0,0,0.45);
}

.scene-title {
  color: #ffd667;
}

.scene-title::after {
  content: "";
}

.scene-actions {
  display: flex;
  gap: 8px;
}

.scene-actions button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 3px solid #6f4d77;
  background: linear-gradient(180deg, #f7d785 0%, #d2b867 100%);
  font-size: 16px;
}

.forest-scene {
  position: relative;
  height: 330px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 15%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 18%, transparent 34%),
    linear-gradient(180deg, #8edfe2 0%, #8fdfd3 20%, #a7e2b3 48%, #6cb472 100%);
}

.sky-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.65), transparent 30%),
    radial-gradient(circle at 50% 60%, rgba(255,238,181,0.35), transparent 35%);
}

.tree {
  position: absolute;
  bottom: 48px;
  width: 160px;
  height: 290px;
}

.tree::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 52px;
  height: 230px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #6b4a39 0%, #5a3d31 100%);
  border-radius: 28px;
  box-shadow: inset 10px 0 0 rgba(255,255,255,0.06);
}

.tree::after {
  content: "";
  position: absolute;
  top: 0;
  left: 10px;
  width: 140px;
  height: 130px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 28% 40%, #bed96f 0 15%, transparent 16%),
    radial-gradient(circle at 58% 35%, #dca53c 0 6%, transparent 7%),
    radial-gradient(circle at 72% 52%, #dca53c 0 6%, transparent 7%),
    radial-gradient(circle at 35% 64%, #dca53c 0 6%, transparent 7%),
    radial-gradient(circle at 50% 50%, #8fcb68 0%, #78b65a 70%, #5d9850 100%);
  border: 5px solid rgba(72, 113, 61, 0.45);
}

.left-tree {
  left: -10px;
}

.right-tree {
  right: -2px;
  transform: scaleX(-1);
}

.mid-tree {
  left: 185px;
  transform: scale(0.8);
  opacity: 0.82;
}

.castle {
  position: absolute;
  left: 50%;
  top: 55px;
  transform: translateX(-50%);
  width: 120px;
  height: 100px;
  background:
    linear-gradient(180deg, #e7d7ec 0%, #c6b0d1 100%);
  clip-path: polygon(
    8% 100%, 8% 46%, 18% 46%, 18% 25%, 24% 15%, 30% 25%, 30% 46%,
    40% 46%, 40% 18%, 50% 4%, 60% 18%, 60% 46%, 70% 46%, 70% 25%,
    76% 15%, 82% 25%, 82% 46%, 92% 46%, 92% 100%
  );
  opacity: 0.9;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.15));
}

.path {
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 280px;
  height: 250px;
  background: #eddc9f;
  clip-path: polygon(39% 0%, 58% 0%, 62% 13%, 57% 32%, 64% 54%, 60% 73%, 73% 100%, 26% 100%, 36% 73%, 34% 53%, 42% 30%, 38% 12%);
  opacity: 0.95;
}

.river {
  position: absolute;
  right: 120px;
  bottom: 0;
  width: 230px;
  height: 120px;
  background: linear-gradient(180deg, #9be8f3 0%, #78cddd 100%);
  clip-path: ellipse(44% 50% at 50% 50%);
  opacity: 0.9;
}

.mushrooms {
  position: absolute;
  bottom: 28px;
  width: 80px;
  height: 100px;
}

.mushrooms::before,
.mushrooms::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 26px;
  height: 40px;
  background: #f8ead0;
  border-radius: 20px 20px 10px 10px;
  box-shadow:
    0 -16px 0 8px #de6c73,
    0 -16px 0 10px rgba(255,255,255,0.25) inset;
}

.mushrooms::before {
  left: 8px;
}

.mushrooms::after {
  left: 42px;
  transform: scale(0.85);
}

.left-mushrooms {
  left: 6px;
}

.right-mushrooms {
  right: 20px;
}

.stone {
  position: absolute;
  background: #a9a8a3;
  border-radius: 50%;
  opacity: 0.9;
}

.stone-1 {
  left: 115px;
  bottom: 92px;
  width: 44px;
  height: 34px;
}

.stone-2 {
  right: 58px;
  bottom: 78px;
  width: 70px;
  height: 48px;
}

.capy-group {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 26px;
  height: 150px;
}

.capy {
  position: absolute;
  width: 100px;
  height: 72px;
  background: #c98a5e;
  border: 4px solid #74472c;
  border-radius: 42px 46px 40px 36px;
}

.capy::before {
  content: "";
  position: absolute;
  right: -10px;
  top: 8px;
  width: 44px;
  height: 42px;
  background: #c98a5e;
  border: 4px solid #74472c;
  border-radius: 46%;
}

.capy::after {
  content: "";
  position: absolute;
  bottom: -10px;
  left: 16px;
  width: 12px;
  height: 20px;
  border-radius: 8px;
  background: #74472c;
  box-shadow: 40px 0 0 #74472c;
}

.leader {
  left: 44%;
  bottom: 48px;
  transform: translateX(-50%);
  width: 110px;
  height: 84px;
}

.samurai {
  left: 29%;
  bottom: 18px;
}

.samurai::before {
  background: #c98a5e;
}

.scout {
  left: 62%;
  bottom: 22px;
  transform: scale(0.95);
}

.bath {
  right: 13%;
  bottom: 10px;
  width: 88px;
  height: 58px;
}

.bath::after {
  display: none;
}

.fruit-top {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #f6a32d;
  border: 3px solid #ad6215;
  border-radius: 50%;
  top: -16px;
  left: 42px;
}

.fruit-top::before {
  content: "";
  position: absolute;
  width: 8px;
  height: 4px;
  background: #62a443;
  border-radius: 8px 8px 2px 8px;
  left: 2px;
  top: -5px;
}

.yuzu-mini {
  left: 46px;
}

/* scene footer */
.scene-footer {
  height: 88px;
  background: linear-gradient(180deg, #2c2f31 0%, #383d41 100%);
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  border-top: 4px solid #7c6d4c;
}

.footer-block {
  padding: 10px 14px;
  border-right: 2px solid rgba(255,255,255,0.15);
  color: #fff2be;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.footer-block:last-child {
  border-right: none;
}

.footer-label {
  font-size: 22px;
  font-weight: 900;
  color: #ffd56c;
  text-shadow:
    -2px -2px 0 rgba(0,0,0,0.4),
    2px -2px 0 rgba(0,0,0,0.4),
    -2px 2px 0 rgba(0,0,0,0.4),
    2px 2px 0 rgba(0,0,0,0.4);
}

.footer-sub {
  margin-top: 4px;
  font-size: 18px;
  color: #f8f2dc;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 24px;
  border-radius: 16px;
  background: #5b5050;
  border: 3px solid #c9a86d;
  overflow: hidden;
  margin-top: 6px;
}

.progress-fill {
  height: 100%;
  width: 74%;
  background: linear-gradient(180deg, #97ea71 0%, #6dcf56 100%);
}

/* status panel */
.status-panel {
  background: #b9ead7;
  border-color: #93865d;
}

.status-header {
  height: 48px;
  background: linear-gradient(180deg, #71b7aa 0%, #64aa9f 100%);
  border-bottom: 3px solid rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #eef6eb;
  font-size: 24px;
  font-weight: 900;
  text-shadow:
    -2px -2px 0 rgba(0,0,0,0.35),
    2px -2px 0 rgba(0,0,0,0.35),
    -2px 2px 0 rgba(0,0,0,0.35),
    2px 2px 0 rgba(0,0,0,0.35);
}

.log-paper {
  margin: 18px;
  background:
    repeating-linear-gradient(
      to bottom,
      #f8f3e7 0px,
      #f8f3e7 46px,
      #c6dfd6 47px,
      #f8f3e7 48px
    );
  border: 4px solid #9c6c37;
  border-radius: 18px;
  min-height: 342px;
  position: relative;
  overflow: hidden;
}

.paper-rings {
  position: absolute;
  top: -6px;
  left: 22px;
  right: 22px;
  display: flex;
  justify-content: space-between;
}

.paper-rings span {
  width: 14px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(180deg, #b7d3dd 0%, #8aa2ad 100%);
  border: 2px solid #6e7f87;
}

.paper-title {
  margin-top: 10px;
  height: 50px;
  background: linear-gradient(180deg, #f8eca5 0%, #f1db83 100%);
  border-bottom: 3px solid rgba(126, 91, 26, 0.2);
  color: #6e451d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
}

.log-lines {
  padding: 18px 34px 34px 34px;
  position: relative;
}

.log-lines::before {
  content: "";
  position: absolute;
  left: 26px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: rgba(225, 127, 145, 0.55);
}

.log-item {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 800;
  color: #4d3422;
  white-space: nowrap;
}

.log-item .time {
  color: #4a2d20;
}

.highlight {
  color: #58a572;
}

.paper-corner {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 46px;
  height: 46px;
  background: linear-gradient(135deg, transparent 50%, #eadbbd 51%);
  border-radius: 0 0 12px 0;
}

/* section title */
.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 18px 6px 12px;
}

.section-line {
  flex: 1;
  height: 4px;
  background: linear-gradient(90deg, transparent 0%, #ecd9a7 18%, #ecd9a7 82%, transparent 100%);
  position: relative;
}

.section-line::after {
  content: "◇";
  position: absolute;
  right: -10px;
  top: -14px;
  color: #d3b582;
  font-size: 24px;
}

.section-title-wrap .section-line:last-child::after {
  left: -10px;
  right: auto;
}

.section-title {
  font-size: 28px;
  font-weight: 900;
  color: #68382c;
  white-space: nowrap;
}

/* cards */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.pet-card {
  border-radius: 18px;
  border: 4px solid #b88e68;
  padding: 10px 12px 12px;
  min-height: 330px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.55);
}

.pet-card.green {
  background: linear-gradient(180deg, #eaf1cb 0%, #dbe6bf 100%);
}

.pet-card.orange {
  background: linear-gradient(180deg, #f7d3b2 0%, #f4dfbf 100%);
}

.pet-card.blue {
  background: linear-gradient(180deg, #d7edf5 0%, #dbeae3 100%);
}

.pet-card.pink {
  background: linear-gradient(180deg, #efd4eb 0%, #ead7e5 100%);
}

.pet-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.pet-mini-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #d8b274;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid #926637;
}

.pet-name-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.pet-name {
  font-size: 24px;
  font-weight: 900;
  color: #5b2f25;
}

.pet-role {
  font-size: 15px;
  font-weight: 700;
  color: #5b2f25;
}

.pet-main {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.pet-portrait {
  height: 108px;
  border-radius: 14px;
  border: 4px solid #927259;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52px;
  background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2));
}

.pet-portrait.green {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 40%),
    linear-gradient(180deg, #6fa580 0%, #8ac0ab 100%);
}

.pet-portrait.orange {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 40%),
    linear-gradient(180deg, #ed8b5c 0%, #f1c06c 100%);
}

.pet-portrait.blue {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 40%),
    linear-gradient(180deg, #7fb9da 0%, #9ecce4 100%);
}

.pet-portrait.pink {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 40%),
    linear-gradient(180deg, #caa4cd 0%, #dfbfd9 100%);
}

.pet-basic {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lv {
  font-size: 18px;
  font-weight: 900;
  color: #563226;
}

.bar-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 8px;
  align-items: center;
}

.bar-label {
  font-size: 16px;
  font-weight: 900;
  color: #5c3527;
}

.stat-bar {
  position: relative;
  height: 22px;
  border-radius: 12px;
  background: #6b5a58;
  border: 2px solid rgba(88, 58, 45, 0.45);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 12px;
}

.stat-bar-fill.hp {
  background: linear-gradient(180deg, #f77c67 0%, #dc5048 100%);
}

.stat-bar-fill.mp {
  background: linear-gradient(180deg, #6cc6ff 0%, #3398dd 100%);
}

.stat-bar-fill.exp {
  background: linear-gradient(180deg, #f3d989 0%, #d1a74f 100%);
}

.bar-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff5f0;
  font-size: 13px;
  font-weight: 900;
  text-shadow: 0 1px 0 rgba(0,0,0,0.45);
}

.pet-info {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 12px;
}

.stats-box {
  border-radius: 12px;
  background: rgba(255,255,255,0.24);
  padding: 10px 10px 12px;
  color: #5c3127;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.45;
}

.skills-title {
  margin-top: 8px;
  font-weight: 900;
}

.skills-list {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.skill-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(180deg, #f2cf7e 0%, #d99a48 100%);
  border: 2px solid #90622f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.pet-bottom-icons {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.bottom-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 3px solid #8a6545;
  background: linear-gradient(180deg, #f0d8aa 0%, #d8b579 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

/* responsive */
@media (max-width: 1500px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .top-panels {
    grid-template-columns: 1fr;
  }

  .status-panel {
    min-height: 420px;
  }
}

@media (max-width: 1100px) {
  .title-badge {
    min-width: auto;
    width: 460px;
  }

  .title-text {
    font-size: 22px;
  }

  .nav-btn {
    font-size: 20px;
    padding: 0 12px;
  }
}

@media (max-width: 860px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    height: auto;
    min-height: 92px;
    padding-top: 76px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .title-badge {
    top: 8px;
    width: calc(100% - 24px);
  }

  .left-nav,
  .right-tools {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .content-frame {
    padding: 12px;
  }

  .side-decor {
    display: none;
  }
}
</style>