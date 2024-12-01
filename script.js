const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

canvas.width = canvas.parentElement.offsetWidth
canvas.height = canvas.parentElement.offsetHeight

let sketchName = 'Unbenannte Skizze'

const cellSize = 20 // Used for the background grid

let mouseDown = false
let mouseX = 0;
let mouseY = 0;
let draggedObjectID = null
let draggedObjectMouseDiff = {x: 0, y: 0}

let downloadButton = document.querySelector("#download-button")
let renameButton = document.querySelector("#rename-button")
let uploadConfirmButton = document.querySelector("#upload-button")
let colorSchemeToggleButton = document.querySelector("#color-scheme-toggle")

let bnot = document.querySelector("#bnot")
let band = document.querySelector("#band")
let bor = document.querySelector("#bor")
let bxor = document.querySelector("#bxor")
let bnand = document.querySelector("#bnand")
let bnor = document.querySelector("#bnor")
let bxnor = document.querySelector("#bxnor")
let bkk = document.querySelector("#bkk")
let bsch = document.querySelector("#bsch")
let bgb = document.querySelector("#bgb")

const blockSize = {x: cellSize * 5, y: cellSize * 7}
const switchRadius = cellSize

const sketchOffset = {x: 0, y: 0}

// Used for rendering objects with scrolling and zoom offset
function toScreenX(worldX) {return worldX + sketchOffset.x}
function toScreenY(worldY) {return worldY + sketchOffset.y}

const preDragMousePos = {x: 0, y: 0}
const dragDiff = {x: 0, y: 0}
let draggingSketch = false

let connectingWires = false

let deltaTime = 0

// Sprites
class Sprite {
	constructor(imagePath) {
		this.hidden = false
		this.position = {x: 0, y: 0}
		this.scale = {x: 1, y: 1}
		this.image = new Image()
		this.image.src = imagePath
		this.velocity = {x: 0, y: 0, rotation: 0}
		this.acceleration = {x: 0, y: 0, rotation: 0}
		this.rotation = 0
	}

	draw() {
		if(!this.hidden) {
			ctx.save()
			ctx.translate(this.position.x, this.position.y)
			ctx.rotate(this.rotation)
			ctx.drawImage(this.image, -this.image.width * this.scale.x / 2, -this.image.width * this.scale.y, this.image.width * this.scale.x, this.image.height * this.scale.y)
			ctx.restore()
		}
	}

	update() {
		this.position.x        += this.velocity.x * deltaTime / 1000
		this.position.y        += this.velocity.y * deltaTime / 1000
		this.rotation          += this.velocity.rotation * deltaTime / 1000
		this.velocity.x        += this.acceleration.x * deltaTime / 1000
		this.velocity.y        += this.acceleration.y * deltaTime / 1000
		this.velocity.rotation += this.acceleration.rotation * deltaTime / 1000
	}
}

const flashbangSprite = new Sprite('assets/flashbang.png')
flashbangSprite.hidden = true
flashbangSprite.scale.x = 0.4
flashbangSprite.scale.y = 0.4

/*const flashbangImage = new Image()
flashbangImage.src = 'assets/flashbang.png'
let flashbangPosition = {x: 0, y: 0}
let showFlashbang = false;*/

//wireOnColor = 'rgb(252, 215, 27)'

const colorSchemes = {
	flashbang: {
		id: 0,
		outline: 'black',
		background: 'white',
		lineColor: 'rgb(230, 230, 230)',
		textColor: 'black',
		wireOnColor: 'rgb(252, 215, 27)',
		wireOffColor: 'black',
	},
	dracula: {
		id: 1,
		outline: 'hsl(323, 70%, 60%)',
		background: 'rgb(48, 48, 48)',
		lineColor: 'rgb(60, 60, 60)',
		textColor: 'rgb(209, 209, 209)',
		wireOnColor: 'rgb(249, 247, 121)',
		wireOffColor: 'rgb(176, 135, 255)',
	},
}

let selectedColorScheme = colorSchemes.dracula

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

function XNOR(input) {
	return !XOR(input)
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
		size: {
			x: blockSize.x,
			y: blockSize.y,
		},
		input: [false],
		output: [],
		operation: null,
		invertsOutput: false,
		isSquare: false,
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
	XNOR: 7,
}

