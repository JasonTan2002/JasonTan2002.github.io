import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import backgroundUrl from "./media/bear-background.jpg";

type SectionKey = "about" | "research" | "projects" | "contact";

const sectionContent: Record<
  SectionKey,
  { eyebrow: string; title: string; body: string; meta: string[] }
> = {
  about: {
    eyebrow: "01 / About",
    title: "Introduction",
    body: "I am Zixuan Tan, a master's student at Nanjing University. My current research focuses on video understanding: helping models perceive, represent, and reason about events that unfold over time.",
    meta: ["Nanjing University", "Master's student", "Suzhou, China"],
  },
  research: {
    eyebrow: "02 / Research",
    title: "From Video Understanding to Video Generation",
    body: "I am primarily working on video understanding and computer vision. I am also interested in world models—how learning systems can build structured, predictive representations from rich visual experience.",
    meta: ["Video understanding", "Computer vision", "World models"],
  },
  projects: {
    eyebrow: "03 / Current work",
    title: "Research in progress.",
    body: "I am developing and studying models that learn from video and reason across time. Selected projects and publications will be added here as they become available.",
    meta: ["Temporal representation", "Video reasoning", "Visual learning"],
  },
  contact: {
    eyebrow: "04 / Contact",
    title: "Let’s exchange ideas.",
    body: "I welcome conversations about video understanding, temporal representation, and world models. The best way to reach me is by email.",
    meta: ["zixuantan@smail.nju.edu.cn", "Nanjing University", "Suzhou, China"],
  },
};

function createMaterialMaps(image: HTMLImageElement) {
  const size = 512;
  const source = document.createElement("canvas");
  source.width = size;
  source.height = size;
  const sourceContext = source.getContext("2d", { willReadFrequently: true })!;
  sourceContext.drawImage(image, 0, 0, size, size);
  const pixels = sourceContext.getImageData(0, 0, size, size);

  const roughness = document.createElement("canvas");
  const bump = document.createElement("canvas");
  roughness.width = bump.width = size;
  roughness.height = bump.height = size;
  const roughContext = roughness.getContext("2d")!;
  const bumpContext = bump.getContext("2d")!;
  const roughPixels = roughContext.createImageData(size, size);
  const bumpPixels = bumpContext.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const lum =
        pixels.data[index] * 0.2126 +
        pixels.data[index + 1] * 0.7152 +
        pixels.data[index + 2] * 0.0722;
      const weave = (Math.sin(x * 1.9) + Math.sin(y * 2.15)) * 7;
      const roughValue = THREE.MathUtils.clamp(218 - lum * 0.48, 75, 226);
      const bumpValue = THREE.MathUtils.clamp(lum * 0.42 + 92 + weave, 0, 255);

      roughPixels.data[index] =
        roughPixels.data[index + 1] =
        roughPixels.data[index + 2] =
          roughValue;
      bumpPixels.data[index] =
        bumpPixels.data[index + 1] =
        bumpPixels.data[index + 2] =
          bumpValue;
      roughPixels.data[index + 3] = bumpPixels.data[index + 3] = 255;
    }
  }
  roughContext.putImageData(roughPixels, 0, 0);
  bumpContext.putImageData(bumpPixels, 0, 0);

  const roughTexture = new THREE.CanvasTexture(roughness);
  const bumpTexture = new THREE.CanvasTexture(bump);
  roughTexture.wrapS = roughTexture.wrapT = THREE.ClampToEdgeWrapping;
  bumpTexture.wrapS = bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
  return { roughTexture, bumpTexture };
}

