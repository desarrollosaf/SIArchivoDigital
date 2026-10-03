// Capturas para el manual de usuario. Uso: node manual-capturas.js <tokenUsuario> <tokenAdmin>
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const [tokenUsuario, tokenAdmin] = process.argv.slice(2);
const OUT = path.join(__dirname, 'img');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4250';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const USUARIO = { id: 810, rfc: 'CUDE780726', email: null, nombre: 'Usuario de prueba', puesto: null, path_foto: null, cambio_contrasena: false, rol: 'usuario' };
const ADMIN = { ...USUARIO, id: 1223, rfc: 'DOOJ900120', nombre: 'Administrador de prueba', rol: 'administrador' };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    defaultViewport: { width: 1366, height: 800, deviceScaleFactor: 1.5 },
  });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('response', (r) => r.status() >= 400 && r.url().includes('/api/') && errores.push(`HTTP ${r.status()} ${r.url()}`));

  const foto = async (nombre, opciones = {}) => {
    await page.screenshot({ path: path.join(OUT, `${nombre}.png`), ...opciones });
    console.log('ok', nombre);
  };
  const ir = async (ruta, ms = 4500) => {
    await page.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
    await espera(ms);
  };
  const clicTexto = async (selector, texto) => {
    const ok = await page.evaluate((sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(txt));
      if (el) el.click();
      return !!el;
    }, selector, texto);
    if (!ok) console.log('NO ENCONTRADO', selector, texto);
    await espera(1500);
    return ok;
  };
  const sesion = async (token, user) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t, u) => { localStorage.setItem('siad_token', t); localStorage.setItem('siad_user', u); }, token, JSON.stringify(user));
  };
  // Recorta solo el contenido (sin pie de página) hasta una altura máxima.
  const fotoContenido = async (nombre, alto = 1400) => {
    const h = await page.evaluate(() => {
      const m = document.querySelector('main.content');
      return m ? m.getBoundingClientRect().bottom + window.scrollY : document.body.scrollHeight;
    });
    await foto(nombre, { clip: { x: 0, y: 0, width: 1366, height: Math.min(h, alto) }, captureBeyondViewport: true });
  };

  // 1. Inicio de sesión
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await espera(2500);
  await foto('01-login');

  // Usuario normal
  await sesion(tokenUsuario, USUARIO);
  await ir('home');
  await fotoContenido('02-inicio', 900);

  // Menú desplegado
  await clicTexto('.topbar a.dropdown-toggle, .topbar a[data-bs-toggle="dropdown"]', 'Bandejas');
  await foto('03-menu', { clip: { x: 0, y: 0, width: 1366, height: 330 } });
  await page.keyboard.press('Escape');
  await page.mouse.click(1300, 700);

  // Notificaciones
  await page.click('.campanita, button[class*="campanita"]').catch(() => console.log('sin campanita'));
  await espera(2000);
  await foto('04-notificaciones', { clip: { x: 566, y: 0, width: 800, height: 560 } });
  await page.mouse.click(200, 700);

  // Bandeja de entrada
  await ir('entrada');
  await foto('05-entrada');
  const registroId = await page.evaluate(() => {
    document.querySelector('.band-card')?.click();
    return null;
  });
  await espera(2500);
  await foto('06-entrada-vista-rapida');
  // Abrir el expediente desde la vista rápida
  await clicTexto('.modal-foot button', 'Abrir expediente');
  await espera(3500);
  const idDoc = page.url().split('/').pop();
  console.log('documento', idDoc);
  await fotoContenido('07-expediente', 1800);
  if (await clicTexto('button', 'Turnar')) {
    await foto('08-turnar');
    await clicTexto('app-modal button', 'Cancelar');
  }
  if (await clicTexto('button', 'Concluir mi turno') || await clicTexto('button', 'Marcar como leído')) {
    await foto('09-concluir');
    await clicTexto('app-modal button', 'Cancelar');
  }

  // Bandeja de salida
  await ir('salida');
  await foto('10-salida');
  await page.evaluate(() => document.querySelector('.band-card')?.click());
  await espera(2500);
  await foto('11-salida-vista-rapida');

  // Registrar documento (página completa)
  await ir('salida/nuevo', 5000);
  await fotoContenido('12-registrar', 3000);

  // Búsqueda
  await ir('busqueda');
  await page.type('input[name="termino"]', 'EVENTO');
  await clicTexto('button[type="submit"]', 'Buscar');
  await espera(3500);
  await fotoContenido('13-busqueda', 1100);

  // Agenda
  await ir('agenda', 5000);
  await fotoContenido('14-agenda', 1300);

  // Concentración
  await ir('concentracion', 6000);
  await fotoContenido('15-concentracion', 1000);

  // Reportes
  await ir('reportes');
  await clicTexto('button', 'Consultar');
  await espera(4000);
  await fotoContenido('16-reportes', 1400);

  // Administrador / Presidencia
  await sesion(tokenAdmin, ADMIN);
  await ir('presidencia/agenda', 6000);
  await fotoContenido('17-agenda-legislativa', 1500);
  const hayEvento = await page.evaluate(() => {
    const b = document.querySelector('.lista-eventos__titulo');
    if (b) b.click();
    return !!b;
  });
  if (hayEvento) {
    await espera(2500);
    await foto('18-agenda-detalle');
  }
  await page.keyboard.press('Escape');

  await ir('presidencia/eventos', 5000);
  await fotoContenido('19-eventos-legislativos', 1100);
  await clicTexto('button', 'Nuevo evento');
  await espera(1500);
  await foto('20-evento-nuevo');

  await ir('administracion/clasificacion', 5000);
  await page.evaluate(() => document.querySelector('.lista__principal')?.click());
  await espera(2000);
  await fotoContenido('21-clasificacion', 1100);

  await ir('administracion/grupos', 4000);
  await fotoContenido('22-grupos', 1000);

  await ir('administracion/roles', 4000);
  await fotoContenido('23-roles', 1000);

  console.log('ERRORES:', errores.length ? errores.join('\n') : 'ninguno');
  await browser.close();
})();
