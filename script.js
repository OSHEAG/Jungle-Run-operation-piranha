// --- CONFIGURACIÓN DEL LIENZO DINÁMICO ---
const canvas = document.getElementById('canvasJuego'); 
const ctx = canvas.getContext('2d'); 

function ajustarPantalla() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Ajustar el suelo del soldado según el nuevo alto de pantalla
    soldado.sueloY = canvas.height - soldado.alto - 20;
    if (soldado.enSuelo) soldado.y = soldado.sueloY;
}

// --- VARIABLES DEL JUEGO ---
let vidas = 3; 
let puntos = 0; 
let juegoTerminado = false; 
let juegoPausado = false; 
let nivelActual = 0;
let flashEfecto = 0; 
let tiempoInicio = Date.now();
let multiplicadorVelocidad = 1;

const soldado = {
    x: 50, 
    y: 0, 
    ancho: 80, // Tamaño un poco más ajustado para móviles
    alto: 100, 
    vy: 0, 
    gravedad: 0.8, 
    saltoFuerza: -15, 
    impulsoExtra: -0.6, 
    estaSaltando: false, 
    enSuelo: false,
    sueloY: 0
};

// Inicializar tamaño
ajustarPantalla();
window.addEventListener('resize', ajustarPantalla);

// --- CARGA DE ASSETS ---
const imgFondo = new Image(); imgFondo.src = 'selva_amazonas.png'; 
const imgSoldado = new Image(); imgSoldado.src = 'soldado.png'; 
const imgPiranaEnemigo = new Image(); imgPiranaEnemigo.src = 'pirana_enemigo.png'; 

const sonidoDisparo = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/arrow.mp3'); 
const sonidoMuertePirana = new Audio('https://rpg.hamsterrepublic.com/ohrrpgce/sounds/Explosion1.wav'); 
sonidoDisparo.volume = 0.5;
sonidoMuertePirana.volume = 0.4;

let balas = []; let piranas = []; let teclasPresionadas = {};

// --- FUNCIONES DE ACCIÓN (PC Y MÓVIL) ---
function saltar() {
    if (soldado.enSuelo) {
        soldado.vy = soldado.saltoFuerza;
        soldado.enSuelo = false;
        soldado.estaSaltando = true;
    }
}

function disparar() {
    if (!juegoPausado && !juegoTerminado) {
        balas.push({ x: soldado.x + soldado.ancho, y: soldado.y + soldado.alto/2, v: 15 });
        sonidoDisparo.currentTime = 0; 
        sonidoDisparo.play().catch(() => {}); 
    }
}

// --- CONTROLES MÓVILES (TOUCH) ---
window.addEventListener('touchstart', (e) => {
    if (juegoTerminado) {
        location.reload();
        return;
    }
    // Lado izquierdo salta, lado derecho dispara
    const touchX = e.touches[0].clientX;
    if (touchX < window.innerWidth / 2) {
        saltar();
    } else {
        disparar();
    }
}, { passive: false });

// --- CONTROLES PC (TECLADO) ---
window.addEventListener('keydown', (e) => {
    teclasPresionadas[e.code] = true;
    if (e.code === 'KeyP' && !juegoTerminado) juegoPausado = !juegoPausado;
    if (e.code === 'ArrowUp') saltar();
    if (e.code === 'Space') disparar();
    if (e.code === 'KeyR' && juegoTerminado) location.reload();
});

window.addEventListener('keyup', (e) => {
    teclasPresionadas[e.code] = false;
    if (e.code === 'ArrowUp') soldado.estaSaltando = false;
});

