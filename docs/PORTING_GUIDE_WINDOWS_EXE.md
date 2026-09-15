# 💻 Guía para Crear el Ejecutable Windows (`.exe`)

> **Destinatario**: Agente o desarrollador encargado de empaquetar la aplicación en un instalador o ejecutable autónomo para Windows.

---

## 1. Comparativa: ¿Tauri v2 o Electron?

| Criterio | **Tauri v2 (Recomendado)** | **Electron** |
| :--- | :--- | :--- |
| **Tamaño del `.exe`** | **~10 a 15 MB** | ~90 a 120 MB |
| **Consumo de RAM** | **~35 MB** (usa WebView2 nativo de Windows) | ~160 MB (empaqueta Chromium completo) |
| **Arranque** | Instantáneo (< 0.5s) | Moderado (~2s) |
| **Requisitos** | Requiere Rust y C++ Build Tools | Solo Node.js y npm |

Ambas opciones son completamente viables. A continuación se detallan los pasos para ambas.

---

## 2. Opción A: Empaquetar con **Tauri v2** (Ultraligero)

### Prerrequisitos en Windows
1. Tener instalado **Rust**: `winget install Rustlang.Rustup` o desde [rustup.rs](https://rustup.rs/).
2. C++ Build Tools de Visual Studio (incluido en Visual Studio Community).

### Paso 1: Instalar Tauri CLI
```bash
npm install -D @tauri-apps/cli
```

### Paso 2: Inicializar Tauri
```bash
npx tauri init
```
Responde a las preguntas del asistente:
- *What is your app name?* -> **Paplitz**
- *What should the window title be?* -> **Paplitz — Simulador de Perspectiva**
- *Where are your web assets?* -> **../dist**
- *What is the url of your dev server?* -> **http://localhost:5173**
- *What command to run dev server?* -> **npm run dev**
- *What command to build web assets?* -> **npm run build**

### Paso 3: Configurar `src-tauri/tauri.conf.json`
```json
{
  "productName": "Paplitz",
  "version": "0.1.0",
  "identifier": "com.paplitz.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Paplitz",
        "width": 1280,
        "height": 840,
        "minWidth": 960,
        "minHeight": 640,
        "center": true,
        "resizable": true
      }
    ]
  }
}
```

### Paso 4: Compilar el `.exe`
```bash
npm run tauri build
```
El instalador y ejecutable autónomo quedarán generados en:
`src-tauri/target/release/bundle/nsis/Paplitz_0.1.0_x64-setup.exe`

---

## 3. Opción B: Empaquetar con **Electron** (Alternativa directa en JS)

Si prefieres no instalar Rust y compilar 100% en el entorno Node.js:

### Paso 1: Instalar dependencias de desarrollo
```bash
npm install -D electron electron-builder concurrently wait-on
```

### Paso 2: Crear archivo `electron/main.cjs`
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Paso 3: Añadir scripts en `package.json`
```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder --win nsis"
  }
}
```

### Paso 4: Compilar el `.exe` con Electron
```bash
npm run electron:build
```
Generará el ejecutable en la carpeta `/dist_electron`.

---

## 4. Garantía de Funcionamiento 100% Offline

Paplitz **no depende de ninguna API externa ni CDN en tiempo de ejecución**:
- Todos los iconos (`lucide-react`), tipografías y componentes SVG del avatar se sirven localmente dentro del bundle.
- El generador de PDFs (`jspdf`) y el escáner QR (`jsqr`) funcionan de forma local en la máquina del usuario sin conexión a internet.
