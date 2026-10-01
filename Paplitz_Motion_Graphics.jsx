/**
 * ==============================================================================
 * PAPLITZ — MOTION GRAPHICS GENERATOR (Bulletproof Edition for After Effects)
 * ==============================================================================
 * Duración: 35.0 Segundos | 1920x1080 @ 30 FPS | Formato 16:9
 * Estética: Blanco y negro tinta editorial, sombreados rígidos "card-ink",
 *           estilo técnico industrial de dibujo de perspectiva.
 * 
 * GARANTÍAS DE ESTABILIDAD (Crash-Proof):
 * - Cero manipulación de ParagraphJustification (elimina el fallo fatal de CoolType.dll).
 * - Cero keyframing sobre ADBE Text Document (elimina la corrupción de caché en AfterFXLib.dll).
 * - Cero caracteres UTF-8 sin escapar (todos los glifos usan \uXXXX para compatibilidad CP1252).
 * - Acceso ultra-defensivo a propiedades (Match Name + fallback por índice).
 * - Escala siempre suministrada como vector de 3 dimensiones [X, Y, 100].
 * - Rotación aplicada exclusivamente a nivel de capa (ADBE Rotate Z).
 * - Tangentes Bézier inicializadas estrictamente con [0, 0].
 * ==============================================================================
 */

