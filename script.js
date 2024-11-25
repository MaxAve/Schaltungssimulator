const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

//canvas.width = window.innerWidth - 200
//canvas.height = window.innerHeight

canvas.width = canvas.parentElement.offsetWidth
canvas.height = canvas.parentElement.offsetHeight

const cellSize = 20 // Used for the background grid

let mouseX = 0;
let mouseY = 0;
let draggedObjectID = null
let draggedObjectMouseDiff = {x: 0, y: 0}
const blockSize = {x: cellSize * 5, y: cellSize * 7}
const switchRadius = cellSize

/*
 * Functions
*/

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

function NAND(input) {
	return !AND(input)
}

function NOR(input) {
	return !OR(input)
}

/*
 * Objects
*/

const WIRE = 0
const BLOCK = 1
const SWITCH = 2

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

function genID() {
	return Math.floor(Math.random() * 999999999999999)
}

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
	if(objectMap.get(from).type == BLOCK) {
		//objectMap.get(from).output.push(false)
		objectMap.get(id).valIndex = objectMap.get(from).output.length - 1
	}
}

function update(id) {
	switch(objectMap.get(id).type) {
		case WIRE:
			switch(objectMap.get(objectMap.get(id).from).type) {
				case WIRE:
					objectMap.get(id).powered = objectMap.get(objectMap.get(id).from).powered
					break
				case BLOCK:
					objectMap.get(id).powered = objectMap.get(objectMap.get(id).from).output[objectMap.get(id).valIndex]
					break
				case SWITCH:
					objectMap.get(id).powered = objectMap.get(objectMap.get(id).from).powered
					break
			}
			objectMap.get(objectMap.get(id).to).input[objectMap.get(id).inIndex] |= objectMap.get(id).powered
			break
		case BLOCK:
			objectMap.get(id).output[0] = objectMap.get(id).operation(objectMap.get(id).input)
			break
	}
}

function updateAllOfType(type) {
	for(let [key, obj] of objectMap) {
		if(obj.type == type) {
			update(key)
		}
	}
}

// Logic gates that are available in the menu
const GateType = {
	NOT:  1,
	AND:  2,
	OR:   3,
	NAND: 4,
	NOR:  5,
	XOR:  6,
}

// Creates a new logic gate block object from a selected preset
function addLogicGateBlock(type) {
	let label = '???'
	let inputs = 0
	let outputs = 0
	let operation = null
	switch(type) {
		case GateType.NOT:
			label = 'NOT'
			inputs = 2
			outputs = 1
			operation = NOT
			break
		case GateType.AND:
			label = 'AND'
			inputs = 2
			outputs = 1
			operation = AND
			break
		case GateType.OR:
			label = 'OR'
			inputs = 2
			outputs = 1
			operation = OR
			break
		case GateType.NAND:
			label = 'NAND'
			inputs = 2
			outputs = 1
			operation = NAND
			break
		case GateType.NOR:
			label = 'NOR'
			inputs = 2
			outputs = 1
			operation = NOR
			break
		case GateType.XOR:
			label = 'XOR'
			inputs = 2
			outputs = 1
			operation = XOR
			break
	}
	const objectID = genID() 
	createObject('block', objectID, label)
	objectMap.get(objectID).operation = operation
	objectMap.get(objectID).input = new Array(inputs).fill(false)
	objectMap.get(objectID).output = new Array(outputs).fill(false)
	return objectID
}

/*
 * Event listeners
*/

canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

