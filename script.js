
// key features
//      3d animation
//      3d navigation

let renderer,
    scene,
    camera,
    activeCamera,
    controls,
    container = document.getElementById("canvas-container"),
    timeout_Debounce,
    planetNodes = [],
    orbits = [],
    sun,
    timestamp = 0,
    currentNode,
    uniforms,
    metadata = {
        urls: {
            sun: {
                surfaceMaterial: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/297733/sunSurfaceMaterial.jpg',
                atmosphereMaterial: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/297733/sunAtmosphereMaterial.png'
            }
        }
    };

const saturnRings = ['#3b2d27', '#876f5b', '#735c49', '#5e4a3d', '#3b2d27', '#241f1e', '#241f1e', '#735c49', '#735c49', '#735c49', '#5e4a3d', '#5e4a3d', '#3b2d27', '#3b2d27', '#3b2d27']

const planets = {
    "mercury": { radius: 1, orbitRadius: 33, speed: 5, rotationSpeed: 0.01 },
    "venus": { radius: 2, orbitRadius: 48, speed: 3, rotationSpeed: 0.005 },
    "earth": { radius: 2.5, orbitRadius: 55, speed: 4, rotationSpeed: 0.02 },
    "mars": { radius: 1.5, orbitRadius: 72, speed: 2, rotationSpeed: 0.01 },
    "jupiter": { radius: 8, orbitRadius: 90, speed: 0.8, rotationSpeed: 0.04 },
    "saturn": { radius: 6, orbitRadius: 120, speed: 0.5, rotationSpeed: 0.02 },
    "uranus": { radius: 4, orbitRadius: 140, speed: 0.4, rotationSpeed: 0.01 },
    "neptune": { radius: 4, orbitRadius: 180, speed: 0.2, rotationSpeed: 0.01 }
}

const MEDIA_PREFIX = 'https://brynmtchll.github.io/codepen-assets/solar-system/';



init();
animate();


