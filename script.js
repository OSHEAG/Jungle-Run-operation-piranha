/**
 * JUNGLE RUN: OPERACIÓN PIRAÑA - MULTIPLAYER ELITE
 * Versión Ultra-Estabilizada (Anti-Freeze).
 */

const canvas = document.getElementById('canvasJuego'); // Obtiene el elemento canvas del HTML
const ctx = canvas.getContext('2d'); // Define el contexto de dibujo en 2D

const ESTADO = { MENU: 0, JUGANDO: 1, PAUSA: 2, FIN_TURNO: 3, RESULTADOS: 4 }; // Define los estados del juego

class JungleRun {
    constructor() {
        this.estadoActual = ESTADO.MENU; // Estado inicial: Menú principal
        this.jugadoresTotales = 1; // Cantidad de jugadores configurados
        this.turnoActual = 0; // Índice del jugador que está jugando
        this.puntajes = []; // Almacena los puntos de todos los jugadores
        this.gravedad = 0.8; // Fuerza de caída constante
        this.teclas = {}; // Registro de teclas presionadas
        this.duracionCiclo = 60000; // Tiempo de duración día/noche (60s)
        this.tiempoTransicion = 5000; // Duración del cambio visual (5s)
        
        this._cargarRecursos(); // Inicializa carga de imágenes y sonidos
        this._escucharEventos(); // Activa los detectores de teclado y ventana
        this.ajustarPantalla(); // Ajusta el canvas al tamaño inicial
        
        this.render(); // Inicia el ciclo de dibujo infinito
    }

    _cargarRecursos() {
        this.img = {
            portada: this._newImg('icono-192.png'), // Imagen de inicio
            fondoNoche: this._newImg('selva_amazonas.png'), // Fondo modo noche
            fondoDia: this._newImg('selva_amazonasd.png'), // Fondo modo día
            soldado: this._newImg('soldado.png'), // Sprite del protagonista
            enemigo: this._newImg('pirana_enemigo.png'), // Sprite del enemigo
            gameOver: this._newImg('pirana_gameover.png') // Imagen de fin de juego
        };
        this.sfx = {
            disparo: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'), // Sonido bala
            muerte: new Audio('https://rpg.hamsterrepublic.com/ohrrpgce/sounds/Explosion1.wav') // Sonido destrucción
        };
    }

    _newImg(src) { 
        const i = new Image(); // Crea nueva instancia de imagen
        i.src = src; // Asigna la ruta de la imagen
        return i; // Retorna el objeto imagen
    }

    _escucharEventos() {
        window.addEventListener('resize', () => this.ajustarPantalla()); // Redimensiona el canvas si cambia la ventana
        window.addEventListener('keydown', (e) => this.input(e.code)); // Procesa tecla presionada
        window.addEventListener('keyup', (e) => this.teclas[e.code] = false); // Marca tecla como liberada
    }

    ajustarPantalla() {
        canvas.width = window.innerWidth; // Ajusta ancho a pantalla completa
        canvas.height = window.innerHeight; // Ajusta alto a pantalla completa
    }

    iniciarPartida(n) {
        this.jugadoresTotales = n; // Define cuántos participarán
        this.turnoActual = 0; // Empieza por el primer jugador
        this.puntajes = Array(n).fill(0); // Crea lista de puntajes en cero
        this.prepararTurno(); // Configura variables de inicio de nivel
    }

    prepararTurno() {
        this.vidas = 3; // Oportunidades por jugador
        this.puntos = 0; // Puntaje inicial del turno
        this.balas = []; // Lista de proyectiles activa vacía
        this.piranas = []; // Lista de enemigos activa vacía
        this.tInicio = Date.now(); // Marca tiempo de inicio del turno
        
        this.player = {
            x: 80, y: 0, w: 130, h: 150, vy: 0, // Posición y tamaño del soldado
            salto: -25, enSuelo: false, // Potencia de salto y control de estado
            sueloY: canvas.height - 170 // Posición del suelo relativa a la pantalla
        };
        this.estadoActual = ESTADO.JUGANDO; // Cambia a modo acción
    }

