import gsap from 'gsap'

export default class CircularMenu {
  constructor({ container, vrIntegration, onAudioToggle, onWalkMode, onFullscreen, onCancelGame }) {
    this.container = container
    this.vrIntegration = vrIntegration
    this.isOpen = false
    this.actionButtons = []

    // Estilo base de los botones
    const baseStyle = `
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 255, 247, 0.12);
      color: #00fff7;
      font-size: 20px;
      border: 1px solid rgba(0, 255, 247, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px #00fff7;
      backdrop-filter: blur(4px);
      z-index: 9999;
      transition: all 0.3s ease;
    `

    const hoverStyle = `
      background: rgba(0, 255, 247, 0.25);
      box-shadow: 0 0 15px #00fff7, 0 0 30px #00fff7;
      transform: scale(1.1);
    `

    // Botón flotante principal ⚙️
    this.toggleButton = document.createElement('button')
    this.toggleButton.innerText = '⚙️'
    this.toggleButton.title = 'Mostrar menú'
    this.toggleButton.setAttribute('aria-label', 'Mostrar menú')
    this.toggleButton.style.cssText = baseStyle + 'top: 80px; right: 20px;'
    container.appendChild(this.toggleButton)
    // Ocultar inicialmente
    this.toggleButton.style.display = 'none'
    this.toggleButton.addEventListener('click', () => this.toggleMenu())

    // Lista de botones de acción
    const actions = [
      { icon: '🔊', title: 'Audio', onClick: onAudioToggle },
      { icon: '🚶', title: 'Modo Caminata', onClick: onWalkMode },
      { icon: '🖥️', title: 'Pantalla Completa', onClick: onFullscreen },
      { icon: '🥽', title: 'Modo VR', onClick: () => this.vrIntegration.toggleVR() },
      { icon: '👨‍💻', title: 'Acerca de', onClick: () => this.showAboutModal() },
      { icon: '❌', title: 'Cancelar Juego', onClick: onCancelGame }
    ]

    actions.forEach((action, index) => {
      const btn = document.createElement('button')
      btn.innerText = action.icon
      btn.title = action.title
      btn.setAttribute('aria-label', action.title)

      Object.assign(btn.style, {
        position: 'fixed',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(0, 255, 247, 0.12)',
        color: '#00fff7',
        fontSize: '20px',
        border: '1px solid rgba(0, 255, 247, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 10px #00fff7',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        top: `${140 + index * 60}px`,
        right: '20px',
        opacity: '0',
        pointerEvents: 'none'
      })

      btn.addEventListener('click', () => {
        action.onClick()
        this.toggleMenu()
      })

      btn.addEventListener('mouseenter', () => btn.style.cssText += hoverStyle)
      btn.addEventListener('mouseleave', () => btn.style.cssText = btn.style.cssText.replace(hoverStyle, ''))

      this.container.appendChild(btn)
      this.actionButtons.push(btn)
    })

    // HUD: Tiempo
    this.timer = document.createElement('div')
    this.timer.id = 'hud-timer'
    this.timer.innerText = '⏱ 0s'
    Object.assign(this.timer.style, {
      position: 'fixed',
      top: '16px',
      left: '70px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.timer)

    // HUD: Nivel
    this.levelLabel = document.createElement('div')
    this.levelLabel.id = 'hud-level'
    this.levelLabel.innerText = '📍 Nivel: 1'
    Object.assign(this.levelLabel.style, {
      position: 'fixed',
      top: '16px',
      right: '20px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.levelLabel)

    // HUD: Puntos del nivel actual
    this.status = document.createElement('div')
    this.status.id = 'hud-points'
    this.status.innerText = '🎖️ Puntos: 0'
    Object.assign(this.status.style, {
      position: 'fixed',
      top: '50px',
      right: '20px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.status)

    // HUD: Puntos totales acumulados
    this.totalPointsLabel = document.createElement('div')
    this.totalPointsLabel.id = 'hud-total-points'
    this.totalPointsLabel.innerText = '⭐ Total: 0'
    Object.assign(this.totalPointsLabel.style, {
      position: 'fixed',
      top: '84px',
      right: '20px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.6)',
      color: '#FFD700',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.totalPointsLabel)

    // HUD: Jugadores

    this.playersLabel = document.createElement('div')
    this.playersLabel.id = 'hud-players'
    this.playersLabel.innerText = '👥 Jugadores: 1'
    Object.assign(this.playersLabel.style, {
      position: 'fixed',
      top: '16px',
      left: '140px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.playersLabel)

  }

  //Mostrar modal acerca de
  showAboutModal() {
    if (this.aboutContainer) return // evita duplicados

    this.aboutContainer = document.createElement('div')
    Object.assign(this.aboutContainer.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.95)',
      padding: '20px',
      borderRadius: '12px',
      color: '#fff',
      zIndex: 10000,
      textAlign: 'center',
      fontFamily: 'sans-serif',
      maxWidth: '300px',
      boxShadow: '0 0 20px #00fff7'
    })

    // Datos del desarrollador - Personaliza estos valores
    const developerInfo = {
      name: 'Edgar Andres Torres Muñoz - 809977',
      university: 'UCC Campus Pasto',
      project: 'Proyecto interactivo Video Juego Educativo con Three.js',
      email: 'atmunoz1927@gmail.com',
    }

    this.aboutContainer.innerHTML = `
          <h2 style="margin-bottom: 10px;">👨‍💻 Desarrollador</h2>
          <p style="margin: 0; font-weight: bold; font-size: 16px;">${developerInfo.name}</p>
          <p style="margin: 5px 0 0; font-size: 14px; color: #00fff7;">${developerInfo.university}</p>
          <p style="margin: 10px 0 0; font-size: 13px; color: #ccc;">${developerInfo.project}</p>
          <p style="margin: 8px 0 0; font-size: 13px;">
            <a href="mailto:${developerInfo.email}" style="color: #00fff7; text-decoration: none;">${developerInfo.email}</a>
          </p>
          <button style="
            margin-top: 12px;
            padding: 6px 14px;
            font-size: 14px;
            background: #00fff7;
            color: black;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s;
          " onmouseover="this.style.background='#00ccff'" onmouseout="this.style.background='#00fff7'">Cerrar</button>
        `

    const closeBtn = this.aboutContainer.querySelector('button')
    closeBtn.onclick = () => {
      this.aboutContainer.remove()
      this.aboutContainer = null
    }

    document.body.appendChild(this.aboutContainer)
  }




  toggleMenu() {
    this.isOpen = !this.isOpen

    this.actionButtons.forEach((btn, index) => {
      const delay = index * 0.05
      if (this.isOpen) {
        gsap.to(btn, {
          opacity: 1,
          y: 0,
          pointerEvents: 'auto',
          delay,
          duration: 0.3,
          ease: 'power2.out'
        })
      } else {
        gsap.to(btn, {
          opacity: 0,
          y: -10,
          pointerEvents: 'none',
          delay,
          duration: 0.2,
          ease: 'power2.in'
        })
      }
    })
  }

  setStatus(text) {
    if (this.status) this.status.innerText = text
  }

  setTimer(seconds) {
    if (this.timer) this.timer.innerText = `⏱ ${seconds}s`
  }

  //Contador jugadores
  setPlayerCount(count) {
    if (this.playersLabel) {
      this.playersLabel.innerText = `👥 Jugadores: ${count}`
    }
  }

  // Actualizar nivel actual
  setLevel(level) {
    if (this.levelLabel) {
      this.levelLabel.innerText = `📍 Nivel: ${level}`
    }
  }

  // Actualizar puntos totales acumulados
  setTotalPoints(totalPoints) {
    if (this.totalPointsLabel) {
      this.totalPointsLabel.innerText = `⭐ Total: ${totalPoints}`
    }
  }


  destroy() {
    this.toggleButton?.remove()
    this.actionButtons?.forEach(btn => btn.remove())
    this.timer?.remove()
    this.status?.remove()
    this.levelLabel?.remove()
    this.totalPointsLabel?.remove()
    this.playersLabel?.remove()
  }
}
