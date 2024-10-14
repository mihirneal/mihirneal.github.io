console.log('fmri_animation.js loaded');
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fmriCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();

    const gridSize = 30;
    const cellSize = Math.max(canvas.width, canvas.height) / gridSize;
    const cols = Math.ceil(canvas.width / cellSize);
    const rows = Math.ceil(canvas.height / cellSize);
    const maxIntensity = 1.5;

    let currentHeatMap = [];
    let targetHeatMap = [];
    let clickCounts = [];

    function initializeHeatMaps() {
        for (let i = 0; i < cols; i++) {
            currentHeatMap[i] = [];
            targetHeatMap[i] = [];
            clickCounts[i] = [];
            for (let j = 0; j < rows; j++) {
                currentHeatMap[i][j] = 0;
                targetHeatMap[i][j] = 0;
                clickCounts[i][j] = 0;
            }
        }
    }

    function createHeatSpot(x, y, intensity, isRandom = false) {
        if (!isRandom) clickCounts[x][y]++;
        const baseRadius = isRandom ? Math.random() * 3 + 2 : 2;
        const maxRadius = isRandom ? Math.random() * 4 + 3 : 3;
        const radius = Math.min(baseRadius + Math.log(clickCounts[x][y] + 1) / 2, maxRadius);
        for (let i = -maxRadius; i <= maxRadius; i++) {
            for (let j = -maxRadius; j <= maxRadius; j++) {
                const distance = Math.sqrt(i*i + j*j);
                if (distance <= radius) {
                    const newX = Math.floor(x + i);
                    const newY = Math.floor(y + j);
                    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
                        const newIntensity = intensity * (1 - distance / radius) * (Math.random() * 0.2 + 0.8);
                        targetHeatMap[newX][newY] = Math.min(maxIntensity, targetHeatMap[newX][newY] + newIntensity);
                    }
                }
            }
        }
    }

    function updateHeatMap() {
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                targetHeatMap[i][j] *= 0.99;
                currentHeatMap[i][j] += (targetHeatMap[i][j] - currentHeatMap[i][j]) * 0.07;
                currentHeatMap[i][j] = Math.min(maxIntensity, currentHeatMap[i][j]);
                if (currentHeatMap[i][j] < 0.01) {
                    clickCounts[i][j] = Math.max(0, clickCounts[i][j] - 0.05);
                }
            }
        }

        if (Math.random() < 0.03) {
            const x = Math.floor(Math.random() * cols);
            const y = Math.floor(Math.random() * rows);
            const intensity = Math.random() * 0.4 + 0.2;
            createHeatSpot(x, y, intensity, true);
        }
    }

    function drawHeatMap() {
        ctx.fillStyle = 'rgba(0, 0, 20, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const intensity = currentHeatMap[i][j];
                if (intensity > 0.01) {
                    const hue = Math.max(0, 240 - intensity * 200);
                    ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${Math.min(1, intensity * 0.8)})`;
                    ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    function animate() {
        updateHeatMap();
        drawHeatMap();
        requestAnimationFrame(animate);
    }

    initializeHeatMaps();
    animate();

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        createHeatSpot(gridX, gridY, 0.7);
    });

    window.addEventListener('resize', () => {
        resizeCanvas();
        initializeHeatMaps();
    });

    console.log('Interactive fMRI Heat Map animation started');
});