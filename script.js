document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const instructions = document.getElementById('instructions');
    const appInfo = document.getElementById('app-info');
    const startAppButton = document.getElementById('start-app-button');
    
    // --- Controles móveis ---
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');

    // --- Game Settings ---
    const PLAYER_SPEED = 15; // Pixels por movimento
    const MOBILE_PLAYER_SPEED = 10; // Velocidade para dispositivos móveis (mais lenta)
    const INITIAL_COIN_SPAWN_INTERVAL = 1500; // Milissegundos
    const INITIAL_BIRD_SPAWN_INTERVAL = 2500; // Milissegundos
    const INITIAL_BIRD_SPEED = 1.5; // Pixels por frame (mais lento)
    const GAME_LOOP_INTERVAL = 50; // Milissegundos (aprox. 20 FPS)
    const SCORE_MILESTONE = 25; // A cada 25 pontos, os pássaros morrem e o jogo fica mais difícil
    const SPEED_INCREASE_FACTOR = 1.25; // Aumento de 25% na velocidade a cada milestone
    const INTERVAL_DECREASE_FACTOR = 0.85; // Redução de 15% no intervalo a cada milestone
    const MIN_BIRD_SPAWN_DISTANCE = 200; // Distância mínima para spawn de pássaros em relação ao jogador
    const RAINBOW_COIN_SPAWN_CHANCE = 0.08; // 8% de chance de spawnar uma moeda especial quando cria moeda normal
    const RAINBOW_COIN_DURATION = 5000; // Duração da moeda especial em milissegundos
    const HEART_SPAWN_CHANCE = 0.07; // 7% de chance de spawnar um coração quando cria moeda normal
    const HEART_DURATION = 7000; // Duração do coração em milissegundos
    const MAX_LIVES = 5; // Número máximo de vidas que o jogador pode ter
    const POWERUP_SPAWN_CHANCE = 0.06; // 6% de chance de spawnar um power-up quando cria moeda normal
    const POWERUP_DURATION = 7000; // Duração dos power-ups em milissegundos
    const INVINCIBILITY_DURATION = 5000; // Duração da invencibilidade em milissegundos
    const TRICK_CHANCE = 0.15; // 15% de chance de fazer uma manobra quando pula
    const TRAIL_EFFECT_CHANCE = 0.3; // 30% de chance de criar efeito de rastro ao se mover rápido
    const SPEED_BOOST_DURATION = 200; // Duração do efeito visual de boost de velocidade

    // --- Game State ---
    let score = 0;
    let lastMilestoneScore = 0; // Para controlar quando o último evento de 25 pontos aconteceu
    let playerX, playerY;
    let gameInterval;
    let coinInterval;
    let birdInterval;
    let isGameOver = false;
    let gameStarted = false;
    let keysPressed = {}; // Acompanha teclas pressionadas
    let isMobileDevice = checkMobileDevice();
    let currentBirdSpeed = INITIAL_BIRD_SPEED;
    let currentCoinSpawnInterval = INITIAL_COIN_SPAWN_INTERVAL;
    let currentBirdSpawnInterval = INITIAL_BIRD_SPAWN_INTERVAL;
    let lives = 3; // Adicione esta linha para definir a variável lives
    let isInvincible = false; // Indica se o jogador está invencível com super saúde
    let pointsMultiplier = 1; // Multiplicador atual de pontos (1x, 2x ou 4x)
    let activePowerup = null; // Armazena o power-up atual ativo
    let powerupEndTime = 0; // Armazena quando o power-up atual terminará
    let activePowerupTimeout = null; // Para armazenar o ID do timeout do powerup ativo
    let lastDx = 0; // Última direção X do movimento
    let lastDy = 0; // Última direção Y do movimento
    let movementCounter = 0; // Contador de movimentos consecutivos

    // --- Helper Functions ---

    // Verifica se é um dispositivo móvel
    function checkMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768);
    }

    // Obtém o retângulo de forma confiável
    function getRect(element) {
        return element.getBoundingClientRect();
    }

    // Verifica colisão entre dois elementos
    function checkCollision(el1, el2) {
        const rect1 = getRect(el1);
        const rect2 = getRect(el2);

        return !(
            rect1.top > rect2.bottom ||
            rect1.right < rect2.left ||
            rect1.bottom < rect2.top ||
            rect1.left > rect2.right
        );
    }

    // Mata todos os pássaros com efeito especial
    function killAllBirds() {
        const birds = document.querySelectorAll('.bird');
        birds.forEach(bird => {
            const birdRect = getRect(bird);
            const gameRect = getRect(gameContainer);
            createExplosion(birdRect.left - gameRect.left + birdRect.width / 2,
                         birdRect.top - gameRect.top + birdRect.height / 2);
            bird.remove();
        });
    }

    // Atualiza a exibição de vidas
    function updateLives() {
        // Atualiza apenas o número dentro do coração
        livesDisplay.textContent = lives;
        
        // Efeito visual quando perde vida
        if (lives > 0) {
            livesDisplay.parentElement.classList.add('life-flash');
            setTimeout(() => {
                livesDisplay.parentElement.classList.remove('life-flash');
            }, 500);
        }
    }

    // Aumenta a velocidade do jogo
    function increaseGameSpeed() {
        // Aumenta a velocidade dos pássaros
        currentBirdSpeed *= SPEED_INCREASE_FACTOR;
        
        // Diminui os intervalos (gera mais rápido)
        currentCoinSpawnInterval *= INTERVAL_DECREASE_FACTOR;
        currentBirdSpawnInterval *= INTERVAL_DECREASE_FACTOR;
        
        // Reinicia os intervalos com os novos valores
        clearInterval(coinInterval);
        clearInterval(birdInterval);
        coinInterval = setInterval(createCoin, currentCoinSpawnInterval);
        birdInterval = setInterval(createBird, currentBirdSpawnInterval);
        
        // Efeito visual para mostrar o aumento de velocidade
        gameContainer.classList.add('speed-up');
        setTimeout(() => {
            gameContainer.classList.remove('speed-up');
        }, 500);
        
        // Exibe mensagem de nível
        const levelMessage = document.createElement('div');
        levelMessage.classList.add('level-message');
        levelMessage.textContent = `NÍVEL ${score / SCORE_MILESTONE}!`;
        gameContainer.appendChild(levelMessage);
        
        // Remove a mensagem após a animação
        setTimeout(() => {
            levelMessage.remove();
        }, 1000);
    }

    // Cria um elemento de moeda especial (rainbow coin)
    function createRainbowCoin() {
        const rainbowCoin = document.createElement('div');
        rainbowCoin.classList.add('rainbow-coin');
        
        // Valor aleatório entre 1 e 8
        const coinValue = Math.floor(Math.random() * 8) + 1;
        rainbowCoin.innerHTML = coinValue;
        rainbowCoin.dataset.value = coinValue; // Armazena o valor da moeda como atributo de dados
        
        // Posição aleatória dentro da área de jogo
        const gameRect = getRect(gameContainer);
        const maxCoinX = gameContainer.offsetWidth - 40;
        const maxCoinY = gameContainer.offsetHeight - 40;
        
        // Posicionamento deliberadamente mais no topo para ser mais desafiador
        rainbowCoin.style.left = `${Math.random() * maxCoinX}px`;
        rainbowCoin.style.top = `${Math.random() * (maxCoinY * 0.7)}px`;
        
        gameContainer.appendChild(rainbowCoin);
        
        // Remove a moeda após um tempo se não for coletada
        setTimeout(() => {
            if (rainbowCoin && rainbowCoin.parentNode) {
                // Cria um efeito de desaparecimento
                rainbowCoin.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    if (rainbowCoin && rainbowCoin.parentNode) {
                        rainbowCoin.remove();
                    }
                }, 500);
            }
        }, RAINBOW_COIN_DURATION);
    }

    // Cria um elemento de coração que dá vida ao jogador
    function createHeart() {
        const heart = document.createElement('div');
        heart.classList.add('heart-item');
        
        // Valor aleatório entre 1 e 3, com maior chance para 1
        let heartValue;
        const chance = Math.random();
        if (chance < 0.7) { // 70% de chance para 1 vida
            heartValue = 1;
        } else if (chance < 0.9) { // 20% de chance para 2 vidas
            heartValue = 2;
        } else { // 10% de chance para 3 vidas
            heartValue = 3;
        }
        
        heart.innerHTML = '❤️';
        heart.dataset.value = heartValue; // Armazena o valor do coração como atributo de dados
        
        // Posição aleatória dentro da área de jogo
        const gameRect = getRect(gameContainer);
        const maxHeartX = gameContainer.offsetWidth - 40;
        const maxHeartY = gameContainer.offsetHeight - 40;
        
        // Posicionamento deliberadamente mais no topo para ser mais desafiador
        heart.style.left = `${Math.random() * maxHeartX}px`;
        heart.style.top = `${Math.random() * (maxHeartY * 0.6)}px`;
        
        // Adiciona um efeito de pulsar
        heart.style.animation = 'pulse 1s infinite, float 3s infinite';
        
        gameContainer.appendChild(heart);
        
        // Remove o coração após um tempo se não for coletado
        setTimeout(() => {
            if (heart && heart.parentNode) {
                // Cria um efeito de desaparecimento
                heart.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    if (heart && heart.parentNode) {
                        heart.remove();
                    }
                }, 500);
            }
        }, HEART_DURATION);
    }

    // Cria um power-up (2x, 4x ou Super Saúde)
    function createPowerup() {
        const powerup = document.createElement('div');
        powerup.classList.add('powerup');
        
        // Determina o tipo de power-up: 0 = 2x pontos, 1 = 4x pontos, 2 = Super Saúde
        const powerupType = Math.floor(Math.random() * 3);
        let powerupClassName = '';
        let powerupText = '';
        
        switch (powerupType) {
            case 0:
                powerupClassName = 'powerup-2x';
                powerupText = '2×';
                powerup.dataset.type = 'multiplier-2x';
                break;
            case 1:
                powerupClassName = 'powerup-4x';
                powerupText = '4×';
                powerup.dataset.type = 'multiplier-4x';
                break;
            case 2:
                powerupClassName = 'powerup-invincible';
                powerupText = '⚡';
                powerup.dataset.type = 'invincible';
                break;
        }
        
        powerup.classList.add(powerupClassName);
        powerup.innerHTML = powerupText;
        
        // Posição aleatória dentro da área de jogo
        const maxPowerupX = gameContainer.offsetWidth - 40;
        const maxPowerupY = gameContainer.offsetHeight - 40;
        
        powerup.style.left = `${Math.random() * maxPowerupX}px`;
        powerup.style.top = `${Math.random() * (maxPowerupY * 0.7)}px`;
        
        gameContainer.appendChild(powerup);
        
        // Remove o power-up após um tempo se não for coletado
        setTimeout(() => {
            if (powerup && powerup.parentNode) {
                // Cria um efeito de desaparecimento
                powerup.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    if (powerup && powerup.parentNode) {
                        powerup.remove();
                    }
                }, 500);
            }
        }, POWERUP_DURATION);
    }

    // Cria um elemento de moeda
    function createCoin() {
        const coin = document.createElement('div');
        coin.classList.add('coin');
        coin.innerHTML = '💰'; // Emoji de moeda

        // Posição aleatória dentro da área de jogo (evitando ligeiramente as bordas)
        const gameRect = getRect(gameContainer);
        const maxCoinX = gameContainer.offsetWidth - 30;
        const maxCoinY = gameContainer.offsetHeight - 30;

        coin.style.left = `${Math.random() * maxCoinX}px`;
        coin.style.top = `${Math.random() * (maxCoinY * 0.8)}px`; // Gera principalmente na área superior

        gameContainer.appendChild(coin);
        
        // Decisão de spawn entre rainbow coin, coração, power-up ou nenhum
        const randomChance = Math.random();
        if (randomChance < RAINBOW_COIN_SPAWN_CHANCE) {
            createRainbowCoin();
        } else if (randomChance < (RAINBOW_COIN_SPAWN_CHANCE + HEART_SPAWN_CHANCE)) {
            createHeart();
        } else if (randomChance < (RAINBOW_COIN_SPAWN_CHANCE + HEART_SPAWN_CHANCE + POWERUP_SPAWN_CHANCE)) {
            createPowerup();
        }
    }

    // Cria um elemento de pássaro
    function createBird() {
        const bird = document.createElement('div');
        bird.classList.add('bird');
        bird.innerHTML = '🐦';

        // Inicia o pássaro fora da tela (por exemplo, de cima ou dos lados)
        const gameRect = getRect(gameContainer);
        let startX, startY;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 10; // Aumentei o número de tentativas
        
        // Posição do jogador
        const playerCenterX = player.offsetLeft + player.offsetWidth / 2;
        const playerCenterY = player.offsetTop + player.offsetHeight / 2;

        // Tenta encontrar uma posição válida (longe do jogador)
        while (!validPosition && attempts < maxAttempts) {
            // Escolhe uma das posições iniciais (garantindo que estejam FORA da tela)
            const spawnPosition = Math.random();
            
            if (spawnPosition < 0.33) { // Inicia no topo
                startX = Math.random() * (gameContainer.offsetWidth - 40);
                startY = -60; // Mais para fora da tela
            } else if (spawnPosition < 0.66) { // Inicia na esquerda
                startX = -60; // Mais para fora da tela
                startY = Math.random() * (gameContainer.offsetHeight * 0.7);
            } else { // Inicia na direita
                startX = gameContainer.offsetWidth + 20; // Garante que está fora da tela
                startY = Math.random() * (gameContainer.offsetHeight * 0.7);
            }
            
            // Calcula a distância entre a posição gerada e o jogador
            const dx = startX - playerCenterX;
            const dy = startY - playerCenterY;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Verifica se a distância é adequada
            if (distanceToPlayer >= MIN_BIRD_SPAWN_DISTANCE) {
                validPosition = true;
            }
            
            attempts++;
        }

        bird.style.left = `${startX}px`;
        bird.style.top = `${startY}px`;

        gameContainer.appendChild(bird);
    }

    // Mostra efeito de explosão
    function createExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.classList.add('explosion');
        explosion.innerHTML = '💥';
        explosion.style.left = `${x - 30}px`; // Centraliza a explosão aproximadamente
        explosion.style.top = `${y - 30}px`;
        gameContainer.appendChild(explosion);

        // Remove o elemento de explosão após o término da animação
        setTimeout(() => {
            explosion.remove();
        }, 500); // Combina com a duração da animação
    }

    // Cria um efeito de coleta de moeda
    function createCoinCollectEffect(x, y, value = 1) {
        const effect = document.createElement('div');
        effect.classList.add('coin-effect');
        effect.textContent = `+${value}`;
        effect.style.left = `${x}px`;
        effect.style.top = `${y}px`;
        
        // Ajusta o estilo conforme o valor da moeda (para moedas especiais)
        if (value > 1) {
            effect.style.fontSize = '22px';
            effect.style.color = '#fff';
            effect.style.textShadow = '0 0 5px #ff0, 0 0 10px #ff0, 0 0 15px #f0f';
        }
        
        gameContainer.appendChild(effect);
        
        // Remove o elemento após a animação
        setTimeout(() => {
            effect.remove();
        }, 800);
        
        // Adiciona um flash no fundo do jogo para feedback visual
        if (value > 1) {
            gameContainer.classList.add('rainbow-flash');
            setTimeout(() => {
                gameContainer.classList.remove('rainbow-flash');
            }, 300);
        } else {
            gameContainer.classList.add('coin-flash');
            setTimeout(() => {
                gameContainer.classList.remove('coin-flash');
            }, 300);
        }
    }

    // Cria um efeito de ganho de vida
    function createHeartCollectEffect(x, y, value = 1) {
        const effect = document.createElement('div');
        effect.classList.add('heart-effect');
        effect.textContent = `+${value}❤️`;
        effect.style.left = `${x}px`;
        effect.style.top = `${y}px`;
        
        // Ajusta o estilo conforme o valor do coração
        if (value > 1) {
            effect.style.fontSize = '22px';
            effect.style.color = '#fff';
            effect.style.textShadow = '0 0 5px #f00, 0 0 10px #f00, 0 0 15px #f00';
        }
        
        gameContainer.appendChild(effect);
        
        // Remove o elemento após a animação
        setTimeout(() => {
            effect.remove();
        }, 800);
        
        // Adiciona um flash no fundo do jogo para feedback visual
        gameContainer.classList.add('heart-flash');
        setTimeout(() => {
            gameContainer.classList.remove('heart-flash');
        }, 300);
    }

    // Cria um efeito de coleta de power-up
    function createPowerupCollectEffect(x, y, type) {
        const effect = document.createElement('div');
        effect.classList.add('powerup-effect');
        
        // Configura a aparência e o texto com base no tipo
        switch (type) {
            case 'multiplier-2x':
                effect.textContent = 'PONTOS 2×!';
                effect.classList.add('multiplier-2x-effect');
                break;
            case 'multiplier-4x':
                effect.textContent = 'PONTOS 4×!';
                effect.classList.add('multiplier-4x-effect');
                break;
            case 'invincible':
                effect.textContent = 'INVENCÍVEL!';
                effect.classList.add('invincible-effect');
                break;
        }
        
        effect.style.left = `${x}px`;
        effect.style.top = `${y}px`;
        
        gameContainer.appendChild(effect);
        
        // Remove o elemento após a animação
        setTimeout(() => {
            effect.remove();
        }, 1000);
        
        // Adiciona um flash no fundo do jogo para feedback visual
        gameContainer.classList.add('powerup-flash');
        setTimeout(() => {
            gameContainer.classList.remove('powerup-flash');
        }, 500);
    }

    // Aplica o efeito do power-up coletado
    function applyPowerup(type) {
        // Cancela o power-up anterior, se houver
        if (activePowerup) {
            clearTimeout(activePowerupTimeout);
            
            // Restaura os valores padrão
            if (activePowerup === 'multiplier-2x' || activePowerup === 'multiplier-4x') {
                pointsMultiplier = 1;
            } else if (activePowerup === 'invincible') {
                isInvincible = false;
                player.classList.remove('invincible');
            }
        }
        
        // Registra o novo power-up ativo
        activePowerup = type;
        
        // Atualiza o indicador
        const powerupIndicator = document.querySelector('.powerup-indicator') || createPowerupIndicator();
        powerupIndicator.className = 'powerup-indicator active'; // Remove classes anteriores
        powerupIndicator.classList.add(type);
        powerupIndicator.textContent = ''; // Limpa o conteúdo anterior
        
        // Configura o temporizador
        const now = Date.now();
        let duration = POWERUP_DURATION;
        
        if (type === 'multiplier-2x') {
            pointsMultiplier = 2;
            powerupIndicator.textContent = '2x';
            
            // Efeito visual no jogador
            player.classList.add('powerup-flash');
            setTimeout(() => {
                player.classList.remove('powerup-flash');
            }, 500);
            
        } else if (type === 'multiplier-4x') {
            pointsMultiplier = 4;
            powerupIndicator.textContent = '4x';
            
            // Efeito visual no jogador
            player.classList.add('powerup-flash');
            setTimeout(() => {
                player.classList.remove('powerup-flash');
            }, 500);
            
        } else if (type === 'invincible') {
            isInvincible = true;
            powerupIndicator.textContent = '★';
            duration = INVINCIBILITY_DURATION;
            
            // Adiciona efeito visual ao jogador
            player.classList.add('invincible');
            
            // Efeito de explosão ao redor do jogador
            const playerRect = getRect(player);
            const gameRect = getRect(gameContainer);
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    createExplosion(
                        playerRect.left - gameRect.left + playerRect.width / 2 + (Math.random() * 40 - 20),
                        playerRect.top - gameRect.top + playerRect.height / 2 + (Math.random() * 40 - 20)
                    );
                }, i * 100);
            }
        }
        
        powerupEndTime = now + duration;
        
        // Inicia a atualização do indicador
        updatePowerupTimeIndicator();
        
        // Configura o timeout para remover o power-up
        activePowerupTimeout = setTimeout(() => {
            // Verifica se este é o mesmo power-up que foi ativado
            // Isso evita que um timeout de um power-up antigo desative um novo power-up
            if (activePowerup === type) {
                // Restaura os valores padrão
                if (type === 'multiplier-2x' || type === 'multiplier-4x') {
                    pointsMultiplier = 1;
                } else if (type === 'invincible') {
                    isInvincible = false;
                    player.classList.remove('invincible');
                }
                
                // Oculta o indicador
                const powerupIndicator = document.getElementById('powerup-indicator');
                if (powerupIndicator) {
                    powerupIndicator.classList.remove('active');
                }
                
                // Limpa a referência ao power-up ativo
                activePowerup = null;
            }
        }, duration);
    }

    // Cria o indicador de power-up na interface
    function createPowerupIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'powerup-indicator';
        indicator.className = 'powerup-indicator';
        gameContainer.appendChild(indicator);
        return indicator;
    }

    // Atualiza o indicador de tempo do power-up
    function updatePowerupTimeIndicator() {
        if (!powerupEndTime) return;
        
        const indicator = document.getElementById('powerup-indicator');
        if (!indicator) return;
        
        const timeLeft = Math.max(0, powerupEndTime - Date.now());
        const percentage = timeLeft / (activePowerup === 'invincible' ? INVINCIBILITY_DURATION : POWERUP_DURATION);
        
        indicator.style.setProperty('--time-left', percentage);
        
        if (timeLeft > 0 && activePowerup) {
            requestAnimationFrame(updatePowerupTimeIndicator);
        } else if (timeLeft <= 0 && activePowerup) {
            // Se o tempo acabou mas o activePowerup ainda existe, isso indica um problema
            // Forçamos a limpeza do power-up
            if (activePowerup === 'multiplier-2x' || activePowerup === 'multiplier-4x') {
                pointsMultiplier = 1;
            } else if (activePowerup === 'invincible') {
                isInvincible = false;
                player.classList.remove('invincible');
            }
            
            indicator.classList.remove('active');
            activePowerup = null;
        }
    }

    // Finaliza o jogo
    function gameOver() {
        if (isGameOver) return; // Evita vários acionamentos
        
        // Se ainda tiver vidas, apenas perde uma vida
        if (lives > 1) {
            lives--;
            updateLives();
            
            // Efeito de invulnerabilidade temporária
            player.classList.add('damaged');
            setTimeout(() => {
                player.classList.remove('damaged');
            }, 1500);
            
            return;
        }
        
        // Perdeu a última vida, fim de jogo
        lives = 0;
        updateLives();
        isGameOver = true;
        console.log("Fim de Jogo!");

        // Para os loops de jogo
        clearInterval(gameInterval);
        clearInterval(coinInterval);
        clearInterval(birdInterval);

        // Mostra a tela de fim de jogo
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.remove('hidden');
        instructions.classList.add('hidden'); // Oculta as instruções

        // Opcional: Cria um efeito de explosão no local do jogador
        const playerRect = getRect(player);
        const gameRect = getRect(gameContainer);
        createExplosion(playerRect.left - gameRect.left + playerRect.width / 2,
                      playerRect.top - gameRect.top + playerRect.height / 2);

        // Torna o jogador semi-transparente
        player.style.opacity = '0.5';
    }

    // Atualiza a posição do jogador com base nas teclas pressionadas
    function updatePlayerPosition() {
        let dx = 0;
        let dy = 0;
        let speed = isMobileDevice ? MOBILE_PLAYER_SPEED : PLAYER_SPEED;
        let isMovingFast = false;
        let consecutiveMovement = false;
        
        // Verifica se estamos nos movendo na mesma direção por algum tempo
        if (lastDx === dx && lastDy === dy && (dx !== 0 || dy !== 0)) {
            movementCounter++;
            if (movementCounter > 5) {
                consecutiveMovement = true;
            }
        } else {
            movementCounter = 0;
        }
        
        if (keysPressed['ArrowLeft'] || keysPressed['btnLeft']) dx -= speed;
        if (keysPressed['ArrowRight'] || keysPressed['btnRight']) dx += speed;
        if (keysPressed['ArrowUp'] || keysPressed['btnUp']) dy -= speed;
        if (keysPressed['ArrowDown'] || keysPressed['btnDown']) dy += speed;

        // Se o movimento é grande o suficiente, considere "movimento rápido"
        isMovingFast = Math.abs(dx) > speed/2 || Math.abs(dy) > speed/2;

        let newX = player.offsetLeft + dx;
        let newY = player.offsetTop + dy;

        // Verificações de limites (mantém o jogador dentro do gameContainer)
        newX = Math.max(0, Math.min(newX, gameContainer.offsetWidth - player.offsetWidth));
        newY = Math.max(0, Math.min(newY, gameContainer.offsetHeight - player.offsetHeight));

        player.style.left = `${newX}px`;
        player.style.top = `${newY}px`;

        // Adiciona efeitos visuais com base no movimento
        // Remove todas as classes de movimento anteriores
        player.classList.remove('move-left', 'move-right');
        
        // Aplica classes de inclinação com base na direção de movimento
        if (dx < 0) {
            player.classList.add('move-left');
            // Chance de criar efeito de vento quando se move rápido
            if (Math.random() < 0.2) createWindEffect(newX + player.offsetWidth, newY + player.offsetHeight / 2, 'right');
        } else if (dx > 0) {
            player.classList.add('move-right');
            // Chance de criar efeito de vento quando se move rápido
            if (Math.random() < 0.2) createWindEffect(newX, newY + player.offsetHeight / 2, 'left');
        }
        
        // Efeito de boost de velocidade quando se move consecutivamente na mesma direção
        if (isMovingFast && consecutiveMovement && !player.classList.contains('speed-boost')) {
            player.classList.add('speed-boost');
            setTimeout(() => {
                player.classList.remove('speed-boost');
            }, SPEED_BOOST_DURATION);
            
            // Chance de criar efeito de rastro
            if (Math.random() < TRAIL_EFFECT_CHANCE) {
                createSpeedTrail(newX, newY, dx > 0 ? 'right' : 'left');
            }
        }
        
        // Adiciona efeito de salto ao se mover para cima
        if (dy < 0 && !player.classList.contains('jump')) {
            player.classList.add('jump');
            
            // Chance de fazer uma manobra legal
            if (Math.random() < TRICK_CHANCE) {
                player.classList.add('trick');
                
                // Cria um efeito de texto para a manobra
                const trickNames = ["Ollie!", "Kickflip!", "Heelflip!", "Pop Shove-it!", "360 Flip!"];
                const randomTrick = trickNames[Math.floor(Math.random() * trickNames.length)];
                createTrickText(newX, newY - 30, randomTrick);
            }
            
            setTimeout(() => {
                player.classList.remove('jump');
                player.classList.remove('trick');
            }, 500); // Corresponde à duração da animação
        }

        // Atualiza a posição global do jogador (relativa ao contêiner)
        playerX = newX;
        playerY = newY;
        
        // Armazena a última direção de movimento
        lastDx = dx;
        lastDy = dy;
    }

    // Loop principal do jogo
    function gameLoop() {
        if (isGameOver) return;

        // 1. Atualiza a posição do jogador (com base nas teclas pressionadas atualmente)
        updatePlayerPosition();

        // 2. Move os pássaros em direção ao jogador
        const birds = document.querySelectorAll('.bird');
        const playerCenterX = player.offsetLeft + player.offsetWidth / 2;
        const playerCenterY = player.offsetTop + player.offsetHeight / 2;

        birds.forEach(bird => {
            const birdX = bird.offsetLeft + bird.offsetWidth / 2;
            const birdY = bird.offsetTop + bird.offsetHeight / 2;

            // Calcula o vetor de direção
            const diffX = playerCenterX - birdX;
            const diffY = playerCenterY - birdY;
            const distance = Math.sqrt(diffX * diffX + diffY * diffY);

            // Normaliza o vetor e move o pássaro
            if (distance > 1) { // Evita divisão por zero ou movimentos pequenos
                const moveX = (diffX / distance) * currentBirdSpeed; // Usa a velocidade atual
                const moveY = (diffY / distance) * currentBirdSpeed;

                bird.style.left = `${bird.offsetLeft + moveX}px`;
                bird.style.top = `${bird.offsetTop + moveY}px`;
            }

            // Remove pássaros que de alguma forma voam para longe (opcional)
            const birdRect = getRect(bird);
            const gameRect = getRect(gameContainer);
            if (birdRect.right < gameRect.left - 100 || birdRect.left > gameRect.right + 100 ||
                birdRect.bottom < gameRect.top - 100 || birdRect.top > gameRect.bottom + 100) {
                bird.remove();
            }
        });

        // 2.5 Move as moedas rainbow de forma rápida e errática
        const specialCoins = document.querySelectorAll('.rainbow-coin');
        specialCoins.forEach(rainbowCoin => {
            // Verificar se a moeda já tem a animação de movimento através do CSS
            // Se não tiver, ou se quisermos um movimento mais dinâmico, podemos implementar:
            
            // Movimento aleatório a cada frame para aumentar a dificuldade
            if (Math.random() < 0.2) { // 20% de chance de mudar de direção a cada frame
                const moveX = (Math.random() - 0.5) * 12; // -6 a 6 pixels
                const moveY = (Math.random() - 0.5) * 12; // -6 a 6 pixels
                
                let newX = rainbowCoin.offsetLeft + moveX;
                let newY = rainbowCoin.offsetTop + moveY;
                
                // Manter dentro dos limites do jogo
                newX = Math.max(0, Math.min(newX, gameContainer.offsetWidth - rainbowCoin.offsetWidth));
                newY = Math.max(0, Math.min(newY, gameContainer.offsetHeight - rainbowCoin.offsetHeight));
                
                rainbowCoin.style.left = `${newX}px`;
                rainbowCoin.style.top = `${newY}px`;
            }
        });

        // 3. Verifica colisões
        // Jogador vs Corações
        const hearts = document.querySelectorAll('.heart-item');
        hearts.forEach(heart => {
            if (checkCollision(player, heart)) {
                const heartRect = getRect(heart);
                const gameRect = getRect(gameContainer);
                const effectX = heartRect.left - gameRect.left;
                const effectY = heartRect.top - gameRect.top;
                
                // Obtém o valor do coração
                const heartValue = parseInt(heart.dataset.value) || 1;
                
                // Adiciona vidas, mas respeitando o limite máximo
                const newLives = Math.min(lives + heartValue, MAX_LIVES);
                const actualGain = newLives - lives; // Calcula quanto realmente ganhou
                
                if (actualGain > 0) {
                    lives = newLives;
                    updateLives();
                    createHeartCollectEffect(effectX, effectY, actualGain);
                }
                
                heart.remove();
            }
        });
        
        // Jogador vs Power-ups
        const powerups = document.querySelectorAll('.powerup');
        powerups.forEach(powerup => {
            if (checkCollision(player, powerup)) {
                const powerupRect = getRect(powerup);
                const gameRect = getRect(gameContainer);
                const effectX = powerupRect.left - gameRect.left;
                const effectY = powerupRect.top - gameRect.top;
                
                // Obtém o tipo do power-up
                const powerupType = powerup.dataset.type;
                
                // Aplica o efeito do power-up
                applyPowerup(powerupType);
                createPowerupCollectEffect(effectX, effectY, powerupType);
                
                powerup.remove();
            }
        });
        
        // Jogador vs Moedas Especiais (Rainbow Coins)
        const rainbowCoins = document.querySelectorAll('.rainbow-coin');
        rainbowCoins.forEach(rainbowCoin => {
            if (checkCollision(player, rainbowCoin)) {
                const coinRect = getRect(rainbowCoin);
                const gameRect = getRect(gameContainer);
                const effectX = coinRect.left - gameRect.left;
                const effectY = coinRect.top - gameRect.top;
                
                // Obtém o valor da moeda especial
                const coinValue = parseInt(rainbowCoin.dataset.value) || 1;
                
                // Aplica o multiplicador de pontos, se estiver ativo
                const actualValue = coinValue * pointsMultiplier;
                
                createCoinCollectEffect(effectX, effectY, actualValue);
                rainbowCoin.remove();
                
                // Guarda o score anterior
                const oldScore = score;
                
                // Adiciona o valor ao score
                score += actualValue;
                scoreDisplay.textContent = score;
                
                // Verifica se passou por algum milestone (múltiplo de 25)
                // Primeiro calculamos qual era o milestone mais próximo antes da coleta
                const oldMilestone = Math.floor(oldScore / SCORE_MILESTONE) * SCORE_MILESTONE;
                // Agora calculamos qual é o milestone atual após a coleta
                const newMilestone = Math.floor(score / SCORE_MILESTONE) * SCORE_MILESTONE;
                
                // Se passamos de pelo menos um milestone
                if (newMilestone > oldMilestone) {
                    lastMilestoneScore = newMilestone;
                    killAllBirds(); // Mata todos os pássaros
                    increaseGameSpeed(); // Aumenta a velocidade do jogo
                    
                    // Se passamos por mais de um milestone de uma vez (caso de moedas de alto valor)
                    const milestonesJumped = (newMilestone - oldMilestone) / SCORE_MILESTONE;
                    if (milestonesJumped > 1) {
                        // Aplica aumentos adicionais de velocidade para cada milestone pulado
                        for (let i = 1; i < milestonesJumped; i++) {
                            setTimeout(() => {
                                increaseGameSpeed();
                            }, i * 1000); // Aumenta a velocidade a cada segundo para dar um efeito visual
                        }
                    }
                }
            }
        });
        
        // Jogador vs Moedas Normais
        const coins = document.querySelectorAll('.coin');
        coins.forEach(coin => {
            if (checkCollision(player, coin)) {
                const coinRect = getRect(coin);
                const gameRect = getRect(gameContainer);
                const effectX = coinRect.left - gameRect.left;
                const effectY = coinRect.top - gameRect.top;
                
                // Aplica o multiplicador de pontos, se estiver ativo
                const value = 1 * pointsMultiplier;
                
                createCoinCollectEffect(effectX, effectY, value);
                coin.remove();
                score += value;
                scoreDisplay.textContent = score;
                
                // Verifica se atingiu um milestone (múltiplo de 25)
                if (score % SCORE_MILESTONE === 0 && score > lastMilestoneScore) {
                    lastMilestoneScore = score;
                    killAllBirds(); // Mata todos os pássaros
                    increaseGameSpeed(); // Aumenta a velocidade do jogo
                }
            }
        });

        // Jogador vs Pássaros
        birds.forEach(bird => {
            if (checkCollision(player, bird)) {
                // Se o jogador estiver invencível com um power-up, destrói o pássaro sem sofrer dano
                if (isInvincible) {
                    const birdRect = getRect(bird);
                    const gameRect = getRect(gameContainer);
                    createExplosion(birdRect.left - gameRect.left + birdRect.width / 2,
                                 birdRect.top - gameRect.top + birdRect.height / 2);
                    bird.remove();
                    return;
                }
                
                // Se o jogador estiver com efeito de dano (invulnerável temporariamente), ignora a colisão
                if (player.classList.contains('damaged')) {
                    return;
                }
                
                // Cria explosão no local do pássaro antes de removê-lo
                const birdRect = getRect(bird);
                const gameRect = getRect(gameContainer);
                createExplosion(birdRect.left - gameRect.left + birdRect.width / 2,
                             birdRect.top - gameRect.top + birdRect.height / 2);
                bird.remove(); // Remove o pássaro que atingiu
                gameOver();
            }
        });
    }

    // Inicia um novo jogo
    function startGame() {
        console.log("Iniciando o jogo...");
        // Reinicia o estado
        score = 0;
        lastMilestoneScore = 0;
        lives = 3; // Reinicia o contador de vidas
        isInvincible = false; // Reinicia o estado de invencibilidade
        pointsMultiplier = 1; // Reinicia o multiplicador de pontos
        
        // Limpa qualquer power-up ativo
        if (activePowerupTimeout) {
            clearTimeout(activePowerupTimeout);
            activePowerupTimeout = null;
        }
        activePowerup = null;
        powerupEndTime = 0;
        
        // Remove o indicador de power-up, se existir
        const powerupIndicator = document.getElementById('powerup-indicator');
        if (powerupIndicator) powerupIndicator.remove();
        
        updateLives(); // Atualiza a exibição de vidas
        isGameOver = false;
        gameStarted = true;
        keysPressed = {};
        scoreDisplay.textContent = score;
        gameOverScreen.classList.add('hidden');
        instructions.classList.remove('hidden');
        player.style.opacity = '1';
        player.classList.remove('damaged'); // Remove qualquer efeito de dano
        player.classList.remove('invincible'); // Remove qualquer efeito de invencibilidade
        
        // Reinicia as velocidades
        currentBirdSpeed = INITIAL_BIRD_SPEED;
        currentCoinSpawnInterval = INITIAL_COIN_SPAWN_INTERVAL;
        currentBirdSpawnInterval = INITIAL_BIRD_SPAWN_INTERVAL;
        
        // Oculta a tela inicial
        appInfo.classList.add('hidden');

        // Limpa moedas, power-ups, corações e pássaros existentes
        document.querySelectorAll('.coin, .rainbow-coin, .powerup, .heart-item, .bird, .explosion').forEach(el => el.remove());

        // Reinicia a posição do jogador (usa offsetLeft/Top para posicionamento dentro do pai)
        player.style.left = `${(gameContainer.offsetWidth - player.offsetWidth) / 2}px`;
        player.style.top = `${gameContainer.offsetHeight - player.offsetHeight - 10}px`; // Inicia próximo ao fundo novamente
        playerX = player.offsetLeft;
        playerY = player.offsetTop;
        
        // Remove qualquer classe de movimento aplicada anteriormente
        player.classList.remove('move-left', 'move-right', 'jump');

        // Reseta as variáveis de movimento
        lastDx = 0;
        lastDy = 0;
        movementCounter = 0;

        // Inicia intervalos
        gameInterval = setInterval(gameLoop, GAME_LOOP_INTERVAL);
        coinInterval = setInterval(createCoin, currentCoinSpawnInterval);
        birdInterval = setInterval(createBird, currentBirdSpawnInterval);
    }

    // --- Event Listeners ---

    // Controles de teclado
    document.addEventListener('keydown', (e) => {
        if (!isGameOver && gameStarted) {
            // Evita a rolagem padrão das teclas de seta
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                keysPressed[e.key] = true; // Marca a tecla como pressionada
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            keysPressed[e.key] = false; // Marca a tecla como liberada
        }
    });

    // Event listeners para controles de toque em dispositivos móveis
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed['btnLeft'] = true;
    });
    
    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed['btnLeft'] = false;
    });
    
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed['btnRight'] = true;
    });
    
    btnRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed['btnRight'] = false;
    });
    
    btnUp.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed['btnUp'] = true;
    });
    
    btnUp.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed['btnUp'] = false;
    });
    
    btnDown.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed['btnDown'] = true;
    });
    
    btnDown.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed['btnDown'] = false;
    });
    
    // Também adicionar eventos de mouse para os botões (para desktop)
    btnLeft.addEventListener('mousedown', () => { keysPressed['btnLeft'] = true; });
    btnLeft.addEventListener('mouseup', () => { keysPressed['btnLeft'] = false; });
    btnLeft.addEventListener('mouseleave', () => { keysPressed['btnLeft'] = false; });
    
    btnRight.addEventListener('mousedown', () => { keysPressed['btnRight'] = true; });
    btnRight.addEventListener('mouseup', () => { keysPressed['btnRight'] = false; });
    btnRight.addEventListener('mouseleave', () => { keysPressed['btnRight'] = false; });
    
    btnUp.addEventListener('mousedown', () => { keysPressed['btnUp'] = true; });
    btnUp.addEventListener('mouseup', () => { keysPressed['btnUp'] = false; });
    btnUp.addEventListener('mouseleave', () => { keysPressed['btnUp'] = false; });
    
    btnDown.addEventListener('mousedown', () => { keysPressed['btnDown'] = true; });
    btnDown.addEventListener('mouseup', () => { keysPressed['btnDown'] = false; });
    btnDown.addEventListener('mouseleave', () => { keysPressed['btnDown'] = false; });

    // Botão de reiniciar
    restartButton.addEventListener('click', startGame);
    
    // Botão de iniciar o aplicativo
    startAppButton.addEventListener('click', startGame);
    
    // Ouvinte de evento de orientação para dispositivos móveis
    window.addEventListener('orientationchange', () => {
        if (gameStarted) {
            // Ajustar posição do jogador após mudança de orientação
            setTimeout(() => {
                // Reposiciona o jogador
                player.style.left = `${(gameContainer.offsetWidth - player.offsetWidth) / 2}px`;
                player.style.top = `${gameContainer.offsetHeight - player.offsetHeight - 10}px`;
                playerX = player.offsetLeft;
                playerY = player.offsetTop;
            }, 300);
        }
    });
    
    // Verificação de tamanho de tela para controles responsivos
    window.addEventListener('resize', () => {
        isMobileDevice = checkMobileDevice();
    });
    
    // Ajusta o tamanho do personagem para dispositivos móveis
    function adjustPlayerForMobile() {
        if (isMobileDevice) {
            document.documentElement.style.setProperty('--player-scale', '0.8');
        } else {
            document.documentElement.style.setProperty('--player-scale', '1');
        }
    }
    
    // --- Inicialização ---
    // O jogo não inicia automaticamente agora, aguarda o clique no botão "Iniciar Jogo"
    // A tela de apresentação do aplicativo é exibida primeiro
    
    // Ajusta o tamanho do jogador com base no dispositivo
    adjustPlayerForMobile();
    window.addEventListener('resize', adjustPlayerForMobile);

    // Cria um efeito de vento atrás do jogador quando ele se move
    function createWindEffect(x, y, direction) {
        const wind = document.createElement('div');
        wind.classList.add('wind');
        wind.style.left = `${x}px`;
        wind.style.top = `${y}px`;
        
        // Adiciona classe direcional
        if (direction === 'left') {
            wind.classList.add('wind-left');
        } else {
            wind.classList.add('wind-right');
        }
        
        gameContainer.appendChild(wind);
        
        // Remove o elemento após a animação
        setTimeout(() => {
            wind.remove();
        }, 400);
    }

    // Cria um efeito de rastro para movimento rápido
    function createSpeedTrail(x, y, direction) {
        const trail = document.createElement('div');
        trail.classList.add('speed-trail');
        
        if (direction === 'left') {
            trail.style.transform = 'scaleX(-1)';
        }
        
        trail.style.left = `${x}px`;
        trail.style.top = `${y}px`;
        trail.style.height = `${player.offsetHeight}px`;
        trail.style.width = `${player.offsetWidth}px`;
        
        gameContainer.appendChild(trail);
        
        // Adiciona a classe para iniciar a animação
        setTimeout(() => {
            trail.classList.add('speed-trail-active');
        }, 10);
        
        // Remove após a animação terminar
        setTimeout(() => {
            if (trail && trail.parentNode) {
                trail.remove();
            }
        }, 500);
    }
    
    // Cria texto para manobras
    function createTrickText(x, y, text) {
        const trickText = document.createElement('div');
        trickText.textContent = text;
        trickText.classList.add('trick-text');
        trickText.style.left = `${x}px`;
        trickText.style.top = `${y}px`;
        
        gameContainer.appendChild(trickText);
        
        // Animação de desaparecimento
        setTimeout(() => {
            trickText.style.opacity = '0';
            trickText.style.transform = 'translateY(-30px) scale(1.5)';
        }, 100);
        
        // Remove após a animação
        setTimeout(() => {
            if (trickText && trickText.parentNode) {
                trickText.remove();
            }
        }, 1000);
    }
});