canvas.addEventListener('mousedown', (event) => {
	switch (event.button) {
		case 0:
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
			break
		case 2:
			for(let [key, obj] of objectMap) {
				if(obj.type == 2 && Math.sqrt(Math.pow(obj.position.x - mouseX, 2) + Math.pow(obj.position.y - mouseY, 2)) <= switchRadius) {
					obj.powered = !obj.powered
				}
			}
			break
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

window.addEventListener('contextmenu', (event) => {
	event.preventDefault() 
});

window.addEventListener('resize', (event) => {
	canvas.width = window.innerWidth - 200
	canvas.height = window.innerHeight
});

/*
 * GUI
*/

function drawLine(x1, y1, x2, y2) {
	ctx.beginPath()
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2)
	ctx.stroke()
}

function drawWire(x1, y1, x2, y2) {
	const half = (x2 - x1) / 2
	drawLine(x1, y1, x1 + half, y1)
	drawLine(x1 + half, y1, x1 + half, y2)
	drawLine(x1 + half, y2, x2, y2)
}

function drawObject(id) {
	const obj = objectMap.get(id)
	ctx.lineWidth = 3
	ctx.strokeStyle = 'black'
	const studLen = 20
	switch(obj.type) {
	case WIRE:
		if(obj.powered)
			ctx.strokeStyle = 'yellow'
		leftStudPositions = []
		rightStudPositions = []

		fromPos = null
		toPos = null

		// Draw wires
		//ctx.beginPath()
		if(objectMap.get(obj.from).type == BLOCK) {
			let relY = (blockSize.y / objectMap.get(obj.from).output.length) * (obj.valIndex + 0.5)
			//ctx.moveTo(objectMap.get(obj.from).position.x + blockSize.x + studLen, objectMap.get(obj.from).position.y + relY/*blockSize.y / 2*/)
			rightStudPositions.push([objectMap.get(obj.from).position.x + blockSize.x, objectMap.get(obj.from).position.y + relY])
			fromPos = [objectMap.get(obj.from).position.x + blockSize.x + studLen, objectMap.get(obj.from).position.y + relY]
		} else if(objectMap.get(obj.from).type == WIRE) {
			//ctx.moveTo(objectMap.get(obj.from).position.x, objectMap.get(obj.from).position.y)
			fromPos = [objectMap.get(obj.from).position.x, objectMap.get(obj.from).position.y]
		} else if(objectMap.get(obj.from).type == SWITCH) {
			//ctx.moveTo(objectMap.get(obj.from).position.x + switchRadius + studLen, objectMap.get(obj.from).position.y)
			fromPos = [objectMap.get(obj.from).position.x + switchRadius + studLen, objectMap.get(obj.from).position.y]
		}
		if(objectMap.get(obj.to).type == BLOCK) {
			let relY = (blockSize.y / objectMap.get(obj.to).input.length) * (obj.inIndex + 0.5)
			//ctx.lineTo(objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY)
			leftStudPositions.push([objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY])
			toPos = [objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY]
		} else if(objectMap.get(obj.to).type == WIRE) {
			//ctx.moveTo(objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y)
			toPos = [objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y]
		}

		drawLine(fromPos[0], fromPos[1], toPos[0], toPos[1])

		//ctx.stroke()
		break
	case BLOCK:	
		ctx.fillStyle = 'white'
		ctx.fillRect(obj.position.x, obj.position.y, blockSize.x, blockSize.y);
		if(id == draggedObjectID) {
			ctx.strokeStyle = 'rgb(200, 200, 200)'
		}
		ctx.fillStyle = 'black'
		ctx.font = "16px Arial";
		ctx.fillText(obj.label, obj.position.x + 5, obj.position.y + 21);
		ctx.beginPath();
		ctx.rect(obj.position.x, obj.position.y, blockSize.x, blockSize.y);
		ctx.stroke()

		// Right studs
		for(let i = 0; i < obj.output.length; i++) {
			ctx.strokeStyle = (obj.output[i] ? 'yellow' : 'black')
			let relY = (blockSize.y / obj.output.length) * (i + 0.5)
			drawLine(obj.position.x + blockSize.x, obj.position.y + relY, obj.position.x + blockSize.x + studLen, obj.position.y + relY)
			/*ctx.beginPath()
			ctx.moveTo(obj.position.x + blockSize.x, obj.position.y + relY)
			ctx.lineTo(obj.position.x + blockSize.x + studLen, obj.position.y + relY)
			ctx.stroke()*/
		}
		// Left studs
		for(let i = 0; i < obj.input.length; i++) {
			ctx.strokeStyle = (obj.input[i] ? 'yellow' : 'black')
			ctx.beginPath()
			let relY = (blockSize.y / obj.input.length) * (i + 0.5)
			ctx.moveTo(obj.position.x, obj.position.y + relY)
			ctx.lineTo(obj.position.x - studLen, obj.position.y + relY)
			ctx.stroke()
		}
		break
	case SWITCH:
		ctx.beginPath();
		ctx.arc(obj.position.x, obj.position.y, switchRadius, 0, 2 * Math.PI);
		ctx.fillStyle = (obj.powered ? "yellow" : 'rgb(200, 200, 200)');
		ctx.fill();
		ctx.strokeStyle = "black";
		ctx.stroke();
		
		// Stud
		ctx.strokeStyle = (obj.powered ? 'yellow' : 'black')
		ctx.beginPath()
		ctx.moveTo(obj.position.x + switchRadius, obj.position.y)
		ctx.lineTo(obj.position.x + studLen + switchRadius, obj.position.y)
		ctx.stroke()
		break
	}
}

//createObject('block', 69, 'NAND');
//objectMap.get(69).operation = NAND 
const id69 = addLogicGateBlock(GateType.NAND)
createObject('block', 70, 'XOR');
createObject('block', 71, 'XOR');
objectMap.get(70).operation = XOR
objectMap.get(71).operation = XOR
objectMap.get(70).input.push(false)
connectWire(id69, 70, 4)
connectWire(id69, 71,99)
objectMap.get(99).valIndex = 0
//connectWire(69, 70, 5)
//objectMap.get(5).inIndex = 1
objectMap.get(4).valIndex = 0
//objectMap.get(5).valIndex = 0
objectMap.get(id69).output.pop()
/*createObject('block', 79, 'XOR');
connectWire(69, 79)
connectWire(69, 79)
connectWire(69, 79)
createObject('block', 420, 'NOT');
objectMap.get(420).input.push(false)
connectWire(69, 420, 15)
objectMap.get(15).inIndex = 1
connectWire(79, 420)*/
createObject('switch', 2)
createObject('switch', 3)
connectWire(2, id69)
connectWire(3, id69, 23)
objectMap.get(23).inIndex = 1

function draw() {
	if(draggedObjectID != null) {
		objectMap.get(draggedObjectID).position.x = (mouseX + draggedObjectMouseDiff.x) - ((mouseX + draggedObjectMouseDiff.x) % cellSize)
		objectMap.get(draggedObjectID).position.y = (mouseY + draggedObjectMouseDiff.y) - ((mouseY + draggedObjectMouseDiff.y) % cellSize)
	}

    ctx.clearRect(0, 0, canvas.width, canvas.height)

	// Background lines
	ctx.strokeStyle = "rgb(240, 240, 240)"
	ctx.lineWidth = 1
	for(let i = 0; i <= canvas.width; i += cellSize) {
		ctx.beginPath()
		ctx.moveTo(i, 0)
		ctx.lineTo(i, canvas.height)
		ctx.stroke()
	}
	for(let i = 0; i <= canvas.height; i += cellSize) {
		ctx.beginPath()
		ctx.moveTo(0, i)
		ctx.lineTo(canvas.width, i)
		ctx.stroke()
	}

	for(let [key, obj] of objectMap) {
		drawObject(key)
		if(obj.type == BLOCK) {
			for(let i = 0; i < obj.input.length; i++) {
				obj.input[i] = false
			}
		}
	}
	
	updateAllOfType(WIRE)
	updateAllOfType(BLOCK)

	requestAnimationFrame(draw);
}

draw();

