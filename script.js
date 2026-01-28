/**
 * JUNGLE RUN: OPERACIÓN PIRAÑA - MULTIPLAYER ELITE
 * Versión Ultra-Estabilizada (Anti-Freeze) con Parche de Seguridad.
 */

const canvas = document.getElementById('canvasJuego'); 
const ctx = canvas.getContext('2d'); 

const ESTADO = { MENU: 0, JUGANDO: 1, PAUSA: 2, FIN_TURNO: 3, RESULTADOS: 4 }; 

class JungleRun {
    constructor() {
        this.tInicio = Date.now(); 
        this.estadoActual = ESTADO.MENU; 
        this.jugadoresTotales = 1; 
        this.turnoActual = 0; 
        this.puntajes = []; 
        this.gravedad = 0.8; 
        this.teclas = {}; 
        this.duracionCiclo = 60000; 
        this.tiempoTransicion = 5000; 
        
        this._cargarRecursos(); 
        this._escucharEventos(); 
        this.ajustarPantalla(); 
        
        this.render(); 
    }

    _cargarRecursos() {
        this.img = {
            portada: this._newImg('icono-192.png'), 
            fondoNoche: this._newImg('selva_amazonas.png'), 
            fondoDia: this._newImg('selva_amazonasd.png'), 
            soldado: this._newImg('soldado.png'), 
            enemigo: this._newImg('pirana_enemigo.png'), 
            gameOver: this._newImg('pirana_gameover.png') 
        };
        this.sfx = {
            disparo: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'), 
            muerte: new Audio('https://rpg.hamsterrepublic.com/ohrrpgce/sounds/Explosion1.wav') 
        };
    }

    _newImg(src) { 
        const i = new Image(); 
        i.src = src; 
        i.onerror = () => console.warn("No se pudo cargar: " + src); 
        return i; 
    }

