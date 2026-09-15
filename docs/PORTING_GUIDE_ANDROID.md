# 📱 Guía para Desarrollar la Versión Android

> **Destinatario**: Agente o desarrollador encargado de crear la versión para Android (móviles y tablets).

---

## 1. Enfoque Tecnológico Recomendado: **Capacitor v7**

### ¿Por qué Capacitor en lugar de rehacer la app en React Native?
1. **Conservación del 100% del código existente**: Toda la lógica matemática 3D, el validador de trazos, el avatar oficial de Bible Strong y el sistema de minijuegos funcionan de forma nativa en la WebView moderna de Android.
2. **Rendimiento Idéntico**: El lienzo HTML5 y el avatar procedural ya están optimizados para GPU a 60/120 FPS.
3. **Acceso a Hardware Nativo**: Soporte completo para cámara (escáner QR), vibración háptica, pantalla completa inmersiva y almacenamiento de archivos PDF.
4. **Soporte de Lápiz Óptico (S-Pen / Stylus)**: Los eventos `PointerEvents` de la app ya reconocen la presión y el tipo de puntero (`pen`).

---

## 2. Paso a Paso para Crear el Proyecto Android

### Paso 1: Instalar dependencias de Capacitor en la raíz del proyecto
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Paso 2: Inicializar Capacitor
```bash
npx cap init "Paplitz" "com.paplitz.app" --web-dir "dist"
```

### Paso 3: Configurar `vite.config.ts`
Asegurarse de que las rutas relativas funcionen dentro de la WebView de Android:
```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // CRUCIAL para WebView de Android
  plugins: [react(), tailwindcss()],
});
```

### Paso 4: Compilar la web y generar la carpeta nativa de Android
```bash
npm run build
npx cap add android
```

Esto creará la carpeta nativa `/android` con un proyecto completo de Android Studio con Gradle.

---

## 3. Configuraciones Específicas de Android

### A. Permisos de Cámara para Escáner QR
En `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### B. Soporte de Stylus / S-Pen y Rechazo de Palma (*Palm Rejection*)
En `src/components/DrawingCanvas.tsx` el elemento `<canvas>` ya cuenta con:
```tsx
className="touch-none cursor-crosshair block w-full h-full"
```
La propiedad CSS `touch-action: none` es fundamental en Android para evitar que el scroll o los gestos del sistema interfieran mientras el usuario apoya la palma de la mano al dibujar con stylus.

Puedes capturar la presión del lápiz en `onPointerDown` / `onPointerMove`:
```ts
if (e.pointerType === 'pen') {
  const pressure = e.pressure; // Valor entre 0.0 y 1.0 para grosor de trazo dinámico
}
```

### C. Modo Inmersivo de Pantalla Completa (Ocultar barras del sistema)
En `android/app/src/main/java/com/paplitz/app/MainActivity.java`:
```java
package com.paplitz.app;
import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ocultar barra de navegación y estado para máxima inmersión al dibujar
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
```

---

## 4. Generar el APK o AAB de Producción

```bash
# Abrir el proyecto en Android Studio
npx cap open android

# O compilar directamente el APK con Gradle desde consola:
cd android
./gradlew assembleDebug   # Genera APK de prueba en app/build/outputs/apk/debug
./gradlew assembleRelease # Genera APK optimizado para distribución
```
