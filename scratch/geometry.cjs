"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var geometry_exports = {};
__export(geometry_exports, {
  clampRayToBox: () => clampRayToBox,
  generateCubeChallenge: () => generateCubeChallenge
});
module.exports = __toCommonJS(geometry_exports);
function pseudoRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function generateCubeChallenge(seed = Math.floor(Math.random() * 1e6), canvasWidth = 600, canvasHeight = 540, options = {}) {
  const rnd = pseudoRandom(seed);
  const isShadow = !!options.isShadowLevel;
  const hasGroundGrid = isShadow ? options.hasGroundGrid !== void 0 ? options.hasGroundGrid : true : false;
  const mode = isShadow ? "normal" : options.mode || (options.axesMode && options.axesMode !== "none" ? "guided" : "normal");
  const axesMode = isShadow ? "none" : options.axesMode !== void 0 ? options.axesMode : mode === "guided" ? "xyz" : "none";
  const lightSide = options.forceSide || (rnd() > 0.5 ? "left" : "right");
  const cx = isShadow ? lightSide === "left" ? 260 : 340 : canvasWidth / 2;
  const cy = isShadow ? 245 : canvasHeight / 2;
  const height = isShadow ? 95 : 150 + rnd() * 18;
  const leftWidth = isShadow ? 85 : 115 + rnd() * 20;
  const rightWidth = isShadow ? 85 : 115 + rnd() * 20;
  const slopeFactor = isShadow ? 0.17 : mode === "guided" || mode === "gentle" ? 0.18 : mode === "dynamic" ? 0.28 : 0.22;
  const leftSlope = leftWidth * slopeFactor;
  const rightSlope = rightWidth * slopeFactor;
  const frontX = cx;
  const frontYBottom = cy + height * 0.38;
  const frontYTop = frontYBottom - height;
  const leftX = frontX - leftWidth;
  const leftYTop = frontYTop - leftSlope;
  const leftYBottom = frontYBottom - leftSlope * 0.85;
  const rightX = frontX + rightWidth;
  const rightYTop = frontYTop - rightSlope;
  const rightYBottom = frontYBottom - rightSlope * 0.85;
  const backX = frontX - leftWidth + rightWidth;
  const backYTop = leftYTop - rightSlope;
  const vertices2D = [
    { x: frontX, y: frontYBottom },
    // 0
    { x: frontX, y: frontYTop },
    // 1
    { x: leftX, y: leftYBottom },
    // 2
    { x: leftX, y: leftYTop },
    // 3
    { x: rightX, y: rightYBottom },
    // 4
    { x: rightX, y: rightYTop },
    // 5
    { x: backX, y: backYTop }
    // 6
  ];
  const givenSide = options.forceSide || (rnd() > 0.5 ? "left" : "right");
  let givenFace;
  let givenEdges;
  let allTargetEdges;
  const hintEdges = [];
  if (givenSide === "left") {
    givenFace = {
      name: "Cara Izquierda",
      vertices: [0, 1, 3, 2]
    };
    givenEdges = [
      { start: 0, end: 1, family: "height" },
      { start: 1, end: 3, family: "width" },
      { start: 3, end: 2, family: "height" },
      { start: 2, end: 0, family: "width" }
    ];
    allTargetEdges = [
      { start: 0, end: 4, family: "depth" },
      // Base derecha
      { start: 1, end: 5, family: "depth" },
      // Techo derecho
      { start: 4, end: 5, family: "height" },
      // Vertical derecha
      { start: 3, end: 6, family: "depth" },
      // Tapa hacia atrás-der
      { start: 5, end: 6, family: "width" }
      // Tapa hacia atrás-izq
    ];
  } else {
    givenFace = {
      name: "Cara Derecha",
      vertices: [0, 1, 5, 4]
    };
    givenEdges = [
      { start: 0, end: 1, family: "height" },
      { start: 1, end: 5, family: "depth" },
      { start: 5, end: 4, family: "height" },
      { start: 4, end: 0, family: "depth" }
    ];
    allTargetEdges = [
      { start: 0, end: 2, family: "width" },
      // Base izquierda
      { start: 1, end: 3, family: "width" },
      // Techo izquierdo
      { start: 2, end: 3, family: "height" },
      // Vertical izquierda
      { start: 5, end: 6, family: "width" },
      // Tapa hacia atrás-izq
      { start: 3, end: 6, family: "depth" }
      // Tapa hacia atrás-der
    ];
  }
  const targetEdges = isShadow ? [] : allTargetEdges;
  let shadowData = void 0;
  if (isShadow) {
    givenEdges = [
      { start: 0, end: 1, family: "height" },
      { start: 1, end: 3, family: "width" },
      { start: 3, end: 2, family: "height" },
      { start: 2, end: 0, family: "width" },
      { start: 1, end: 5, family: "depth" },
      { start: 5, end: 4, family: "height" },
      { start: 4, end: 0, family: "depth" },
      { start: 3, end: 6, family: "depth" },
      { start: 5, end: 6, family: "width" }
    ];
    const lightX = lightSide === "left" ? 95 : 505;
    const lightY = 28;
    const groundStationY = 230;
    const light2D = { x: lightX, y: lightY };
    const groundStation2D = { x: lightX, y: groundStationY };
    const lightSource = { light2D, groundStation2D, side: lightSide };
    const H_light = groundStationY - lightY;
    if (lightSide === "left") {
      const H_edge1 = vertices2D[2].y - vertices2D[3].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1 = {
        x: Math.round(lightX + u1 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[2].y - groundStationY))
      };
      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2 = {
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY))
      };
      const H_edge3 = vertices2D[4].y - vertices2D[5].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3 = {
        x: Math.round(lightX + u3 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[4].y - groundStationY))
      };
      const shadowVertices2D = [S1, S2, S3];
      const shadowPolygon = [vertices2D[2], S1, S2, S3, vertices2D[4], vertices2D[0]];
      const targetShadowEdges = [
        { start: vertices2D[2], end: S1, label: "Rayo Suelo Izquierdo" },
        { start: S1, end: S2, label: "Cresta Superior Izquierda" },
        { start: S2, end: S3, label: "Cresta Superior Derecha" },
        { start: S3, end: vertices2D[4], label: "Rayo Suelo Derecho" }
      ];
      const constructionRays = [
        { fromLight: { start: light2D, end: S1 }, fromGround: { start: groundStation2D, end: S1 }, intersection: S1 },
        { fromLight: { start: light2D, end: S2 }, fromGround: { start: groundStation2D, end: S2 }, intersection: S2 },
        { fromLight: { start: light2D, end: S3 }, fromGround: { start: groundStation2D, end: S3 }, intersection: S3 }
      ];
      shadowData = {
        light: lightSource,
        shadowVertices2D,
        shadowPolygon,
        targetEdges: targetShadowEdges,
        constructionRays
      };
    } else {
      const H_edge1 = vertices2D[4].y - vertices2D[5].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1 = {
        x: Math.round(lightX + u1 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[4].y - groundStationY))
      };
      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2 = {
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY))
      };
      const H_edge3 = vertices2D[2].y - vertices2D[3].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3 = {
        x: Math.round(lightX + u3 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[2].y - groundStationY))
      };
      const shadowVertices2D = [S1, S2, S3];
      const shadowPolygon = [vertices2D[4], S1, S2, S3, vertices2D[2], vertices2D[0]];
      const targetShadowEdges = [
        { start: vertices2D[4], end: S1, label: "Rayo Suelo Derecho" },
        { start: S1, end: S2, label: "Cresta Superior Derecha" },
        { start: S2, end: S3, label: "Cresta Superior Izquierda" },
        { start: S3, end: vertices2D[2], label: "Rayo Suelo Izquierdo" }
      ];
      const constructionRays = [
        { fromLight: { start: light2D, end: S1 }, fromGround: { start: groundStation2D, end: S1 }, intersection: S1 },
        { fromLight: { start: light2D, end: S2 }, fromGround: { start: groundStation2D, end: S2 }, intersection: S2 },
        { fromLight: { start: light2D, end: S3 }, fromGround: { start: groundStation2D, end: S3 }, intersection: S3 }
      ];
      shadowData = {
        light: lightSource,
        shadowVertices2D,
        shadowPolygon,
        targetEdges: targetShadowEdges,
        constructionRays
      };
    }
  }
  const axes = [];
  const axisZ = {
    id: "Z",
    label: "Z",
    origin: vertices2D[0],
    farPoint: { x: vertices2D[0].x, y: vertices2D[0].y - (height + 65) }
  };
  const axisX = {
    id: "X",
    label: "X",
    origin: vertices2D[0],
    farPoint: {
      x: vertices2D[0].x + (vertices2D[2].x - vertices2D[0].x) * 1.55,
      y: vertices2D[0].y + (vertices2D[2].y - vertices2D[0].y) * 1.55
    }
  };
  const axisY = {
    id: "Y",
    label: "Y",
    origin: vertices2D[0],
    farPoint: {
      x: vertices2D[0].x + (vertices2D[4].x - vertices2D[0].x) * 1.55,
      y: vertices2D[0].y + (vertices2D[4].y - vertices2D[0].y) * 1.55
    }
  };
  if (!isShadow && axesMode === "xyz") {
    axes.push(axisX, axisY, axisZ);
  } else if (!isShadow && axesMode === "base_axes") {
    axes.push(axisX, axisY);
  }
  const givenVertexSet = new Set(givenFace.vertices);
  const targetVertices2D = {};
  vertices2D.forEach((p, idx) => {
    if (!givenVertexSet.has(idx)) {
      targetVertices2D[idx] = p;
    }
  });
  const horizonY = frontYTop - 45;
  return {
    id: `cube-${seed}`,
    seed,
    mode,
    axesMode,
    axes,
    horizonY,
    givenSide,
    vertices2D,
    edges: [...givenEdges, ...targetEdges],
    givenFace,
    givenEdges,
    hintEdges,
    targetEdges,
    targetVertices2D,
    isShadowLevel: isShadow,
    hasGroundGrid,
    shadowData
  };
}
function clampRayToBox(ox, oy, rawFx, rawFy, box, endPadding = 0) {
  const dx = rawFx - ox;
  const dy = rawFy - oy;
  const rawDist = Math.hypot(dx, dy);
  if (rawDist < 1e-3) return { x: rawFx, y: rawFy };
  const ux = dx / rawDist;
  const uy = dy / rawDist;
  let maxDist = rawDist;
  if (ux > 1e-4) {
    maxDist = Math.min(maxDist, (box.right - ox) / ux);
  } else if (ux < -1e-4) {
    maxDist = Math.min(maxDist, (box.left - ox) / ux);
  }
  if (uy > 1e-4) {
    maxDist = Math.min(maxDist, (box.bottom - oy) / uy);
  } else if (uy < -1e-4) {
    maxDist = Math.min(maxDist, (box.top - oy) / uy);
  }
  const safeDist = Math.max(5, Math.min(rawDist, maxDist - endPadding));
  return {
    x: ox + ux * safeDist,
    y: oy + uy * safeDist
  };
}
