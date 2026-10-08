import { useEffect, useRef, useState, type RefObject } from "react";
import teddyFallback from "@/assets/nandini/teddy3d";
import { shouldAnimateMouth, shouldScheduleGestures } from "./teddy-animation";

export type TeddyAnimationState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

type Props = {
  state: TeddyAnimationState;
  analyserRef: RefObject<AnalyserNode | null>;
};

export default function TeddyScene({ state, analyserRef }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || failed) return;

    let disposed = false;
    let cleanup = () => undefined;

    void import("three")
      .then((THREE) => {
        if (disposed || !host) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const canvas = document.createElement("canvas");
        canvas.className = "vc-teddy-canvas";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);

        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: true,
          });
        } catch {
          canvas.remove();
          setFailed(true);
          return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
        camera.position.set(0, 1.2, 7.3);
        camera.lookAt(0, 1.05, 0);

        scene.add(new THREE.HemisphereLight(0xfff5ea, 0x9b7d83, 2.35));
        const key = new THREE.DirectionalLight(0xffe8d5, 2.4);
        key.position.set(-3, 4, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffb9c8, 1.1);
        fill.position.set(3, 2, 3);
        scene.add(fill);

        const cream = new THREE.MeshStandardMaterial({
          color: 0xf4dfc7,
          roughness: 0.93,
          metalness: 0,
        });
        const muzzle = new THREE.MeshStandardMaterial({
          color: 0xffedda,
          roughness: 0.9,
          metalness: 0,
        });
        const dark = new THREE.MeshStandardMaterial({
          color: 0x3a2928,
          roughness: 0.72,
          metalness: 0,
        });
        const pink = new THREE.MeshStandardMaterial({
          color: 0xf5a4b4,
          roughness: 0.8,
          metalness: 0,
        });
        const heartMaterial = new THREE.MeshStandardMaterial({
          color: 0xe77d91,
          roughness: 0.76,
          metalness: 0,
          side: THREE.DoubleSide,
        });

        const root = new THREE.Bone();
        root.name = "TeddyRoot";
        scene.add(root);

        const torsoBone = new THREE.Bone();
        torsoBone.name = "Torso";
        torsoBone.position.y = -0.2;
        root.add(torsoBone);

        const neckBone = new THREE.Bone();
        neckBone.name = "Neck";
        neckBone.position.y = 1.25;
        torsoBone.add(neckBone);

        const headBone = new THREE.Bone();
        headBone.name = "Head";
        headBone.position.y = 0.38;
        neckBone.add(headBone);

        const jawBone = new THREE.Bone();
        jawBone.name = "Jaw";
        jawBone.position.set(0, -0.24, 0.61);
        headBone.add(jawBone);

        const leftArmBone = new THREE.Bone();
        leftArmBone.name = "Arm.L";
        leftArmBone.position.set(-0.82, 0.55, 0.02);
        torsoBone.add(leftArmBone);

        const rightArmBone = new THREE.Bone();
        rightArmBone.name = "Arm.R";
        rightArmBone.position.set(0.82, 0.55, 0.02);
        torsoBone.add(rightArmBone);

        const leftPawBone = new THREE.Bone();
        leftPawBone.name = "Paw.L";
        leftPawBone.position.set(0, -0.7, 0);
        leftArmBone.add(leftPawBone);

        const rightPawBone = new THREE.Bone();
        rightPawBone.name = "Paw.R";
        rightPawBone.position.set(0, -0.7, 0);
        rightArmBone.add(rightPawBone);

        const torso = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), cream);
        torso.name = "TorsoMesh";
        torso.scale.set(0.95, 1.18, 0.72);
        torso.position.set(0, 0.42, 0);
        torsoBone.add(torso);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.73, 20, 14), muzzle);
        belly.scale.set(0.88, 1.02, 0.3);
        belly.position.set(0, 0.3, 0.66);
        torsoBone.add(belly);

        const head = new THREE.Mesh(new THREE.SphereGeometry(1.08, 28, 20), cream);
        head.name = "HeadMesh";
        head.scale.set(1.03, 0.92, 0.88);
        headBone.add(head);

        for (const side of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 12), cream);
          ear.scale.set(1, 1, 0.65);
          ear.position.set(side * 0.78, 0.68, -0.05);
          headBone.add(ear);

          const inner = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10), pink);
          inner.scale.set(1, 1, 0.28);
          inner.position.set(side * 0.78, 0.68, 0.29);
          headBone.add(inner);
        }

        const muzzleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.54, 20, 14), muzzle);
        muzzleMesh.scale.set(1.1, 0.72, 0.5);
        muzzleMesh.position.set(0, -0.22, 0.73);
        headBone.add(muzzleMesh);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 10), dark);
        nose.scale.set(1.1, 0.7, 0.7);
        nose.position.set(0, -0.12, 1.02);
        headBone.add(nose);

        const eyeGeometry = new THREE.SphereGeometry(0.12, 14, 10);
        const eyes: InstanceType<typeof THREE.Mesh>[] = [];
        const eyelids: InstanceType<typeof THREE.Mesh>[] = [];
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(eyeGeometry, dark);
          eye.scale.set(0.82, 1.08, 0.55);
          eye.position.set(side * 0.4, 0.2, 0.86);
          headBone.add(eye);
          eyes.push(eye);

          const lid = new THREE.Mesh(new THREE.SphereGeometry(0.132, 14, 10), cream);
          lid.scale.set(0.9, 0.08, 0.6);
          lid.position.set(side * 0.4, 0.3, 0.9);
          headBone.add(lid);
          eyelids.push(lid);

          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), pink);
          cheek.scale.set(1.25, 0.58, 0.3);
          cheek.position.set(side * 0.53, -0.23, 0.88);
          headBone.add(cheek);
        }

        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), dark);
        mouth.name = "MouthOpen";
        mouth.scale.set(0.85, 0.12, 0.35);
        mouth.position.set(0, -0.03, 0.19);
        jawBone.add(mouth);

        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), muzzle);
        jaw.name = "JawMesh";
        jaw.scale.set(1.05, 0.42, 0.48);
        jaw.position.set(0, -0.06, 0.02);
        jawBone.add(jaw);

        const mouthCornerGeometry = new THREE.SphereGeometry(0.045, 10, 8);
        const mouthCorners: InstanceType<typeof THREE.Mesh>[] = [];
        for (const side of [-1, 1]) {
          const corner = new THREE.Mesh(mouthCornerGeometry, dark);
          corner.position.set(side * 0.17, -0.31, 0.96);
          headBone.add(corner);
          mouthCorners.push(corner);
        }

        const armGeometry = new THREE.SphereGeometry(0.47, 18, 14);
        const leftArm = new THREE.Mesh(armGeometry, cream);
        leftArm.scale.set(0.68, 1.38, 0.68);
        leftArm.position.set(0, -0.38, 0.02);
        leftArmBone.add(leftArm);
        const rightArm = leftArm.clone();
        rightArmBone.add(rightArm);

        const pawGeometry = new THREE.SphereGeometry(0.42, 18, 14);
        const leftPaw = new THREE.Mesh(pawGeometry, cream);
        leftPaw.scale.set(0.9, 0.75, 0.72);
        leftPawBone.add(leftPaw);
        const rightPaw = leftPaw.clone();
        rightPawBone.add(rightPaw);

        const heartShape = new THREE.Shape();
        heartShape.moveTo(0, -0.22);
        heartShape.bezierCurveTo(-0.5, -0.55, -0.72, -0.05, -0.42, 0.18);
        heartShape.bezierCurveTo(-0.2, 0.36, 0, 0.18, 0, 0.02);
        heartShape.bezierCurveTo(0, 0.18, 0.2, 0.36, 0.42, 0.18);
        heartShape.bezierCurveTo(0.72, -0.05, 0.5, -0.55, 0, -0.22);
        const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape, 12), heartMaterial);
        heart.scale.setScalar(0.32);
        heart.position.set(0.44, 0.42, 0.79);
        heart.rotation.z = -0.16;
        torsoBone.add(heart);

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1.22, 32),
          new THREE.MeshBasicMaterial({ color: 0x9a6570, transparent: true, opacity: 0.13 }),
        );
        shadow.scale.set(1, 0.28, 1);
        shadow.position.set(0, -1.48, -0.2);
        shadow.rotation.x = -Math.PI / 2;
        scene.add(shadow);

        root.position.y = -0.22;

        const clock = new THREE.Clock();
        const amplitude = new Uint8Array(64);
        let blinkAt = 2.4;
        let gestureIndex = 0;
        let gestureStart = -10;
        let lastState = stateRef.current;
        let speakingStartedAt = 0;
        let errorStartedAt = 0;
        let hidden = document.hidden;

        const damp = (current: number, target: number, lambda: number, dt: number) =>
          THREE.MathUtils.damp(current, target, lambda, dt);

        const resetPose = (dt: number) => {
          torsoBone.rotation.x = damp(torsoBone.rotation.x, 0, 6, dt);
          torsoBone.rotation.z = damp(torsoBone.rotation.z, 0, 6, dt);
          leftArmBone.rotation.x = damp(leftArmBone.rotation.x, 0.08, 5, dt);
          leftArmBone.rotation.z = damp(leftArmBone.rotation.z, -0.3, 5, dt);
          rightArmBone.rotation.x = damp(rightArmBone.rotation.x, 0.08, 5, dt);
          rightArmBone.rotation.z = damp(rightArmBone.rotation.z, 0.3, 5, dt);
          leftPawBone.rotation.z = damp(leftPawBone.rotation.z, 0, 7, dt);
          rightPawBone.rotation.z = damp(rightPawBone.rotation.z, 0, 7, dt);
        };

        const animate = () => {
          if (hidden || disposed) return;
          const dt = Math.min(clock.getDelta(), 0.05);
          const t = clock.elapsedTime;
          const current = stateRef.current;

          if (current !== lastState) {
            if (current === "speaking") {
              speakingStartedAt = t;
              gestureStart = t + 0.7;
              gestureIndex = 0;
            }
            if (current === "error") errorStartedAt = t;
            lastState = current;
          }

          const breath = reducedMotion ? 0 : Math.sin(t * 1.65) * 0.018;
          torso.scale.y = 1 + breath;
          resetPose(dt);

          let headX = 0;
          let headY = 0;
          let headZ = reducedMotion ? 0 : Math.sin(t * 0.55) * 0.018;

          if (current === "listening") {
            headX = 0.06;
            headZ += -0.075;
            torsoBone.rotation.x = damp(torsoBone.rotation.x, -0.035, 4, dt);
          } else if (current === "thinking" || current === "connecting") {
            headY = reducedMotion ? 0 : Math.sin(t * 1.1) * 0.08;
            headZ += -0.045;
          } else if (current === "error") {
            const p = Math.min(1, (t - errorStartedAt) / 0.65);
            headZ += reducedMotion ? -0.05 : Math.sin(p * Math.PI * 3) * 0.055 * (1 - p);
          } else if (current === "speaking") {
            headX = reducedMotion ? 0 : Math.sin((t - speakingStartedAt) * 2.2) * 0.025;
            headY = reducedMotion ? 0 : Math.sin((t - speakingStartedAt) * 1.35) * 0.04;

            const gestureAge = t - gestureStart;
            if (shouldScheduleGestures(current, reducedMotion) && gestureAge >= 0 && gestureAge < 1.45) {
              const phase = Math.sin(Math.min(1, gestureAge / 1.45) * Math.PI);
              if (gestureIndex % 2 === 0) {
                rightArmBone.rotation.x += phase * 0.48;
                rightArmBone.rotation.z -= phase * 0.34;
                rightPawBone.rotation.z -= phase * 0.22;
              } else {
                leftArmBone.rotation.x += phase * 0.32;
                leftArmBone.rotation.z += phase * 0.22;
                headZ += phase * 0.025;
              }
            } else if (shouldScheduleGestures(current, reducedMotion) && gestureAge >= 4.4) {
              gestureIndex += 1;
              gestureStart = t;
            }
          }

          headBone.rotation.x = damp(headBone.rotation.x, headX, 7, dt);
          headBone.rotation.y = damp(headBone.rotation.y, headY, 7, dt);
          headBone.rotation.z = damp(headBone.rotation.z, headZ, 7, dt);

          let jawTarget = 0;
          if (shouldAnimateMouth(current, reducedMotion)) {
            const analyser = analyserRef.current;
            if (analyser) {
              analyser.getByteFrequencyData(amplitude);
              let sum = 0;
              for (let i = 2; i < 28; i += 1) sum += amplitude[i] ?? 0;
              const level = sum / 26 / 255;
              jawTarget = THREE.MathUtils.clamp((level - 0.035) * 1.9, 0, 0.42);
            }
          }
          jawBone.rotation.x = damp(jawBone.rotation.x, jawTarget, 15, dt);
          mouth.scale.y = damp(mouth.scale.y, 0.12 + jawTarget * 1.6, 14, dt);

          const smiling = current === "speaking" ? 1 : 0;
          mouthCorners[0]!.position.y = damp(mouthCorners[0]!.position.y, -0.31 + smiling * 0.035, 6, dt);
          mouthCorners[1]!.position.y = damp(mouthCorners[1]!.position.y, -0.31 + smiling * 0.035, 6, dt);

          if (!reducedMotion && t > blinkAt) {
            blinkAt = t + 3.2 + ((Math.sin(t * 2.17) + 1) * 0.5) * 2.8;
          }
          const blinkPhase = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(t - (blinkAt - 0.12)) / 0.12);
          const lidScale = 0.08 + blinkPhase * 0.95;
          eyelids.forEach((lid) => {
            lid.scale.y = lidScale;
            lid.position.y = 0.3 - blinkPhase * 0.1;
          });
          eyes.forEach((eye) => {
            eye.scale.y = 1.08 - blinkPhase * 0.85;
          });

          renderer.render(scene, camera);
        };

        const resize = () => {
          const rect = host.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          renderer.setSize(rect.width, rect.height, false);
          camera.aspect = rect.width / rect.height;
          camera.updateProjectionMatrix();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        const onVisibility = () => {
          hidden = document.hidden;
          if (!hidden) clock.getDelta();
        };
        document.addEventListener("visibilitychange", onVisibility);

        const onContextLost = (event: Event) => {
          event.preventDefault();
          setFailed(true);
        };
        canvas.addEventListener("webglcontextlost", onContextLost);

        renderer.setAnimationLoop(animate);

        cleanup = () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", onVisibility);
          canvas.removeEventListener("webglcontextlost", onContextLost);
          renderer.setAnimationLoop(null);
          scene.traverse((object) => {
            const mesh = object as InstanceType<typeof THREE.Mesh>;
            mesh.geometry?.dispose?.();
            const material = mesh.material;
            if (Array.isArray(material)) material.forEach((item) => item.dispose());
            else material?.dispose?.();
          });
          renderer.dispose();
          canvas.remove();
        };
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [analyserRef, failed]);

  return (
    <div className="vc-teddy-renderer" ref={hostRef} data-renderer={failed ? "fallback" : "three"}>
      {failed ? (
        <img className="vc-teddy-renderer-fallback" src={teddyFallback} alt="" draggable={false} />
      ) : (
        <span className="vc-teddy-loading" aria-hidden="true">♡</span>
      )}
    </div>
  );
}
