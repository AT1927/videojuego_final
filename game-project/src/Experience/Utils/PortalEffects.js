// PortalEffects.js - Efectos visuales mejorados para el portal
import * as THREE from 'three'

export default class PortalEffects {
    constructor({ scene, position, experience }) {
        this.scene = scene
        this.experience = experience
        this.position = position.clone()
        this.clock = new THREE.Clock()
        this.time = 0

        // Grupo principal para todos los efectos
        this.portalGroup = new THREE.Group()
        this.portalGroup.position.copy(this.position)
        this.scene.add(this.portalGroup)

        // Crear todos los efectos
        this.createEnergyRing()
        this.createParticleSystem()
        this.createOrbitingParticles()
        this.createDynamicLights()
        this.createEnergyWaves()
        this.createGlowSphere()

        // Actualizar en cada frame
        this.experience.time.on('tick', this.update)
    }

    createEnergyRing() {
        // Anillo de energía que rota alrededor del portal
        const ringGeometry = new THREE.TorusGeometry(1.5, 0.15, 16, 32)
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        })

        this.energyRing = new THREE.Mesh(ringGeometry, ringMaterial)
        this.energyRing.rotation.x = Math.PI / 2
        this.portalGroup.add(this.energyRing)

        // Segundo anillo más pequeño
        const ring2Geometry = new THREE.TorusGeometry(1.2, 0.1, 16, 32)
        const ring2Material = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        })

        this.energyRing2 = new THREE.Mesh(ring2Geometry, ring2Material)
        this.energyRing2.rotation.x = Math.PI / 2
        this.energyRing2.rotation.z = Math.PI / 4
        this.portalGroup.add(this.energyRing2)
    }

    createParticleSystem() {
        // Sistema de partículas principal
        const particleCount = 200
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)
        const velocities = new Float32Array(particleCount * 3)

        const color1 = new THREE.Color(0x00ffff)
        const color2 = new THREE.Color(0xff00ff)
        const color3 = new THREE.Color(0xffff00)

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3

            // Posiciones aleatorias alrededor del portal
            const radius = Math.random() * 3 + 0.5
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI

            positions[i3] = Math.sin(phi) * Math.cos(theta) * radius
            positions[i3 + 1] = Math.cos(phi) * radius
            positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius

            // Velocidades aleatorias
            velocities[i3] = (Math.random() - 0.5) * 0.02
            velocities[i3 + 1] = Math.random() * 0.03 + 0.01
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02

            // Colores aleatorios entre los tres colores
            const colorMix = Math.random()
            let color
            if (colorMix < 0.33) {
                color = color1
            } else if (colorMix < 0.66) {
                color = color2
            } else {
                color = color3
            }

            colors[i3] = color.r
            colors[i3 + 1] = color.g
            colors[i3 + 2] = color.b

            sizes[i] = Math.random() * 0.3 + 0.1
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })

        this.particleSystem = new THREE.Points(geometry, material)
        this.particleVelocities = velocities
        this.portalGroup.add(this.particleSystem)
    }

    createOrbitingParticles() {
        // Partículas que orbitan alrededor del portal
        const orbitCount = 30
        const orbitGeometry = new THREE.BufferGeometry()
        const orbitPositions = new Float32Array(orbitCount * 3)
        const orbitColors = new Float32Array(orbitCount * 3)
        const orbitAngles = new Float32Array(orbitCount)
        const orbitRadii = new Float32Array(orbitCount)
        const orbitSpeeds = new Float32Array(orbitCount)

        const color = new THREE.Color(0x00ffff)

        for (let i = 0; i < orbitCount; i++) {
            const i3 = i * 3
            const radius = 2 + Math.random() * 1
            const angle = (i / orbitCount) * Math.PI * 2

            orbitPositions[i3] = Math.cos(angle) * radius
            orbitPositions[i3 + 1] = (Math.random() - 0.5) * 2
            orbitPositions[i3 + 2] = Math.sin(angle) * radius

            orbitAngles[i] = angle
            orbitRadii[i] = radius
            orbitSpeeds[i] = 0.5 + Math.random() * 0.5

            orbitColors[i3] = color.r
            orbitColors[i3 + 1] = color.g
            orbitColors[i3 + 2] = color.b
        }

        orbitGeometry.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3))
        orbitGeometry.setAttribute('color', new THREE.BufferAttribute(orbitColors, 3))

        const orbitMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })

        this.orbitingParticles = new THREE.Points(orbitGeometry, orbitMaterial)
        this.orbitAngles = orbitAngles
        this.orbitRadii = orbitRadii
        this.orbitSpeeds = orbitSpeeds
        this.portalGroup.add(this.orbitingParticles)
    }

    createDynamicLights() {
        // Luces dinámicas con pulsos
        this.portalLight = new THREE.PointLight(0x00ffff, 3, 15, 2)
        this.portalLight.position.set(0, 0, 0)
        this.portalGroup.add(this.portalLight)

        // Luz direccional desde arriba
        this.topLight = new THREE.SpotLight(0xff00ff, 2, 10, Math.PI / 6, 0.3, 1)
        this.topLight.position.set(0, 3, 0)
        this.topLight.target.position.set(0, 0, 0)
        this.portalGroup.add(this.topLight)
        this.portalGroup.add(this.topLight.target)

        // Luces adicionales en círculo
        this.circleLights = []
        const lightCount = 6
        for (let i = 0; i < lightCount; i++) {
            const angle = (i / lightCount) * Math.PI * 2
            const light = new THREE.PointLight(0xffff00, 1.5, 8, 1.5)
            light.position.set(
                Math.cos(angle) * 2,
                0.5,
                Math.sin(angle) * 2
            )
            this.circleLights.push(light)
            this.portalGroup.add(light)
        }
    }

    createEnergyWaves() {
        // Ondas de energía que se expanden
        const waveCount = 3
        this.energyWaves = []

        for (let i = 0; i < waveCount; i++) {
            const waveGeometry = new THREE.RingGeometry(0.5, 0.6, 32)
            const waveMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            })

            const wave = new THREE.Mesh(waveGeometry, waveMaterial)
            wave.rotation.x = -Math.PI / 2
            wave.position.y = 0.1
            wave.userData.radius = 0.5
            wave.userData.speed = 0.02 + i * 0.01
            wave.userData.initialOpacity = 0.4 - i * 0.1
            this.energyWaves.push(wave)
            this.portalGroup.add(wave)
        }
    }

    createGlowSphere() {
        // Esfera de brillo interno
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16)
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        })

        this.glowSphere = new THREE.Mesh(glowGeometry, glowMaterial)
        this.portalGroup.add(this.glowSphere)

        // Esfera exterior más grande
        const outerGlowGeometry = new THREE.SphereGeometry(1.2, 16, 16)
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        })

        this.outerGlowSphere = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial)
        this.portalGroup.add(this.outerGlowSphere)
    }

    update = () => {
        const delta = this.clock.getDelta()
        this.time += delta

        // Rotar anillos de energía
        if (this.energyRing) {
            this.energyRing.rotation.z += delta * 1.5
            this.energyRing.material.opacity = 0.6 + Math.sin(this.time * 2) * 0.2
        }

        if (this.energyRing2) {
            this.energyRing2.rotation.z -= delta * 2
            this.energyRing2.material.opacity = 0.4 + Math.sin(this.time * 3) * 0.2
        }

        // Actualizar partículas principales
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array
            const velocities = this.particleVelocities

            for (let i = 0; i < positions.length; i += 3) {
                // Mover partículas
                positions[i] += velocities[i]
                positions[i + 1] += velocities[i + 1]
                positions[i + 2] += velocities[i + 2]

                // Si se alejan demasiado, resetear cerca del centro
                const distance = Math.sqrt(
                    positions[i] ** 2 +
                    positions[i + 1] ** 2 +
                    positions[i + 2] ** 2
                )

                if (distance > 4) {
                    const radius = Math.random() * 0.5
                    const theta = Math.random() * Math.PI * 2
                    const phi = Math.random() * Math.PI

                    positions[i] = Math.sin(phi) * Math.cos(theta) * radius
                    positions[i + 1] = Math.cos(phi) * radius
                    positions[i + 2] = Math.sin(phi) * Math.sin(theta) * radius
                }
            }

            this.particleSystem.geometry.attributes.position.needsUpdate = true
        }

        // Actualizar partículas orbitantes
        if (this.orbitingParticles) {
            const positions = this.orbitingParticles.geometry.attributes.position.array

            for (let i = 0; i < this.orbitAngles.length; i++) {
                const i3 = i * 3
                this.orbitAngles[i] += delta * this.orbitSpeeds[i]

                positions[i3] = Math.cos(this.orbitAngles[i]) * this.orbitRadii[i]
                positions[i3 + 2] = Math.sin(this.orbitAngles[i]) * this.orbitRadii[i]
                positions[i3 + 1] = Math.sin(this.time * 2 + i) * 1
            }

            this.orbitingParticles.geometry.attributes.position.needsUpdate = true
        }

        // Actualizar luces dinámicas
        if (this.portalLight) {
            const pulse = Math.sin(this.time * 3) * 0.5 + 1
            this.portalLight.intensity = 2 + pulse
            this.portalLight.color.setHSL((this.time * 0.1) % 1, 1, 0.5)
        }

        if (this.topLight) {
            this.topLight.intensity = 1.5 + Math.sin(this.time * 2) * 0.5
        }

        // Actualizar luces circulares
        this.circleLights.forEach((light, i) => {
            const angle = (i / this.circleLights.length) * Math.PI * 2 + this.time
            light.position.x = Math.cos(angle) * 2
            light.position.z = Math.sin(angle) * 2
            light.intensity = 1 + Math.sin(this.time * 4 + i) * 0.5
        })

        // Actualizar ondas de energía
        this.energyWaves.forEach((wave, i) => {
            wave.userData.radius += wave.userData.speed
            wave.scale.set(wave.userData.radius, wave.userData.radius, 1)
            wave.material.opacity = wave.userData.initialOpacity * (1 - (wave.userData.radius - 0.5) / 3)

            if (wave.userData.radius > 3.5) {
                wave.userData.radius = 0.5
                wave.scale.set(0.5, 0.5, 1)
            }
        })

        // Actualizar esferas de brillo
        if (this.glowSphere) {
            this.glowSphere.scale.setScalar(1 + Math.sin(this.time * 2) * 0.2)
            this.glowSphere.material.opacity = 0.2 + Math.sin(this.time * 3) * 0.1
        }

        if (this.outerGlowSphere) {
            this.outerGlowSphere.scale.setScalar(1 + Math.sin(this.time * 1.5) * 0.15)
            this.outerGlowSphere.material.opacity = 0.1 + Math.sin(this.time * 2) * 0.05
        }

        // Rotar todo el grupo lentamente
        this.portalGroup.rotation.y += delta * 0.3
    }

    dispose() {
        this.experience.time.off('tick', this.update)

        // Limpiar geometrías y materiales
        const disposeObject = (obj) => {
            if (obj.geometry) obj.geometry.dispose()
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose())
                } else {
                    obj.material.dispose()
                }
            }
        }

        this.portalGroup.traverse(disposeObject)
        this.scene.remove(this.portalGroup)
    }
}