// Creates a new logic gate block object from a selected preset
function addLogicGateBlock(type) {
	let label = '???'
	let inputs = 0
	let outputs = 0
	let operation = null
	let invertsOutput = false
	let isSquare = false
	let height = blockSize.y
	switch(type) {
		case GateType.NOT:
			label = '1'
			inputs = 1
			outputs = 1
			operation = NOT
			isSquare = true
			invertsOutput = true
			height = blockSize.x
			break
		case GateType.AND:
			label = '&'
			inputs = 2
			outputs = 1
			operation = AND
			break
		case GateType.OR:
			label = '≥1'
			inputs = 2
			outputs = 1
			operation = OR
			break
		case GateType.NAND:
			label = '&'
			inputs = 2
			outputs = 1
			operation = NAND
			invertsOutput = true
			break
		case GateType.NOR:
			label = '≥1'
			inputs = 2
			outputs = 1
			operation = NOR
			invertsOutput = true;
			break
		case GateType.XOR:
			label = '=1'
			inputs = 2
			outputs = 1
			operation = XOR
			break
		case GateType.XNOR:
			label = '=1'
			inputs = 2
			outputs = 1
			operation = XNOR
			invertsOutput = true
			break
	}
	const objectID = genID() 
	createObject('block', objectID, label)
	objectMap.get(objectID).operation = operation
	objectMap.get(objectID).invertsOutput = invertsOutput
	//objectMap.get(objectID).isSquare = isSquare
	objectMap.get(objectID).size.y = height
	objectMap.get(objectID).input = new Array(inputs).fill(false)
	objectMap.get(objectID).output = new Array(outputs).fill(false)
	return objectID
}

// Saves the entire sketch as a JSON string
function save() {
	objectMapObj = {}
	for(let [id, obj] of objectMap) {
		objectMapObj[id] = obj
	}
	//print(objectMapObj)
	return JSON.stringify(objectMapObj)
}

function getDistance(x1, y1, x2, y2)
{
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/*
 * Event listeners
*/

canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;

	if(draggingSketch && !connectingWires) {
		dragDiff.x = preDragMousePos.x - mouseX	
		dragDiff.y = preDragMousePos.y - mouseY
		sketchOffset.x -= dragDiff.x
		sketchOffset.y -= dragDiff.y
		dragDiff.x = 0
		dragDiff.y = 0
		preDragMousePos.x = mouseX
		preDragMousePos.y = mouseY
	}
});

canvas.addEventListener('mousedown', (event) => {
	mouseDown = true
	worldMouseX = (mouseX - sketchOffset.x) + cellSize + (mouseX - sketchOffset.x) % cellSize // TODO this is a temporary fix, find out problem (likely to do with the way objects are snapped into place)
	worldMouseY = (mouseY - sketchOffset.y) + cellSize + (mouseY - sketchOffset.y) % cellSize
	switch (event.button) {
		case 0:
			draggingObject = false
			for(let [key, obj] of objectMap) {
				if(obj.type == 1 && worldMouseX >= obj.position.x && worldMouseY >= obj.position.y && worldMouseX <= (obj.position.x + obj.size.x) && worldMouseY <= (obj.position.y + obj.size.y)) {
					draggedObjectID = key
					draggedObjectMouseDiff.x = obj.position.x - mouseX
					draggedObjectMouseDiff.y = obj.position.y - mouseY
					draggingObject = true
				} else if(obj.type == 2 && /*Math.sqrt(Math.pow(obj.position.x - worldMouseX, 2) + Math.pow(obj.position.y - (worldMouseY), 2))*/getDistance(obj.position.x, obj.position.y, worldMouseX, worldMouseY) <= switchRadius) {
					draggedObjectID = key
					draggedObjectMouseDiff.x = obj.position.x - mouseX
					draggedObjectMouseDiff.y = obj.position.y - mouseY
					draggingObject = true
				}
			}
			if(!draggingObject) {
				draggingSketch = true
				preDragMousePos.x = mouseX
				preDragMousePos.y = mouseY
			}
			break
		case 2:
			for(let [key, obj] of objectMap) {
				if(obj.type == 2 && /*Math.sqrt(Math.pow(obj.position.x - (worldMouseX), 2) + Math.pow(obj.position.y - (worldMouseY), 2))*/getDistance(obj.position.x, obj.position.y, worldMouseX, worldMouseY) <= switchRadius) {
					obj.powered = !obj.powered
				}
			}
			break
	}
});