// --- LÓGICA DE ACTUALIZACIÓN ---
function actualizar() {
    if (juegoTerminado || juegoPausado) return; 

    let tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000;
    multiplicadorVelocidad = 1 + Math.floor(tiempoTranscurrido / 10);

    // Salto sostenido
    if (teclasPresionadas['ArrowUp'] && soldado.estaSaltando && soldado.vy < 0) {
        soldado.vy += soldado.impulsoExtra;
    }

    soldado.vy += soldado.gravedad;
    soldado.y += soldado.vy;
    
    // Suelo dinámico
    if (soldado.y > soldado.sueloY) {
        soldado.y = soldado.sueloY; 
        soldado.vy = 0;
        soldado.enSuelo = true; 
        soldado.estaSaltando = false;
    }

    if (flashEfecto > 0) flashEfecto -= 0.05;

    // Niveles
    nivelActual = Math.floor(puntos / 5000);

    balas.forEach((b, i) => { b.x += b.v; if (b.x > canvas.width) balas.splice(i, 1); });

    // Aparición de pirañas según el tamaño de pantalla
    if (Math.random() < 0.02 * (1 + multiplicadorVelocidad * 0.1)) {
        piranas.push({ 
            x: canvas.width, 
            y: Math.random() * (canvas.height - 150) + 50,
            v: (4 + (puntos/1000)) * (1 + multiplicadorVelocidad * 0.05)
        });
    }

    piranas.forEach((p, pIdx) => {
        p.x -= p.v;
        
        // Colisión Bala
        balas.forEach((b, bIdx) => {
            if (Math.hypot(b.x - p.x, b.y - p.y) < 40) {
                piranas.splice(pIdx, 1); balas.splice(bIdx, 1);
                puntos += 10;
                flashEfecto = 0.3;
                sonidoMuertePirana.currentTime = 0;
                sonidoMuertePirana.play().catch(() => {});
            }
        });

        // Colisión Soldado
        if (p.x > soldado.x && p.x < soldado.x + soldado.ancho && 
            p.y > soldado.y && p.y < soldado.y + soldado.alto) {
            vidas--; 
            piranas.splice(pIdx, 1);
            if (vidas <= 0) juegoTerminado = true;
        }
        if (p.x < -100) piranas.splice(pIdx, 1);
    });
}

// --- DIBUJO ---
function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo estirado a pantalla completa
    if (imgFondo.complete) ctx.drawImage(imgFondo, 0, 0, canvas.width, canvas.height);
    
    // --- HUD RESPONSIVE ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 10, 160, 80);
    ctx.strokeStyle = "white";
    ctx.strokeRect(10, 10, 160, 80);

    ctx.fillStyle = "white";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(`VIDAS: ${vidas}`, 20, 35);
    ctx.fillText(`PUNTOS: ${puntos}`, 20, 55);
    ctx.fillText(`NIVEL: ${nivelActual}`, 20, 75);

    // Solo mostrar ayuda de teclas si no es táctil (opcional)
    if (window.innerWidth > 800) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText("↑:SALTA | ESPACIO:DISPARA", canvas.width - 250, 30);
    } else {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px Arial";
        ctx.fillText("TOCA IZQ: SALTAR | TOCA DER: DISPARAR", canvas.width/2 - 100, canvas.height - 10);
    }

    // Dibujar Soldier y Elementos
    if (imgSoldado.complete) ctx.drawImage(imgSoldado, soldado.x, soldado.y, soldado.ancho, soldado.alto);
    balas.forEach(b => { ctx.fillStyle = "yellow"; ctx.fillRect(b.x, b.y, 15, 5); });
    piranas.forEach(p => { if (imgPiranaEnemigo.complete) ctx.drawImage(imgPiranaEnemigo, p.x - 40, p.y - 30, 80, 50); });

    if (flashEfecto > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${flashEfecto})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (juegoTerminado) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("Toca o presiona 'R' para reiniciar", canvas.width/2, canvas.height/2 + 50);
        return;
    }

    if (juegoPausado) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("PAUSA", canvas.width/2, canvas.height/2);
    }

    actualizar();
    requestAnimationFrame(dibujar);
}

imgSoldado.onload = () => { dibujar(); };