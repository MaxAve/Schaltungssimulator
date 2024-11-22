const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let mouseX = 0;
let mouseY = 0;
let draggedObjectID = null
let draggedObjectMouseDiff = {x: 0, y: 0}
const blockSize = {x: 100, y: 150}
const switchRadius = 30

function AND(input) {
	let res = input[0]
	for(let i = 1; i < input.length; i++)
		res = res && input[i]
	return res
}

function OR(input) {
	let res = input[0]
	for(let i = 1; i < input.length; i++)
		res = res || input[i]
	return res
}

function NOT(input) {
	let res = []
	for(let i = 0; i < input.length; i++)
		res.push(!input[i])
	return res
}

function XOR(input) {
	for(let i = 1; i < input.length; i++)
		if(input[i] == input[i - 1])
			return false;
	return true;
}

// Object presets
const objectPresets = {
	'wire': {
		type: 0,
		from: null,
		to: null,
		valIndex: 0,
		inIndex: 0,
		powered: false,
	},
	'block': {
		type: 1,
		label: null,
		position: {
			x: 0,
			y: 0,
		},
		input: [false],
		output: [],
		operation: null,
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

function connectWire(from, to, objID=null) {
	let id
	if (objID == null)
		id = Math.floor(Math.random() * 999999999999999)
	else
		id = objID
	createObject('wire', id);
	objectMap.get(id).from = from
	objectMap.get(id).to = to
	objectMap.get(from).output.push(false)
	objectMap.get(id).valIndex = objectMap.get(from).output.length - 1
}

function update(id) {
	switch(objectMap.get(id).type) {
	case 0:
		objectMap.get(objectMap.get(id).to).input = objectMap.get(objectMap.get(id).from).output
		break
	case 1:
		objectMap.get(id).output = objectMap.get(id).operation(objectMap.get(id).input)
		break
	}
}

const rectWidth = 50;
const rectHeight = 30;

canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

canvas.addEventListener('mousedown', (event) => {
	for(let [key, obj] of objectMap) {
		if(obj.type == 1 && mouseX >= obj.position.x && mouseY >= obj.position.y && mouseX <= (obj.position.x + blockSize.x) && mouseY <= (obj.position.y + blockSize.y)) {
			draggedObjectID = key
			draggedObjectMouseDiff.x = obj.position.x - mouseX
			draggedObjectMouseDiff.y = obj.position.y - mouseY
		} else if(obj.type == 2 && Math.sqrt(Math.pow(obj.position.x - mouseX, 2) + Math.pow(obj.position.y - mouseY, 2)) <= switchRadius) {
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
	if (event.key === 'q' || event.key === 'Q') {
		createObject('switch', Math.floor(Math.random() * 999999999999999));
	}
});

function drawObject(id) {
	const obj = objectMap.get(id)
	ctx.lineWidth = 2;
	ctx.strokeStyle = 'black'
	switch(obj.type) {
	case 0:
		ctx.beginPath()
		let relY = (blockSize.y / objectMap.get(obj.from).output.length) * (obj.valIndex + 0.5)
		ctx.moveTo(objectMap.get(obj.from).position.x + blockSize.x, objectMap.get(obj.from).position.y + relY/*blockSize.y / 2*/)
		relY = (blockSize.y / objectMap.get(obj.to).input.length) * (obj.inIndex + 0.5)
		ctx.lineTo(objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y + relY)
		ctx.stroke()
		break
	case 1:	
		ctx.fillStyle = 'white'
		ctx.fillRect(obj.position.x, obj.position.y, 100, 150);
		if(id == draggedObjectID) {
			ctx.strokeStyle = 'rgb(200, 200, 200)'
		}
		ctx.fillStyle = 'black'
		ctx.font = "16px Arial";
		ctx.fillText(obj.label, obj.position.x + 5, obj.position.y + 21);
		ctx.beginPath();
		ctx.rect(obj.position.x, obj.position.y, 100, 150);
		ctx.stroke();
		break
	case 2:
		ctx.beginPath();
		ctx.arc(obj.position.x, obj.position.y, switchRadius, 0, 2 * Math.PI);
		ctx.fillStyle = "white";
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "black";
		ctx.stroke();
		break
	}
}

createObject('block', 69, 'NAND');
createObject('block', 79, 'XOR');
connectWire(69, 79)
connectWire(69, 79)
connectWire(69, 79)
createObject('block', 420, 'NOT');
objectMap.get(420).input.push(false)
connectWire(69, 420, 15)
objectMap.get(15).inIndex = 1
connectWire(79, 420)

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

