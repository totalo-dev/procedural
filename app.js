/* ==========================================================================
   OUSMANE DEMBÉLÉ - INTERACTIVE 3D PARTICLE GLOBE (app.js)
   ========================================================================== */

// --- Objeto de Configuração do Sistema (Inspirado no Motor Original) ---
const CONFIG = {
    CAMERA_FOV: 45,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    CAMERA_INITIAL_Z: 8.5,
    CAMERA_ZOOM_DISTANCE: 5.5,
    
    SPHERE_RADIUS: 2.2,
    SPHERE_Y_OFFSET: 0.1,
    
    PARTICLES_COUNT: 10000,
    PARTICLES_COLOR: 0xcccccc,       // Cor base platinada/cinza premium
    PARTICLES_OPACITY: 0.75,
    PARTICLES_SHININESS: 100,
    
    PARTICLES_SIZE_MIN: 0.02,
    PARTICLES_SIZE_MAX: 0.05,
    PARTICLES_APPEAR_DELAY_MAX: 2.5,  // Tempo máximo para início da montagem de cada partícula
    PARTICLES_FLOAT_AMPLITUDE: 0.08,
    PARTICLES_FLOAT_SPEED: 0.002,
    ANIMATION_DURATION: 2.0,          // Duração da montagem individual (em segundos)
    
    LIGHT_AMBIENT_INTENSITY: 1.4,
    LIGHT_DIRECTIONAL_INTENSITY: 1.0,
    LIGHT_DIRECTIONAL_POSITION: { x: 5, y: 8, z: 5 },
    
    ROTATION_SENSITIVITY: 0.0025,
    ROTATION_SMOOTHNESS: 0.08,
    AUTO_ROTATION_SPEED: 0.003,
    
    EXPLOSION_DISTANCE: 4.5,
    EXPLOSION_ROTATION_SPEED: 1.8,
    
    SHINE_COLOR: 0xFFF300,            // Amarelo Ouro Ballon d'Or
    SHINE_RADIUS: 1.5,
    SHINE_INTENSITY: 2.0,
    
    REPULSION_RADIUS: 1.2,
    REPULSION_STRENGTH: 1.2,
    REPULSION_RETURN_SPEED: 0.08,
    REPULSION_LERP_SPEED: 0.1
};

class ParticleBallon {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.initProperties();
        this.initWebGL();
        this.createSphereCollider();
        this.createParticleSystem();
        this.setupLights();
        this.setupEvents();
        this.animate();
        
