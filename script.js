// === Конфигурация ===
const size = 10;
let tool = 'shovel';
const grid = [];

// === Панель инструментов ===
function selectTool(t) {
    tool = t;
    document.querySelectorAll('#toolbar button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(t + 'Btn');
    if (btn) btn.classList.add('active');
}
selectTool('shovel');

// === Базовый класс Клетка ===
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.moisture = 0;
        this.plant = null;

        this.el = document.createElement('div');
        this.el.className = 'cell';
        this.el.onclick = () => this.interact();

        // Прогресс-бар создаётся в клетке
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress';
        this.progressFill = document.createElement('div');
        this.progressBar.appendChild(this.progressFill);
        this.el.appendChild(this.progressBar);

        document.getElementById('grid').appendChild(this.el);
        this.render();
    }

    interact() {
        // Переопределяется в наследниках
    }

    render() {
        // Общая логика отрисовки прогресса
        if (this.plant) {
            this.progressFill.style.width = Math.min(this.plant.growth * 10, 100) + '%';
            if (!this.plant.alive) {
                this.el.classList.add('dead');
            } else {
                this.el.classList.remove('dead');
            }
        } else {
            this.progressFill.style.width = '0%';
            this.el.classList.remove('dead');
        }
    }
}

// === Земля ===
class LandCell extends Cell {
    constructor(x, y) {
        super(x, y);
        this.type = 'land';
        this.el.classList.add('land');
    }

    interact() {
        if (tool === 'shovel') {
            this.plant = null;
        } else if (tool === 'bucket') {
            const water = new WaterCell(this.x, this.y);
            grid[this.y][this.x] = water;
            this.el.replaceWith(water.el);
        } else if (['potato', 'cactus', 'swamp'].includes(tool)) {
            if (!this.plant) {
                if (tool === 'potato') this.plant = new Potato(this);
                if (tool === 'cactus') this.plant = new Cactus(this);
                if (tool === 'swamp') this.plant = new Swamp(this);
            }
        }
        updateMoisture();
        this.render();
    }

    render() {
        super.render();
        // Цвет земли зависит от влажности
        const m = this.moisture;
        const r = Math.floor(249 - m * 40);
        const g = Math.floor(245 - m * 80);
        const b = Math.floor(231 - m * 120);

        this.el.classList.remove('water');
        this.el.classList.add('land');
        this.el.style.backgroundColor = `rgb(${r},${g},${b})`;

        // Убираем старый текст и вставляем иконку растения
        this.el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) this.el.removeChild(node);
        });
        if (this.plant) {
            this.el.insertBefore(document.createTextNode(this.plant.icon), this.progressBar);
        }
    }
}

// === Вода ===
class WaterCell extends Cell {
    constructor(x, y) {
        super(x, y);
        this.type = 'water';
        this.moisture = 1.0;
        this.el.classList.add('water');
    }

    interact() {
        if (tool === 'bucket') {
            const land = new LandCell(this.x, this.y);
            grid[this.y][this.x] = land;
            this.el.replaceWith(land.el);
            updateMoisture();
        }
        this.render();
    }

    render() {
        super.render();
        this.el.classList.remove('land');
        this.el.classList.add('water');
        this.el.style.backgroundColor = '';
        // Убираем текстовые узлы
        this.el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) this.el.removeChild(node);
        });
    }
}

// === Растения ===
class Plant {
    constructor(cell) {
        this.cell = cell;
        this.growth = 0;
        this.alive = true;
        this.icon = '?';
        this.minMoisture = 0;
        this.maxMoisture = 1;
    }
    tick() {
        if (!this.alive) return;
        const m = this.cell.moisture;
        if (m < this.minMoisture || m > this.maxMoisture) {
            this.alive = false;
            this.icon = '✖';
        } else {
            this.growth++;
        }
    }
}

class Potato extends Plant {
    constructor(cell) {
        super(cell);
        this.icon = '🥔';
        this.minMoisture = 0.6;
        this.maxMoisture = 0.8;
    }
}

class Cactus extends Plant {
    constructor(cell) {
        super(cell);
        this.icon = '🌵';
        this.minMoisture = 0.0;
        this.maxMoisture = 0.0;
    }
}

class Swamp extends Plant {
    constructor(cell) {
        super(cell);
        this.icon = '🌿';
        this.minMoisture = 0.8;
        this.maxMoisture = 1.0;
    }
}

// === Инициализация сетки ===
for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
        row.push(new LandCell(x, y));
    }
    grid.push(row);
}

// === Логика влажности ===
function updateMoisture() {
    const waterCells = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (cell instanceof WaterCell) {
                waterCells.push(cell);
            }
        }
    }

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = grid[r][c];

            if (cell instanceof WaterCell) {
                cell.moisture = 1.0;
                continue;
            }

            if (waterCells.length === 0) {
                cell.moisture = 0.0;
                continue;
            }

            let minDist = Infinity;
            for (const w of waterCells) {
                const d = Math.abs(w.x - cell.x) + Math.abs(w.y - cell.y);
                if (d < minDist) minDist = d;
                if (minDist === 1) break;
            }

            if (minDist === 1) {
                cell.moisture = 0.8;
            } else if (minDist === 2) {
                cell.moisture = 0.6;
            } else {
                cell.moisture = 0.0;
            }
        }
    }
    renderAll();
}


function renderAll() {
    for (let row of grid) {
        for (let cell of row) {
            cell.render();
        }
    }
}

setInterval(() => {
    for (let row of grid) {
        for (let cell of row) {
            if (cell.plant) cell.plant.tick();
        }
    }
    renderAll();
}, 2000);