canvas.addEventListener('mouseup', (event) => {
	mouseDown = false
	draggingSketch = false
	if(draggedObjectID != null) {
		draggedObjectID = null;
	}
	connectingWires = false
});

window.addEventListener('keydown', (event) => {
});

window.addEventListener('contextmenu', (event) => {
	event.preventDefault() 
});

window.addEventListener('resize', (event) => {
	canvas.width = window.innerWidth - 200
	canvas.height = window.innerHeight
});

downloadButton.addEventListener("click", () => {
	let valueinput = save()
    let blobdtMIME = new Blob([valueinput], { type: "text/plain" })
    let url = URL.createObjectURL(blobdtMIME)
    let anele = document.createElement("a")
    anele.setAttribute("download", `${sketchName}.json`);
    anele.href = url;
    anele.click();
})

uploadConfirmButton.addEventListener("click", () => {
	if(confirm('Achtung: beim hochladen wird die jetzige Skizze gelöscht!')) {
		console.log('TODO: Upload file')
	}
})

bnot.addEventListener("click", () => {
	addLogicGateBlock(GateType.NOT)
})

band.addEventListener("click", () => {
	addLogicGateBlock(GateType.AND)
})

bor.addEventListener("click", () => {
	addLogicGateBlock(GateType.OR)
})

bxor.addEventListener("click", () => {
	addLogicGateBlock(GateType.XOR)
})

bnand.addEventListener("click", () => {
	addLogicGateBlock(GateType.NAND)
})

bnor.addEventListener("click", () => {
	addLogicGateBlock(GateType.NOR)
})

bxnor.addEventListener("click", () => {
	addLogicGateBlock(GateType.XNOR)
})

bkk.addEventListener("click", () => {
})

bsch.addEventListener("click", () => {
})

bgb.addEventListener("click", () => {
})

colorSchemeToggleButton.addEventListener("click", () => {
	if(selectedColorScheme.id == 0) {
		selectedColorScheme = colorSchemes.dracula
	}
	else if(selectedColorScheme.id == 1) {
		flashbangSprite.hidden = false
		flashbangSprite.position.x = -100
		flashbangSprite.position.y = 0
		flashbangSprite.velocity.x = 800
		flashbangSprite.velocity.rotation = 15
		flashbangSprite.acceleration.x = -200
		flashbangSprite.acceleration.y = 3000
		flashbangSprite.acceleration.rotation = -3.65
		
		selectedColorScheme = colorSchemes.flashbang
	}
})


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
	const xDis = x2 - x1
	const yDis = y2 - y1
	const half = xDis / 2
	drawLine(x1, y1, x1 + half, y1)
	drawLine(x1 + half, y1, x1 + half, y2)
	drawLine(x1 + half, y2, x2, y2)
}

