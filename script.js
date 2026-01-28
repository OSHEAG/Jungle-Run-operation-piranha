/**
 * JUNGLE RUN: OPERACIÓN PIRAÑA - MULTIPLAYER ELITE
 * Versión Ultra-Estabilizada (Anti-Freeze) con Parche de Seguridad.
 */

const canvas = document.getElementById('canvasJuego'); // Obtiene el elemento canvas del HTML
const ctx = canvas.getContext('2d'); // Establece el contexto de dibujo en 2D

const ESTADO = { MENU: 0, JUGANDO: 1, PAUSA: 2, FIN_TURNO: 3, RESULTADOS: 4 }; // Define los estados posibles del juego

class JungleRun {
    constructor() {
        this.tInicio = Date.now(); // Registra el tiempo de inicio para cálculos de dificultad
        this.estadoActual = ESTADO.MENU; // Establece el estado inicial en el menú
        this.jugadoresTotales = 1; // Variable para almacenar cuántos jugadores participarán
        this.turnoActual = 0; // Rastrea cuál jugador está jugando actualmente
        this.puntajes = []; // Array para guardar los puntos de cada jugador
        this.gravedad = 0.8; // Fuerza que empuja al jugador hacia abajo
        this.teclas = {}; // Objeto para registrar qué teclas están presionadas
        this.duracionCiclo = 60000; // Tiempo que tarda el ciclo día/noche (60s)
        this.tiempoTransicion = 5000; // Duración del efecto de fundido entre día y noche
        
        this._cargarRecursos(); // Llama a la carga de imágenes y sonidos
        this._escucharEventos(); // Configura los controles de teclado y mouse
        this.ajustarPantalla(); // Ajusta el tamaño del canvas al navegador
        
        this.render(); // Inicia el bucle principal de dibujo
    }

    _cargarRecursos() {
        this.img = {
            portada: this._newImg('icono-192.png'), // Imagen de inicio
            fondoNoche: this._newImg('selva_amazonas.png'), // Fondo nocturno
            fondoDia: this._newImg('selva_amazonasd.png'), // Fondo diurno
            soldado: this._newImg('soldado.png'), // Sprite del protagonista
            enemigo: this._newImg('pirana_enemigo.png'), // Sprite de la piraña
            gameOver: this._newImg('pirana_gameover.png') // Imagen de fin de juego
        };
        this.sfx = {
            disparo: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'), // Sonido de bala
            muerte: new Audio('https://rpg.hamsterrepublic.com/ohrrpgce/sounds/Explosion1.wav') // Sonido de enemigo abatido
        };
    }

    _newImg(src) { 
        const i = new Image(); // Crea un nuevo objeto de imagen
        i.src = src; // Asigna la ruta de la imagen
        i.onerror = () => console.warn("No se pudo cargar: " + src); // Maneja errores de carga
        return i; // Retorna el objeto imagen
    }

