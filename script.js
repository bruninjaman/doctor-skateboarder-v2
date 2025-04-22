document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const scoreDisplay = document.getElementById('score');
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
    function createCoinCollectEffect(x, y) {
        const effect = document.createElement('div');
        effect.classList.add('coin-effect');
        effect.textContent = '+1';
        effect.style.left = `${x}px`;
        effect.style.top = `${y}px`;
        gameContainer.appendChild(effect);
        
        // Remove o elemento após a animação
        setTimeout(() => {
            effect.remove();
        }, 800);
        
        // Adiciona um flash no fundo do jogo para feedback visual
        gameContainer.classList.add('coin-flash');
        setTimeout(() => {
            gameContainer.classList.remove('coin-flash');
        }, 300);
    }

    // Finaliza o jogo
    function gameOver() {
        if (isGameOver) return; // Evita vários acionamentos
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

        if (keysPressed['ArrowLeft'] || keysPressed['btnLeft']) dx -= speed;
        if (keysPressed['ArrowRight'] || keysPressed['btnRight']) dx += speed;
        if (keysPressed['ArrowUp'] || keysPressed['btnUp']) dy -= speed;
        if (keysPressed['ArrowDown'] || keysPressed['btnDown']) dy += speed;

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
        
        // Adiciona efeito de salto ao se mover para cima
        if (dy < 0 && !player.classList.contains('jump')) {
            player.classList.add('jump');
            setTimeout(() => {
                player.classList.remove('jump');
            }, 500); // Corresponde à duração da animação
        }

        // Atualiza a posição global do jogador (relativa ao contêiner)
        playerX = newX;
        playerY = newY;
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

        // 3. Verifica colisões
        // Jogador vs Moedas
        const coins = document.querySelectorAll('.coin');
        coins.forEach(coin => {
            if (checkCollision(player, coin)) {
                const coinRect = getRect(coin);
                const gameRect = getRect(gameContainer);
                const effectX = coinRect.left - gameRect.left;
                const effectY = coinRect.top - gameRect.top;
                
                createCoinCollectEffect(effectX, effectY);
                coin.remove();
                score++;
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
        isGameOver = false;
        gameStarted = true;
        keysPressed = {};
        scoreDisplay.textContent = score;
        gameOverScreen.classList.add('hidden');
        instructions.classList.remove('hidden');
        player.style.opacity = '1';
        
        // Reinicia as velocidades
        currentBirdSpeed = INITIAL_BIRD_SPEED;
        currentCoinSpawnInterval = INITIAL_COIN_SPAWN_INTERVAL;
        currentBirdSpawnInterval = INITIAL_BIRD_SPAWN_INTERVAL;
        
        // Oculta a tela inicial
        appInfo.classList.add('hidden');

        // Limpa moedas e pássaros existentes
        document.querySelectorAll('.coin, .bird, .explosion').forEach(el => el.remove());

        // Reinicia a posição do jogador (usa offsetLeft/Top para posicionamento dentro do pai)
        player.style.left = `${(gameContainer.offsetWidth - player.offsetWidth) / 2}px`;
        player.style.top = `${gameContainer.offsetHeight - player.offsetHeight - 10}px`; // Inicia próximo ao fundo novamente
        playerX = player.offsetLeft;
        playerY = player.offsetTop;
        
        // Remove qualquer classe de movimento aplicada anteriormente
        player.classList.remove('move-left', 'move-right', 'jump');

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
});