export default function ClothPortfolio() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [ready, setReady] = useState(false);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !matchMedia("(max-width: 760px)").matches,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      return;
    }

    const isMobile =
      matchMedia("(max-width: 760px)").matches ||
      navigator.maxTouchPoints > 0 ||
      navigator.hardwareConcurrency <= 4;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.45 : 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-label", "Interactive cloth artwork");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0c0d");
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
    camera.position.set(0, 0, 7.2);

    const segmentsX = isMobile ? 34 : 58;
    const segmentsY = isMobile ? 58 : 92;
    const geometry = new THREE.PlaneGeometry(2, 2, segmentsX, segmentsY);
    const basePositions = geometry.attributes.position.array.slice();
    const velocities = new Float32Array(geometry.attributes.position.count * 3);
    const loader = new THREE.TextureLoader();
    let textureAspect = 3 / 2;
    const imageTexture = loader.load(
      backgroundUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy(),
        );
        const image = texture.image as HTMLImageElement;
        textureAspect = image.naturalWidth / image.naturalHeight;
        const maps = createMaterialMaps(image);
        material.roughnessMap = maps.roughTexture;
        material.bumpMap = maps.bumpTexture;
        material.needsUpdate = true;
        updateSizing();
        setReady(true);
      },
      undefined,
      () => setWebglError(true),
    );
    imageTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhysicalMaterial({
      map: imageTexture,
      color: "#fffaf0",
      roughness: 0.64,
      metalness: 0,
      bumpScale: isMobile ? 0.018 : 0.028,
      sheen: isMobile ? 0.18 : 0.48,
      sheenColor: new THREE.Color("#f7dfbd"),
      sheenRoughness: 0.72,
      clearcoat: isMobile ? 0.04 : 0.13,
      clearcoatRoughness: 0.74,
      side: THREE.DoubleSide,
    });

    const cloth = new THREE.Mesh(geometry, material);
    scene.add(cloth);

    scene.add(new THREE.HemisphereLight("#fff4dc", "#182a2c", 1.75));
    const key = new THREE.DirectionalLight("#fff0d1", isMobile ? 2.1 : 3.1);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight("#8bc1b8", isMobile ? 5 : 9, 12);
    rim.position.set(3.5, -2, 4);
    scene.add(rim);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-10, -10);
    const grabAnchor = new THREE.Vector3();
    let dragging = false;
    let pointerId = -1;
    let pullStrength = 0;
    let targetStrength = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let currentOffsetX = 0;
    let currentOffsetY = 0;
    let targetDepth = 0;
    let currentDepth = 0;
    let frame = 0;

    const updateSizing = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const viewportHeight =
        2 *
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) *
        camera.position.z;
      const viewportWidth = viewportHeight * camera.aspect;
      cloth.scale.set(viewportWidth * 0.54, viewportHeight * 0.54, 1);

      const planeAspect = viewportWidth / viewportHeight;
      if (planeAspect > textureAspect) {
        imageTexture.repeat.set(1, textureAspect / planeAspect);
        imageTexture.offset.set(0, (1 - imageTexture.repeat.y) / 2);
      } else {
        imageTexture.repeat.set(planeAspect / textureAspect, 1);
        imageTexture.offset.set((1 - imageTexture.repeat.x) / 2, 0);
      }
      imageTexture.needsUpdate = true;
    };

    const captureAnchor = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(cloth, false)[0];
      if (hit) {
        grabAnchor.copy(cloth.worldToLocal(hit.point.clone()));
        return true;
      }
      return false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      if (!captureAnchor(event)) return;
      dragging = true;
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      targetOffsetX = 0;
      targetOffsetY = 0;
      targetDepth = reduceMotion ? 0.08 : 0.16;
      targetStrength = 1;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add("is-dragging");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      const totalX = event.clientX - dragStartX;
      const totalY = event.clientY - dragStartY;
      const distance = Math.hypot(
        totalX / bounds.width,
        totalY / bounds.height,
      );
      targetOffsetX = THREE.MathUtils.clamp(
        (totalX / bounds.width) * 1.9,
        -0.82,
        0.82,
      );
      targetOffsetY = THREE.MathUtils.clamp(
        (-totalY / bounds.height) * 1.9,
        -0.82,
        0.82,
      );
      targetDepth = reduceMotion
        ? Math.min(0.32, 0.08 + distance * 0.8)
        : Math.min(1.65, 0.16 + Math.pow(distance, 0.72) * 3.4);
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = -1;
      targetStrength = 0;
      targetOffsetX = 0;
      targetOffsetY = 0;
      targetDepth = 0;
      renderer.domElement.classList.remove("is-dragging");
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", releasePointer);
    renderer.domElement.addEventListener("pointercancel", releasePointer);
    window.addEventListener("resize", updateSizing);
    updateSizing();

    const clock = new THREE.Clock();
    const position = geometry.attributes.position;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 1 / 30);
      const timeScale = delta * 60;
      pullStrength = THREE.MathUtils.lerp(
        pullStrength,
        targetStrength,
        dragging ? 0.12 * timeScale : 0.06 * timeScale,
      );
      currentOffsetX = THREE.MathUtils.lerp(
        currentOffsetX,
        targetOffsetX,
        (dragging ? 0.14 : 0.055) * timeScale,
      );
      currentOffsetY = THREE.MathUtils.lerp(
        currentOffsetY,
        targetOffsetY,
        (dragging ? 0.14 : 0.055) * timeScale,
      );
      currentDepth = THREE.MathUtils.lerp(
        currentDepth,
        targetDepth,
        (dragging ? 0.11 : 0.05) * timeScale,
      );

      for (let index = 0; index < position.count; index += 1) {
        const offset = index * 3;
        const baseX = basePositions[offset];
        const baseY = basePositions[offset + 1];
        const dx = baseX - grabAnchor.x;
        const dy = baseY - grabAnchor.y;
        const distanceSquared = dx * dx + dy * dy;
        const influence = Math.exp(-distanceSquared * 3.65);
        const edgeX = Math.sin(Math.PI * (baseX * 0.5 + 0.5));
        const edgeY = Math.sin(Math.PI * (baseY * 0.5 + 0.5));
        const edgePin = Math.pow(Math.max(0, edgeX * edgeY), 1.25);
        const pull = influence * edgePin * pullStrength;
        const targetX = baseX + currentOffsetX * pull * 0.82;
        const targetY = baseY + currentOffsetY * pull * 0.82;
        const targetZ = currentDepth * pull;

        const spring = 0.082 * timeScale;
        velocities[offset] +=
          (targetX - position.getX(index)) * spring;
        velocities[offset + 1] +=
          (targetY - position.getY(index)) * spring;
        velocities[offset + 2] +=
          (targetZ - position.getZ(index)) * spring;

        const damping = Math.pow(dragging ? 0.83 : 0.88, timeScale);
        velocities[offset] *= damping;
        velocities[offset + 1] *= damping;
        velocities[offset + 2] *= damping;

        position.setXYZ(
          index,
          position.getX(index) + velocities[offset] * timeScale,
          position.getY(index) + velocities[offset + 1] * timeScale,
          position.getZ(index) + velocities[offset + 2] * timeScale,
        );
      }

      position.needsUpdate = true;
      geometry.computeVertexNormals();
      cloth.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.006;
      cloth.rotation.y = Math.cos(clock.elapsedTime * 0.13) * 0.008;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSizing);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", releasePointer);
      renderer.domElement.removeEventListener("pointercancel", releasePointer);
      geometry.dispose();
      material.dispose();
      imageTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const openSection = (section: SectionKey) => {
    setActiveSection(section);
  };

  return (
    <main
      className="portfolio-shell"
      style={
        {
          "--background-image": `url("${backgroundUrl}")`,
        } as CSSProperties
      }
    >
      <div ref={canvasHost} className="cloth-stage" />
      <div className="ambient-grain" aria-hidden="true" />
      {!ready && !webglError && (
        <div className="loading-mark" aria-live="polite">
          <span />
          Preparing the surface
        </div>
      )}
      {webglError && (
        <div className="fallback-image" role="img" aria-label="Research collage" />
      )}

      <nav className="identity-card" aria-label="Portfolio">
        <h1>Zixuan Tan</h1>
        <p>Master&apos;s student at Nanjing University</p>
        <div className="nav-links">
          {(Object.keys(sectionContent) as SectionKey[]).map((key) => (
            <button key={key} type="button" onClick={() => openSection(key)}>
              {key}
            </button>
          ))}
          <a href="mailto:zixuantan@smail.nju.edu.cn">email ↗</a>
        </div>
      </nav>

      <div className="gesture-hint" aria-hidden="true">
        <span>Drag the surface</span>
        <i />
      </div>

      <aside
        className={`detail-panel ${activeSection ? "is-open" : ""}`}
        aria-hidden={!activeSection}
        aria-live="polite"
      >
        {activeSection && (
          <>
            <button
              className="close-panel"
              type="button"
              onClick={() => setActiveSection(null)}
              aria-label="Close details"
            >
              Close
            </button>
            <p className="panel-eyebrow">{sectionContent[activeSection].eyebrow}</p>
            <h2>{sectionContent[activeSection].title}</h2>
            <p className="panel-body">{sectionContent[activeSection].body}</p>
            <ul>
              {sectionContent[activeSection].meta.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {activeSection && (
        <button
          className="panel-scrim"
          type="button"
          aria-label="Close details"
          onClick={() => setActiveSection(null)}
        />
      )}
    </main>
  );
}
