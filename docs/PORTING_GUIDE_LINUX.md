# 🐧 Guía para Crear los Paquetes de Linux (`.AppImage` y `.deb`)

> **Destinatario**: Agente o desarrollador encargado de empaquetar la aplicación en ejecutables portables o instaladores para distribuciones Linux (Ubuntu, Debian, Fedora, Arch, etc.).

---

## 1. Formatos Disponibles

| Formato | Tipo | Compatibilidad | Descripción |
| :--- | :--- | :--- | :--- |
| **`.AppImage`** | Ejecutable Portable | Universal (cualquier distro) | No requiere instalación; basta con darle permisos de ejecución (`chmod +x`) y ejecutar. |
| **`.deb`** | Paquete Instalador | Debian, Ubuntu, Linux Mint | Se integra en el lanzador del sistema, menú de aplicaciones y `/usr/share/applications/`. |
| **`.tar.gz`** | Binario Portable comprimido | Universal | Carpeta desempaquetable con todos los binarios y dependencias integradas. |

---

## 2. Comandos de Compilación

Los scripts están listos en `package.json`:

```bash
# 1. Compilar todo (AppImage + deb)
npm run electron:build:linux

# 2. Compilar únicamente AppImage portable
npm run electron:build:linux:appimage

# 3. Compilar únicamente paquete .deb (Debian/Ubuntu)
npm run electron:build:linux:deb

# 4. Compilar todos los formatos (AppImage + deb + tar.gz)
npm run electron:build:linux:all
```

Los paquetes resultantes se generan en el directorio:
```
dist_electron/
├── Paplitz-0.1.2.AppImage
├── paplitz_0.1.2_amd64.deb
└── paplitz-0.1.2.tar.gz
```

---

## 3. Cómo Ejecutar e Instalar en Linux

### Ejecutar el `.AppImage`:
```bash
chmod +x dist_electron/Paplitz-0.1.2.AppImage
./dist_electron/Paplitz-0.1.2.AppImage
```

### Instalar el `.deb`:
```bash
sudo dpkg -i dist_electron/paplitz_0.1.2_amd64.deb
# O con apt para resolver dependencias automáticamente:
sudo apt install ./dist_electron/paplitz_0.1.2_amd64.deb
```
