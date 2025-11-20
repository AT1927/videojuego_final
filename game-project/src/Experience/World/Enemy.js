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
        this.baseSpeed = 1.0  //Control velocidad del enemigo
        this.speed = this.baseSpeed
		this.delayActivation = 0 // activo de inmediato en modo escritorio



        // Sonido de proximidad en loop
        this.proximitySound = new Sound('/sounds/alert.ogg', {
            loop: true,
            volume: 0
        })
        this._soundCooldown = 0
        this.proximitySound.play()

        // Modelo visual - clonar correctamente el modelo GLTF
        this.model = model.clone(true) // Clonar recursivamente
        this.model.position.copy(position)
        
        // Configurar escala para el modelo Skeleton (ajustar según necesidad)
        this.model.scale.set(0.5, 0.5, 0.5)
        
        // Configurar sombras
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        
        this.scene.add(this.model)
        
        // Configurar animaciones
        this.setAnimation()

        //  Material físico del enemigo
        const enemyMaterial = new CANNON.Material('enemyMaterial')
        enemyMaterial.friction = 0.0

        // Cuerpo físico
        const shape = new CANNON.Sphere(0.5)
        this.body = new CANNON.Body({
            mass: 5,
            shape,
            material: enemyMaterial,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.01
        })

		// Alinear altura con el robot en modo escritorio (evita que nunca colisionen por Y)
		if (this.playerRef?.body) {
			this.body.position.y = this.playerRef.body.position.y
			this.model.position.y = this.body.position.y
		}

        this.body.sleepSpeedLimit = 0.0
        this.body.wakeUp()
        this.physicsWorld.addBody(this.body)

        // Asocia el cuerpo al modelo
        this.model.userData.physicsBody = this.body

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
    }

    update(delta) {
        if (this.delayActivation > 0) {
            this.delayActivation -= delta
            return
        }

		if (!this.body || !this.playerRef?.body) return

		const targetPos = new CANNON.Vec3(
			this.playerRef.body.position.x,
			this.playerRef.body.position.y,
			this.playerRef.body.position.z
		)

        const enemyPos = this.body.position

        //  Volumen según cercanía
        const distance = enemyPos.distanceTo(targetPos)
        if (distance < 4) {
            this.speed = 2.5
        } else {
            this.speed = this.baseSpeed
        }
        const maxDistance = 10
        const clampedDistance = Math.min(distance, maxDistance)
        const proximityVolume = 1 - (clampedDistance / maxDistance)

        if (this.proximitySound) {
            this.proximitySound.setVolume(proximityVolume * 0.8)
        }

        //  Movimiento directo hacia el robot
		const direction = new CANNON.Vec3(
			targetPos.x - enemyPos.x,
			targetPos.y - enemyPos.y,
			targetPos.z - enemyPos.z
		)

		if (direction.length() > 0.5) {
            direction.normalize()
            direction.scale(this.speed, direction)
            this.body.velocity.x = direction.x
			this.body.velocity.y = direction.y
            this.body.velocity.z = direction.z
        }

        //  Sincronizar modelo visual
        this.model.position.copy(this.body.position)
        
        // Rotar el modelo hacia la dirección de movimiento
        if (direction.length() > 0.5) {
            const angle = Math.atan2(direction.x, direction.z)
            this.model.rotation.y = angle
        }
        
        // Actualizar animaciones
        if (this.animation && this.animation.mixer) {
            this.animation.mixer.update(delta)
        }
    }
    
    setAnimation() {
        // Verificar si el modelo tiene animaciones (es un GLTF)
        const gltfData = this.experience?.resources?.items?.enemyModel
        if (!gltfData || !gltfData.animations || gltfData.animations.length === 0) {
            console.warn('⚠️ Modelo enemigo no tiene animaciones o no está cargado')
            return
        }
        
        // Función helper para buscar animaciones por nombre
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
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}
        
        // Buscar animaciones comunes para enemigos
        const walkClip = findAnimation(['walk', 'run', 'move', 'chase', 'pursuit', 'forward'])
        const idleClip = findAnimation(['idle', 'stand', 'rest', 'breath'])
        const attackClip = findAnimation(['attack', 'hit', 'strike', 'punch'])
        
        // Asignar animaciones encontradas
        if (walkClip) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkClip)
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
        } else if (gltfData.animations.length > 0) {
            // Usar la primera animación como walking si no se encuentra
            this.animation.actions.walking = this.animation.mixer.clipAction(gltfData.animations[0])
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
            console.warn('⚠️ Animación walking no encontrada, usando primera animación disponible')
        }
        
        if (idleClip) {
            this.animation.actions.idle = this.animation.mixer.clipAction(idleClip)
            this.animation.actions.idle.setLoop(THREE.LoopRepeat)
        } else if (gltfData.animations.length > 0) {
            this.animation.actions.idle = this.animation.mixer.clipAction(gltfData.animations[0])
            this.animation.actions.idle.setLoop(THREE.LoopRepeat)
        }
        
        if (attackClip) {
            this.animation.actions.attack = this.animation.mixer.clipAction(attackClip)
            this.animation.actions.attack.setLoop(THREE.LoopOnce)
        }
        
        // Log de animaciones encontradas (solo una vez por tipo de enemigo)
        if (!Enemy._animationsLogged) {
            console.log('🎬 Animaciones disponibles en el modelo enemigo:')
            gltfData.animations.forEach((clip, index) => {
                console.log(`  ${index}: ${clip.name}`)
            })
            console.log('🎯 Animaciones asignadas:')
            console.log(`  Walking: ${walkClip?.name || 'fallback'}`)
            console.log(`  Idle: ${idleClip?.name || 'fallback'}`)
            console.log(`  Attack: ${attackClip?.name || 'no encontrada'}`)
            Enemy._animationsLogged = true
        }
        
        // Iniciar animación de caminar (ya que el enemigo siempre está persiguiendo)
        if (this.animation.actions.walking) {
            this.animation.actions.walking.play()
            this.animation.currentAction = this.animation.actions.walking
        } else if (this.animation.actions.idle) {
            this.animation.actions.idle.play()
            this.animation.currentAction = this.animation.actions.idle
        }
    }

    destroy() {
        // Limpiar animaciones
        if (this.animation && this.animation.mixer) {
            if (this.animation.actions) {
                Object.values(this.animation.actions).forEach(action => {
                    if (action) action.stop()
                })
            }
            this.animation.mixer.stopAllAction()
            this.animation.mixer = null
        }
        
        if (this.model) {
            this.scene.remove(this.model)
            
            // Limpiar geometrías y materiales
            this.model.traverse((child) => {
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
