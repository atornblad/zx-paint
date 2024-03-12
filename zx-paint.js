
import { ZX } from '/zx-bitmap.js';

const appMenu = document.getElementById('app-menu');
const popoverButtons = [...appMenu.querySelectorAll('button[popovertarget]')];
const allButtons = [...document.querySelectorAll('body > menu button')];

const paintToolsMenu = document.getElementById('paint-tools');
const coloursMenu = document.getElementById('colours');

const colours = [
    '#000000',
    '#0000CC',
    '#CC0000',
    '#CC00CC',
    '#00CC00',
    '#00CCCC',
    '#CCCC00',
    '#CCCCCC',
    '#000000',
    '#3333FF',
    '#FF3333',
    '#FF33FF',
    '#33FF33',
    '#33FFFF',
    '#FFFF33',
    '#FFFFFF'
]

const state = {
    tool: 'pencil',
    colourmode: 'colours',
    colourtarget: 'foreground',
    foreground: 0,
    background: 7,
    bright: 0,
    zoom: 4
};

HTMLElement.prototype.setClassWhen = function (condition, className) {
    if (condition)
        this.classList.add(className);
    else
        this.classList.remove(className);
};

const applyState = (propertyName, value) => {
    if (propertyName) {
        state[propertyName] = value;
    }

    for (const button of allButtons) {
        const command = button.dataset.command;
        if (command) {
            const colonPos = command.indexOf(':');
            if (colonPos >= 1) {
                const stateName = command.substring(0, colonPos);
                const stateValue = command.substring(colonPos + 1);
                button.setClassWhen(state[stateName] === stateValue, 'selected');
            }
        }
    }

    document.querySelector('#colour-foreground > span').style.backgroundColor = colours[state.foreground + 8 * state.bright];
    if (state.background === 8) {
        document.querySelector('#colour-background > span').className = 'keep';
        document.querySelector('#colour-background > span').style.backgroundColor = '';
    }
    else {
        document.querySelector('#colour-background > span').className = '';
        document.querySelector('#colour-background > span').style.backgroundColor = colours[state.background + 8 * state.bright];
    }
};

const commands = {
    setcolour: (value) => {
        const index = parseInt(value, 10);
        applyState(state.colourtarget, index % 8);
        if (index != 0) {
            applyState('bright', index >> 3);
        }
    },
    setkeepbg: () => {
        applyState('background', 8);
    },
    zoomin: () => {
        if (state.zoom < 25) {
            state.zoom += 1;
            repaint();
        }
    },
    zoomout: () => {
        if (state.zoom > 1) {
            state.zoom -= 1;
            repaint();
        }
    }
};

for (const button of popoverButtons) {
    const popoverTargetId = button.getAttribute('popovertarget');
    const popoverTarget = document.getElementById(popoverTargetId);
    popoverTarget.addEventListener('beforetoggle', (e) => {
        const buttonRect = button.getBoundingClientRect();
        popoverTarget.style.top = `${buttonRect.bottom}px`;
        popoverTarget.style.left = `${buttonRect.left}px`;
    });
}

for (const button of allButtons) {
    button.addEventListener('click', (e) => {
        const currentPopover = document.querySelector('body > menu [popover]:popover-open');
        if (currentPopover) {
            currentPopover.hidePopover();
        }
        const command = button.dataset.command;
        if (command) {
            const colonPos = command.indexOf(':');
            const parenPos = command.indexOf('(');
            if (colonPos >= 1) {
                const stateName = command.substring(0, colonPos);
                const stateValue = command.substring(colonPos + 1);
                applyState(stateName, stateValue);
            }
            else if (parenPos >= 1) {
                const commandName = command.substring(0, parenPos);
                const lastEndParen = command.lastIndexOf(')');
                const paramsRaw = command.substring(parenPos + 1, lastEndParen);
                commands[commandName].apply(null, paramsRaw.split(','));
            }
            else {
                commands[command]();
            }
        }
    });
}

const canvas = document.getElementById('paint-canvas');
const context = canvas.getContext('2d');

const hiddenCanvas = new OffscreenCanvas(256, 192);
const bitmap = new ZX.Spectrum.Bitmap({target: hiddenCanvas});