        // Easing de entrada do painel UI usando GSAP
        this.triggerUIIntro();
    }

    initProperties() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Colisor e Raycaster
        this.sphereCollider = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-9999, -9999); // Inicia fora da tela
        this.mouseIntersectionPoint = new THREE.Vector3();
        this.hasMouseIntersection = false;
        
        // Estados e Animações
        this.startTime = Date.now();
        this.particles = null;
        this.particleData = [];
        
        // Lógica de Arrasto e Rotação
        this.isMouseDown = false;
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Parâmetros Dinâmicos (Controlados pela UI/Scroll)
        this.explosionProgress = 0.0;
        this.targetExplosionProgress = 0.0;
        this.repulsionRadius = CONFIG.REPULSION_RADIUS;
        this.autoRotate = true;
        
        // Cores auxiliares para otimizar alocação de memória no loop
        this.baseColorObj = new THREE.Color(CONFIG.PARTICLES_COLOR);
        this.shineColorObj = new THREE.Color(CONFIG.SHINE_COLOR);
        this.tempColor = new THREE.Color();
        this.tempMatrix = new THREE.Matrix4();
        this.tempPosition = new THREE.Vector3();
        this.tempRotation = new THREE.Euler();
        this.tempQuaternion = new THREE.Quaternion();
        this.tempScale = new THREE.Vector3();
    }

    initWebGL() {
        // 1. Criar Cena
        this.scene = new THREE.Scene();

        // 2. Criar Câmera Perspectiva
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA_NEAR,
            CONFIG.CAMERA_FAR
        );
        this.camera.position.z = CONFIG.CAMERA_INITIAL_Z;

        // 3. Criar Renderizador
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Fade in suave do canvas
        this.canvas.style.opacity = 0;
        setTimeout(() => {
            this.canvas.style.transition = "opacity 2.0s cubic-bezier(0.16, 1, 0.3, 1)";
            this.canvas.style.opacity = 1;
        }, 100);
    }

    createSphereCollider() {
        // Cria uma esfera matemática invisível que servirá como colisor tridimensional
        const geometry = new THREE.SphereGeometry(CONFIG.SPHERE_RADIUS, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        this.sphereCollider = new THREE.Mesh(geometry, material);
        this.sphereCollider.position.y = CONFIG.SPHERE_Y_OFFSET;
        this.scene.add(this.sphereCollider);
    }

    createParticleSystem() {
        const count = CONFIG.PARTICLES_COUNT;
        
        // Utiliza planos simples 2D com lados duplos para maior velocidade
        const geometry = new THREE.PlaneGeometry(1, 1);
        
        // Material Phong altamente reativo a luzes diretas com especularidade dourada
        const material = new THREE.MeshPhongMaterial({
            color: CONFIG.PARTICLES_COLOR,
            transparent: true,
            opacity: CONFIG.PARTICLES_OPACITY,
            depthTest: true,
            depthWrite: false, // Evita clipping visual mantendo o brilho volumétrico
            side: THREE.DoubleSide,
            shininess: CONFIG.PARTICLES_SHININESS,
            specular: CONFIG.PARTICLES_COLOR
        });

        this.particles = new THREE.InstancedMesh(geometry, material, count);
        
        // Inicializa as cores das instâncias chamando setColorAt para que o Three.js gerencie o buffer automaticamente
        for(let i = 0; i < count; i++) {
            this.particles.setColorAt(i, this.baseColorObj);
        }
        
        // --- Distribuição Fibonacci Sphere para 10.000 partículas ---
        const indices = Array.from({length: count}, (_, k) => k);
        // Embaralha os índices para remover o seam (linha de ordenação alpha)
        for (let i = count - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        for (let loopIdx = 0; loopIdx < count; loopIdx++) {
            let i = indices[loopIdx];
            // Algoritmo matemático Fibonacci para distribuir uniformemente
            const phi = Math.acos(1 - 2 * i / count);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            
            // Posição final na superfície da esfera dourada
            const targetX = CONFIG.SPHERE_RADIUS * Math.cos(theta) * Math.sin(phi);
            const targetY = CONFIG.SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi) + CONFIG.SPHERE_Y_OFFSET;
            const targetZ = CONFIG.SPHERE_RADIUS * Math.cos(phi);
            
            const originalPosition = new THREE.Vector3(targetX, targetY, targetZ);
            
            // Vetor Normal da partícula (aponta do centro do globo para fora)
            const normal = new THREE.Vector3().copy(originalPosition);
            normal.y -= CONFIG.SPHERE_Y_OFFSET; // Ajusta offset
            normal.normalize();
            
            // Posição inicial explosiva no espaço (efeito de montagem)
            // As partículas voam de longe (raio de 12 a 18) em direção ao globo
            const flyDist = 12 + Math.random() * 8;
            const startPosition = new THREE.Vector3()
                .copy(normal)
                .multiplyScalar(flyDist)
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 6 + CONFIG.SPHERE_Y_OFFSET,
                    (Math.random() - 0.5) * 6
                ));

            // Tamanho individual da partícula
            const scale = CONFIG.PARTICLES_SIZE_MIN + Math.random() * (CONFIG.PARTICLES_SIZE_MAX - CONFIG.PARTICLES_SIZE_MIN);
            
            this.particleData.push({
                startPosition: startPosition,
                originalPosition: originalPosition,
                currentPosition: startPosition.clone(),
                velocity: new THREE.Vector3(0, 0, 0),
                normal: normal,
                scale: scale,
                appearDelay: Math.random() * CONFIG.PARTICLES_APPEAR_DELAY_MAX,
                animationOffset: Math.random() * 50,
                currentBrightness: 0.0
            });
            
            // Configurar matriz inicial
            this.tempPosition.copy(startPosition);
            this.tempScale.set(scale, scale, 1);
            this.tempQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
            this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
            this.particles.setMatrixAt(i, this.tempMatrix);
        }
        
        if (this.particles.instanceColor) {
            this.particles.instanceColor.needsUpdate = true;
        }
        
        this.scene.add(this.particles);
    }

    setupLights() {
        // Luz ambiente difusa
        const ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.LIGHT_AMBIENT_INTENSITY);
        this.scene.add(ambientLight);

        // Luz direcional para destacar o relevo tridimensional e reflexos metálicos
        const dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.LIGHT_DIRECTIONAL_INTENSITY);
        dirLight.position.set(
            CONFIG.LIGHT_DIRECTIONAL_POSITION.x,
            CONFIG.LIGHT_DIRECTIONAL_POSITION.y,
            CONFIG.LIGHT_DIRECTIONAL_POSITION.z
        );
        this.scene.add(dirLight);
    }

    setupEvents() {
        // Eventos de Mouse e Interatividade
        window.addEventListener("resize", () => this.onResize());
        window.addEventListener("mousemove", (e) => this.onMouseMove(e), { passive: true });
        window.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: true });
        
        // Arrasto / Rotação manual
        this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
        window.addEventListener("mouseup", () => this.onMouseUp());
        
        // Lógica de Scroll integrada com GSAP para dispersão física do globo
        window.addEventListener("wheel", (e) => this.onWheel(e), { passive: true });

        // Conectar elementos da UI
        this.setupUIControls();
    }

    setupUIControls() {
        const explosionSlider = document.getElementById("explosion-slider");
        const repulsionSlider = document.getElementById("repulsion-slider");
        const btnExplode = document.getElementById("btn-explode");
        const btnReset = document.getElementById("btn-reset");
        const autoRotateCheck = document.getElementById("auto-rotate-check");

        if (explosionSlider) {
            explosionSlider.addEventListener("input", (e) => {
                this.targetExplosionProgress = parseFloat(e.target.value);
            });
        }

        if (repulsionSlider) {
            repulsionSlider.addEventListener("input", (e) => {
                this.repulsionRadius = parseFloat(e.target.value);
            });
        }

        if (btnExplode) {
            btnExplode.addEventListener("click", () => {
                this.targetExplosionProgress = 1.0;
                if (explosionSlider) explosionSlider.value = 1.0;
            });
        }

        if (btnReset) {
            btnReset.addEventListener("click", () => {
                this.targetExplosionProgress = 0.0;
                if (explosionSlider) explosionSlider.value = 0.0;
                
                // Reinicia a montagem fly-in disparando uma nova contagem de tempo
                this.startTime = Date.now();
                this.particleData.forEach(p => {
                    p.currentPosition.copy(p.startPosition);
                    p.velocity.set(0,0,0);
                });
                
                // Zoom dinâmico de câmera
                this.camera.position.z = CONFIG.CAMERA_INITIAL_Z * 1.5;
                gsap.to(this.camera.position, {
                    z: CONFIG.CAMERA_INITIAL_Z,
                    duration: 2.5,
                    ease: "power3.out"
                });
            });
        }

        if (autoRotateCheck) {
            autoRotateCheck.addEventListener("change", (e) => {
                this.autoRotate = e.target.checked;
            });
        }
    }

    triggerUIIntro() {
        // Efeito de fade-in glassmorphism refinado nos painéis
        gsap.fromTo(".metrics-panel", 
            { opacity: 0, x: -60 }, 
            { opacity: 1, x: 0, duration: 1.5, ease: "power4.out", delay: 0.5 }
        );
        gsap.fromTo(".controls-panel", 
            { opacity: 0, x: 60 }, 
            { opacity: 1, x: 0, duration: 1.5, ease: "power4.out", delay: 0.7 }
        );
        gsap.fromTo(".app-header", 
            { opacity: 0, y: -40 }, 
            { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 0.2 }
        );
        gsap.fromTo(".app-footer", 
            { opacity: 0, y: 30 }, 
            { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 1.0 }
        );
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        if (this.isMouseDown) {
            const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;
            this.targetRotationY += deltaX * CONFIG.ROTATION_SENSITIVITY;
            this.targetRotationX += deltaY * CONFIG.ROTATION_SENSITIVITY;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        }
    }

    onTouchMove(e) {
        if (e.touches.length > 0) {
            this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }

    onMouseDown(e) {
        this.isMouseDown = true;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    onMouseUp() {
        this.isMouseDown = false;
    }

    onWheel(e) {
        // Converte movimentos da roda do mouse em progresso de explosão de forma suave
        const delta = e.deltaY * 0.0015;
        this.targetExplosionProgress = Math.max(0.0, Math.min(1.0, this.targetExplosionProgress + delta));
        
        // Atualiza o slider UI para sincronizar
        const explosionSlider = document.getElementById("explosion-slider");
        if (explosionSlider) {
            explosionSlider.value = this.targetExplosionProgress;
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsedTime = (Date.now() - this.startTime) / 1000;
        
        // --- 1. Lógica de Raycasting tridimensional ---
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersections = this.raycaster.intersectObject(this.sphereCollider);
        
        if (intersections.length > 0) {
            this.hasMouseIntersection = true;
            this.mouseIntersectionPoint.copy(intersections[0].point);
        } else {
            this.hasMouseIntersection = false;
        }

        // --- 2. Interpolação suave para a explosão e câmera ---
        this.explosionProgress += (this.targetExplosionProgress - this.explosionProgress) * 0.08;
        
        // Afasta suavemente a câmera caso o globo esteja explodindo
        this.camera.position.z = CONFIG.CAMERA_INITIAL_Z + (this.explosionProgress * CONFIG.CAMERA_ZOOM_DISTANCE);
        
        // Aplica opacidade gradiente no material base baseado na explosão
        this.particles.material.opacity = CONFIG.PARTICLES_OPACITY * (1.0 - this.explosionProgress * 0.85);

        // --- 3. Controle de Rotação Manual & Automática (Inércia) ---
        if (this.autoRotate && !this.isMouseDown) {
            this.targetRotationY += CONFIG.AUTO_ROTATION_SPEED;
        }
        
        // Limita a rotação vertical (X) para evitar virar de ponta cabeça
        this.targetRotationX = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, this.targetRotationX));
        
        this.rotationY += (this.targetRotationY - this.rotationY) * CONFIG.ROTATION_SMOOTHNESS;
        this.rotationX += (this.targetRotationX - this.rotationX) * CONFIG.ROTATION_SMOOTHNESS;
        
        this.particles.rotation.y = this.rotationY;
        this.particles.rotation.x = this.rotationX;
        this.sphereCollider.rotation.y = this.rotationY;
        this.sphereCollider.rotation.x = this.rotationX;

        // --- 4. Atualização Física das Instâncias (CPU/GPU pipeline) ---
        const count = CONFIG.PARTICLES_COUNT;
        
        // Otimização de Performance: pré-calcula a transformação inversa do ponto do mouse
        // fora do loop de 10.000 partículas. Isso reduz alocações e inversões de matrizes de 10.000 para apenas 1 por frame!
        let localMousePoint = null;
        if (this.hasMouseIntersection && this.particles) {
            const inverseMatrix = new THREE.Matrix4().copy(this.particles.matrixWorld).invert();
            localMousePoint = this.mouseIntersectionPoint.clone().applyMatrix4(inverseMatrix);
        }

        for (let i = 0; i < count; i++) {
            const data = this.particleData[i];
            
            // 4a. Efeito de Montagem Mágica (Fly-in)
            const t = Math.max(0, elapsedTime - data.appearDelay);
            const rawProgress = Math.min(1.0, t / CONFIG.ANIMATION_DURATION);
            const assembleProgress = this.easeInOutCubic(rawProgress);
            
            // Posição flutuante sem forças aplicadas
            const idleOffset = Math.sin(elapsedTime * 1000 * CONFIG.PARTICLES_FLOAT_SPEED + data.animationOffset) * CONFIG.PARTICLES_FLOAT_AMPLITUDE;
            
            const targetPos = new THREE.Vector3()
                .copy(data.originalPosition)
                .addScaledVector(data.normal, idleOffset);

            // Interpolação vetorial entre a posição externa caótica e a posição montada na casca
            data.currentPosition.lerpVectors(data.startPosition, targetPos, assembleProgress);

            // 4b. Repulsão do cursor
            if (localMousePoint && assembleProgress >= 0.95 && this.explosionProgress < 0.1) {
                const dist = data.currentPosition.distanceTo(localMousePoint);
                
                if (dist < this.repulsionRadius) {
                    const repulsionVec = new THREE.Vector3()
                        .copy(data.currentPosition)
                        .sub(localMousePoint);
                    
                    repulsionVec.y *= 0.5; // Achata levemente a distorção vertical para estética
                    repulsionVec.normalize();
                    
                    // Intensidade inversamente proporcional à distância
                    const force = (1.0 - dist / this.repulsionRadius) * CONFIG.REPULSION_STRENGTH;
                    
                    data.velocity.addScaledVector(repulsionVec, force * 0.08);
                    
                    // Acumula intensidade do spotlight
                    data.currentBrightness += (force - data.currentBrightness) * 0.15;
                } else {
                    data.currentBrightness += (0.0 - data.currentBrightness) * 0.08;
                }
            } else {
                data.currentBrightness += (0.0 - data.currentBrightness) * 0.08;
            }

            // Aplica amortecimento e atualiza a posição local
            data.velocity.multiplyScalar(0.92);
            data.currentPosition.add(data.velocity);

            // Puxa elástico das partículas de volta à geometria do globo
            const originalLocalTarget = targetPos.clone();
            data.currentPosition.lerp(originalLocalTarget, CONFIG.REPULSION_RETURN_SPEED);

            // 4c. Aplicação da Explosão Radial (Dispersão)
            const finalRenderPos = data.currentPosition.clone();
            
            if (this.explosionProgress > 0.001) {
                const explodeDistance = this.explosionProgress * CONFIG.EXPLOSION_DISTANCE;
                finalRenderPos.addScaledVector(data.normal, explodeDistance);
            }

            // 4d. Spotlight Dourado (Atualização dinâmica do array de cores)
            if (data.currentBrightness > 0.01) {
                this.tempColor.copy(this.baseColorObj).lerp(this.shineColorObj, data.currentBrightness * CONFIG.SHINE_INTENSITY);
                this.particles.setColorAt(i, this.tempColor);
            } else {
                this.particles.setColorAt(i, this.baseColorObj);
            }

            // 4e. Computar a matriz de transformação da instância
            this.tempPosition.copy(finalRenderPos);
            
            // Assegura que as partículas fiquem orientadas para a câmera (billboarding falso para volume)
            // e adiciona rotações caóticas durante a explosão
            const baseRotX = -this.rotationX;
            const baseRotY = -this.rotationY;
            const baseRotZ = Math.sin(elapsedTime * 2 + data.animationOffset) * 0.2;
            
            const explodeRot = this.explosionProgress * CONFIG.EXPLOSION_ROTATION_SPEED;
            this.tempRotation.set(
                baseRotX + (data.normal.y * explodeRot),
                baseRotY + (data.normal.x * explodeRot),
                baseRotZ + (data.normal.z * explodeRot)
            );
            this.tempQuaternion.setFromEuler(this.tempRotation);
            
            this.tempScale.set(data.scale, data.scale, 1.0);
            
            this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
            this.particles.setMatrixAt(i, this.tempMatrix);
        }

        // Notifica a GPU sobre as alterações feitas nas matrizes das instâncias neste quadro
        this.particles.instanceMatrix.needsUpdate = true;
        
        // Notifica a GPU sobre as alterações de cores nas instâncias (Otimização: chamada única por frame)
        if (this.particles.instanceColor) {
            this.particles.instanceColor.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// --- Inicialização Automática após carregamento do DOM ---
document.addEventListener("DOMContentLoaded", () => {
    const app = new ParticleBallon("ballon-load");
});
