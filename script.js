/**
 * JUNGLE RUN: ELITE - BOSS CHALLENGE EDITION
 * - REGLA: +1 Vida solo tras matar 10 Pirañas Gigantes (Bosses).
 * - Power-Ups, Clima y Multijugador activos.
 */

const CONFIG = {
    GRAVEDAD: 0.8,
    POTENCIA_SALTO: -25,
    VELOCIDAD_BALA: 12,
    FRECUENCIA_ENEMIGOS: 0.02,
    OFFSET_DISPARO_Y: 40,
    RECOIL: 5,
    CANTIDAD_LLUVIA: 60,
    CHANCE_RELAMPAGO: 0.005 
};

const ESTADOS = Object.freeze({ MENU: 0, JUGANDO: 1, FIN_TURNO: 2, RESULTADOS: 3 });
const TIPOS_BALA = Object.freeze({ NORMAL: 'normal', TRIPLE: 'triple', LASER: 'laser' });

class Gota {
    constructor(w, h) { this.w = w; this.h = h; this.reset(); }
    reset() {
        this.x = Math.random() * this.w;
        this.y = Math.random() * -this.h;
        this.v = 10 + Math.random() * 10;
        this.l = 15 + Math.random() * 15;
    }
    update() {
        this.y += this.v;
        this.x -= 1;
        if (this.y > this.h) this.reset();
    }
    draw(ctx) {
        ctx.strokeStyle = "rgba(174, 194, 224, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.l);
        ctx.stroke();
    }
}

