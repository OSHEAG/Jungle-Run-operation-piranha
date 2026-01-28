/**
 * JUNGLE RUN: OPERACIÓN PIRAÑA - MULTIPLAYER ELITE
 * Versión Ultra-Estabilizada (Anti-Freeze) con Parche de Seguridad.
 */

const canvas = document.getElementById('canvasJuego'); // Referencia al lienzo HTML
const ctx = canvas.getContext('2d'); // Herramienta para dibujar en el lienzo

const ESTADO = { MENU: 0, JUGANDO: 1, PAUSA: 2, FIN_TURNO: 3, RESULTADOS: 4 }; // Diccionario de estados posibles

class JungleRun {
    constructor() {
        this.tInicio = Date.now(); // Registra el tiempo exacto de arranque
        this.estadoActual = ESTADO.MENU; // Define que el juego inicia en el menú
        this.jugadoresTotales = 1; // Valor por defecto de participantes
        this.turnoActual = 0; // Indica qué jugador debe empezar
        this.puntajes = []; // Arreglo para guardar los puntos de cada uno
        this.gravedad = 0.8; // Fuerza que empuja al jugador hacia abajo
        this.teclas = {}; // Objeto para saber qué teclas están hundidas
        this.duracionCiclo = 60000; // Milisegundos que dura el día o la noche
        this.tiempoTransicion = 5000; // Milisegundos que dura el cambio de luz
        
        this._cargarRecursos(); // Llama a la carga de archivos externos
        this._escucharEventos(); // Activa los controles del teclado
        this.ajustarPantalla(); // Calcula el tamaño inicial del área de juego
        
        this.render(); // Lanza el bucle infinito de dibujo
    }

    _cargarRecursos() {
        this.img = {
            portada: this._newImg('icono-192.png'), // Carga imagen de fondo inicial
            fondoNoche: this._newImg('selva_amazonas.png'), // Carga fondo oscuro
            fondoDia: this._newImg('selva_amazonasd.png'), // Carga fondo claro
            soldado: this._newImg('soldado.png'), // Carga al personaje principal
            enemigo: this._newImg('pirana_enemigo.png'), // Carga al enemigo piraña
            gameOver: this._newImg('pirana_gameover.png') // Carga imagen de derrota
        };
        this.sfx = {
            disparo: new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'), // Sonido de bala
            muerte: new Audio('https://rpg.hamsterrepublic.com/ohrrpgce/sounds/Explosion1.wav') // Sonido de explosión
        };
    }

    _newImg(src) { 
        const i = new Image(); // Crea un objeto de imagen vacío
        i.src = src; // Le asigna la ruta del archivo
        i.onerror = () => console.warn("No se pudo cargar: " + src); // Avisa en consola si el archivo no existe
        return i; // Devuelve la imagen lista para usar
    }

    _escucharEventos() {
        window.addEventListener('resize', () => this.ajustarPantalla()); // Reacciona si cambias el tamaño de la ventana
        window.addEventListener('keydown', (e) => this.input(e.code)); // Detecta cuando presionas una tecla
        window.addEventListener('keyup', (e) => this.teclas[e.code] = false); // Detecta cuando sueltas la tecla
    }

    ajustarPantalla() {
        canvas.width = window.innerWidth; // Ajusta el ancho del juego al navegador
        canvas.height = window.innerHeight; // Ajusta el alto del juego al navegador
    }

    iniciarPartida(n) {
        this.jugadoresTotales = n; // Define el número de jugadores (1 a 4)
        this.turnoActual = 0; // Reinicia al primer jugador
        this.puntajes = Array(n).fill(0); // Crea una lista de ceros para los puntos
        this.prepararTurno(); // Configura el escenario para el primer turno
    }

    prepararTurno() {
        this.vidas = 3; // Otorga 3 vidas al empezar
        this.puntos = 0; // Inicia el marcador en cero
        this.balas = []; // Limpia las balas en pantalla
        this.piranas = []; // Limpia las pirañas en pantalla
        this.tInicio = Date.now(); // Reinicia el reloj de dificultad
        
        this.player = {
            x: 80, y: 0, w: 130, h: 150, vy: 0, // Propiedades físicas del soldado
            salto: -25, enSuelo: false, // Fuerza de salto y estado de apoyo
            sueloY: canvas.height - 170 // Calcula dónde está el suelo según la pantalla
        };
        this.estadoActual = ESTADO.JUGANDO; // Cambia la pantalla al modo juego
    }

