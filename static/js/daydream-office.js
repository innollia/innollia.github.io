/**
 * ============================================================================
 * [ 백일몽 주식회사 - 3D 낡은 사무실 및 어둠(F) 탐사 환경 ]
 * ============================================================================
 * Three.js 및 PointerLockControls를 기반으로 구현된 1인칭 3D 가상 공간입니다.
 * 웹소설 <괴담에 떨어져도 출근을 해야 하는구나>의 백일몽 주식회사 사무실 및
 * 문 밖의 오염된 황금색 액체가 터진 복도를 고증하여 렌더링합니다.
 * ============================================================================
 */

let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let dustParticles;
let isOfficeInitialized = false;

/**
 * 3D 사무실 공간을 초기화하고 렌더링을 시작합니다.
 * @param {string} containerId - 3D 캔버스가 들어갈 HTML 요소 ID
 * @param {string} blockerId - 포인터 락 오버레이(가림막) HTML 요소 ID
 */
function initDaydreamOffice(containerId = 'threejs-canvas-container', blockerId = 'blocker') {
    if (isOfficeInitialized) return;
    isOfficeInitialized = true;

    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    /* 1. 씬(Scene) 및 카메라(Camera) 설정 */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010101);
    scene.fog = new THREE.FogExp2(0x010101, 0.2); // 음산한 안개 효과

    camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 3); // 플레이어 눈높이(1.6m) 및 초기 위치

    /* 2. 렌더러(Renderer) 설정 */
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* 3. 1인칭 컨트롤러 (PointerLockControls) */
    controls = new THREE.PointerLockControls(camera, document.body);
    const blocker = document.getElementById(blockerId);
    if (blocker) {
        blocker.addEventListener('click', () => {
            controls.lock();
        });
        controls.addEventListener('lock', () => {
            blocker.style.display = 'none';
            const crosshair = document.getElementById('crosshair');
            if (crosshair) crosshair.style.display = 'block';
        });
        controls.addEventListener('unlock', () => {
            blocker.style.display = 'flex';
            const crosshair = document.getElementById('crosshair');
            if (crosshair) crosshair.style.display = 'none';
        });
    }
    scene.add(controls.getObject());

    /* 키보드 이동 이벤트 바인딩 */
    const onKeyDown = (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    /* 4. 조명(Lights) 구성 */
    // 아주 미세한 어두운 환경광
    const ambientLight = new THREE.AmbientLight(0x080808);
    scene.add(ambientLight);

    // 카메라에 부착된 탐사 손전등 (SpotLight)
    const flashlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.5, 1);
    flashlight.castShadow = true;
    camera.add(flashlight);
    flashlight.position.set(0, 0, 0);
    flashlight.target = new THREE.Object3D();
    camera.add(flashlight.target);
    flashlight.target.position.set(0, 0, -1);

    // 문 틈새에서 새어 들어오는 노르스름한 불빛 (PointLight)
    const doorLight = new THREE.PointLight(0xffcc44, 2.5, 6);
    doorLight.position.set(0, 1.5, -5.2);
    scene.add(doorLight);

    /* 5. 사무실 방 구조 생성 (벽면, 바닥, 천장) */
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.9 });

    // 바닥 (10x10)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 천장 (10x10)
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.0;
    scene.add(ceiling);

    // 뒷벽, 좌우 벽체
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), wallMat);
    backWall.position.set(0, 1.5, 5);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), wallMat);
    leftWall.position.set(-5, 1.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), wallMat);
    rightWall.position.set(5, 1.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // 문이 위치한 앞벽 (좌, 우, 상부 분할 생성하여 문 틈 공간 확보)
    const frontWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 3), wallMat);
    frontWallLeft.position.set(-2.85, 1.5, -5);
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 3), wallMat);
    frontWallRight.position.set(2.85, 1.5, -5);
    scene.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), wallMat);
    frontWallTop.position.set(0, 2.6, -5);
    scene.add(frontWallTop);

    /* 6. 살짝 열린 문 (Door) */
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1f1a15, roughness: 0.8 })
    );
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-0.7, 1.1, -5); // 왼쪽 힌지 축 기준
    doorFrame.position.set(0.7, 0, 0);
    doorGroup.add(doorFrame);
    doorGroup.rotation.y = 0.6; // 살짝 열린 틈새 연출
    scene.add(doorGroup);

    /* 7. 낡은 사무실 가구 및 기물 배치 */
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 0.8 });

    // 책상 (Desk)
    const deskGroup = new THREE.Group();
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.0), woodMat);
    deskTop.position.y = 0.75;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    [[-0.9, 0.375, -0.4], [0.9, 0.375, -0.4], [-0.9, 0.375, 0.4], [0.9, 0.375, 0.4]].forEach(p => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(p[0], p[1], p[2]);
        leg.castShadow = true;
        deskGroup.add(leg);
    });
    deskGroup.position.set(-2, 0, 1.5);
    deskGroup.rotation.y = 0.15;
    scene.add(deskGroup);

    // 책상 위의 기밀 문서 종이 (Paper)
    const paperGeo = new THREE.PlaneGeometry(0.4, 0.5);
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffee, roughness: 0.5, side: THREE.DoubleSide });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.set(0, 0.79, 0); // 책상 중심 위
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.25;
    paper.name = "anomaly_paper";
    deskGroup.add(paper);

    // 종이 위에 붉은 글씨 문양 연출
    const textGeo = new THREE.PlaneGeometry(0.3, 0.025);
    const textMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
    for (let i = 0; i < 7; i++) {
        const line = new THREE.Mesh(textGeo, textMat);
        line.position.set(0, (i - 3) * 0.06, 0.005);
        paper.add(line);
    }

    // 종이 위치 하이라이트 조명
    const paperLight = new THREE.PointLight(0xff2222, 2.0, 3);
    paperLight.position.set(-2.0, 1.3, 1.5);
    scene.add(paperLight);

    // 종이 클릭 및 찢기 이벤트 처리
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPaperClick = (event) => {
        if (!isOfficeInitialized || !scene || !camera) return;
        
        if (controls && controls.isLocked) {
            mouse.set(0, 0);
        } else {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            if ((obj.name === "anomaly_paper" || obj.parent === paper || obj.parent === deskGroup || obj === deskGroup.children[0]) && intersects[i].distance < 4.5) {
                tearPaperSequence(paper, paperLight);
                break;
            }
        }
    };
    document.addEventListener('click', onPaperClick);

    function tearPaperSequence(paperMesh, lightObj) {
        if (window.isPaperTearing) return;
        window.isPaperTearing = true;

        // 1. Web Audio API로 종이 찢는 소리 재생
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (ctx.state === 'suspended') ctx.resume();
                
                const bufferSize = ctx.sampleRate * 0.45;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.18));
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1600;
                filter.Q.value = 2.5;
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(1.8, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start();
            } catch(e) { console.error(e); }
        }

        // 2. 종이가 반으로 찢어져 날아가는 애니메이션
        if (paperMesh && paperMesh.parent) {
            paperMesh.visible = false;
            
            const leftPiece = paperMesh.clone();
            const rightPiece = paperMesh.clone();
            leftPiece.visible = true;
            rightPiece.visible = true;
            leftPiece.scale.set(0.5, 1, 1);
            rightPiece.scale.set(0.5, 1, 1);
            leftPiece.position.x -= 0.1;
            rightPiece.position.x += 0.1;
            paperMesh.parent.add(leftPiece, rightPiece);

            let startTime = performance.now();
            const animTear = () => {
                let elapsed = (performance.now() - startTime) / 1000;
                if (elapsed < 1.2) {
                    leftPiece.position.x -= 0.025;
                    leftPiece.position.y += 0.015;
                    leftPiece.rotation.z += 0.08;
                    
                    rightPiece.position.x += 0.025;
                    rightPiece.position.y += 0.015;
                    rightPiece.rotation.z -= 0.08;
                    
                    if (lightObj) lightObj.intensity = Math.max(0, (1.0 - elapsed) * 2);
                    requestAnimationFrame(animTear);
                } else {
                    window.isPaperTearing = false;
                    if (typeof window.returnFromAnomaly === 'function') {
                        window.returnFromAnomaly();
                    }
                }
            };
            animTear();
        } else {
            setTimeout(() => {
                window.isPaperTearing = false;
                if (typeof window.returnFromAnomaly === 'function') {
                    window.returnFromAnomaly();
                }
            }, 800);
        }
    }

    // 화이트보드 (Whiteboard)
    const boardGroup = new THREE.Group();
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 1.2, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.4 })
    );
    board.position.y = 1.5;
    board.castShadow = true;
    boardGroup.add(board);
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.05), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    const legL = boardFrame.clone(); legL.position.set(-1.0, 1.0, 0);
    const legR = boardFrame.clone(); legR.position.set(1.0, 1.0, 0);
    boardGroup.add(legL, legR);
    boardGroup.position.set(3, 0, -2);
    boardGroup.rotation.y = -0.6;
    scene.add(boardGroup);

    // 손님맞이용 원형 테이블
    const guestTable = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16), woodMat);
    guestTable.position.set(2, 0.25, 2);
    guestTable.castShadow = true;
    scene.add(guestTable);

    // 화초 (Plant - 방치되어 낡은 화분)
    const plantGroup = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x6e5b50 }));
    pot.position.y = 0.15;
    plantGroup.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x122915, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 4), leafMat);
        leaf.position.set((Math.random() - 0.5) * 0.15, 0.35, (Math.random() - 0.5) * 0.15);
        leaf.rotation.x = (Math.random() - 0.5) * 0.8;
        leaf.rotation.z = (Math.random() - 0.5) * 0.8;
        plantGroup.add(leaf);
    }
    plantGroup.position.set(-4, 0, -3.5);
    scene.add(plantGroup);

    /* 8. 문 너머 어둠(F) 복도 및 황금색 오염 액체 스플래시 */
    const hallFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 15),
        new THREE.MeshStandardMaterial({ color: 0x090807, roughness: 0.95 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(0, 0, -12.5); // 문 너머로 연장
    scene.add(hallFloor);

    const hallLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(15, 3), wallMat);
    hallLeftWall.position.set(-1.25, 1.5, -12.5);
    hallLeftWall.rotation.y = Math.PI / 2;
    scene.add(hallLeftWall);

    const hallRightWall = new THREE.Mesh(new THREE.PlaneGeometry(15, 3), wallMat);
    hallRightWall.position.set(1.25, 1.5, -12.5);
    hallRightWall.rotation.y = -Math.PI / 2;
    scene.add(hallRightWall);

    // 복도 벽면에 터진 어두운 황금색 오염 액체 (금속성 재질)
    const goldLiquidMat = new THREE.MeshStandardMaterial({ color: 0x7a6020, roughness: 0.2, metalness: 0.8 });
    for (let i = 0; i < 20; i++) {
        const splat = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, Math.random() * 0.8 + 0.1, Math.random() * 0.8 + 0.1),
            goldLiquidMat
        );
        const side = Math.random() > 0.5 ? 1 : -1;
        splat.position.set(side * 1.24, Math.random() * 2 + 0.3, -5.5 - Math.random() * 8.5);
        scene.add(splat);
    }

    /* 9. 부유하는 먼지 및 거미줄 파티클 시스템 */
    const particleCount = 120;
    const geom = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 9.5;
        posArray[i + 1] = Math.random() * 3.0;
        posArray[i + 2] = (Math.random() - 0.5) * 9.5;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.03,
        transparent: true,
        opacity: 0.4
    });
    dustParticles = new THREE.Points(geom, partMat);
    scene.add(dustParticles);

    /* 10. 캔버스 리사이즈 처리 및 애니메이션 루프 시작 */
    window.addEventListener('resize', () => {
        if (!container || !renderer || !camera) return;
        const newW = container.clientWidth || 800;
        const newH = container.clientHeight || 600;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    });

    animate();
}

