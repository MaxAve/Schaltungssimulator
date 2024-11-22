const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

let mouseX = 0;
let mouseY = 0;
let draggedObjectID = null
let draggedObjectMouseDiff = {x: 0, y: 0}
const blockSize = {x: 100, y: 150}

// Object presets
const objectPresets = {
	'wire': {
		type: 0,
		from: null,
		to: null,
		valIndex: 0,
	},
	'block': {
		type: 1,
		position: {
			x: 0,
			y: 0,
		},
		input: [],
		output: [],
		label: null
	},
	'switch': {
		type: 2,
		position: {
			x: 0,
			y: 0,
		},
		powered: false,
	},
}

const objectMap = new Map();

function createObject(type, id, label) {
	console.log(`Creating object of type ${type}`)
	const obj = JSON.parse(JSON.stringify((objectPresets[type])))
	if(obj.type > 0) {
		obj.position.x = canvas.width / 2 + Math.floor(Math.random() * 40) - 20
		obj.position.y = canvas.height / 2 + Math.floor(Math.random() * 40) - 20
	}
	obj.label = label
	objectMap.set(id, obj)
}

function connectWire(from, to) {
	let id = Math.floor(Math.random() * 999999999999999)
	createObject('wire', id);
	objectMap.get(id).from = from
	objectMap.get(id).to = to
	objectMap.get(from).output.push(false)
	objectMap.get(id).valIndex = objectMap.get(from).output.length - 1
	
	console.log(objectMap.get(id).valIndex) 
	console.log(objectMap.get(from).output) 
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const rectWidth = 50;
const rectHeight = 30;

canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

canvas.addEventListener('mousedown', (event) => {
	for(let [key, obj] of objectMap) {
		if(obj.type > 0 && mouseX >= obj.position.x && mouseY >= obj.position.y && mouseX <= (obj.position.x + blockSize.x) && mouseY <= (obj.position.y + blockSize.y)) {
			draggedObjectID = key
			draggedObjectMouseDiff.x = obj.position.x - mouseX
			draggedObjectMouseDiff.y = obj.position.y - mouseY
		}
	}
});

canvas.addEventListener('mouseup', (event) => {
	if(draggedObjectID != null) {
		draggedObjectID = null;
	}
});

window.addEventListener('keydown', (event) => {
	if (event.key === 'w' || event.key === 'W') {
		createObject('block', Math.floor(Math.random() * 999999999999999), 'neues element');
	}
});

function drawObject(id) {
	const obj = objectMap.get(id)
	switch(obj.type) {
	case 0:
		ctx.strokeStyle = 'black'
		ctx.beginPath()
		ctx.moveTo(objectMap.get(obj.from).position.x + blockSize.x, objectMap.get(obj.from).position.y + blockSize.y / 2)
		ctx.lineTo(objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y + blockSize.y / 2)
		ctx.stroke()
		break
	case 1:	
		ctx.fillStyle = 'white'
		ctx.fillRect(obj.position.x, obj.position.y, 100, 150);
		ctx.strokeStyle = 'black'
		ctx.fillStyle = 'black'
		ctx.font = "16px Arial";
		ctx.fillText(obj.label, obj.position.x + 5, obj.position.y + 21);
		ctx.beginPath();
		ctx.rect(obj.position.x, obj.position.y, 100, 150);
		ctx.stroke();
		break
	}
}

createObject('block', 69, 'NAND');
createObject('block', 79, 'XOR');
connectWire(69, 79)
connectWire(69, 79)

function draw() {
	if(draggedObjectID != null) {
		objectMap.get(draggedObjectID).position.x = mouseX + draggedObjectMouseDiff.x
		objectMap.get(draggedObjectID).position.y = mouseY + draggedObjectMouseDiff.y
	}

    ctx.clearRect(0, 0, canvas.width, canvas.height);

	for(let [key, obj] of objectMap) {
		drawObject(key)
	}

	requestAnimationFrame(draw);
}

draw();