(function generatePaplitzMotionGraphics() {
    if (typeof app === "undefined") {
        alert("Por favor, abre Adobe After Effects antes de ejecutar este script.");
        return;
    }

    if (!app.project) {
        try {
            app.newProject();
        } catch (e) {}
    }

    if (!app.project) {
        alert("No se pudo inicializar un proyecto en After Effects. Por favor, crea un proyecto vac\u00EDo primero.");
        return;
    }

    app.beginUndoGroup("Paplitz Motion Graphics Promo");

    try {
        var compW = 1920;
        var compH = 1080;
        var fps = 30;
        var duration = 35.0;
        var compName = "PAPLITZ_PROMO_35s";

        // Paleta oficial Paplitz
        var colWhite = [1, 1, 1];
        var colBlack = [0, 0, 0];
        var colGrayText = [0.38, 0.38, 0.42];
        var colGreenPass = [0.086, 0.639, 0.29]; // #16A34A
        var colRedFail = [0.88, 0.12, 0.12];    // #E11D48

        // Crear Composición principal
        var comp = app.project.items.addComp(compName, compW, compH, 1, duration, fps);
        comp.bgColor = colWhite;

        // =====================================================================
        // HELPERS CRASH-PROOF ULTRA-DEFENSIVOS
        // =====================================================================

        function getTransform(layer) {
            return layer.property("ADBE Transform Group");
        }

        function setPos(layer, pos) {
            var pProp = getTransform(layer).property("ADBE Position");
            if (pProp) pProp.setValue(pos);
        }

        function setOpacity(layer, op) {
            var opProp = getTransform(layer).property("ADBE Opacity");
            if (opProp) opProp.setValue(op);
        }

        // Animación de escala con rebote elástico (3 keyframes nativos en 3D)
        function bounceIn(layer, t0, dur, fromScale) {
            var sc = getTransform(layer).property("ADBE Scale");
            if (!sc) return;
            var s0 = (fromScale !== undefined) ? fromScale : 0;
            var t1 = t0 + dur * 0.65;
            var t2 = t0 + dur;
            sc.setValueAtTime(t0, [s0, s0, 100]);
            sc.setValueAtTime(t1, [106, 106, 100]);
            sc.setValueAtTime(t2, [100, 100, 100]);
        }

        // Creación segura de texto (sin tocar justification en TextDocument)
        function addSafeText(textStr, layerName, inP, outP, x, y, fontSize, fontColor) {
            var tLayer = comp.layers.addText(textStr);
            tLayer.name = layerName;
            tLayer.inPoint = inP;
            tLayer.outPoint = outP;

            try {
                var tProp = tLayer.property("ADBE Text Properties").property("ADBE Text Document");
                var tDoc = tProp.value;
                tDoc.fontSize = fontSize;
                tDoc.fillColor = fontColor;
                tDoc.applyFill = true;
                tProp.setValue(tDoc);
            } catch (e) {}

            // Centrar punto de anclaje de forma matemática y segura
            try {
                var bounds = tLayer.sourceRectAtTime(inP, false);
                if (bounds.width > 0 && bounds.height > 0) {
                    var aProp = getTransform(tLayer).property("ADBE Anchor Point");
                    if (aProp) {
                        aProp.setValue([
                            bounds.left + bounds.width / 2,
                            bounds.top + bounds.height / 2
                        ]);
                    }
                }
            } catch (e) {}

            setPos(tLayer, [x, y]);
            return tLayer;
        }

        // Helper para crear tarjetas estilo Card-Ink (caja + sombra rígida negra)
        function createCard(layerName, inP, outP, x, y, w, h, shadowOff, strokeW, fillColor, strokeColor) {
            var sLayer = comp.layers.addShape();
            sLayer.name = layerName;
            sLayer.inPoint = inP;
            sLayer.outPoint = outP;
            setPos(sLayer, [x, y]);

            var root = sLayer.property("ADBE Root Vectors Group");

            // 1. Sombra negra dura rígida
            if (shadowOff && shadowOff > 0) {
                var shG = root.addProperty("ADBE Vector Group");
                var shCont = shG.property("ADBE Vectors Group");
                var shRect = shCont.addProperty("ADBE Vector Shape - Rect");
                var shRSize = shRect.property("ADBE Vector Rect Size") || shRect.property(1);
                if (shRSize) shRSize.setValue([w, h]);
                var shRPos = shRect.property("ADBE Vector Rect Position") || shRect.property(2);
                if (shRPos) shRPos.setValue([shadowOff, shadowOff]);

                var shFill = shCont.addProperty("ADBE Vector Graphic - Fill");
                var shFCol = shFill.property("ADBE Vector Fill Color") || shFill.property(4);
                if (shFCol) shFCol.setValue(colBlack);
            }

            // 2. Caja principal blanca con trazo
            var boxG = root.addProperty("ADBE Vector Group");
            var boxCont = boxG.property("ADBE Vectors Group");
            var boxRect = boxCont.addProperty("ADBE Vector Shape - Rect");
            var bRSize = boxRect.property("ADBE Vector Rect Size") || boxRect.property(1);
            if (bRSize) bRSize.setValue([w, h]);
            var bRPos = boxRect.property("ADBE Vector Rect Position") || boxRect.property(2);
            if (bRPos) bRPos.setValue([0, 0]);

            var bFill = boxCont.addProperty("ADBE Vector Graphic - Fill");
            var bFCol = bFill.property("ADBE Vector Fill Color") || bFill.property(4);
            if (bFCol) bFCol.setValue(fillColor || colWhite);

            if (strokeW && strokeW > 0) {
                var bStroke = boxCont.addProperty("ADBE Vector Graphic - Stroke");
                var bSCol = bStroke.property("ADBE Vector Stroke Color") || bStroke.property(3);
                if (bSCol) bSCol.setValue(strokeColor || colBlack);
                var bSW = bStroke.property("ADBE Vector Stroke Width") || bStroke.property(4);
                if (bSW) bSW.setValue(strokeWidth);
            }

            return sLayer;
        }

        // Helper para crear trazados con Trim Paths ultra-defensivo
        function createPath(layerName, inP, outP, x, y, verts, closed, strokeColor, strokeWidth, trimStart, trimEnd) {
            var sLayer = comp.layers.addShape();
            sLayer.name = layerName;
            sLayer.inPoint = inP;
            sLayer.outPoint = outP;
            setPos(sLayer, [x, y]);

            var root = sLayer.property("ADBE Root Vectors Group");
            var group = root.addProperty("ADBE Vector Group");
            var cont = group.property("ADBE Vectors Group");

            // 1. Trazado Bézier
            var p = cont.addProperty("ADBE Vector Shape - Path");
            var shp = new Shape();
            shp.vertices = verts;
            var tang = [];
            for (var i = 0; i < verts.length; i++) tang.push([0, 0]);
            shp.inTangents = tang;
            shp.outTangents = tang;
            shp.closed = (closed === true);
            var pathProp = p.property("ADBE Vector Shape") || p.property(1);
            if (pathProp) pathProp.setValue(shp);

            // 2. Trazo
            var s = cont.addProperty("ADBE Vector Graphic - Stroke");
            var strCol = s.property("ADBE Vector Stroke Color") || s.property(3);
            if (strCol) strCol.setValue(strokeColor);
            var strW = s.property("ADBE Vector Stroke Width") || s.property(4);
            if (strW) strW.setValue(strokeWidth);

            // 3. Trim Paths opcional
            if (trimStart !== undefined && trimEnd !== undefined) {
                try {
                    var trim = cont.addProperty("ADBE Vector Filter - Trim");
                    var endProp = trim.property("ADBE Vector Trim-End") || trim.property(2);
                    if (endProp) {
                        endProp.setValueAtTime(trimStart, 0);
                        endProp.setValueAtTime(trimEnd, 100);
                    }
                } catch (e) {}
            }

            return sLayer;
        }

        // =====================================================================
        // CAPA 1: FONDO BLANCO Y MARCADORES TÉCNICOS PERIMETRALES
        // =====================================================================
        var bg = comp.layers.addSolid(colWhite, "BG_Blanco", compW, compH, 1, duration);
        bg.moveToEnd();

        // Marcadores de encuadre en las 4 esquinas (bracket guides)
        var frameGuide = comp.layers.addShape();
        frameGuide.name = "UI_Frame_Guides";
        frameGuide.inPoint = 0;
        frameGuide.outPoint = duration;
        setPos(frameGuide, [compW / 2, compH / 2]);

        var fgRoot = frameGuide.property("ADBE Root Vectors Group");
        var fgG = fgRoot.addProperty("ADBE Vector Group");
        var fgCont = fgG.property("ADBE Vectors Group");

        var dX = 860;
        var dY = 460;
        var bSize = 36;
        var corners = [
            [[-dX, -dY + bSize], [-dX, -dY], [-dX + bSize, -dY]], // Sup-Izq
            [[dX - bSize, -dY], [dX, -dY], [dX, -dY + bSize]],    // Sup-Der
            [[-dX, dY - bSize], [-dX, dY], [-dX + bSize, dY]],    // Inf-Izq
            [[dX - bSize, dY], [dX, dY], [dX, dY - bSize]]        // Inf-Der
        ];

        for (var c = 0; c < corners.length; c++) {
            var cPath = fgCont.addProperty("ADBE Vector Shape - Path");
            var cShp = new Shape();
            cShp.vertices = corners[c];
            cShp.inTangents = [[0, 0], [0, 0], [0, 0]];
            cShp.outTangents = [[0, 0], [0, 0], [0, 0]];
            cShp.closed = false;
            var cPathProp = cPath.property("ADBE Vector Shape") || cPath.property(1);
            if (cPathProp) cPathProp.setValue(cShp);
        }

        var fgStroke = fgCont.addProperty("ADBE Vector Graphic - Stroke");
        var fgSCol = fgStroke.property("ADBE Vector Stroke Color") || fgStroke.property(3);
        if (fgSCol) fgSCol.setValue(colBlack);
        var fgSW = fgStroke.property("ADBE Vector Stroke Width") || fgStroke.property(4);
        if (fgSW) fgSW.setValue(2.5);

        // Header técnico superior
        addSafeText("PAPLITZ // SPATIAL RESEARCH & PERSPECTIVE TRAINER", "TXT_UI_Header", 0, duration, compW / 2, 70, 14, colGrayText);
        addSafeText("ESTRUCTURA DID\u00C1CTICA DIGITAL // VER 1.0", "TXT_UI_Footer", 0, duration, compW / 2, 1010, 14, colGrayText);

        // =====================================================================
        // ACTO 1: EL DOLOR DEL FOLIO EN BLANCO (0.0s - 7.0s)
        // =====================================================================
        var txt1A = addSafeText("EN DISE\u00D1O INDUSTRIAL TE EXIGEN DIBUJAR...", "TXT_Acto1_A", 0.4, 4.2, compW / 2, 240, 52, colBlack);
        bounceIn(txt1A, 0.4, 0.4, 0);

        // Cubo con perspectiva fallida (torcido, líneas divergentes)
        var badCubeVerts = [
            [0, 110], [-140, 45], [-160, -115], [-10, -50], [0, 110],
            [170, 20], [150, -155], [-10, -50],
            [150, -155], [0, -220], [-160, -115]
        ];
        createPath("SHP_Bad_Cube_Failure", 0.8, 7.0, compW / 2, 530, badCubeVerts, false, colBlack, 5, 0.8, 2.4);

        var txt1B = addSafeText("...PERO NADIE TE ENSE\u00D1A EL M\u00C9TODO.", "TXT_Acto1_B", 2.6, 7.0, compW / 2, 850, 48, colRedFail);
        bounceIn(txt1B, 2.6, 0.4, 30);

        // Cruz roja de fallo
        var crossLayer = comp.layers.addShape();
        crossLayer.name = "SHP_Cross_Fail";
        crossLayer.inPoint = 4.2;
        crossLayer.outPoint = 7.0;
        setPos(crossLayer, [compW / 2, 530]);

        var clRoot = crossLayer.property("ADBE Root Vectors Group");
        var clG = clRoot.addProperty("ADBE Vector Group");
        var clCont = clG.property("ADBE Vectors Group");

        var cp1 = clCont.addProperty("ADBE Vector Shape - Path");
        var cs1 = new Shape(); cs1.vertices = [[-110, -110], [110, 110]]; cs1.inTangents = [[0,0],[0,0]]; cs1.outTangents = [[0,0],[0,0]]; cs1.closed = false;
        var cp1Prop = cp1.property("ADBE Vector Shape") || cp1.property(1);
        if (cp1Prop) cp1Prop.setValue(cs1);

        var cp2 = clCont.addProperty("ADBE Vector Shape - Path");
        var cs2 = new Shape(); cs2.vertices = [[-110, 110], [110, -110]]; cs2.inTangents = [[0,0],[0,0]]; cs2.outTangents = [[0,0],[0,0]]; cs2.closed = false;
        var cp2Prop = cp2.property("ADBE Vector Shape") || cp2.property(1);
        if (cp2Prop) cp2Prop.setValue(cs2);

        var clStroke = clCont.addProperty("ADBE Vector Graphic - Stroke");
        var clSCol = clStroke.property("ADBE Vector Stroke Color") || clStroke.property(3);
        if (clSCol) clSCol.setValue(colRedFail);
        var clSW = clStroke.property("ADBE Vector Stroke Width") || clStroke.property(4);
        if (clSW) clSW.setValue(14);
        bounceIn(crossLayer, 4.2, 0.35, 0);

        // Flash de transición sincopada
        var flash = comp.layers.addSolid(colBlack, "FX_Flash_Cut", compW, compH, 1, 0.2);
        flash.startTime = 6.85;
        flash.inPoint = 6.85;
        flash.outPoint = 7.05;

        // =====================================================================
        // ACTO 2: NACE PAPLITZ (7.0s - 14.5s)
        // =====================================================================
        var logoX = compW / 2 - 240;
        var logoY = 470;

        // 1. Caja contenedora del logotipo con sombra rígida
        var logoCard = createCard("LOGO_Paplitz_Card", 7.0, 14.5, logoX, logoY, 260, 260, 18, 12, colWhite, colBlack);
        bounceIn(logoCard, 7.0, 0.45, 0);

        // 2. Cara cuadrada interior girada a 12.5° (capa independiente)
        var logoInner = comp.layers.addShape();
        logoInner.name = "LOGO_Paplitz_Inner_Face";
        logoInner.inPoint = 7.0;
        logoInner.outPoint = 14.5;
        setPos(logoInner, [logoX, logoY]);
        var rotInner = getTransform(logoInner).property("ADBE Rotate Z");
        if (rotInner) rotInner.setValue(12.5);

        var liRoot = logoInner.property("ADBE Root Vectors Group");
        var liG = liRoot.addProperty("ADBE Vector Group");
        var liCont = liG.property("ADBE Vectors Group");
        var liRect = liCont.addProperty("ADBE Vector Shape - Rect");
        var liRSize = liRect.property("ADBE Vector Rect Size") || liRect.property(1);
        if (liRSize) liRSize.setValue([125, 125]);
        var liFill = liCont.addProperty("ADBE Vector Graphic - Fill");
        var liFCol = liFill.property("ADBE Vector Fill Color") || liFill.property(4);
        if (liFCol) liFCol.setValue(colWhite);
        var liStroke = liCont.addProperty("ADBE Vector Graphic - Stroke");
        var liSCol = liStroke.property("ADBE Vector Stroke Color") || liStroke.property(3);
        if (liSCol) liSCol.setValue(colBlack);
        var liSW = liStroke.property("ADBE Vector Stroke Width") || liStroke.property(4);
        if (liSW) liSW.setValue(10);
        bounceIn(logoInner, 7.0, 0.45, 0);

        // Título PAPLITZ en tipografía display contundente
        var txtPap = addSafeText("PAPLITZ", "TXT_Paplitz_Title", 7.3, 14.5, compW / 2 + 220, 450, 108, colBlack);
        bounceIn(txtPap, 7.3, 0.4, 40);

        // Badge técnico: OPEN SOURCE • PERSPECTIVE TRAINER
        var badge = createCard("SHP_Badge_OpenSource", 7.7, 14.5, compW / 2 + 220, 535, 460, 44, 0, 0, colBlack);
        bounceIn(badge, 7.7, 0.35, 0);
        addSafeText("OPEN SOURCE \u2022 PERSPECTIVE TRAINER", "TXT_Badge_OpenSource", 7.7, 14.5, compW / 2 + 220, 536, 18, colWhite);

        // Subtítulo explicativo
        var txtSub = addSafeText("DOMINA EL SKETCHING T\u00C9CNICO MEDIANTE MICROLECCIONES Y FEEDBACK INMEDIATO", "TXT_Manifesto_Sub", 8.2, 14.5, compW / 2, 710, 22, colGrayText);
        var opSub = getTransform(txtSub).property("ADBE Opacity");
        if (opSub) {
            opSub.setValueAtTime(8.2, 0);
            opSub.setValueAtTime(8.7, 100);
        }

        // =====================================================================
        // ACTO 3: EL BUCLE DE PRÁCTICA Y EVALUACIÓN (14.5s - 24.5s)
        // =====================================================================
        var cWin = createCard("SHP_Canvas_Window", 14.5, 24.5, compW / 2, 530, 940, 650, 14, 5, colWhite, colBlack);
        bounceIn(cWin, 14.5, 0.45, 50);

        // Cabecera de la ventana
        addSafeText("LECCI\u00D3N 1.1 \u2022 CUBO 3D EN PERSPECTIVA (EJES X, Y, Z)", "TXT_Lesson_Header", 14.8, 24.5, compW / 2, 245, 20, colBlack);

        // Ejes X, Y, Z de referencia en gris
        var axesVerts = [
            [0, 60], [0, -220],     // Eje Z (vertical)
            [0, 60], [-250, 20],    // Eje X (izquierda)
            [0, 60], [250, 20]      // Eje Y (derecha)
        ];
        createPath("SHP_Axes_XYZ", 15.0, 24.5, compW / 2, 540, axesVerts, false, colGrayText, 2, 15.0, 15.8);

        // Cara inicial dada (referencia fija)
        var givenFaceVerts = [[0, 60], [0, -110], [-140, -145], [-140, 25]];
        createPath("SHP_Given_Left_Face", 15.8, 24.5, compW / 2, 540, givenFaceVerts, true, colBlack, 5, 15.8, 16.6);

        // Trazado del usuario completando el cubo en 3D
        var userCubeVerts = [
            [0, 60], [140, 25], [140, -145], [0, -110],
            [140, -145], [0, -180], [-140, -145]
        ];
        createPath("SHP_User_Drawing_Cube", 16.8, 24.5, compW / 2, 540, userCubeVerts, false, colBlack, 5, 16.8, 19.2);

        // Línea láser verde de escaneo evaluador
        var laserVerts = [[-320, 0], [320, 0]];
        var scanLaser = createPath("FX_Scan_Laser_Line", 19.4, 20.6, compW / 2, 380, laserVerts, false, colGreenPass, 4);
        var laserPos = getTransform(scanLaser).property("ADBE Position");
        if (laserPos) {
            laserPos.setValueAtTime(19.4, [compW / 2, 360]);
            laserPos.setValueAtTime(20.4, [compW / 2, 720]);
        }

        // Banner Pop-up de Calificación Aprobado
        var scoreBanner = createCard("SHP_Score_Banner", 20.5, 24.5, compW / 2, 780, 520, 76, 8, 4, colWhite, colGreenPass);
        bounceIn(scoreBanner, 20.5, 0.4, 0);

        addSafeText("\u2714 APROBADO \u2014 94% PRECISI\u00D3N GEOM\u00C9TRICA", "TXT_Score_Title", 20.5, 24.5, compW / 2, 770, 24, colGreenPass);
        addSafeText("Perspectiva correcta \u2022 Puntos de fuga convergentes", "TXT_Score_Sub", 20.6, 24.5, compW / 2, 796, 15, colGrayText);

        // =====================================================================
        // ACTO 4: EL CAMINO DE APRENDIZAJE (24.5s - 29.8s)
        // =====================================================================
        addSafeText("METODOLOG\u00CDA DIGITAL \u2022 THE LEARNING PATH", "TXT_Acto4_Title", 24.5, 29.8, compW / 2, 200, 38, colBlack);
        addSafeText("De l\u00EDneas b\u00E1sicas a formas complejas con dificultad adaptativa", "TXT_Acto4_Sub", 24.6, 29.8, compW / 2, 245, 20, colGrayText);

        var pathNodes = [
            { code: "01", title: "FUNDAMENTOS // L\u00CDNEAS Y EJES", status: "completed", x: compW / 2 - 180, y: 360 },
            { code: "02", title: "PLANOS // ELIPSES Y ROTACI\u00D3N", status: "completed", x: compW / 2 + 180, y: 470 },
            { code: "03", title: "VOLUMEN // CUBOS EN PERSPECTIVA", status: "current",   x: compW / 2 - 180, y: 580 },
            { code: "04", title: "DEFORMACI\u00D3N // RADIOS Y FILLETS", status: "locked",    x: compW / 2 + 180, y: 690 }
        ];

        for (var pn = 0; pn < pathNodes.length; pn++) {
            var node = pathNodes[pn];
            var nIn = 24.8 + pn * 0.15;
            var isComp = (node.status === "completed");
            var isCur = (node.status === "current");

            var nCard = createCard(
                "NODE_Card_" + node.code,
                nIn,
                29.8,
                node.x,
                node.y,
                460,
                78,
                6,
                isCur ? 4 : 3,
                isComp ? colBlack : colWhite,
                isCur ? colGreenPass : colBlack
            );
            bounceIn(nCard, nIn, 0.35, 0);

            var prefix = isComp ? "[ \u2714 ] " : (isCur ? "[ \u25B6 ] " : "[   ] ");
            var tColor = isComp ? colWhite : (isCur ? colBlack : colGrayText);

            addSafeText(prefix + node.code + " // " + node.title, "TXT_Node_" + node.code, nIn, 29.8, node.x, node.y, 20, tColor);
        }

        // =====================================================================
        // ACTO 5: CIERRE Y LLAMADA A LA ACCIÓN (29.8s - 35.0s)
        // =====================================================================
        // Doble marco exterior
        var finalFrame = createCard("SHP_Final_Frame", 29.8, duration, compW / 2, compH / 2, 1740, 920, 0, 6, colWhite, colBlack);
        bounceIn(finalFrame, 29.8, 0.4, 95);

        // Logotipo final centrado
        var flCard = createCard("LOGO_Final_Card", 30.2, duration, compW / 2, 340, 160, 160, 12, 8, colWhite, colBlack);
        bounceIn(flCard, 30.2, 0.4, 0);

        var flInner = comp.layers.addShape();
        flInner.name = "LOGO_Final_Inner_Face";
        flInner.inPoint = 30.2;
        flInner.outPoint = duration;
        setPos(flInner, [compW / 2, 340]);
        var flRot = getTransform(flInner).property("ADBE Rotate Z");
        if (flRot) flRot.setValue(12.5);

        var fliRoot = flInner.property("ADBE Root Vectors Group");
        var fliG = fliRoot.addProperty("ADBE Vector Group");
        var fliCont = fliG.property("ADBE Vectors Group");
        var fliRect = fliCont.addProperty("ADBE Vector Shape - Rect");
        var fliRSize = fliRect.property("ADBE Vector Rect Size") || fliRect.property(1);
        if (fliRSize) fliRSize.setValue([76, 76]);
        var fliFill = fliCont.addProperty("ADBE Vector Graphic - Fill");
        var fliFCol = fliFill.property("ADBE Vector Fill Color") || fliFill.property(4);
        if (fliFCol) fliFCol.setValue(colWhite);
        var fliStroke = fliCont.addProperty("ADBE Vector Graphic - Stroke");
        var fliSCol = fliStroke.property("ADBE Vector Stroke Color") || fliStroke.property(3);
        if (fliSCol) fliSCol.setValue(colBlack);
        var fliSW = fliStroke.property("ADBE Vector Stroke Width") || fliStroke.property(4);
        if (fliSW) fliSW.setValue(6);
        bounceIn(flInner, 30.2, 0.4, 0);

        // Título final PAPLITZ
        var finalTitle = addSafeText("PAPLITZ", "TXT_Final_Title", 30.6, duration, compW / 2, 490, 96, colBlack);
        bounceIn(finalTitle, 30.6, 0.4, 20);

        // Subtítulo MIT
        addSafeText("100% C\u00D3DIGO ABIERTO \u2022 LICENCIA MIT \u2022 GRATUITO Y SIN REGISTRO", "TXT_Final_Sub", 31.0, duration, compW / 2, 570, 22, colGrayText);

        // Botón CTA URL
        var ctaBox = createCard("SHP_Final_CTA_Button", 31.3, duration, compW / 2, 680, 520, 72, 8, 0, colBlack);
        bounceIn(ctaBox, 31.3, 0.4, 0);

        addSafeText("paplitz.vercel.app", "TXT_Final_Url", 31.3, duration, compW / 2, 680, 34, colWhite);
        addSafeText("Comienza a practicar en tu navegador", "TXT_Final_Tagline", 31.7, duration, compW / 2, 755, 18, colGrayText);

        app.endUndoGroup();

        alert("Composici\u00F3n 'PAPLITZ_PROMO_35s' generada con \u00E9xito en After Effects.");

    } catch (err) {
        app.endUndoGroup();
        alert("Error en el script:\n" + err.toString() + "\nL\u00EDnea: " + (err.line || "desconocida"));
    }
})();