bitmap.ink(state.foreground);
bitmap.paper(state.background);
bitmap.bright(state.bright);
bitmap.over(0);
bitmap.flash(0);
bitmap.realSpectrumCoords(false);
bitmap.cls();

const repaint = () => {
    context.fillStyle = '#eeeeee';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    bitmap.refresh();
    context.drawImage(hiddenCanvas, 0, 0, 256 * state.zoom, 192 * state.zoom);
    if (state.zoom >= 10) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 1;
        context.beginPath();
        for (let x = 0; x <= 256; ++x) {
            context.moveTo(x * state.zoom, 0);
            context.lineTo(x * state.zoom, 192 * state.zoom);
        }
        for (let y = 0; y <= 192; ++y) {
            context.moveTo(0, y * state.zoom);
            context.lineTo(256 * state.zoom, y * state.zoom);
        }
        context.stroke();
        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.beginPath();
        for (let x = 0; x <= 256; ++x) {
            context.moveTo(x * state.zoom - 1, 0);
            context.lineTo(x * state.zoom - 1, 192 * state.zoom);
        }
        for (let y = 0; y <= 192; ++y) {
            context.moveTo(0, y * state.zoom - 1);
            context.lineTo(256 * state.zoom, y * state.zoom - 1);
        }
        context.stroke();
    }
    if (state.zoom >= 4) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = (state.zoom >= 12) ? 3 : 1;
        context.beginPath();
        for (let x = 0; x <= 256; x += 8) {
            context.moveTo(x * state.zoom, 0);
            context.lineTo(x * state.zoom, 192 * state.zoom);
        }
        for (let y = 0; y <= 192; y += 8) {
            context.moveTo(0, y * state.zoom);
            context.lineTo(256 * state.zoom, y * state.zoom);
        }
        context.stroke();
        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.beginPath();
        for (let x = 0; x <= 256; x += 8) {
            context.moveTo(x * state.zoom - 1, 0);
            context.lineTo(x * state.zoom - 1, 192 * state.zoom);
        }
        for (let y = 0; y <= 192; y += 8) {
            context.moveTo(0, y * state.zoom - 1);
            context.lineTo(256 * state.zoom, y * state.zoom - 1);
        }
        context.stroke();
    }
};

const pointers = new Map();

const handlePointer = (e) => {
    e.preventDefault();
    if (e.pressure < 0.1) return;
    const {offsetX: x, offsetY: y} = e;
    const pixelX = (x / state.zoom) | 0;
    const pixelY = (y / state.zoom) | 0;

    if (!pointers.has(e.pointerId)) {
        const newPointer = {
            x: pixelX,
            y: pixelY
        };
        pointers.set(e.pointerId, newPointer);
    }

    const pointer = pointers.get(e.pointerId);

    bitmap.ink(state.foreground);
    bitmap.paper(state.background);
    bitmap.bright(state.bright);
    bitmap.inverse(state.colourtarget === 'background')

    switch (state.tool) {
        case 'pencil':
            bitmap.plot(pixelX, pixelY);
            break;
        case 'brush':
            bitmap.line(pointer.x, pointer.y, pixelX, pixelY);
            break;
    }

    pointer.x = pixelX;
    pointer.y = pixelY;

    bitmap.refresh();
    repaint();
}

const releasePointer = (e) => {
    e.preventDefault();
    pointers.delete(e.pointerId);
}

canvas.addEventListener('pointerdown', handlePointer);
canvas.addEventListener('pointermove', handlePointer);
canvas.addEventListener('pointerup', releasePointer);

bitmap.onFlashChange = () => repaint();

const applyCanvasSize = () => {
    const height = (window.innerHeight - appMenu.offsetHeight) | 0;
    const width = (window.innerWidth - paintToolsMenu.offsetWidth - coloursMenu.offsetWidth) | 0;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    repaint();
};

document.addEventListener('DOMContentLoaded', () => {
    applyState();
});

window.addEventListener('load', () => {
    applyCanvasSize();
});

window.addEventListener('resize', () => {
    applyCanvasSize();
})