    input(code) {
        this.teclas[code] = true; // Registra que la tecla está siendo presionada
        if (this.estadoActual === ESTADO.MENU) {
            const n = code.match(/Digit(\d)/); // Busca si presionaste números del 1 al 9
            if (n && n[1] >= 1 && n[1] <= 4) this.iniciarPartida(parseInt(n[1])); // Inicia según el número
        } else if (this.estadoActual === ESTADO.JUGANDO) {
            if (code === 'ArrowUp' && this.player.enSuelo) { // Si presionas arriba y estás en el suelo
                this.player.vy = this.player.salto; // Impulsa al jugador hacia arriba
                this.player.enSuelo = false; // Indica que ya no toca el piso
            }
            if (code === 'Space') this.disparar(); // Si presionas espacio, dispara
            if (code === 'KeyP') this.estadoActual = ESTADO.PAUSA; // Si presionas P, pausa el juego
        } else if (this.estadoActual === ESTADO.PAUSA && code === 'KeyP') {
            this.estadoActual = ESTADO.JUGANDO; // Si estás en pausa y presionas P, reanuda
        } else if (this.estadoActual === ESTADO.FIN_TURNO && code === 'Enter') {
            this.puntajes[this.turnoActual] = this.puntos; // Guarda los puntos del jugador actual
            if (this.turnoActual + 1 < this.jugadoresTotales) { // Revisa si falta alguien por jugar
                this.turnoActual++; // Pasa al siguiente turno
                this.prepararTurno(); // Reinicia el nivel para el nuevo jugador
            } else {
                this.estadoActual = ESTADO.RESULTADOS; // Si todos jugaron, muestra el ranking
            }
        } else if (this.estadoActual === ESTADO.RESULTADOS && code === 'KeyR') {
            this.estadoActual = ESTADO.MENU; // Si presionas R al final, vuelve al inicio
        }
    }

    disparar() {
        this.balas.push({ x: this.player.x + 100, y: this.player.y + 70, v: 15 }); // Agrega una bala al arreglo
        if (this.sfx.disparo.readyState >= 2) { // Revisa si el sonido cargó lo suficiente
            this.sfx.disparo.currentTime = 0; // Reinicia el sonido al principio
            this.sfx.disparo.play().catch(e => console.log("Audio bloqueado")); // Reproduce sonido con protección
        }
    }

    update() {
        if (this.estadoActual !== ESTADO.JUGANDO) return; // Si no estás jugando, no calcula movimientos

        this.player.vy += this.gravedad; // La gravedad aumenta la velocidad de caída
        this.player.y += this.player.vy; // La posición cambia según la velocidad vertical
        if (this.player.y > this.player.sueloY) { // Si el jugador atraviesa el piso
            this.player.y = this.player.sueloY; // Lo coloca exactamente sobre el suelo
            this.player.vy = 0; // Detiene la caída
            this.player.enSuelo = true; // Habilita la posibilidad de saltar
        }

        const diff = 1 + (Date.now() - this.tInicio) / 15000; // Calcula dificultad según el tiempo

        if (Math.random() < 0.02 * diff) { // Controla la probabilidad de que salga un enemigo
            this.piranas.push({ x: canvas.width, y: Math.random() * (canvas.height - 250) + 100, v: 3 * diff }); // Crea piraña
        }

        this.piranas.forEach((p, i) => {
            p.x -= p.v; // Mueve la piraña hacia la izquierda
            const pBox = { x: p.x + 10, y: p.y + 10, w: 60, h: 30 }; // Caja invisible de daño de la piraña
            const sBox = { x: this.player.x + 30, y: this.player.y, w: 70, h: 150 }; // Caja invisible del jugador

            if (sBox.x < pBox.x + pBox.w && sBox.x + sBox.w > pBox.x && 
                sBox.y < pBox.y + pBox.h && sBox.y + sBox.h > pBox.y) { // Detecta choque entre cajas
                if (this.player.vy > 0 && (sBox.y + sBox.h - this.player.vy) <= pBox.y + 15) { // Si el jugador cae sobre la piraña
                    this.piranas.splice(i, 1); // Elimina a la piraña
                    this.puntos += 200; // Da puntos por saltar encima
                    this.player.vy = this.player.salto / 1.8; // Hace que el jugador rebote
                    this.sfx.muerte.play().catch(() => {}); // Suena la eliminación
                } else {
                    this.vidas--; // Resta una vida por choque frontal
                    this.piranas.splice(i, 1); // Quita la piraña que golpeó
                    if (this.vidas <= 0) this.estadoActual = ESTADO.FIN_TURNO; // Si llega a cero, termina el turno
                }
            }
        });

        this.balas.forEach((b, bi) => {
            b.x += b.v; // Mueve la bala hacia adelante
            this.piranas.forEach((p, pi) => {
                if (Math.hypot(b.x - p.x, b.y - p.y) < 45) { // Si la distancia entre bala y piraña es corta
                    this.piranas.splice(pi, 1); // Elimina piraña
                    this.balas.splice(bi, 1); // Elimina la bala
                    this.puntos += 100; // Da puntos por puntería
                }
            });
        });
    }