function drawObject(id) {
	const obj = objectMap.get(id)
	ctx.lineWidth = 3
	ctx.strokeStyle = selectedColorScheme.outline
	const studLen = 20
	switch(obj.type) {
	case WIRE:
		ctx.strokeStyle = selectedColorScheme.wireOffColor
		if(obj.powered)
			ctx.strokeStyle = selectedColorScheme.wireOnColor//wireOnColor
		leftStudPositions = []
		rightStudPositions = []

		fromPos = null
		toPos = null

		// Draw wires
		if(objectMap.get(obj.from).type == BLOCK) {
			let relY = (objectMap.get(obj.from).size.y / objectMap.get(obj.from).output.length) * (obj.valIndex + 0.5)
			rightStudPositions.push([objectMap.get(obj.from).position.x + objectMap.get(obj.from).size.x, objectMap.get(obj.from).position.y + relY])
			fromPos = [objectMap.get(obj.from).position.x + objectMap.get(obj.from).size.x + studLen, objectMap.get(obj.from).position.y + relY]
		} else if(objectMap.get(obj.from).type == WIRE) {
			fromPos = [objectMap.get(obj.from).position.x, objectMap.get(obj.from).position.y]
		} else if(objectMap.get(obj.from).type == SWITCH) {
			fromPos = [objectMap.get(obj.from).position.x + switchRadius + studLen, objectMap.get(obj.from).position.y]
		}
		if(objectMap.get(obj.to).type == BLOCK) {
			let relY = (objectMap.get(obj.to).size.y / objectMap.get(obj.to).input.length) * (obj.inIndex + 0.5)
			leftStudPositions.push([objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY])
			toPos = [objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY]
		} else if(objectMap.get(obj.to).type == WIRE) {
			toPos = [objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y]
		}

		drawWire(toScreenX(fromPos[0]), toScreenY(fromPos[1]), toScreenX(toPos[0]), toScreenY(toPos[1]))
		break
	case BLOCK:	
		ctx.fillStyle = selectedColorScheme.background
		const blockWidth = obj.size.x
		const blockHeight = obj.isSquare ? obj.size.x : obj.size.y
		ctx.fillRect(toScreenX(obj.position.x), toScreenY(obj.position.y), blockWidth, blockHeight)
		if(id == draggedObjectID && !connectingWires) {
			ctx.strokeStyle = 'rgb(200, 200, 200)'
		}
		ctx.strokeStyle = selectedColorScheme.outline
		ctx.fillStyle = selectedColorScheme.textColor
		ctx.font = "32px Arial";
		ctx.fillText(obj.label, toScreenX(obj.position.x + obj.size.x / 2 - ctx.measureText(obj.label).width / 2), toScreenY(obj.position.y + obj.size.y / 2 + 10));
		ctx.beginPath();
		ctx.rect(toScreenX(obj.position.x), toScreenY(obj.position.y), blockWidth, blockHeight);
		ctx.stroke()

		//TODO objects will be dragged and cancels wire connection; pls fix
		// Right studs
		if(obj.invertsOutput) {
			for(let i = 0; i < obj.output.length; i++) {
				ctx.strokeStyle = (obj.output[i] ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor)//'black' 
				let relY = (blockHeight / obj.output.length) * (i + 0.5)
				//drawLine(obj.position.x + obj.size.x + sketchOffset.x, obj.position.y + relY + sketchOffset.y, toScreenX(obj.position.x) + obj.size.x + studLen, toScreenY(obj.position.y) + relY)
				ctx.beginPath();
				ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 10, 0, 2 * Math.PI);		
				ctx.stroke();

				if(getDistance(toScreenX(obj.position.x + obj.size.x - 10), toScreenY(obj.position.y + relY), mouseX, mouseY) < 20) {
					if(mouseDown && draggedObjectID == null)
						connectingWires = true
					ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 20, 0, 2 * Math.PI)
					ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'
					ctx.fill()
					ctx.strokeStyle = "black"
				}
			}
		} else {
			for(let i = 0; i < obj.output.length; i++) {
				ctx.strokeStyle = (obj.output[i] ? selectedColorSchemewireOnColor : selectedColorScheme.wireOffColor)
				let relY = (blockHeight / obj.output.length) * (i + 0.5)
				drawLine(obj.position.x + obj.size.x + sketchOffset.x, obj.position.y + relY + sketchOffset.y, toScreenX(obj.position.x) + obj.size.x + studLen, toScreenY(obj.position.y) + relY)
			
				if(getDistance(toScreenX(obj.position.x + obj.size.x - 10), toScreenY(obj.position.y + relY), mouseX, mouseY) < 20) {
					if(mouseDown && draggedObjectID == null)
						connectingWires = true
					ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 20, 0, 2 * Math.PI)
					ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'
					ctx.fill()
					ctx.strokeStyle = "black"
				}
			}
		}
		// Left studs
		for(let i = 0; i < obj.input.length; i++) {
			ctx.strokeStyle = (obj.input[i] ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor) 
			ctx.beginPath()
			let relY = (blockHeight / obj.input.length) * (i + 0.5)
			ctx.moveTo(toScreenX(obj.position.x), toScreenY(obj.position.y) + relY)
			ctx.lineTo(toScreenX(obj.position.x) - studLen, toScreenY(obj.position.y) + relY)
			ctx.stroke()

			if(getDistance(toScreenX(obj.position.x - 30), toScreenY(obj.position.y) + relY, mouseX, mouseY) < 20) {
				if(mouseDown && draggedObjectID == null)
					connectingWires = true
				ctx.arc(toScreenX(obj.position.x) - studLen/2, toScreenY(obj.position.y) + relY, 20, 0, 2 * Math.PI)
				ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'
				ctx.fill()
				ctx.strokeStyle = "black"
			}
		}
		break
	case SWITCH:
		ctx.beginPath();
		ctx.arc(toScreenX(obj.position.x), toScreenY(obj.position.y), switchRadius, 0, 2 * Math.PI);
		ctx.fillStyle = (obj.powered ? "red" : 'rgb(200, 200, 200)');
		ctx.fill();
		ctx.strokeStyle = "black";
		ctx.stroke();
		
		// Stud
		ctx.strokeStyle = (obj.powered ? selectedColorSchemes.wireOnColor : 'black')
		ctx.beginPath()
		ctx.moveTo(toScreenX(obj.position.x) + switchRadius, toScreenY(obj.position.y))
		ctx.lineTo(toScreenX(obj.position.x) + studLen + switchRadius, toScreenY(obj.position.y))
		ctx.stroke()
		break
	}
}

