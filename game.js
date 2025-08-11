class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // Game objects
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnDelay = 1000; // 1 second initially (was 2000)
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Initialize game
        this.init();
    }
    
    init() {
        this.player = new Player(this.width / 2, this.height - 50);
        this.updateUI();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.player.shoot();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button events
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
    }
    
    startGame() {
        this.gameState = 'playing';
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        // Spawn an enemy immediately for testing
        this.spawnEnemy();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.player = new Player(this.width / 2, this.height - 50);
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.updateUI();
        document.getElementById('gameOver').classList.add('hidden');
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameLoop(currentTime) {
        if (this.gameState !== 'playing') return;
        
        // Initialize lastTime on first frame
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update player
        this.player.update(this.keys, this.width, this.height);
        
        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.y < 0) {
                this.bullets.splice(index, 1);
            }
        });
        
        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > this.enemySpawnDelay) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
            // Increase difficulty over time
            this.enemySpawnDelay = Math.max(500, this.enemySpawnDelay - 10);
            console.log(`Enemy spawned! Total enemies: ${this.enemies.length}`);
        }
        
        // Update enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update();
            if (enemy.y > this.height) {
                this.enemies.splice(index, 1);
            }
        });
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update();
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Check game over
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
    
    spawnEnemy() {
        const x = Math.random() * (this.width - 40);
        const speed = 1 + Math.random() * 3 + this.level * 0.5;
        
        // Randomly choose enemy type based on probability
        const rand = Math.random();
        let enemy;
        
        if (rand < 0.5) {
            // Basic enemy (50% chance)
            enemy = new BasicEnemy(x, -40, speed);
        } else if (rand < 0.75) {
            // Fast enemy (25% chance)
            enemy = new FastEnemy(x, -40, speed * 1.5);
        } else if (rand < 0.9) {
            // Tank enemy (15% chance)
            enemy = new TankEnemy(x, -40, speed * 0.7);
        } else {
            // Zigzag enemy (10% chance)
            enemy = new ZigzagEnemy(x, -40, speed);
        }
        
        this.enemies.push(enemy);
    }
    
    checkCollisions() {
        // Bullet vs Enemy collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    // Remove bullet
                    this.bullets.splice(bulletIndex, 1);
                    
                    // Damage enemy
                    enemy.takeDamage(1);
                    
                    if (enemy.health <= 0) {
                        // Remove enemy and add score
                        this.enemies.splice(enemyIndex, 1);
                        this.score += enemy.scoreValue;
                        this.updateUI();
                        
                        // Add explosion particles
                        this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.explosionSize);
                    } else {
                        // Enemy hit but not destroyed - smaller explosion
                        this.createHitEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    }
                }
            });
        });
        
        // Player vs Enemy collisions
        this.enemies.forEach((enemy, index) => {
            if (this.isColliding(this.player, enemy)) {
                this.enemies.splice(index, 1);
                this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.explosionSize);
                this.lives -= enemy.damageToPlayer;
                this.updateUI();
                
                // Player hit effect
                this.player.hit();
            }
        });
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    createExplosion(x, y, size = 15) {
        for (let i = 0; i < size; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }
    
    createHitEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(x, y, 'hit'));
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw stars background
        this.drawStars();
        
        // Draw game objects
        this.player.draw(this.ctx);
        
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Debug info
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 30);
        this.ctx.fillText(`Spawn Timer: ${Math.floor(this.enemySpawnTimer)}ms`, 10, 50);
        
        // Draw pause overlay
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#00d4ff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width/2, this.height/2);
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 47) % this.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.shootCooldown = 0;
        this.hitTimer = 0;
    }
    
    update(keys, canvasWidth, canvasHeight) {
        // Movement
        if (keys['ArrowLeft'] && this.x > 0) {
            this.x -= this.speed;
        }
        if (keys['ArrowRight'] && this.x < canvasWidth - this.width) {
            this.x += this.speed;
        }
        if (keys['ArrowUp'] && this.y > 0) {
            this.y -= this.speed;
        }
        if (keys['ArrowDown'] && this.y < canvasHeight - this.height) {
            this.y += this.speed;
        }
        
        // Update timers
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.hitTimer > 0) this.hitTimer--;
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            game.bullets.push(new Bullet(this.x + this.width/2, this.y));
            this.shootCooldown = 15; // Prevent rapid fire
        }
    }
    
    hit() {
        this.hitTimer = 60; // 1 second at 60fps
    }
    
    draw(ctx) {
        // Flashing effect when hit
        if (this.hitTimer > 0 && Math.floor(this.hitTimer / 5) % 2) {
            return; // Skip drawing for flashing effect
        }
        
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw player as a simple ship
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(this.x + 15, this.y + 15, 10, 10);
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = 8;
    }
    
    update() {
        this.y -= this.speed;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y, speed, health = 1, scoreValue = 10) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.scoreValue = scoreValue;
        this.damageToPlayer = 1;
        this.explosionSize = 15;
        this.color = '#ff4444';
    }
    
    update() {
        this.y += this.speed;
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    draw(ctx) {
        // Health-based color intensity
        const healthRatio = this.health / this.maxHealth;
        const intensity = Math.floor(255 * healthRatio);
        this.color = `rgb(${255}, ${intensity}, ${intensity})`;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw enemy details
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
        
        // Health bar for enemies with more than 1 health
        if (this.maxHealth > 1) {
            const barWidth = this.width;
            const barHeight = 4;
            const healthWidth = (this.health / this.maxHealth) * barWidth;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y - 8, healthWidth, barHeight);
        }
    }
}

class BasicEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 1, 10);
        this.width = 25;
        this.height = 25;
    }
}

class FastEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 1, 15);
        this.width = 20;
        this.height = 20;
        this.color = '#ff8800';
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw triangle shape for fast enemy
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 5);
        ctx.lineTo(this.x + 5, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width - 5, this.y + this.height - 5);
        ctx.closePath();
        ctx.fill();
    }
}

class TankEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 3, 30);
        this.width = 35;
        this.height = 35;
        this.color = '#884444';
        this.explosionSize = 25;
        this.damageToPlayer = 2;
    }
    
    draw(ctx) {
        super.draw(ctx);
        
        // Add armor plating visual
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x + 2, this.y + 2, 5, 5);
        ctx.fillRect(this.x + this.width - 7, this.y + 2, 5, 5);
        ctx.fillRect(this.x + 2, this.y + this.height - 7, 5, 5);
        ctx.fillRect(this.x + this.width - 7, this.y + this.height - 7, 5, 5);
    }
}

class ZigzagEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 2, 25);
        this.width = 28;
        this.height = 28;
        this.color = '#ff44ff';
        this.zigzagAmplitude = 50;
        this.zigzagFrequency = 0.05;
        this.initialX = x;
        this.time = 0;
    }
    
    update() {
        this.y += this.speed;
        this.time += this.zigzagFrequency;
        this.x = this.initialX + Math.sin(this.time) * this.zigzagAmplitude;
        
        // Keep within screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x > 800 - this.width) this.x = 800 - this.width;
    }
    
    draw(ctx) {
        super.draw(ctx);
        
        // Add zigzag visual indicator
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
            const offset = i * 8;
            ctx.fillRect(this.x + 8 + offset, this.y + 5, 3, 3);
            ctx.fillRect(this.x + 5 + offset, this.y + 15, 3, 3);
        }
    }
}

class Particle {
    constructor(x, y, type = 'explosion') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        if (type === 'explosion') {
            this.vx = (Math.random() - 0.5) * 10;
            this.vy = (Math.random() - 0.5) * 10;
            this.life = 30;
            this.maxLife = 30;
            this.size = Math.random() * 4 + 2;
            this.colors = ['#ff6600', '#ff9900', '#ffcc00', '#ff3300'];
        } else if (type === 'hit') {
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6;
            this.life = 15;
            this.maxLife = 15;
            this.size = Math.random() * 2 + 1;
            this.colors = ['#ffff00', '#ffffff'];
        }
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const colorIndex = Math.floor(Math.random() * this.colors.length);
        const color = this.colors[colorIndex];
        
        // Extract RGB values and add alpha
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
            ctx.fillStyle = color;
        }
        
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});