    input(code) {
        this.teclas[code] = true; // Almacena tecla activa
        if (this.estadoActual === ESTADO.MENU) {
            const n = code.match(/Digit(\d)/); // Detecta si se presiona un número
            if (n && n[1] >= 1 && n[1] <= 4) this.iniciarPartida(parseInt(n[1])); // Inicia con N jugadores
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            if (code === 'ArrowUp' && this.player.enSuelo) { // Acción de saltar
                this.player.vy = this.player.salto; // Aplica impulso hacia arriba
                this.player.enSuelo = false; // Desactiva estado en suelo
            }
            if (code === 'Space') this.disparar(); // Llama a la función de disparo
            if (code === 'KeyP') this.estadoActual = ESTADO.PAUSA; // Activa pausa
        } else if (this.estadoActual === ESTADO.PAUSA && code === 'KeyP') {
            this.estadoActual = ESTADO.JUGANDO; // Quita pausa
        } else if (this.estadoActual === ESTADO.FIN_TURNO && code === 'Enter') {
            this.puntajes[this.turnoActual] = this.puntos; // Registra puntaje final
            if (this.turnoActual + 1 < this.jugadoresTotales) { // Verifica si faltan jugadores
                this.turnoActual++; // Siguiente turno
                this.prepararTurno(); // Reinicia parámetros
            } else {
                this.estadoActual = ESTADO.RESULTADOS; // Muestra ranking final
            }
        } else if (this.estadoActual === ESTADO.RESULTADOS && code === 'KeyR') {
            this.estadoActual = ESTADO.MENU; // Reinicia todo el juego
        }
    }

    disparar() {
        this.balas.push({ x: this.player.x + 100, y: this.player.y + 70, v: 15 }); // Crea bala en posición del arma
        this.sfx.disparo.currentTime = 0; // Reinicia tiempo del sonido
        this.sfx.disparo.play().catch(() => {}); // Reproduce sonido (protegido contra bloqueos)
    }

    update() {
        if (this.estadoActual !== ESTADO.JUGANDO) return; // Detiene lógica si no se está jugando

        this.player.vy += this.gravedad; // Aplica gravedad a la velocidad vertical
        this.player.y += this.player.vy; // Actualiza posición con la velocidad
        if (this.player.y > this.player.sueloY) { // Detecta colisión con el piso
            this.player.y = this.player.sueloY; // Mantiene al jugador en el nivel del suelo
            this.player.vy = 0; // Anula velocidad de caída
            this.player.enSuelo = true; // Permite volver a saltar
        }

        const diff = 1 + (Date.now() - this.tInicio) / 15000; // Escala de dificultad por tiempo

        if (Math.random() < 0.02 * diff) { // Probabilidad de aparición de enemigos
            this.piranas.push({ x: canvas.width, y: Math.random() * (canvas.height - 250) + 100, v: 1 * diff }); // Crea piraña
        }

        this.piranas.forEach((p, i) => {
            p.x -= p.v; // Mueve enemigo a la izquierda
            const pBox = { x: p.x + 10, y: p.y + 10, w: 60, h: 30 }; // Caja de colisión enemigo
            const sBox = { x: this.player.x + 30, y: this.player.y, w: 70, h: 150 }; // Caja de colisión jugador

            if (sBox.x < pBox.x + pBox.w && sBox.x + sBox.w > pBox.x && 
                sBox.y < pBox.y + pBox.h && sBox.y + sBox.h > pBox.y) { // Detección de colisión AABB
                if (this.player.vy > 0 && (sBox.y + sBox.h - this.player.vy) <= pBox.y + 15) { // Si cae encima de piraña
                    this.piranas.splice(i, 1); // Elimina piraña
                    this.puntos += 200; // Bonus por eliminación física
                    this.player.vy = this.player.salto / 1.8; // Rebote hacia arriba
                    this.sfx.muerte.play().catch(() => {}); // Efecto de sonido
                } else {
                    this.vidas--; // Descuenta salud
                    this.piranas.splice(i, 1); // Quita enemigo que golpeó
                    if (this.vidas <= 0) this.estadoActual = ESTADO.FIN_TURNO; // Fin si no hay vidas
                }
            }
        });

        this.balas.forEach((b, bi) => {
            b.x += b.v; // Mueve bala a la derecha
            this.piranas.forEach((p, pi) => {
                if (Math.hypot(b.x - p.x, b.y - p.y) < 45) { // Colisión circular bala-enemigo
                    this.piranas.splice(pi, 1); // Quita enemigo
                    this.balas.splice(bi, 1); // Quita bala
                    this.puntos += 100; // Puntos por disparo
                }
            });
        });
    }