    _escucharEventos() {
        window.addEventListener('resize', () => this.ajustarPantalla()); // Redimensiona si cambia el tamaño de ventana
        window.addEventListener('keydown', (e) => this.input(e.code)); // Detecta cuando se presiona una tecla
        window.addEventListener('keyup', (e) => this.teclas[e.code] = false); // Detecta cuando se suelta una tecla

        // NUEVO: Soporte táctil para móviles
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Evita el scroll accidental al jugar
            const touch = e.touches[0]; // Captura el primer punto de contacto
            this.manejarToque(touch.clientX, touch.clientY); // Procesa la posición del toque
        }, { passive: false });
    }

    manejarToque(x, y) {
        if (this.estadoActual === ESTADO.MENU) {
            // Elige jugadores según dónde tocas en la mitad inferior
            if (y > canvas.height / 2) {
                if (x < canvas.width * 0.25) this.iniciarPartida(1); // Tocar zona 1: 1 jugador
                else if (x < canvas.width * 0.50) this.iniciarPartida(2); // Tocar zona 2: 2 jugadores
                else if (x < canvas.width * 0.75) this.iniciarPartida(3); // Tocar zona 3: 3 jugadores
                else this.iniciarPartida(4); // Tocar zona 4: 4 jugadores
            }
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            // Izquierda salta, Derecha dispara
            if (x < canvas.width / 2) {
                if (this.player.enSuelo) {
                    this.player.vy = this.player.salto; // Aplica fuerza de salto
                    this.player.enSuelo = false; // El jugador ya no está en el suelo
                }
            } else {
                this.disparar(); // Ejecuta la acción de disparo
            }
        } else if (this.estadoActual === ESTADO.FIN_TURNO) {
            this.input('Enter'); // Simula ENTER para avanzar de turno
        } else if (this.estadoActual === ESTADO.RESULTADOS) {
            this.input('KeyR'); // Simula 'R' para volver al menú
        }
    }

    ajustarPantalla() {
        canvas.width = window.innerWidth; // Ajusta ancho del canvas al ancho total
        canvas.height = window.innerHeight; // Ajusta alto del canvas al alto total
    }

    iniciarPartida(n) {
        this.jugadoresTotales = n; // Define cantidad de jugadores
        this.turnoActual = 0; // Empieza con el primer jugador
        this.puntajes = Array(n).fill(0); // Crea el ranking vacío
        this.prepararTurno(); // Configura los valores iniciales del turno
    }

    prepararTurno() {
        this.vidas = 3; // Otorga 3 vidas al inicio del turno
        this.puntos = 0; // Reinicia el contador de puntos local
        this.balas = []; // Limpia las balas en pantalla
        this.piranas = []; // Limpia los enemigos en pantalla
        this.tInicio = Date.now(); // Reinicia el tiempo para la dificultad
        
        this.player = {
            x: 80, y: 0, w: 120, h: 130, vy: 0, // Posición y tamaño del jugador
            salto: -25, enSuelo: false, // Potencia de salto y estado de contacto
            sueloY: canvas.height - 150 // Calcula la línea de suelo según el canvas
        };
        this.estadoActual = ESTADO.JUGANDO; // Cambia el estado a juego activo
    }

    input(code) {
        if (this.estadoActual === ESTADO.MENU) {
            const n = code.match(/Digit(\d)/); // Busca si la tecla presionada es un número (1-4)
            if (n && n[1] >= 1 && n[1] <= 4) this.iniciarPartida(parseInt(n[1])); 
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            if (code === 'ArrowUp' && this.player.enSuelo) { 
                this.player.vy = this.player.salto; // Acción de saltar con teclado
                this.player.enSuelo = false; 
            }
            if (code === 'Space') this.disparar(); // Espacio para disparar
            if (code === 'KeyP') this.estadoActual = ESTADO.PAUSA; // P para pausar
        } else if (this.estadoActual === ESTADO.PAUSA && code === 'KeyP') {
            this.estadoActual = ESTADO.JUGANDO; // P para quitar pausa
        } else if (this.estadoActual === ESTADO.FIN_TURNO && code === 'Enter') {
            this.puntajes[this.turnoActual] = this.puntos; // Guarda puntos del jugador actual
            if (this.turnoActual + 1 < this.jugadoresTotales) { 
                this.turnoActual++; // Pasa al siguiente jugador
                this.prepararTurno(); 
            } else {
                this.estadoActual = ESTADO.RESULTADOS; // Si todos jugaron, muestra resultados
            }
        } else if (this.estadoActual === ESTADO.RESULTADOS && code === 'KeyR') {
            this.estadoActual = ESTADO.MENU; // R para volver al inicio
        }
    }

    disparar() {
        this.balas.push({ x: this.player.x + 115, y: this.player.y + 55, v: 15 }); // Añade bala al array
        if (this.sfx.disparo.readyState >= 2) { 
            this.sfx.disparo.currentTime = 0; // Reinicia sonido para disparo rápido
            this.sfx.disparo.play().catch(() => {}); // Reproduce sonido (silencia errores de navegador)
        }
    }

    update() {
        if (this.estadoActual !== ESTADO.JUGANDO) return; // Si no se está jugando, no actualiza lógica

        this.player.vy += this.gravedad; // Aplica gravedad a la velocidad vertical
        this.player.y += this.player.vy; // Cambia posición Y según velocidad
        if (this.player.y > this.player.sueloY) { 
            this.player.y = this.player.sueloY; // Limita caída al suelo
            this.player.vy = 0; 
            this.player.enSuelo = true; 
        }

        const diff = 1 + (Date.now() - this.tInicio) / 15000; // Aumenta la dificultad cada 15 segundos

        if (Math.random() < 0.02 * diff) { // Genera enemigos aleatoriamente
            this.piranas.push({ x: canvas.width, y: Math.random() * (canvas.height - 250) + 100, v: 2 * diff }); 
        }

        this.piranas.forEach((p, i) => {
            p.x -= p.v; // Mueve enemigos a la izquierda
            const pBox = { x: p.x + 10, y: p.y + 10, w: 60, h: 30 }; // Caja de colisión enemigo
            const sBox = { x: this.player.x + 20, y: this.player.y, w: 80, h: 130 }; // Caja de colisión jugador

            if (sBox.x < pBox.x + pBox.w && sBox.x + sBox.w > pBox.x && 
                sBox.y < pBox.y + pBox.h && sBox.y + sBox.h > pBox.y) { // Detector de colisión rectangular
                if (this.player.vy > 0 && (sBox.y + sBox.h - this.player.vy) <= pBox.y + 15) { 
                    this.piranas.splice(i, 1); // Mata enemigo si se cae encima de él
                    this.puntos += 200; 
                    this.player.vy = this.player.salto / 1.8; // Pequeño rebote al saltar sobre enemigo
                    this.sfx.muerte.play().catch(() => {}); 
                } else {
                    this.vidas--; // Resta vida por impacto lateral
                    this.piranas.splice(i, 1); 
                    if (this.vidas <= 0) this.estadoActual = ESTADO.FIN_TURNO; // Fin si no hay vidas
                }
            }
        });

        this.balas.forEach((b, bi) => {
            b.x += b.v; // Mueve la bala a la derecha
            this.piranas.forEach((p, pi) => {
                if (Math.hypot(b.x - p.x, b.y - p.y) < 45) { // Detección de impacto circular (bala-enemigo)
                    this.piranas.splice(pi, 1); 
                    this.balas.splice(bi, 1); 
                    this.puntos += 100; 
                }
            });
        });
    }

    dibujarFondoDinamico() {
        const tiempoTranscurrido = (Date.now() - (this.tInicio || 0)) % (this.duracionCiclo * 2); 
        let opacidadDia = 0; // Controla la transparencia del fondo de día

        if (tiempoTranscurrido > this.duracionCiclo - this.tiempoTransicion && tiempoTranscurrido < this.duracionCiclo) {
            opacidadDia = (tiempoTranscurrido - (this.duracionCiclo - this.tiempoTransicion)) / this.tiempoTransicion; 
        } else if (tiempoTranscurrido >= this.duracionCiclo && tiempoTranscurrido < (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1; 
        } else if (tiempoTranscurrido >= (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1 - (tiempoTranscurrido - ((this.duracionCiclo * 2) - this.tiempoTransicion)) / this.tiempoTransicion; 
        }

        ctx.fillStyle = "#0a1f0a"; // Color base selva oscura
        ctx.fillRect(0,0, canvas.width, canvas.height); 

        if (this.img.fondoNoche.complete && this.img.fondoNoche.naturalWidth > 0) { 
            ctx.drawImage(this.img.fondoNoche, 0, 0, canvas.width, canvas.height); 
        }
        
        if (opacidadDia > 0 && this.img.fondoDia.complete && this.img.fondoDia.naturalWidth > 0) { 
            ctx.save(); 
            ctx.globalAlpha = opacidadDia; // Aplica la transparencia calculada
            ctx.drawImage(this.img.fondoDia, 0, 0, canvas.width, canvas.height); 
            ctx.restore(); 
        }
    }

    _drawHeart(x, y, size, fill) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + size / 4); // Dibuja forma de corazón mediante curvas
        ctx.quadraticCurveTo(x, y, x + size / 4, y);
        ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4);
        ctx.quadraticCurveTo(x + size / 2, y, x + (size * 3) / 4, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
        ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + (size * 3) / 4);
        ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
        ctx.fillStyle = fill ? "#ff4757" : "rgba(255,255,255,0.2)"; // Color rojo si tiene vida, gris si no
        ctx.fill(); ctx.restore();
    }

    drawGame() {
        const hudX = 30, hudY = 30, hudW = 320, hudH = 120; // Configuración de la caja de interfaz (HUD)
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
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia el canvas en cada fotograma
        this.dibujarFondoDinamico(); // Dibuja el fondo antes que los objetos

        try {
            switch (this.estadoActual) { // Máquina de estados para decidir qué dibujar
                case ESTADO.MENU: this.drawMenu(); break; 
                case ESTADO.JUGANDO: this.drawGame(); break; 
                case ESTADO.PAUSA: this.drawOverlay("PAUSA - TOCA PARA SEGUIR"); break; 
                case ESTADO.FIN_TURNO: this.drawGameOver(); break; 
                case ESTADO.RESULTADOS: this.drawResultados(); break; 
            }
            this.update(); // Ejecuta lógica de movimiento
        } catch (e) {
            console.error("Error:", e); // Captura fallos críticos para evitar freeze
        }

        requestAnimationFrame(() => this.render()); // Llama al siguiente fotograma (60fps aprox)
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
        
        ctx.font = "bold 20px Courier New";
        for(let i=1; i<=4; i++) { // Dibuja indicadores visuales para selección de jugadores
            ctx.fillText(`[ ${i} ]`, (canvas.width * 0.25 * i) - (canvas.width * 0.125), canvas.height - 80);
        }
    }

    drawOverlay(txt) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; // Fondo semi-transparente para mensajes
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
        this.puntajes.forEach((p, i) => { // Lista los puntos de todos los jugadores al final
            ctx.fillText(`Jugador ${i+1}: ${p} PTS`, canvas.width/2, 200 + (i*50)); 
        });
        ctx.fillText("Toca para reiniciar", canvas.width/2, canvas.height - 100); 
    }
}

const game = new JungleRun(); // Inicializa la instancia del juego