function init() {
    scene = new THREE.Scene();

    // lighting
    let ambientLight = new THREE.AmbientLight("#ffffff", 0.4);
    ambientLight.position.set(0, 20, 20);
    scene.add(ambientLight);

    let pointLight = new THREE.PointLight(0xFFFFFF, 2.5);
    scene.add(pointLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // main camera and orbit controls
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 100, 230);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxDistance = 400;
    controls.minDistance = 80;
    controls.enablePan = false;


    // globe background
    {
        let loader = new THREE.TextureLoader(),
            texture = loader.load('https://i.ibb.co/4gHcRZD/bg3-je3ddz.jpg');

        texture.anisotropy = 20;

        let geometry = new THREE.SphereBufferGeometry(200, 60, 60),
            material = new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                map: texture,
            });

        globe = new THREE.Mesh(geometry, material);
        scene.add(globe);
    }

    //   sun
    {
        // credit for the shaders - github: 'https://github.com/bradyhouse/house/tree/master/fiddles/three/fiddle-0009-Sun',
        let fragmentShader = `uniform float time;
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            varying vec2 texCoord;
            void main( void ) {
               vec4 noise = texture2D( texture1, texCoord );
               vec2 T1 = texCoord + vec2( 1.5, -1.5 ) * time  * 0.01;
               vec2 T2 = texCoord + vec2( -0.5, 2.0 ) * time *  0.01;
               T1.x -= noise.r * 2.0;
               T1.y += noise.g * 4.0;
               T2.x += noise.g * 0.2;
               T2.y += noise.b * 0.2;
               float p = texture2D( texture1, T1 * 2.0 ).a + 0.3;
               vec4 color = texture2D( texture2, T2 );
               vec4 temp = color * 3.0 * ( vec4( p + 0.1, p - 0.2, p + 0.5, p + 0.5) ) + ( color * color);
  
               gl_FragColor = temp;
            }`;
        let vertexShader = `varying vec2 texCoord;
            void main() {
                texCoord = uv;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }`;


        let loader = new THREE.TextureLoader(),
            textureSun1 = loader.load(metadata.urls.sun.atmosphereMaterial),
            textureSun2 = loader.load(metadata.urls.sun.surfaceMaterial);
        uniforms = {
            time: { type: "f", value: 1.0 },
            texture1: {
                type: "t",
                value: 0,
                texture: textureSun1
            },
            texture2: {
                type: "t",
                value: textureSun2,
            }
        };

        let material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        }),
            geometry = new THREE.SphereGeometry(28, 64, 64);
        sun = new THREE.Mesh(geometry, material);

        scene.add(sun);
    }

    //     planets
    let createPlanet = function (name, radius, orbitRadius) {

        // create planet
        let loader = new THREE.TextureLoader(),
            texture = loader.load(MEDIA_PREFIX + name + '.jpeg'),
            geometry = new THREE.SphereGeometry(radius, 32, 16),
            material = new THREE.MeshLambertMaterial({ map: texture, }),
            planet = new THREE.Mesh(geometry, material);

        // saturn rings
        if (name == "saturn") {
            for (let i = 0; i < saturnRings.length; i++) {
                let ringGeometry = new THREE.RingGeometry(i / 4 + 6.5, i / 4 + 6.75, 32),
                    ringMaterial = new THREE.MeshBasicMaterial({ color: saturnRings[i], side: THREE.DoubleSide }),
                    ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                planet.add(ring);
            }
        }

        scene.add(planet);

        // planet camera and controls
        let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
        camera.position.set(0, 100, 175);
        let controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.maxDistance = 400;
        controls.minDistance = 80;
        controls.enablePan = false;

        // store planet
        planetNodes.push({
            planet: planet,
            camera: camera,
            controls: controls,
            name: name
        })

        // create planet orbit line
        let shape = new THREE.Shape();
        shape.moveTo(orbitRadius, 0);
        shape.absarc(0, 0, orbitRadius, 0, 2 * Math.PI, false);

        let spacedPoints = shape.getSpacedPoints(128);

        let orbitGeometry = new THREE.BufferGeometry().setFromPoints(spacedPoints);
        orbitGeometry.rotateX(-1.5707);

        let orbitMaterial = new THREE.LineBasicMaterial({
            color: "#5C5680",
        });

        let orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbit);
        orbits.push(orbit);
    };

    for (let [name, properties] of Object.entries(planets)) {
        createPlanet(name, properties.radius, properties.orbitRadius);
    }

    orbits.forEach(orbit => orbit.visible = !orbit.visible);


    currentNode = planetNodes[5];
    activeCamera = camera;

    //     gui camera view changing
    planetNodes.forEach(function (node, i) {
        $(`#${node.name}-button`).on('click', () => {
            activeCamera = node.camera;
            currentNode = node;
            $('.active-button').removeClass("active-button");
            $(`#${node.name}-button`).addClass('active-button');
        })
    });
    $('#main-button').on('click', () => {
        activeCamera = camera;
        $('.active-button').removeClass("active-button");
        $('#main-button').addClass('active-button');
    });

    //     gui orbit lines toggle
    $('#lines-button').on('click', () => {
        if ($('#lines-button').hasClass("visible")) $('#lines-button').removeClass('visible');
        else $('#lines-button').addClass("visible");
        orbits.forEach(orbit => orbit.visible = !orbit.visible);
    })
}




function animate() {

    // move and rotate planets
    timestamp = Date.now() * 0.0001;
    planetNodes.forEach(function ({ planet, name }) {
        planet.position.x = Math.cos(timestamp * planets[name].speed) * planets[name].orbitRadius;
        planet.position.z = Math.sin(timestamp * planets[name].speed) * planets[name].orbitRadius;
        planet.rotation.y += planets[name].rotationSpeed;
    });

    sun.rotation.y += 0.001;


    // update planet controls
    const currentObjectPosition = new THREE.Vector3();
    currentNode.planet.getWorldPosition(currentObjectPosition);
    currentNode.planet.getWorldPosition(currentNode.controls.target);
    const cameraOffset = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)

    currentNode.camera.position.copy(currentObjectPosition).add(cameraOffset);
    currentNode.controls.update();


    controls.update();
    renderer.render(scene, activeCamera);
    requestAnimationFrame(animate);
}



// resize
window.addEventListener("resize", () => {
    clearTimeout(timeout_Debounce);
    timeout_Debounce = setTimeout(onWindowResize, 80);
});
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    planetNodes.forEach((planetNode) => {
        planetNode.camera.aspect = container.clientWidth / container.clientHeight;
        planetNode.camera.updateProjectionMatrix();
    })

    renderer.setSize(container.clientWidth, container.clientHeight);
}