/**
 * 프레임 단위 애니메이션 및 물리 충돌 연산 루프
 */
function animate() {
    requestAnimationFrame(animate);

    /* 1인칭 시점 조작 시 이동 및 충돌 처리 */
    if (controls && controls.isLocked === true) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        // 속도 감쇠 (마찰력)
        velocity.x -= velocity.x * 8.0 * delta;
        velocity.z -= velocity.z * 8.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 30.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 30.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // 이동 반경 경계 및 벽 충돌 처리
        const pos = controls.getObject().position;
        if (pos.z < -4.5 && pos.x > -0.65 && pos.x < 0.65) {
            // 문 틈새를 통과해 복도 내부에 진입한 경우
            if (pos.x < -1.1) pos.x = -1.1;
            if (pos.x > 1.1) pos.x = 1.1;
            if (pos.z < -19.0) pos.z = -19.0;
        } else {
            // 사무실 내부에 위치한 경우
            if (pos.x < -4.5) pos.x = -4.5;
            if (pos.x > 4.5) pos.x = 4.5;
            if (pos.z > 4.5) pos.z = 4.5;
            if (pos.z < -4.5) {
                if (pos.x <= -0.65 || pos.x >= 0.65) {
                    pos.z = -4.5;
                }
            }
        }

        prevTime = time;
    } else {
        prevTime = performance.now();
    }

    /* 공중에 부유하는 먼지 하강 애니메이션 */
    if (dustParticles) {
        const arr = dustParticles.geometry.attributes.position.array;
        for (let i = 1; i < arr.length; i += 3) {
            arr[i] -= 0.0015; // 천천히 하강
            if (arr[i] < 0) arr[i] = 3.0; // 바닥에 닿으면 다시 천장으로 재생성
        }
        dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