    dibujarFondoDinamico() {
        const tiempoTranscurrido = (Date.now() - (this.tInicio || 0)) % (this.duracionCiclo * 2); // Ciclo de tiempo
        let opacidadDia = 0; // Opacidad inicial del fondo día

        if (tiempoTranscurrido > this.duracionCiclo - this.tiempoTransicion && tiempoTranscurrido < this.duracionCiclo) {
            opacidadDia = (tiempoTranscurrido - (this.duracionCiclo - this.tiempoTransicion)) / this.tiempoTransicion; // Amanecer
        } else if (tiempoTranscurrido >= this.duracionCiclo && tiempoTranscurrido < (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1; // Día pleno
        } else if (tiempoTranscurrido >= (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1 - (tiempoTranscurrido - ((this.duracionCiclo * 2) - this.tiempoTransicion)) / this.tiempoTransicion; // Atardecer
        }

        if (this.img.fondoNoche.complete) {
            ctx.drawImage(this.img.fondoNoche, 0, 0, canvas.width, canvas.height); // Dibuja base nocturna
        }
        
        if (opacidadDia > 0 && this.img.fondoDia.complete) {
            ctx.save(); // Guarda contexto
            ctx.globalAlpha = opacidadDia; // Aplica transparencia dinámica
            ctx.drawImage(this.img.fondoDia, 0, 0, canvas.width, canvas.height); // Superpone fondo día
            ctx.restore(); // Restaura contexto
        }
    }

    _drawHeart(x, y, size, fill) { // Función auxiliar para dibujar vidas (corazones)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.quadraticCurveTo(x, y, x + size / 4, y);
        ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4);
        ctx.quadraticCurveTo(x + size / 2, y, x + (size * 3) / 4, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
        ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + (size * 3) / 4);
        ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
        ctx.fillStyle = fill ? "#ff4757" : "rgba(255,255,255,0.2)"; // Color si está lleno o vacío
        ctx.fill();
        ctx.restore();
    }

    drawGame() {
        const hudX = 30, hudY = 30, hudW = 320, hudH = 120; // Configuración caja de datos (HUD)
        
        ctx.save();
        ctx.shadowBlur = 15; // Estética de brillo
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        const grad = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH); // Degradado de fondo HUD
        grad.addColorStop(0, "rgba(20, 20, 20, 0.85)");
        grad.addColorStop(1, "rgba(40, 40, 40, 0.95)");
        ctx.fillStyle = grad;
        const r = 15;
        ctx.beginPath(); // Dibuja rectángulo redondeado para el HUD
        ctx.moveTo(hudX + r, hudY);
        ctx.arcTo(hudX + hudW, hudY, hudX + hudW, hudY + hudH, r);
        ctx.arcTo(hudX + hudW, hudY + hudH, hudX, hudY + hudH, r);
        ctx.arcTo(hudX, hudY + hudH, hudX, hudY, r);
        ctx.arcTo(hudX, hudY, hudX + hudW, hudY, r);
        ctx.fill();
        ctx.strokeStyle = "#2ecc71"; // Borde verde neón
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = "left";
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillText("OPERATIVO ACTIVADO:", hudX + 20, hudY + 30); // Etiqueta jugador
        ctx.fillStyle = "white";
        ctx.font = "bold 22px Arial";
        ctx.fillText(`JUGADOR ${this.turnoActual + 1}`, hudX + 20, hudY + 55); // Número de jugador

        for (let i = 0; i < 3; i++) {
            this._drawHeart(hudX + 220 + (i * 30), hudY + 40, 22, i < this.vidas); // Dibuja indicadores de vida
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillText("PUNTOS ACUMULADOS:", hudX + 20, hudY + 85); // Etiqueta puntaje
        ctx.fillStyle = "white";
        ctx.font = "bold 26px 'Courier New'";
        ctx.fillText(this.puntos.toString().padStart(6, '0'), hudX + 20, hudY + 108); // Valor de puntaje

        if (this.img.soldado.complete) {
            ctx.drawImage(this.img.soldado, this.player.x, this.player.y, this.player.w, this.player.h); // Dibuja soldado
        }
        
        this.piranas.forEach(p => {
            if (this.img.enemigo.complete) {
                ctx.drawImage(this.img.enemigo, p.x, p.y, 80, 50); // Dibuja pirañas
            }
        });

        ctx.fillStyle = "yellow";
        this.balas.forEach(b => ctx.fillRect(b.x, b.y, 25, 6)); // Dibuja balas como rectángulos amarillos
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia el canvas en cada frame
        this.dibujarFondoDinamico(); // Dibuja el ambiente actual

        try {
            switch (this.estadoActual) { // Máquina de estados visual
                case ESTADO.MENU: this.drawMenu(); break;
                case ESTADO.JUGANDO: this.drawGame(); break;
                case ESTADO.PAUSA: this.drawOverlay("PAUSA - PRESIONA 'P'"); break;
                case ESTADO.FIN_TURNO: this.drawGameOver(); break;
                case ESTADO.RESULTADOS: this.drawResultados(); break;
            }
            this.update(); // Ejecuta cálculos de movimiento
        } catch (e) {
            console.error("Error en ciclo de renderizado:", e); // Captura errores sin detener el navegador
        }

        requestAnimationFrame(() => this.render()); // Solicita el siguiente cuadro de animación
    }

    drawMenu() {
        if(this.img.portada.complete) ctx.drawImage(this.img.portada, 0, 0, canvas.width, canvas.height); // Fondo de portada
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // Filtro oscuro
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
        ctx.textAlign = "center"; 
        ctx.fillStyle = "#2ecc71"; 
        ctx.font = "bold 50px Courier New"; 
        ctx.fillText("JUNGLE RUN: ELITE", canvas.width/2, canvas.height/2 - 80); // Título
        ctx.fillStyle = "white"; 
        ctx.font = "24px Arial"; 
        ctx.fillText("ELIGE NÚMERO DE JUGADORES [1-4]", canvas.width/2, canvas.height/2); // Guía de inicio
    }

    drawOverlay(txt) { // Dibuja un mensaje centralizado sobre pantalla oscurecida
        ctx.fillStyle = "rgba(0,0,0,0.8)"; 
        ctx.fillRect(0,0,canvas.width, canvas.height); 
        ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.font = "30px Arial"; 
        ctx.fillText(txt, canvas.width/2, canvas.height/2); 
    }

    drawGameOver() {
        this.drawOverlay("¡TURNO TERMINADO!"); // Indica fin de vida
        ctx.font = "20px Arial"; 
        ctx.fillText(`Puntos: ${this.puntos}. Presiona ENTER`, canvas.width/2, canvas.height/2 + 50); // Muestra logro
    }

    drawResultados() {
        this.drawOverlay("RANKING FINAL"); // Encabezado de resultados
        this.puntajes.forEach((p, i) => { 
            ctx.fillText(`Jugador ${i+1}: ${p} PTS`, canvas.width/2, 200 + (i*50)); // Lista de puntos
        });
        ctx.fillText("Presiona 'R' para reiniciar", canvas.width/2, canvas.height - 100); // Guía de reinicio
    }
}

const game = new JungleRun(); // Crea e inicia la instancia del juego


