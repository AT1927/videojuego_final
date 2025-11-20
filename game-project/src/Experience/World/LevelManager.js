export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;  // Inicias en el nivel 1
        this.totalLevels = 3;   // Total de niveles 
    }

    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            this.currentLevel++;
    
            this.experience.world.clearCurrentScene();
            this.experience.world.loadLevel(this.currentLevel);
    
            // Espera breve para que el nivel se cargue y luego reubicar al robot
            setTimeout(() => {
                // Spawn points diferentes según el nivel
                let spawnPoint;
                if (this.currentLevel === 2) {
                    spawnPoint = { x: -17, y: 1.5, z: -67 };
                } else if (this.currentLevel === 3) {
                    spawnPoint = { x: 5, y: 1.5, z: 5 }; // Ajusta según el nivel 3
                } else {
                    spawnPoint = { x: -17, y: 1.5, z: -67 }; // Default
                }
                this.experience.world.resetRobotPosition(spawnPoint);
            }, 1000)
        }
    }
    

    resetLevel() {
        this.currentLevel = 1;
        this.experience.world.loadLevel(this.currentLevel);
    }


    getCurrentLevelTargetPoints() {
        return this.pointsToComplete?.[this.currentLevel] || 2;
    }
    
}
