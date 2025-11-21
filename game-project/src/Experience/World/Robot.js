import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
    }

    setModel() {
        this.model = this.resources.items.robotModel.scene
        this.model.scale.set(0.6, 0.6, 0.6)
        this.model.position.set(0, -0.4, 0) // Centrar respecto al cuerpo físico

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        //const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.5, 0.3))
        const shape = new CANNON.Sphere(0.4)

        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            //position: new CANNON.Vec3(4, 1, 0), // Apenas sobre el piso real (que termina en y=0)
            position: new CANNON.Vec3(0, 1.2, 0),
            linearDamping: 0.05,
            angularDamping: 0.9
        })

        this.body.angularFactor.set(0, 1, 0)

        // Estabilización inicial
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.sleep()
        this.body.material = this.physics.robotMaterial
        //console.log(' Robot material:', this.body.material.name)


        this.physics.world.addBody(this.body)
        //console.log(' Posición inicial del robot:', this.body.position)
        // Activar cuerpo después de que el mundo haya dado al menos un paso de simulación
        setTimeout(() => {
            this.body.wakeUp()
        }, 100) // 100 ms ≈ 6 pasos de simulación si step = 1/60
    }


    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { volume: 0.8 })
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        const animations = this.resources.items.robotModel.animations
        
        // Función helper para buscar animaciones por nombre (case-insensitive)
        const findAnimation = (searchNames) => {
            for (const clip of animations) {
                const clipNameLower = clip.name.toLowerCase()
                for (const searchName of searchNames) {
                    if (clipNameLower.includes(searchName.toLowerCase())) {
                        return clip
                    }
                }
            }
            return null
        }

        this.animation.actions = {}
        
        // Buscar animaciones por nombres comunes
        const idleClip = findAnimation(['idle', 'stand', 'rest', 'breath'])
        const walkClip = findAnimation(['walk', 'run', 'move', 'forward'])
        const jumpClip = findAnimation(['jump', 'leap', 'hop'])
        const deathClip = findAnimation(['death', 'die', 'dead', 'fall'])
        const danceClip = findAnimation(['dance', 'victory', 'celebrate', 'win'])

        // Asignar animaciones encontradas o usar la primera disponible como fallback
        if (idleClip) {
            this.animation.actions.idle = this.animation.mixer.clipAction(idleClip)
        } else if (animations.length > 0) {
            this.animation.actions.idle = this.animation.mixer.clipAction(animations[0])
            console.warn('⚠️ Animación idle no encontrada, usando primera animación disponible')
        }

        if (walkClip) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkClip)
        } else if (animations.length > 1) {
            this.animation.actions.walking = this.animation.mixer.clipAction(animations[1])
            console.warn('⚠️ Animación walking no encontrada, usando segunda animación disponible')
        } else {
            this.animation.actions.walking = this.animation.actions.idle
            console.warn('⚠️ Animación walking no encontrada, usando idle')
        }

        if (jumpClip) {
            this.animation.actions.jump = this.animation.mixer.clipAction(jumpClip)
        } else if (animations.length > 2) {
            this.animation.actions.jump = this.animation.mixer.clipAction(animations[2])
            console.warn('⚠️ Animación jump no encontrada, usando tercera animación disponible')
        } else {
            this.animation.actions.jump = this.animation.actions.idle
            console.warn('⚠️ Animación jump no encontrada, usando idle')
        }

        if (deathClip) {
            this.animation.actions.death = this.animation.mixer.clipAction(deathClip)
        } else if (animations.length > 3) {
            this.animation.actions.death = this.animation.mixer.clipAction(animations[3])
            console.warn('⚠️ Animación death no encontrada, usando cuarta animación disponible')
        } else {
            this.animation.actions.death = this.animation.actions.idle
            console.warn('⚠️ Animación death no encontrada, usando idle')
        }

        if (danceClip) {
            this.animation.actions.dance = this.animation.mixer.clipAction(danceClip)
        } else if (animations.length > 0) {
            this.animation.actions.dance = this.animation.mixer.clipAction(animations[0])
            console.warn('⚠️ Animación dance no encontrada, usando primera animación disponible')
        } else {
            this.animation.actions.dance = this.animation.actions.idle
        }

        // Log de animaciones encontradas para debugging
        console.log('🎬 Animaciones disponibles en el modelo:')
        animations.forEach((clip, index) => {
            console.log(`  ${index}: ${clip.name}`)
        })
        console.log('🎯 Animaciones asignadas:')
        console.log(`  Idle: ${idleClip?.name || 'fallback'}`)
        console.log(`  Walking: ${walkClip?.name || 'fallback'}`)
        console.log(`  Jump: ${jumpClip?.name || 'fallback'}`)
        console.log(`  Death: ${deathClip?.name || 'fallback'}`)
        console.log(`  Dance: ${danceClip?.name || 'fallback'}`)

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Configurar jump como animación de una sola vez
        if (this.animation.actions.jump) {
            this.animation.actions.jump.setLoop(THREE.LoopOnce)
            this.animation.actions.jump.clampWhenFinished = true
            this.animation.actions.jump.onFinished = () => {
                this.animation.play('idle')
            }
        }

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            if (!newAction) {
                console.warn(`⚠️ Animación "${name}" no disponible`)
                return
            }

            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            if (oldAction && oldAction !== newAction) {
                newAction.crossFadeFrom(oldAction, 0.3)
            }
            this.animation.actions.current = newAction

            if (name === 'walking') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }

            if (name === 'jump') {
                this.jumpSound.play()
            }
        }
    }

    update() {
        if (this.animation.actions.current === this.animation.actions.death) return
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        const keys = this.keyboard.getState()
        const moveForce = 80
        const turnSpeed = 2.5
        let isMoving = false

        // Limitar velocidad si es demasiado alta
        const maxSpeed = 15
        this.body.velocity.x = Math.max(Math.min(this.body.velocity.x, maxSpeed), -maxSpeed)
        this.body.velocity.z = Math.max(Math.min(this.body.velocity.z, maxSpeed), -maxSpeed)


        // Salto
        // Dirección hacia adelante, independientemente del salto o movimiento
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)

        // Salto
        if (keys.space && this.body.position.y <= 0.51) {
            this.body.applyImpulse(new CANNON.Vec3(forward.x * 0.5, 3, forward.z * 0.5))
            this.animation.play('jump')
            return
        }
        //No permitir que el robot salga del escenario
        if (this.body.position.y > 10) {
            console.warn(' Robot fuera del escenario. Reubicando...')
            this.body.position.set(0, 1.2, 0)
            this.body.velocity.set(0, 0, 0)
        }


        // Movimiento hacia adelante
        if (keys.up) {
            const forward = new THREE.Vector3(0, 0, 1)
            forward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Movimiento hacia atrás
        if (keys.down) {
            const backward = new THREE.Vector3(0, 0, -1)
            backward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Rotación
        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }


        // Animaciones según movimiento
        if (isMoving) {
            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }
        } else {
            if (this.animation.actions.current !== this.animation.actions.idle) {
                this.animation.play('idle')
            }
        }

        // Sincronización física → visual
        this.group.position.copy(this.body.position)

    }

    // Método para mover el robot desde el exterior VR
    moveInDirection(dir, speed) {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) {
            return
        }

        // Si hay controles móviles activos
        const mobile = window.experience?.mobileControls
        if (mobile?.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()

            const adjustedSpeed = 250 * mobile.intensity // velocidad más fluida
            const force = new CANNON.Vec3(dir3D.x * adjustedSpeed, 0, dir3D.z * adjustedSpeed)

            this.body.applyForce(force, this.body.position)

            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }

            // Rotar suavemente en dirección de avance
            const angle = Math.atan2(dir3D.x, dir3D.z)
            this.group.rotation.y = angle
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
    }
    die() {
        if (this.animation.actions.current !== this.animation.actions.death) {
            this.animation.actions.current.fadeOut(0.2)
            this.animation.actions.death.reset().fadeIn(0.2).play()
            this.animation.actions.current = this.animation.actions.death

            this.walkSound.stop()

            // 💥 Eliminar cuerpo del mundo para evitar errores
            if (this.physics.world.bodies.includes(this.body)) {
                this.physics.world.removeBody(this.body)
            }
            this.body = null  // prevenir referencias rotas

            // Ajustes visuales (opcional)
            this.group.position.y -= 0.5
            this.group.rotation.x = -Math.PI / 2

            console.log(' Robot ha muerto')
        }
    }



}