//createObject('block', 69, 'NAND');
//objectMap.get(69).operation = NAND 
/*const id69 = addLogicGateBlock(GateType.NAND)
createObject('block', 70, 'XOR');
createObject('block', 71, 'XOR');
objectMap.get(70).operation = XOR
objectMap.get(71).operation = XOR
objectMap.get(70).input.push(false)
connectWire(id69, 70, 4)
connectWire(id69, 71,99)
objectMap.get(99).valIndex = 0*/
//connectWire(69, 70, 5)
//objectMap.get(5).inIndex = 1
//objectMap.get(4).valIndex = 0
//objectMap.get(5).valIndex = 0
//objectMap.get(id69).output.pop()
/*createObject('block', 79, 'XOR');
connectWire(69, 79)
connectWire(69, 79)
connectWire(69, 79)
createObject('block', 420, 'NOT');
objectMap.get(420).input.push(false)
connectWire(69, 420, 15)
objectMap.get(15).inIndex = 1
connectWire(79, 420)*/
//createObject('switch', 2)
//createObject('switch', 3)
//connectWire(2, id69)
//connectWire(3, id69, 23)
//objectMap.get(23).inIndex = 1

let wireHue = 0

let lastExecution = new Date().getTime()

function draw() {
	deltaTime = new Date().getTime() - lastExecution
	
	// Regenbogen :D
	//wireHue = (wireHue + 5) % 360
	//selectedColorScheme.wireOnColor = `hsl(${wireHue}, 100%, 50%)`

	if(!connectingWires && draggedObjectID != null) {
		objectMap.get(draggedObjectID).position.x = (mouseX + draggedObjectMouseDiff.x) - ((mouseX + draggedObjectMouseDiff.x) % cellSize)
		objectMap.get(draggedObjectID).position.y = (mouseY + draggedObjectMouseDiff.y) - ((mouseY + draggedObjectMouseDiff.y) % cellSize)
	}

	// Update sprites
	if(flashbangSprite.position.y > canvas.height - 50) {
		flashbangSprite.velocity.y = -Math.abs(flashbangSprite.velocity.y * 0.65)
		if(flashbangSprite.velocity.y > -200) {
			flashbangSprite.velocity.y = 0
		}
	}
	if(flashbangSprite.velocity.x < 0) {
		flashbangSprite.acceleration.x = 0
		flashbangSprite.velocity.x = 0 
	}
	if(flashbangSprite.velocity.rotation < 0) {
		flashbangSprite.velocity.rotation = 0
		flashbangSprite.acceleration.rotation = 0
	}
	flashbangSprite.update()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

	ctx.fillStyle = selectedColorScheme.background
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	// Background lines
	//ctx.strokeStyle = "rgb(230, 230, 230)"
	ctx.strokeStyle = selectedColorScheme.lineColor
	ctx.lineWidth = 1
	for(let i = 0; i <= canvas.width; i += cellSize) {
		ctx.beginPath()
		ctx.moveTo(i + (sketchOffset.x % cellSize), (sketchOffset.y % cellSize) - 100)
		ctx.lineTo(i + (sketchOffset.x % cellSize), canvas.height + (sketchOffset.y % cellSize) + 100)
		ctx.stroke()
	}
	for(let i = 0; i <= canvas.height; i += cellSize) {
		ctx.beginPath()
		ctx.moveTo(sketchOffset.x % cellSize - 100, i + (sketchOffset.y % cellSize))
		ctx.lineTo(canvas.width + (sketchOffset.x % cellSize) + 100, i + (sketchOffset.y % cellSize))
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
		
	sketchName = document.getElementById("name").value
	
	// Render sprites
	flashbangSprite.draw()

	lastExecution = new Date().getTime()
	requestAnimationFrame(draw);
}

draw();