class Proyectil {
    constructor(x, y, velocidad, angulo = 0, tipo = TIPOS_BALA.NORMAL) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angulo) * velocidad;
        this.vy = Math.sin(angulo) * velocidad;
        this.tipo = tipo;
        this.width = tipo === TIPOS_BALA.LASER ? 60 : 20;
        this.height = 4;
        this.activo = true;
    }
    update() { 
        this.x += this.vx; this.y += this.vy;
        if (this.x > window.innerWidth || this.x < 0) this.activo = false; 
    }
    draw(ctx) {
        ctx.fillStyle = this.tipo === TIPOS_BALA.LASER ? "#00ffff" : "#f1c40f";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemigo {
    constructor(canvasW, canvasH, dificultad, tipo = 'piraña') {
        this.tipo = tipo; this.x = canvasW; this.activo = true;
        this.width = (tipo === 'boss') ? 140 : 70;
        this.height = (tipo === 'boss') ? 90 : 45;
        this.v = (tipo === 'boss') ? 2 : (4 + Math.random() * 3) * dificultad;
        this.vida = (tipo === 'boss') ? 5 : 1;
        this.y = Math.random() * (canvasH - 250) + 100;
    }
    update() { this.x -= this.v; if (this.x + this.width < 0) this.activo = false; }
    draw(ctx, img) {
        if (img && img.complete && img.width > 0) {
            if (this.tipo === 'boss') ctx.filter = "hue-rotate(90deg)";
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
            ctx.filter = "none";
        } else {
            ctx.fillStyle = (this.tipo === 'boss') ? "red" : "orange";
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class PowerUp {
    constructor(canvasW, canvasH) {
        this.x = canvasW;
        this.y = Math.random() * (canvasH - 300) + 100;
        this.tipo = Math.random() > 0.5 ? TIPOS_BALA.TRIPLE : TIPOS_BALA.LASER;
        this.activo = true;
    }
    update() { this.x -= 3; if(this.x < -50) this.activo = false; }
    draw(ctx) {
        ctx.fillStyle = "#9b59b6";
        ctx.beginPath(); ctx.arc(this.x + 20, this.y + 20, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
        ctx.fillText("?", this.x + 13, this.y + 27);
    }
}

class JungleRun {
    constructor() {
        this.canvas = document.getElementById('canvasJuego');
        this.ctx = this.canvas.getContext('2d');
        this.tInicioGlobal = Date.now();
        this.estadoActual = ESTADOS.MENU;
        this.turnoActual = 0; this.jugadoresTotales = 1; this.puntajes = [];
        this.balas = []; this.enemigos = []; this.powerups = []; this.lluvia = [];
        this.screenShake = 0; this.flashRelampago = 0;

        this._cargarRecursos();
        this._initSistemas();
        this.resizer();
        this.render();
    }

    _cargarRecursos() {
        const loadImg = (src) => { 
            const i = new Image(); i.src = src; 
            return i; 
        };
        this.assets = {
            img: {
                soldado: loadImg('soldado.png'),
                enemigo: loadImg('pirana_enemigo.png'),
                fondoNoche: loadImg('selva_amazonas.png'),
                fondoDia: loadImg('selva_amazonasd.png')
            },
            sfx: { 
                disparo: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'),
                stomp: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/galaxyinvaders/bonus.wav')
            }
        };
    }

    _initSistemas() {
        window.addEventListener('keydown', (e) => this.inputHandler(e.code));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.manejarToque(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        window.addEventListener('resize', () => this.resizer());
        for(let i=0; i<CONFIG.CANTIDAD_LLUVIA; i++) this.lluvia.push(new Gota(window.innerWidth, window.innerHeight));
    }

    resizer() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    iniciarPartida(n) {
        this.jugadoresTotales = n;
        this.turnoActual = 0;
        this.puntajes = Array(n).fill(0);
        this.prepararTurno();
    }

    prepararTurno() {
        this.vidas = 3; 
        this.puntos = 0; 
        this.bossesDerrotados = 0; // CONTADOR PARA LA REGLA DE 10
        this.tipoArma = TIPOS_BALA.NORMAL;
        this.powerTimer = 0; this.balas = []; this.enemigos = []; this.powerups = [];
        this.player = { x: 80, y: 0, w: 100, h: 120, vy: 0, enSuelo: false, sueloY: this.canvas.height - 150 };
        this.estadoActual = ESTADOS.JUGANDO;
    }

    disparar() {
        if (this.estadoActual !== ESTADOS.JUGANDO) return;
        this.player.x -= CONFIG.RECOIL; 
        const startX = this.player.x + 80;
        const startY = this.player.y + CONFIG.OFFSET_DISPARO_Y;
        
        if (this.tipoArma === TIPOS_BALA.TRIPLE) {
            [-0.2, 0, 0.2].forEach(a => this.balas.push(new Proyectil(startX, startY, CONFIG.VELOCIDAD_BALA, a, TIPOS_BALA.TRIPLE)));
        } else {
            this.balas.push(new Proyectil(startX, startY, CONFIG.VELOCIDAD_BALA, 0, this.tipoArma));
        }
        try { this.assets.sfx.disparo.cloneNode().play(); } catch(e){}
    }

    update() {
        this.lluvia.forEach(g => g.update());
        if (Math.random() < CONFIG.CHANCE_RELAMPAGO) { this.flashRelampago = 0.8; this.screenShake = 12; }
        if (this.flashRelampago > 0) this.flashRelampago -= 0.05;

        if (this.estadoActual !== ESTADOS.JUGANDO) return;

        if (this.player.x < 80) this.player.x += 1;
        this.player.vy += CONFIG.GRAVEDAD;
        this.player.y += this.player.vy;
        if (this.player.y > this.player.sueloY) { this.player.y = this.player.sueloY; this.player.vy = 0; this.player.enSuelo = true; }

        const dif = 1 + (Date.now() - this.tInicioGlobal) / 60000;
        if (Math.random() < CONFIG.FRECUENCIA_ENEMIGOS * dif) {
            const t = Math.random() < 0.15 ? 'boss' : 'piraña';
            this.enemigos.push(new Enemigo(this.canvas.width, this.canvas.height, dif, t));
        }

        if (Math.random() < 0.003) this.powerups.push(new PowerUp(this.canvas.width, this.canvas.height));

        this.balas.forEach(b => b.update());
        this.enemigos.forEach(e => {
            e.update();
            // Colisiones Balas
            this.balas.forEach(b => {
                if (b.activo && e.activo && b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
                    e.vida--; if (this.tipoArma !== TIPOS_BALA.LASER) b.activo = false;
                    if (e.vida <= 0) { 
                        e.activo = false; this.puntos += 100;
                        
                        // LÓGICA DE 10 BOSSES = 1 VIDA
                        if (e.tipo === 'boss') {
                            this.bossesDerrotados++;
                            if (this.bossesDerrotados >= 10) {
                                this.vidas++;
                                this.bossesDerrotados = 0; // Reinicia el contador
                            }
                        }
                    }
                }
            });
            // Colisión Jugador (Pisotón o Daño)
            if (e.activo && this.player.x < e.x + e.width - 20 && this.player.x + this.player.w > e.x + 20 && this.player.y < e.y + e.height - 20 && this.player.y + this.player.h > e.y + 20) {
                if (this.player.vy > 0 && this.player.y + this.player.h < e.y + 40) {
                    e.activo = false; this.puntos += 150; this.player.vy = -20;
                    
                    // TAMBIÉN CUENTA POR PISOTÓN
                    if (e.tipo === 'boss') {
                        this.bossesDerrotados++;
                        if (this.bossesDerrotados >= 10) {
                            this.vidas++;
                            this.bossesDerrotados = 0;
                        }
                    }
                    try { this.assets.sfx.stomp.cloneNode().play(); } catch(e){}
                } else {
                    this.vidas--; e.activo = false; this.screenShake = 20;
                    if (this.vidas <= 0) {
                        this.puntajes[this.turnoActual] = this.puntos;
                        this.estadoActual = ESTADOS.FIN_TURNO;
                    }
                }
            }
        });

        this.powerups.forEach(p => {
            p.update();
            if (p.activo && this.player.x < p.x + 40 && this.player.x + this.player.w > p.x && this.player.y < p.y + 40 && this.player.y + this.player.h > p.y) {
                this.tipoArma = p.tipo; this.powerTimer = 400; p.activo = false;
            }
        });

        if (this.powerTimer > 0) { this.powerTimer--; if (this.powerTimer <= 0) this.tipoArma = TIPOS_BALA.NORMAL; }
        this.balas = this.balas.filter(b => b.activo);
        this.enemigos = this.enemigos.filter(e => e.activo);
        this.powerups = this.powerups.filter(p => p.activo);
        if (this.screenShake > 0) this.screenShake *= 0.8;
    }

    _drawBackground() {
        this.ctx.fillStyle = "#051505"; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.assets.img.fondoNoche.complete) this.ctx.drawImage(this.assets.img.fondoNoche, 0, 0, this.canvas.width, this.canvas.height);
        this.lluvia.forEach(g => g.draw(this.ctx));
        if (this.flashRelampago > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashRelampago})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    render() {
        this.ctx.save();
        if (this.screenShake > 1) this.ctx.translate(Math.random()*this.screenShake, Math.random()*this.screenShake);
        this._drawBackground();

        if (this.estadoActual === ESTADOS.JUGANDO) {
            this.powerups.forEach(p => p.draw(this.ctx));
            this.enemigos.forEach(e => e.draw(this.ctx, this.assets.img.enemigo));
            this.balas.forEach(b => b.draw(this.ctx));
            if (this.assets.img.soldado.complete) this.ctx.drawImage(this.assets.img.soldado, this.player.x, this.player.y, this.player.w, this.player.h);
            else { this.ctx.fillStyle = "#2ecc71"; this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h); }
            
            this.ctx.fillStyle = "white"; this.ctx.font = "bold 20px Arial";
            this.ctx.fillText(`J${this.turnoActual+1} | VIDAS: ${this.vidas} | PTS: ${this.puntos}`, 30, 40);
            
            // HUD DE PROGRESO HACIA VIDA EXTRA (OPCIONAL)
            this.ctx.fillStyle = "#ffcc00"; this.ctx.font = "14px Arial";
            this.ctx.fillText(`Pirañas Gigantes: ${this.bossesDerrotados}/10`, 30, 65);

            if (this.tipoArma !== TIPOS_BALA.NORMAL) { this.ctx.fillStyle = "#00ffff"; this.ctx.fillText(`ARMA: ${this.tipoArma.toUpperCase()}`, 30, 90); }
        } else if (this.estadoActual === ESTADOS.MENU) {
            this.ctx.fillStyle = "rgba(0,0,0,0.8)"; this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#2ecc71"; this.ctx.textAlign = "center"; this.ctx.font = "bold 40px Arial";
            this.ctx.fillText("JUNGLE RUN: ELITE", this.canvas.width/2, this.canvas.height/2 - 60);
            this.ctx.fillStyle = "white"; this.ctx.font = "20px Arial";
            this.ctx.fillText("TOCA IZQ: 1 JUGADOR | TOCA DER: 2 JUGADORES", this.canvas.width/2, this.canvas.height/2);
        } else if (this.estadoActual === ESTADOS.FIN_TURNO) {
            this.ctx.fillStyle = "white"; this.ctx.textAlign = "center";
            this.ctx.fillText(`TURNO J${this.turnoActual+1} FINALIZADO - TOCA PARA SEGUIR`, this.canvas.width/2, this.canvas.height/2);
        } else if (this.estadoActual === ESTADOS.RESULTADOS) {
            this.ctx.fillStyle = "gold"; this.ctx.textAlign = "center"; this.ctx.font = "30px Arial";
            this.ctx.fillText("PUNTUACIONES FINALES", this.canvas.width/2, 100);
            this.puntajes.forEach((p, i) => {
                this.ctx.fillStyle = "white";
                this.ctx.fillText(`JUGADOR ${i+1}: ${p} PTS`, this.canvas.width/2, 200 + i*50);
            });
            this.ctx.fillText("TOCA PARA REINICIAR", this.canvas.width/2, this.canvas.height - 100);
        }
        this.ctx.restore();
        this.update();
        requestAnimationFrame(() => this.render());
    }

    manejarToque(x, y) {
        if (this.estadoActual === ESTADOS.MENU) { x < this.canvas.width / 2 ? this.iniciarPartida(1) : this.iniciarPartida(2); } 
        else if (this.estadoActual === ESTADOS.FIN_TURNO) {
            if (this.turnoActual + 1 < this.jugadoresTotales) { this.turnoActual++; this.prepararTurno(); } 
            else this.estadoActual = ESTADOS.RESULTADOS;
        } else if (this.estadoActual === ESTADOS.RESULTADOS) this.estadoActual = ESTADOS.MENU;
        else if (this.estadoActual === ESTADOS.JUGANDO) {
            if (x < this.canvas.width / 2) {
                if (this.player.enSuelo) { this.player.vy = CONFIG.POTENCIA_SALTO; this.player.enSuelo = false; }
            } else this.disparar();
        }
    }

    inputHandler(code) {
        if (code === 'ArrowUp') this.manejarToque(0, 0);
        if (code === 'Space') this.manejarToque(window.innerWidth, 0);
        if ((this.estadoActual === ESTADOS.FIN_TURNO || this.estadoActual === ESTADOS.RESULTADOS) && code === 'Enter') this.manejarToque(0,0);
    }
}

window.onload = () => { new JungleRun(); };
