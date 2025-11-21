import * as THREE from 'three'
import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import VRIntegration from '../integrations/VRIntegration.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import ModalManager from './Utils/ModalManager.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'
import sources from './sources.js'
import Sounds from './World/Sound.js'
import Raycaster from './Utils/Raycaster.js'
import KeyboardControls from './Utils/KeyboardControls.js'
import GameTracker from './Utils/GameTracker.js'
import Physics from './Utils/Physics.js'
import cannonDebugger from 'cannon-es-debugger'
import CircularMenu from '../controls/CircularMenu.js'
import { Howler } from 'howler'
import SocketManager from '../network/SocketManager.js'

let instance = null

export default class Experience {
  constructor(_canvas) {
    if (instance) return instance
    instance = this

    // Global access
    window.experience = this
    this.canvas = _canvas

    // Flag de interacción
    window.userInteracted = false

    // Core setup
    this.debug = new Debug()
    this.sizes = new Sizes()
    this.time = new Time()
    this.scene = new THREE.Scene()
    this.physics = new Physics()
    this.debugger = cannonDebugger(this.scene, this.physics.world, { color: 0x00ff00 })
    this.keyboard = new KeyboardControls()

    this.scene.background = new THREE.Color('#87ceeb')

    // Recursos
    this.resources = new Resources(sources)

    this.resources.on('ready', () => {
      // Mostrar modal solo cuando los recursos estén listos
      this.modal.show({
        icon: '🚀',
        message: 'Recoge todas las monedas\n¡y evita los obstáculos!',
        buttons: [
          {
            text: '▶️ Iniciar juego',
            onClick: () => this.startGame()
          }
        ]
      })

      // Ocultar precarga si existe
      const overlay = document.querySelector('.loader-overlay')
      if (overlay) {
        overlay.classList.add('fade-out')
        setTimeout(() => overlay.remove(), 1000)
      }
    })

    
    // Cámara y renderer
    this.camera = new Camera(this)
    this.renderer = new Renderer(this)

    // 🚀 Dolly para VR movement
    this.vrDolly = new THREE.Group()
    this.vrDolly.name = 'VR_DOLLY'
    this.vrDolly.add(this.camera.instance)
    this.scene.add(this.vrDolly)


    // Socket
    //this.socketManager = new SocketManager(this)

    // Raycaster
    this.raycaster = new Raycaster(this)


    // Modal y VR
    this.modal = new ModalManager({ container: document.body })
    this.vr = new VRIntegration({
      renderer: this.renderer.instance,
      scene: this.scene,
      camera: this.camera.instance,
      vrDolly: this.vrDolly,
      modalManager: this.modal,
      experience: this
    })

    // Menú
    this.menu = new CircularMenu({
      container: document.body,
      vrIntegration: this.vr,
      onAudioToggle: () => this.world.toggleAudio(),
      onWalkMode: () => {
        this.resumeAudioContext()
        this.toggleWalkMode()
      },
      onFullscreen: () => {
        if (!document.fullscreenElement) {
          document.body.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      },
      onCancelGame: () => this.tracker.handleCancelGame() // 🔴 aquí se integra la lógica central
    })

    //Generar obstaculos
    this._startObstacleWaves()



    // Activar tiempos
    if (this.tracker) {
      this.tracker.destroy()
    }

    this.tracker = new GameTracker({ modal: this.modal, menu: this.menu })


    // Mundo
    this.world = new World(this)

    // Flag tercera persona
    this.isThirdPerson = false

    // Iniciar loop adecuado
    this.startLoop()

    // Resize
    this.sizes.on('resize', () => this.resize())

    // Sonidos
    this.sounds = new Sounds({ time: this.time, debug: this.debug })

    // Detectar gesto del usuario
    window.addEventListener('click', this.handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', this.handleFirstInteraction, { once: true })
  }

  //Control de audio
  handleFirstInteraction() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('🔊 AudioContext reanudado por interacción del usuario.')
      }).catch((err) => {
        console.warn('⚠️ Error reanudando AudioContext:', err)
      })
    }
    window.userInteracted = true
  }

  resumeAudioContext() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('🔊 AudioContext reanudado manualmente')
      }).catch((err) => {
        console.warn('⚠️ Error reanudando AudioContext:', err)
      })
    }
  }

  toggleWalkMode() {
    this.isThirdPerson = !this.isThirdPerson

    const controls = this.camera.controls
    const cam = this.camera.instance

    if (this.isThirdPerson) {
      controls.enabled = false
      console.log('🟡 Tercera persona ON')
    } else {
      controls.enabled = true
      controls.enableRotate = true
      controls.enableZoom = true
      controls.enablePan = false
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI * 0.9

      cam.position.set(12, 5, 10)
      cam.up.set(0, 1, 0)
      controls.target.set(0, 0, 0)
      cam.lookAt(controls.target)
      controls.update()

      console.log('🟢 Vista global restaurada')
    }
  }

  startLoop() {
    this.vr.setUpdateCallback((delta) => this.update(delta))

    this.time.on('tick', () => {
      if (!this.renderer.instance.xr.isPresenting) {
        const delta = this.time.delta * 0.001
        this.update(delta)
      }
    })
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
  }

  update(delta) {
    if (!this.isThirdPerson && !this.renderer.instance.xr.isPresenting) {
      this.camera.update()
    }

    if (this.renderer.instance.xr.isPresenting) {
      this.adjustCameraForVR()
    }

    this.world.update(delta)
    this.renderer.update()
    this.physics.update(delta)

    this.socketManager?.update()
    //linea para activar el debugger
    // if (this.debugger) this.debugger.update()
  }

  adjustCameraForVR() {
    if (this.renderer.instance.xr.isPresenting && this.world.robot?.group) {
      const pos = this.world.robot.group.position
      this.camera.instance.position.copy(pos).add(new THREE.Vector3(0, 1.6, 0))
      this.camera.instance.lookAt(pos.clone().add(new THREE.Vector3(0, 1.6, -1)))
      // console.log('🎯 Cámara ajustada a robot en VR')
    }
  }

  //Generar olas de cubos
  _startObstacleWaves() {
    this.obstacleWaveCount = 10
    this.maxObstacles = 50
    this.currentObstacles = []
    const delay = 30000

    const spawnWave = () => {
      if (this.obstacleWavesDisabled) return

      for (let i = 0; i < this.obstacleWaveCount; i++) {
        const obstacle = this.raycaster.generateRandomObstacle?.()
        if (obstacle) {
          this.currentObstacles.push(obstacle)
        }
      }

      // Mantener máximo 50 obstáculos
      while (this.currentObstacles.length > this.maxObstacles) {
        const oldest = this.currentObstacles.shift()
        if (oldest) {
          // Usar el removedor centralizado para desregistrar tick y liberar recursos
          this.raycaster._removeObstacle(oldest)
        }
      }

      // Mantener constante el tamaño de la oleada para evitar crecimiento exponencial
      // this.obstacleWaveCount += 10
      this.obstacleWaveTimeout = setTimeout(spawnWave, delay)
    }

    // Inicia primera oleada tras 30s
    this.obstacleWaveTimeout = setTimeout(spawnWave, 30000)
  }



  destroy() {
    this.sizes.off('resize')
    this.time.off('tick')

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose && mat.dispose())
        } else {
          child.material.dispose?.()
        }

      }
    })

    this.camera.controls.dispose()
    this.renderer.instance.dispose()
    if (this.debug.active) this.debug.ui.destroy()
  }

  startGame() {
    console.log('🎮 Juego iniciado')
    this.isThirdPerson = true // ⬅️ asegurar el modo
    this.tracker.start()
    this._startObstacleWaves()
    if (this.menu && this.menu.toggleButton && this.menu.toggleButton.style) {
      this.menu.toggleButton.style.display = 'block'
    }

    if (this.world) {
      this.world.gameStarted = true
    }
    console.log('🎮 Iniciando partida...')
  }



  resetGame() {
    console.log('♻️ Reiniciando juego...')
    
    // CRÍTICO: Detener TODOS los sonidos de Howler globalmente
    try {
      Howler.stop() // Detener todos los sonidos de Howler
    } catch (e) {
      console.warn('Error deteniendo sonidos de Howler:', e)
    }
    
    // Detener sonidos específicos del World
    if (this.world?.loseSound) {
      this.world.loseSound.stop()
    }
    if (this.world?.ambientSound && this.world.ambientSound.isPlaying) {
      this.world.ambientSound.toggle() // Detener sonido ambiente
    }
    if (this.world?.coinSound) {
      this.world.coinSound.stop()
    }
    if (this.world?.portalSound) {
      this.world.portalSound.stop()
    }
    if (this.world?.winner) {
      this.world.winner.stop()
    }
    
    // Resetear flag de derrota
    if (this.world) {
      this.world.defeatTriggered = false
    }
    
    // Notificar desconexión al servidor
    this.socketManager?.socket?.disconnect()

    // Limpieza explícita del HUD
    if (this.menu) this.menu.destroy()

    // Limpieza del temporizador viejo
    if (this.tracker) this.tracker.destroy()

    //limpiar fantasmas de robot antiguos
    if (this.socketManager) {
      this.socketManager.destroy()
    }

    // Destruir todo
    this.destroy()

    // Reiniciar instancia
    instance = null
    const newExperience = new Experience(this.canvas)

    // Forzar modo tercera persona
    newExperience.isThirdPerson = true

    // Limpiar botón cancelar
    const cancelBtn = document.getElementById('cancel-button')
    if (cancelBtn) cancelBtn.remove()


    // Esconder botones en la nueva instancia:
    newExperience.tracker?.hideGameButtons?.()
  }


  resetGameToFirstLevel() {
    console.log('♻️ Reiniciando al nivel 1');

    // Cerrar el modal primero para evitar ciclos
    if (this.modal && typeof this.modal.hide === 'function') {
      this.modal.hide()
    }

    // Resetear flags CRÍTICOS primero
    this.world.defeatTriggered = false
    this.world.gameStarted = false

    // 💀 Destruir enemigos previos si existen
    if (Array.isArray(this.world.enemies)) {
      this.world.enemies.forEach(e => {
        try {
          e?.destroy?.()
        } catch (err) {
          console.warn('Error destruyendo enemigo:', err)
        }
      })
      this.world.enemies = []
    } else {
      try {
        this.world.enemy?.destroy()
      } catch (err) {
        console.warn('Error destruyendo enemigo único:', err)
      }
      this.world.enemy = null
    }

    // Resetear variables de World
    this.world.points = 0;
    if (this.world.robot) {
      this.world.robot.points = 0;
    }
    this.world.totalPoints = 0;
    if (this.world.loader) {
      this.world.loader.prizes = [];
    }

    // Resetear nivel actual
    if (this.world.levelManager) {
      this.world.levelManager.currentLevel = 1;
    }
    
    // Actualizar HUD
    if (this.menu) {
      this.menu.setLevel?.(1);
      this.menu.setStatus?.(`🎖️ Puntos: 0`);
      this.menu.setTotalPoints?.(0);
    }

    // Limpiar la escena
    try {
      this.world.clearCurrentScene();
    } catch (err) {
      console.warn('Error limpiando escena:', err)
    }

    // Usar un delay más largo para asegurar limpieza completa
    setTimeout(async () => {
      try {
        // Cargar nivel 1 de nuevo
        await this.world.loadLevel(1)
        
        // Esperar un poco más para que el jugador se posicione
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Los enemigos se crearán automáticamente en loadLevel()
        
        // Reiniciar el seguimiento de tiempo después de cargar el nivel
        if (this.tracker) {
          try {
            this.tracker.destroy();
          } catch (err) {
            console.warn('Error destruyendo tracker:', err)
          }
        }
        this.tracker = new GameTracker({ modal: this.modal, menu: this.menu });
        this.tracker.start();
        
        // Reiniciar el juego después de un pequeño delay adicional
        setTimeout(() => {
          this.world.gameStarted = true
          this.world.defeatTriggered = false // Asegurar que esté reseteado
          console.log('✅ Juego reiniciado en nivel 1.');
        }, 300)
      } catch (err) {
        console.error('❌ Error al cargar el nivel:', err)
        // Intentar reiniciar de nuevo después de un error
        setTimeout(() => {
          this.resetGameToFirstLevel()
        }, 1000)
      }
    }, 300)
  }


}