    _escucharEventos() {
        window.addEventListener('resize', () => this.ajustarPantalla()); 
        window.addEventListener('keydown', (e) => this.input(e.code)); 
        window.addEventListener('keyup', (e) => this.teclas[e.code] = false);

        // NUEVO: Soporte táctil para móviles
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.manejarToque(touch.clientX, touch.clientY);
        }, { passive: false });
    }

    manejarToque(x, y) {
        if (this.estadoActual === ESTADO.MENU) {
            // Elige jugadores según dónde tocas en la mitad inferior
            if (y > canvas.height / 2) {
                if (x < canvas.width * 0.25) this.iniciarPartida(1);
                else if (x < canvas.width * 0.50) this.iniciarPartida(2);
                else if (x < canvas.width * 0.75) this.iniciarPartida(3);
                else this.iniciarPartida(4);
            }
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            // Izquierda salta, Derecha dispara
            if (x < canvas.width / 2) {
                if (this.player.enSuelo) {
                    this.player.vy = this.player.salto;
                    this.player.enSuelo = false;
                }
            } else {
                this.disparar();
            }
        } else if (this.estadoActual === ESTADO.FIN_TURNO) {
            // Simula ENTER al tocar
            this.input('Enter');
        } else if (this.estadoActual === ESTADO.RESULTADOS) {
            // Simula 'R' al tocar
            this.input('KeyR');
        }
    }

    ajustarPantalla() {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
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
        this.balas = []; 
        this.piranas = []; 
        this.tInicio = Date.now(); 
        
        this.player = {
            x: 80, y: 0, w: 130, h: 150, vy: 0, 
            salto: -25, enSuelo: false, 
            sueloY: canvas.height - 170 
        };
        this.estadoActual = ESTADO.JUGANDO; 
    }

    input(code) {
        if (this.estadoActual === ESTADO.MENU) {
            const n = code.match(/Digit(\d)/); 
            if (n && n[1] >= 1 && n[1] <= 4) this.iniciarPartida(parseInt(n[1])); 
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            if (code === 'ArrowUp' && this.player.enSuelo) { 
                this.player.vy = this.player.salto; 
                this.player.enSuelo = false; 
            }
            if (code === 'Space') this.disparar(); 
            if (code === 'KeyP') this.estadoActual = ESTADO.PAUSA; 
        } else if (this.estadoActual === ESTADO.PAUSA && code === 'KeyP') {
            this.estadoActual = ESTADO.JUGANDO; 
        } else if (this.estadoActual === ESTADO.FIN_TURNO && code === 'Enter') {
            this.puntajes[this.turnoActual] = this.puntos; 
            if (this.turnoActual + 1 < this.jugadoresTotales) { 
                this.turnoActual++; 
                this.prepararTurno(); 
            } else {
                this.estadoActual = ESTADO.RESULTADOS; 
            }
        } else if (this.estadoActual === ESTADO.RESULTADOS && code === 'KeyR') {
            this.estadoActual = ESTADO.MENU; 
        }
    }

    disparar() {
        this.balas.push({ x: this.player.x + 100, y: this.player.y + 70, v: 15 }); 
        if (this.sfx.disparo.readyState >= 2) { 
            this.sfx.disparo.currentTime = 0; 
            this.sfx.disparo.play().catch(() => {}); 
        }
    }

    update() {
        if (this.estadoActual !== ESTADO.JUGANDO) return; 

        this.player.vy += this.gravedad; 
        this.player.y += this.player.vy; 
        if (this.player.y > this.player.sueloY) { 
            this.player.y = this.player.sueloY; 
            this.player.vy = 0; 
            this.player.enSuelo = true; 
        }

        const diff = 1 + (Date.now() - this.tInicio) / 15000; 

        if (Math.random() < 0.02 * diff) { 
            this.piranas.push({ x: canvas.width, y: Math.random() * (canvas.height - 250) + 100, v: 2 * diff }); 
        }

        this.piranas.forEach((p, i) => {
            p.x -= p.v; 
            const pBox = { x: p.x + 10, y: p.y + 10, w: 60, h: 30 }; 
            const sBox = { x: this.player.x + 30, y: this.player.y, w: 70, h: 150 }; 

            if (sBox.x < pBox.x + pBox.w && sBox.x + sBox.w > pBox.x && 
                sBox.y < pBox.y + pBox.h && sBox.y + sBox.h > pBox.y) { 
                if (this.player.vy > 0 && (sBox.y + sBox.h - this.player.vy) <= pBox.y + 15) { 
                    this.piranas.splice(i, 1); 
                    this.puntos += 200; 
                    this.player.vy = this.player.salto / 1.8; 
                    this.sfx.muerte.play().catch(() => {}); 
                } else {
                    this.vidas--; 
                    this.piranas.splice(i, 1); 
                    if (this.vidas <= 0) this.estadoActual = ESTADO.FIN_TURNO; 
                }
            }
        });

        this.balas.forEach((b, bi) => {
            b.x += b.v; 
            this.piranas.forEach((p, pi) => {
                if (Math.hypot(b.x - p.x, b.y - p.y) < 45) { 
                    this.piranas.splice(pi, 1); 
                    this.balas.splice(bi, 1); 
                    this.puntos += 100; 
                }
            });
        });
    }

    dibujarFondoDinamico() {
        const tiempoTranscurrido = (Date.now() - (this.tInicio || 0)) % (this.duracionCiclo * 2); 
        let opacidadDia = 0; 

        if (tiempoTranscurrido > this.duracionCiclo - this.tiempoTransicion && tiempoTranscurrido < this.duracionCiclo) {
            opacidadDia = (tiempoTranscurrido - (this.duracionCiclo - this.tiempoTransicion)) / this.tiempoTransicion; 
        } else if (tiempoTranscurrido >= this.duracionCiclo && tiempoTranscurrido < (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1; 
        } else if (tiempoTranscurrido >= (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1 - (tiempoTranscurrido - ((this.duracionCiclo * 2) - this.tiempoTransicion)) / this.tiempoTransicion; 
        }

        ctx.fillStyle = "#0a1f0a"; 
        ctx.fillRect(0,0, canvas.width, canvas.height); 

        if (this.img.fondoNoche.complete && this.img.fondoNoche.naturalWidth > 0) { 
            ctx.drawImage(this.img.fondoNoche, 0, 0, canvas.width, canvas.height); 
        }
        
        if (opacidadDia > 0 && this.img.fondoDia.complete && this.img.fondoDia.naturalWidth > 0) { 
            ctx.save(); 
            ctx.globalAlpha = opacidadDia; 
            ctx.drawImage(this.img.fondoDia, 0, 0, canvas.width, canvas.height); 
            ctx.restore(); 
        }
    }

    _drawHeart(x, y, size, fill) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + size / 4);
        ctx.quadraticCurveTo(x, y, x + size / 4, y);
        ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4);
        ctx.quadraticCurveTo(x + size / 2, y, x + (size * 3) / 4, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
        ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + (size * 3) / 4);
        ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
        ctx.fillStyle = fill ? "#ff4757" : "rgba(255,255,255,0.2)";
        ctx.fill(); ctx.restore();
    }

    drawGame() {
        const hudX = 30, hudY = 30, hudW = 320, hudH = 120;
        ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "rgba(0,0,0,0.5)";
        const grad = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH);
        grad.addColorStop(0, "rgba(20, 20, 20, 0.85)"); grad.addColorStop(1, "rgba(40, 40, 40, 0.95)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(hudX, hudY, hudW, hudH, 15); ctx.fill();
        ctx.strokeStyle = "#2ecc71"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

        ctx.textAlign = "left"; ctx.fillStyle = "#2ecc71"; ctx.font = "bold 14px Courier New";
        ctx.fillText("OPERATIVO ACTIVADO:", hudX + 20, hudY + 30);
        ctx.fillStyle = "white"; ctx.font = "bold 22px Arial";
        ctx.fillText(`JUGADOR ${this.turnoActual + 1}`, hudX + 20, hudY + 55);

        for (let i = 0; i < 3; i++) this._drawHeart(hudX + 220 + (i * 30), hudY + 40, 22, i < this.vidas);

        ctx.fillStyle = "#f1c40f"; ctx.font = "bold 14px Courier New";
        ctx.fillText("PUNTOS ACUMULADOS:", hudX + 20, hudY + 85);
        ctx.fillStyle = "white"; ctx.font = "bold 26px Courier New";
        ctx.fillText(this.puntos.toString().padStart(6, '0'), hudX + 20, hudY + 108);

        if (this.img.soldado.complete && this.img.soldado.naturalWidth > 0) { 
            ctx.drawImage(this.img.soldado, this.player.x, this.player.y, this.player.w, this.player.h); 
        } else {
            ctx.fillStyle = "green"; ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h); 
        }
        
        this.piranas.forEach(p => {
            if (this.img.enemigo.complete && this.img.enemigo.naturalWidth > 0) { 
                ctx.drawImage(this.img.enemigo, p.x, p.y, 80, 50); 
            } else {
                ctx.fillStyle = "red"; ctx.fillRect(p.x, p.y, 80, 50); 
            }
        });

        ctx.fillStyle = "yellow"; 
        this.balas.forEach(b => ctx.fillRect(b.x, b.y, 25, 6)); 
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        this.dibujarFondoDinamico(); 

        try {
            switch (this.estadoActual) { 
                case ESTADO.MENU: this.drawMenu(); break; 
                case ESTADO.JUGANDO: this.drawGame(); break; 
                case ESTADO.PAUSA: this.drawOverlay("PAUSA - TOCA PARA SEGUIR"); break; 
                case ESTADO.FIN_TURNO: this.drawGameOver(); break; 
                case ESTADO.RESULTADOS: this.drawResultados(); break; 
            }
            this.update(); 
        } catch (e) {
            console.error("Error:", e); 
        }

        requestAnimationFrame(() => this.render()); 
    }

    drawMenu() {
        if(this.img.portada.complete && this.img.portada.naturalWidth > 0) {
            ctx.drawImage(this.img.portada, 0, 0, canvas.width, canvas.height); 
        }
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
        ctx.textAlign = "center"; 
        ctx.fillStyle = "#2ecc71"; ctx.font = "bold 50px Courier New"; 
        ctx.fillText("JUNGLE RUN: ELITE", canvas.width/2, canvas.height/2 - 80); 
        ctx.fillStyle = "white"; ctx.font = "24px Arial"; 
        ctx.fillText("TOCA ABAJO PARA ELEGIR JUGADORES", canvas.width/2, canvas.height/2); 
        
        // Guía visual táctica
        ctx.font = "bold 20px Courier New";
        for(let i=1; i<=4; i++) {
            ctx.fillText(`[ ${i} ]`, (canvas.width * 0.25 * i) - (canvas.width * 0.125), canvas.height - 80);
        }
    }

    drawOverlay(txt) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; 
        ctx.fillRect(0,0,canvas.width, canvas.height); 
        ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.font = "30px Arial"; 
        ctx.fillText(txt, canvas.width/2, canvas.height/2); 
    }

    drawGameOver() {
        this.drawOverlay("¡TURNO TERMINADO!"); 
        ctx.font = "20px Arial"; 
        ctx.fillText(`Puntos: ${this.puntos}. TOCA PANTALLA`, canvas.width/2, canvas.height/2 + 50); 
    }

    drawResultados() {
        this.drawOverlay("RANKING FINAL"); 
        this.puntajes.forEach((p, i) => { 
            ctx.fillText(`Jugador ${i+1}: ${p} PTS`, canvas.width/2, 200 + (i*50)); 
        });
        ctx.fillText("Toca para reiniciar", canvas.width/2, canvas.height - 100); 
    }
}

const game = new JungleRun();
