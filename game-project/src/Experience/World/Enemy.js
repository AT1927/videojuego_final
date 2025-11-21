import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import Sound from './Sound.js'

export default class Enemy {
    constructor({ scene, physicsWorld, playerRef, model, position, experience }) {
        this.experience = experience
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.playerRef = playerRef
        this.baseSpeed = 1.0
        this.speed = this.baseSpeed
        this.delayActivation = 0

        // Sonido de proximidad
        this.proximitySound = new Sound('/sounds/alert.ogg', {
            loop: true,
            volume: 0
        })
        this.proximitySound.play()

        // Modelo visual - DESACTIVADO (usar esfera visual en su lugar)
        this.model = null
        this.group = new THREE.Group()
        this.group.position.set(position.x, position.y, position.z)
        // NO agregar modelo a la escena
        // this.scene.add(this.group)

        // Esfera enemiga mejorada - estilo visual mejorado
        const enemyGeometry = new THREE.SphereGeometry(0.6, 16, 16)
        
        // Material exterior: rojo brillante con wireframe
        const outerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        })
        
        // Material interior: rojo sólido semi-transparente
        const innerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcc0000,
            transparent: true,
            opacity: 0.6,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        })
        
        // Esfera exterior (wireframe)
        this.helper = new THREE.Mesh(enemyGeometry, outerMaterial)
        this.helper.position.set(position.x, position.y, position.z)
        this.helper.castShadow = true
        this.scene.add(this.helper)
        
        // Esfera interior (sólida con glow)
        const innerGeometry = new THREE.SphereGeometry(0.5, 16, 16)
        this.innerSphere = new THREE.Mesh(innerGeometry, innerMaterial)
        this.innerSphere.position.set(position.x, position.y, position.z)
        this.innerSphere.castShadow = true
        this.scene.add(this.innerSphere)
        
        // Ojos del enemigo (dos esferas pequeñas)
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8)
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.0
        })
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
        this.leftEye.position.set(position.x - 0.2, position.y + 0.2, position.z + 0.4)
        this.scene.add(this.leftEye)
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
        this.rightEye.position.set(position.x + 0.2, position.y + 0.2, position.z + 0.4)
        this.scene.add(this.rightEye)
        
        console.log('✅ Enemigo esfera creado en:', position)

        // Estado de animación
        this.isMoving = false
        this.currentAnimationState = 'idle'
        
        // NO configurar animaciones del modelo (no hay modelo)
        this.animation = null

        // Cuerpo físico
        const enemyMaterial = new CANNON.Material('enemyMaterial')
        enemyMaterial.friction = 0.0

        const shape = new CANNON.Sphere(0.5)
        this.body = new CANNON.Body({
            mass: 5,
            shape,
            material: enemyMaterial,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.01
        })

        // IMPORTANTE: NO alinear con el robot al inicio, usar la posición especificada
        // Solo sincronizar altura si es necesario, pero mantener la posición X y Z original
        if (this.playerRef?.body) {
            // Solo ajustar altura Y, mantener X y Z de la posición original
            this.body.position.y = this.playerRef.body.position.y
        }

        this.body.sleepSpeedLimit = 0.0
        this.body.wakeUp()
        this.physicsWorld.addBody(this.body)
        
        // Sincronizar grupo con cuerpo físico DESPUÉS de crear el cuerpo
        this.group.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        )
        
        console.log('📍 Posición inicial - Cuerpo físico:', this.body.position, 'Grupo visual:', this.group.position)

        // Colisión con robot
        this._onCollide = (event) => {
            if (event.body === this.playerRef.body) {
                if (typeof this.playerRef.die === 'function') {
                    this.playerRef.die()
                }
                if (this.proximitySound) {
                    this.proximitySound.stop()
                }
                if (this.model.parent) {
                    new FinalPrizeParticles({
                        scene: this.scene,
                        targetPosition: this.body.position,
                        sourcePosition: this.body.position,
                        experience: this.experience
                    })
                    this.destroy()
                }
            }
        }

        this.body.addEventListener('collide', this._onCollide)
        
        console.log('🤖 Enemigo creado en:', position)
    }

    update(delta) {
        // CRÍTICO: Sincronizar posición visual SIEMPRE, incluso durante delay
        if (this.body) {
            const pos = this.body.position
            
            // Sincronizar esfera exterior
            if (this.helper) {
                this.helper.position.set(pos.x, pos.y, pos.z)
            }
            
            // Sincronizar esfera interior
            if (this.innerSphere) {
                this.innerSphere.position.set(pos.x, pos.y, pos.z)
            }
            
            // Sincronizar ojos
            if (this.leftEye) {
                this.leftEye.position.set(pos.x - 0.2, pos.y + 0.2, pos.z + 0.4)
            }
            if (this.rightEye) {
                this.rightEye.position.set(pos.x + 0.2, pos.y + 0.2, pos.z + 0.4)
            }
            
            // Rotar ojos hacia el jugador
            if (this.playerRef?.body && this.leftEye && this.rightEye) {
                const targetPos = this.playerRef.body.position
                const direction = new THREE.Vector3(
                    targetPos.x - pos.x,
                    targetPos.y - pos.y,
                    targetPos.z - pos.z
                ).normalize()
                
                // Rotar ojos para mirar al jugador
                const eyeLookAt = new THREE.Vector3(
                    pos.x + direction.x * 0.4,
                    pos.y + direction.y * 0.2 + 0.2,
                    pos.z + direction.z * 0.4
                )
                this.leftEye.lookAt(eyeLookAt)
                this.rightEye.lookAt(eyeLookAt)
            }
        }
        
        // Actualizar animaciones (si existen)
        if (this.animation && this.animation.mixer) {
            this.animation.mixer.update(delta)
        }

        if (this.delayActivation > 0) {
            this.delayActivation -= delta
            return
        }

        if (!this.body || !this.playerRef?.body || !this.group) return

        const targetPos = new CANNON.Vec3(
            this.playerRef.body.position.x,
            this.playerRef.body.position.y,
            this.playerRef.body.position.z
        )

        const enemyPos = this.body.position
        const distance = enemyPos.distanceTo(targetPos)

        // Ajustar velocidad según distancia
        if (distance < 4) {
            this.speed = 2.5
        } else {
            this.speed = this.baseSpeed
        }

        // Volumen de sonido
        const maxDistance = 10
        const clampedDistance = Math.min(distance, maxDistance)
        const proximityVolume = 1 - (clampedDistance / maxDistance)
        if (this.proximitySound) {
            this.proximitySound.setVolume(proximityVolume * 0.8)
        }

        // Movimiento hacia el jugador
        const direction = new CANNON.Vec3(
            targetPos.x - enemyPos.x,
            targetPos.y - enemyPos.y,
            targetPos.z - enemyPos.z
        )

        const isMoving = direction.length() > 0.5

        if (isMoving) {
            direction.normalize()
            direction.scale(this.speed, direction)
            this.body.velocity.x = direction.x
            this.body.velocity.y = direction.y
            this.body.velocity.z = direction.z

            this.isMoving = true

            // Animación visual: hacer la esfera más brillante cuando persigue
            if (this.innerSphere && this.innerSphere.material) {
                this.innerSphere.material.emissiveIntensity = 0.6
                this.innerSphere.material.opacity = 0.8
            }
        } else {
            this.isMoving = false
            // Animación visual: hacer la esfera menos brillante cuando está quieta
            if (this.innerSphere && this.innerSphere.material) {
                this.innerSphere.material.emissiveIntensity = 0.3
                this.innerSphere.material.opacity = 0.6
            }
        }

        // Rotar esfera hacia la dirección de movimiento
        if (isMoving && this.helper && this.body) {
            const angle = Math.atan2(direction.x, direction.z)
            this.helper.rotation.y = angle
            if (this.innerSphere) {
                this.innerSphere.rotation.y = angle
            }
        }
    }

    setAnimation() {
        const gltfData = this.experience?.resources?.items?.enemyModel
        if (!gltfData || !gltfData.animations || gltfData.animations.length === 0) {
            console.warn('⚠️ Modelo enemigo no tiene animaciones')
            return
        }

        const findAnimation = (searchNames) => {
            for (const clip of gltfData.animations) {
                const clipNameLower = clip.name.toLowerCase()
                for (const searchName of searchNames) {
                    if (clipNameLower.includes(searchName.toLowerCase())) {
                        return clip
                    }
                }
            }
            return null
        }

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.group)
        this.animation.actions = {}

        // Buscar específicamente la animación "walk" para Frog
        const walkClip = findAnimation(['walk']) || findAnimation(['walking', 'run', 'running', 'move', 'moving'])
        const idleClip = findAnimation(['idle', 'idling', 'stand', 'standing'])

        if (walkClip) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkClip)
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
            console.log('✅ Animación walk encontrada:', walkClip.name)
        } else if (gltfData.animations.length > 0) {
            // Fallback: usar primera animación disponible
            this.animation.actions.walking = this.animation.mixer.clipAction(gltfData.animations[0])
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
            console.warn('⚠️ Animación walk no encontrada, usando:', gltfData.animations[0].name)
        }

        if (idleClip) {
            this.animation.actions.idle = this.animation.mixer.clipAction(idleClip)
            this.animation.actions.idle.setLoop(THREE.LoopRepeat)
        } else if (gltfData.animations.length > 0 && !walkClip) {
            // Solo usar como idle si no hay walk
            this.animation.actions.idle = this.animation.mixer.clipAction(gltfData.animations[0])
            this.animation.actions.idle.setLoop(THREE.LoopRepeat)
        }

        // Método para cambiar animaciones
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            if (!newAction) return

            const oldAction = this.animation.actions.current
            if (oldAction === newAction) return

            newAction.reset()
            newAction.play()
            if (oldAction) {
                newAction.crossFadeFrom(oldAction, 0.3)
            }

            this.animation.actions.current = newAction
        }

        // Iniciar con idle
        if (this.animation.actions.idle) {
            this.animation.actions.idle.play()
            this.animation.actions.current = this.animation.actions.idle
            this.currentAnimationState = 'idle'
        } else if (this.animation.actions.walking) {
            this.animation.actions.walking.play()
            this.animation.actions.current = this.animation.actions.walking
            this.currentAnimationState = 'walking'
        }

        // Log animaciones (solo una vez)
        if (!Enemy._animationsLogged) {
            console.log('🎬 Animaciones disponibles en Frog:')
            gltfData.animations.forEach((clip, index) => {
                console.log(`  ${index}: ${clip.name}`)
            })
            console.log('🎯 Animación walk asignada:', walkClip?.name || 'no encontrada')
            console.log('🎯 Animación idle asignada:', idleClip?.name || 'no encontrada')
            Enemy._animationsLogged = true
        }
    }

    destroy() {
        // Limpiar esfera exterior
        if (this.helper) {
            this.scene.remove(this.helper)
            this.helper.geometry.dispose()
            this.helper.material.dispose()
        }
        
        // Limpiar esfera interior
        if (this.innerSphere) {
            this.scene.remove(this.innerSphere)
            this.innerSphere.geometry.dispose()
            this.innerSphere.material.dispose()
        }
        
        // Limpiar ojos
        if (this.leftEye) {
            this.scene.remove(this.leftEye)
            this.leftEye.geometry.dispose()
            this.leftEye.material.dispose()
        }
        
        if (this.rightEye) {
            this.scene.remove(this.rightEye)
            this.rightEye.geometry.dispose()
            this.rightEye.material.dispose()
        }
        
        // Limpiar grupo si existe
        if (this.group) {
            this.scene.remove(this.group)
            this.group.traverse((child) => {
                if (child.geometry) child.geometry.dispose()
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            })
        }
        
        // Limpiar helper
        if (this.helper) {
            this.scene.remove(this.helper)
            this.helper.geometry.dispose()
            this.helper.material.dispose()
        }

        if (this.proximitySound) {
            this.proximitySound.stop()
        }

        if (this.body) {
            this.body.removeEventListener('collide', this._onCollide)
            if (this.physicsWorld.bodies.includes(this.body)) {
                this.physicsWorld.removeBody(this.body)
            }
            this.body = null
        }
    }
}
