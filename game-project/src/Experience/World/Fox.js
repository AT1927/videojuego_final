import * as THREE from 'three'

export default class Fox {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        
        // Velocidad de movimiento del lobo
        this.speed = 2.0
        this.followDistance = 3.0 // Distancia mínima para seguir al jugador
        this.stopDistance = 2.0 // Distancia a la que se detiene
        this.isMoving = false

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder('fox')
        }

        // Resource
        this.resource = this.resources.items.foxModel

        this.setModel()
        this.setAnimation()
    }

    setModel() {
        this.model = this.resource.scene
        this.model.scale.set(0.02, 0.02, 0.02)
        this.model.position.set(3, 0, 0)
        this.scene.add(this.model)
        //Activando la sobra de fox
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }
    //Manejo GUI
    setAnimation() {
        this.animation = {}

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Play the action
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            if (!newAction) {
                console.warn(`⚠️ Animación "${name}" no encontrada en el lobo`)
                return
            }
            
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            if (oldAction && oldAction !== newAction) {
                newAction.crossFadeFrom(oldAction, 0.3) // Transición más suave
            }

            this.animation.actions.current = newAction
        }

        // Debug
        if (this.debug.active) {
            const debugObject = {
                playIdle: () => { this.animation.play('idle') },
                playWalking: () => { this.animation.play('walking') },
                playRunning: () => { this.animation.play('running') }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
        }
    }

    update() {
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)
        
        // Seguir al jugador si está disponible
        this.followPlayer(delta)
    }
    
    followPlayer(delta) {
        // Obtener referencia al robot/jugador
        const player = this.experience.world?.robot
        if (!player || !player.body || !this.model) {
            return
        }
        
        // Obtener posiciones
        const playerPos = player.body.position
        const foxPos = this.model.position
        
        // Calcular distancia al jugador
        const distance = foxPos.distanceTo(
            new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
        )
        
        // Determinar si debe moverse
        if (distance > this.followDistance) {
            // Calcular dirección hacia el jugador
            const direction = new THREE.Vector3(
                playerPos.x - foxPos.x,
                0, // Mantener en el suelo
                playerPos.z - foxPos.z
            ).normalize()
            
            // Mover hacia el jugador
            const moveDistance = this.speed * delta
            this.model.position.x += direction.x * moveDistance
            this.model.position.z += direction.z * moveDistance
            
            // Rotar el modelo hacia la dirección de movimiento
            const angle = Math.atan2(direction.x, direction.z)
            this.model.rotation.y = angle
            
            this.isMoving = true
            
            // Cambiar animación según la distancia
            if (distance > this.followDistance * 2) {
                // Muy lejos: correr
                if (this.animation.actions.current !== this.animation.actions.running) {
                    this.animation.play('running')
                }
            } else {
                // Cerca pero no lo suficientemente cerca: caminar
                if (this.animation.actions.current !== this.animation.actions.walking) {
                    this.animation.play('walking')
                }
            }
        } else if (distance <= this.stopDistance) {
            // Muy cerca: detenerse y usar idle
            this.isMoving = false
            if (this.animation.actions.current !== this.animation.actions.idle) {
                this.animation.play('idle')
            }
        } else {
            // Zona intermedia: caminar lentamente
            const direction = new THREE.Vector3(
                playerPos.x - foxPos.x,
                0,
                playerPos.z - foxPos.z
            ).normalize()
            
            const moveDistance = (this.speed * 0.5) * delta // Movimiento más lento
            this.model.position.x += direction.x * moveDistance
            this.model.position.z += direction.z * moveDistance
            
            const angle = Math.atan2(direction.x, direction.z)
            this.model.rotation.y = angle
            
            this.isMoving = true
            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }
        }
    }
}