    dibujarFondoDinamico() {
        const tiempoTranscurrido = (Date.now() - (this.tInicio || 0)) % (this.duracionCiclo * 2); // Ciclo infinito de tiempo
        let opacidadDia = 0; // Valor de transparencia para el fondo de día

        if (tiempoTranscurrido > this.duracionCiclo - this.tiempoTransicion && tiempoTranscurrido < this.duracionCiclo) {
            opacidadDia = (tiempoTranscurrido - (this.duracionCiclo - this.tiempoTransicion)) / this.tiempoTransicion; // Amanecer
        } else if (tiempoTranscurrido >= this.duracionCiclo && tiempoTranscurrido < (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1; // Día completo
        } else if (tiempoTranscurrido >= (this.duracionCiclo * 2) - this.tiempoTransicion) {
            opacidadDia = 1 - (tiempoTranscurrido - ((this.duracionCiclo * 2) - this.tiempoTransicion)) / this.tiempoTransicion; // Atardecer
        }

        ctx.fillStyle = "#0a1f0a"; // Color verde oscuro de respaldo
        ctx.fillRect(0,0, canvas.width, canvas.height); // Pinta el fondo sólido

        if (this.img.fondoNoche.complete && this.img.fondoNoche.naturalWidth > 0) { // Si el fondo nocturno cargó
            ctx.drawImage(this.img.fondoNoche, 0, 0, canvas.width, canvas.height); // Dibújalo
        }
        
        if (opacidadDia > 0 && this.img.fondoDia.complete && this.img.fondoDia.naturalWidth > 0) { // Si es de día
            ctx.save(); // Guarda el estado del lienzo
            ctx.globalAlpha = opacidadDia; // Aplica la transparencia calculada
            ctx.drawImage(this.img.fondoDia, 0, 0, canvas.width, canvas.height); // Superpone el fondo de día
            ctx.restore(); // Limpia la configuración de transparencia
        }
    }

    _drawHeart(x, y, size, fill) {
        ctx.save(); // Guarda el pincel
        ctx.beginPath(); // Empieza a trazar el corazón
        ctx.moveTo(x, y + size / 4); // Punto de inicio
        ctx.quadraticCurveTo(x, y, x + size / 4, y); // Curva superior izquierda
        ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4); // Curva central
        ctx.quadraticCurveTo(x + size / 2, y, x + (size * 3) / 4, y); // Curva superior derecha
        ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4); // Cierre superior derecho
        ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + (size * 3) / 4); // Pico inferior derecho
        ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4); // Pico inferior izquierdo
        ctx.fillStyle = fill ? "#ff4757" : "rgba(255,255,255,0.2)"; // Color rojo si tiene vida, gris si no
        ctx.fill(); // Rellena el corazón
        ctx.restore(); // Libera el pincel
    }

    drawGame() {
        const hudX = 30, hudY = 30, hudW = 320, hudH = 120; // Ubicación del panel de puntos
        
        ctx.save();
        ctx.shadowBlur = 15; // Brillo del panel
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        const grad = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH); // Color degradado del panel
        grad.addColorStop(0, "rgba(20, 20, 20, 0.85)");
        grad.addColorStop(1, "rgba(40, 40, 40, 0.95)");
        ctx.fillStyle = grad;
        const r = 15;
        ctx.beginPath(); // Dibuja el marco redondeado
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
        ctx.fillText("OPERATIVO ACTIVADO:", hudX + 20, hudY + 30); // Texto decorativo
        ctx.fillStyle = "white";
        ctx.font = "bold 22px Arial";
        ctx.fillText(`JUGADOR ${this.turnoActual + 1}`, hudX + 20, hudY + 55); // Indica quién juega

        for (let i = 0; i < 3; i++) {
            this._drawHeart(hudX + 220 + (i * 30), hudY + 40, 22, i < this.vidas); // Pinta los 3 corazones
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillText("PUNTOS ACUMULADOS:", hudX + 20, hudY + 85);
        ctx.fillStyle = "white";
        ctx.font = "bold 26px 'Courier New'";
        ctx.fillText(this.puntos.toString().padStart(6, '0'), hudX + 20, hudY + 108); // Muestra puntos con ceros a la izquierda

        if (this.img.soldado.complete && this.img.soldado.naturalWidth > 0) { // Si el dibujo del soldado existe
            ctx.drawImage(this.img.soldado, this.player.x, this.player.y, this.player.w, this.player.h); // Dibújalo
        } else {
            ctx.fillStyle = "green"; // Si falla la imagen
            ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h); // Dibuja un cuadro verde de emergencia
        }
        
        this.piranas.forEach(p => {
            if (this.img.enemigo.complete && this.img.enemigo.naturalWidth > 0) { // Si el dibujo de piraña existe
                ctx.drawImage(this.img.enemigo, p.x, p.y, 80, 50); // Dibújala
            } else {
                ctx.fillStyle = "red"; // Si falla la imagen
                ctx.fillRect(p.x, p.y, 80, 50); // Dibuja un cuadro rojo de emergencia
            }
        });

        ctx.fillStyle = "yellow"; // Color de la munición
        this.balas.forEach(b => ctx.fillRect(b.x, b.y, 25, 6)); // Dibuja cada bala como un rectángulo
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Borra todo lo anterior para redibujar
        this.dibujarFondoDinamico(); // Pinta el paisaje

        try {
            switch (this.estadoActual) { // Revisa qué pantalla debe mostrar
                case ESTADO.MENU: this.drawMenu(); break; // Pantalla de inicio
                case ESTADO.JUGANDO: this.drawGame(); break; // Pantalla de acción
                case ESTADO.PAUSA: this.drawOverlay("PAUSA - PRESIONA 'P'"); break; // Pantalla de pausa
                case ESTADO.FIN_TURNO: this.drawGameOver(); break; // Pantalla de "Perdiste"
                case ESTADO.RESULTADOS: this.drawResultados(); break; // Pantalla de puntajes finales
            }
            this.update(); // Procesa los movimientos
        } catch (e) {
            console.error("Error en ciclo de renderizado:", e); // Captura fallos críticos sin cerrar el juego
        }

        requestAnimationFrame(() => this.render()); // Vuelve a ejecutar esta función 60 veces por segundo
    }

    drawMenu() {
        if(this.img.portada.complete && this.img.portada.naturalWidth > 0) {
            ctx.drawImage(this.img.portada, 0, 0, canvas.width, canvas.height); // Dibuja la portada si existe
        }
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // Oscurece el fondo un poco
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
        ctx.textAlign = "center"; 
        ctx.fillStyle = "#2ecc71"; 
        ctx.font = "bold 50px Courier New"; 
        ctx.fillText("JUNGLE RUN: ELITE", canvas.width/2, canvas.height/2 - 80); // Texto del título
        ctx.fillStyle = "white"; 
        ctx.font = "24px Arial"; 
        ctx.fillText("ELIGE NÚMERO DE JUGADORES [1-4]", canvas.width/2, canvas.height/2); // Instrucción
    }

    drawOverlay(txt) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; // Crea una capa semitransparente negra
        ctx.fillRect(0,0,canvas.width, canvas.height); 
        ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.font = "30px Arial"; 
        ctx.fillText(txt, canvas.width/2, canvas.height/2); // Escribe el texto en el centro
    }

    drawGameOver() {
        this.drawOverlay("¡TURNO TERMINADO!"); // Avisa que el jugador perdió
        ctx.font = "20px Arial"; 
        ctx.fillText(`Puntos: ${this.puntos}. Presiona ENTER`, canvas.width/2, canvas.height/2 + 50); // Muestra el puntaje
    }

    drawResultados() {
        this.drawOverlay("RANKING FINAL"); // Título de la tabla
        this.puntajes.forEach((p, i) => { 
            ctx.fillText(`Jugador ${i+1}: ${p} PTS`, canvas.width/2, 200 + (i*50)); // Escribe los puntos de cada uno
        });
        ctx.fillText("Presiona 'R' para reiniciar", canvas.width/2, canvas.height - 100); // Instrucción para volver al inicio
    }
}

const game = new JungleRun(); // Enciende el motor del juego



