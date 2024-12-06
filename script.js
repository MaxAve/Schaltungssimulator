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
let colorSchemeSelection = document.querySelector("#colorscheme")
let rainbowToggle = document.querySelector("#rainbow-button")
colorSchemeSelection.value = '1'

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

let wireHue = 0

let rainbow = false

let wireConnectFromHoverID = null
let wireConnectFromID = null
let wireConnectFromIndex = null
let wireConnectToHoverID = null
const wireFromPosition = {x: 0, x: 0}

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
let grenadeLanded = false

const colorSchemes = {
	flashbang: {
		id: 0,
		outline: 'black',
		dragOutline: 'rgb(252, 215, 27)',
		background: 'white',
		gateBackground: 'rgb(240, 240, 240)',
		lineColor: 'rgb(230, 230, 230)',
		textColor: 'black',
		wireOnColor: 'rgb(252, 215, 27)',
		wireOffColor: 'black',
		menuBackground: 'rgb(245, 245, 245)',
		menuTextColor: 'black',
		buttonColor: 'rgb(225, 225, 225)',
		borderColor: 'rgb(160, 160, 160)',
		dotted: false,
	},
	dracula: {
		id: 1,
		outline: 'hsl(323, 70%, 60%)',
		dragOutline: 'white',
		background: 'rgb(48, 48, 48)',
		gateBackground: 'rgb(38, 38, 38)',
		lineColor: 'rgb(70, 70, 70)',
		textColor: 'white',
		wireOnColor: 'rgb(249, 247, 121)',
		wireOffColor: 'rgb(126, 85, 205)',
		menuBackground: 'rgb(30, 30, 30)',
		menuTextColor: 'white',
		buttonColor: 'rgb(48, 48, 48)',
		borderColor: 'rgb(80, 80, 80)',
		dotted: true,
	},
	bnw: {
		id: 2,
		outline: 'white',
		dragOutline: 'rgb(150, 150, 150)',
		background: 'black',
		gateBackground: 'black',
		lineColor: 'rgb(40, 40, 40)',
		textColor: 'white',
		wireOnColor: 'white',
		wireOffColor: 'rgb(100, 100, 100)',
		menuBackground: 'rgb(15, 15, 15)',
		menuTextColor: 'white',
		buttonColor: 'rgb(50, 50, 50)',
		borderColor: 'rgb(80, 80, 80)',
		dotted: true,
	},
	chalkboard: {
		id: 3,
	},
	blueprint: {
		id: 4,
	},
}

let selectedColorScheme = colorSchemes.dracula

let menuMenu = document.querySelector("#menu")

function updateMenu() {
	function processElement(element) {
		const tag    = element.tagName
		const id     = element.id
		const _class = element.className
	
		//element.style.setProperty('border-color', selectedColorScheme.borderColor)

		if(id == 'menu') {
			element.style.setProperty('background-color', selectedColorScheme.menuBackground)
		}
		if(tag == 'P' || tag == 'LABEL' || tag == 'INPUT') {
			element.style.setProperty('color', selectedColorScheme.menuTextColor)
		}
		if(_class != 'file-input' && (tag == 'INPUT' || id == 'item-select' || tag == 'BUTTON' || tag == 'SELECT' || tag == 'OPTION')) {
			element.style.setProperty('background-color', selectedColorScheme.background)
			element.style.setProperty('color', selectedColorScheme.menuTextColor)
		}
		if((tag == 'BUTTON' || tag == 'INPUT' || tag == 'SELECT') && _class != 'object-place' && _class != 'file-input') {
			element.style.setProperty('background-color', selectedColorScheme.buttonColor)
		}

        for (let child of element.children) {
            processElement(child);
        }
    }

    processElement(document.documentElement);
}

updateMenu()

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
	// let res = []
	// for(let i = 0; i < input.length; i++)
	// 	res.push(!input[i])
	return !input[0]
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
			objectMap.get(objectMap.get(id).to).input[objectMap.get(id).inIndex] = false//objectMap.get(id).powered // TODO
			if(objectMap.get(id).powered)
				objectMap.get(objectMap.get(id).to).input[objectMap.get(id).inIndex] = true
			
			// TODO revise (the gate only works when connected with wires)
			//objectMap.get(objectMap.get(id).to).output[0] = objectMap.get(objectMap.get(id).to).operation(objectMap.get(objectMap.get(id).to).input)
			break
		case BLOCK:
			//console.log(`${id}: ${objectMap.get(id).input[0]}`)
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
	wireConnectFromID = wireConnectFromHoverID
});

canvas.addEventListener('mouseup', (event) => {
	mouseDown = false
	draggingSketch = false
	if(draggedObjectID != null) {
		draggedObjectID = null;
	}
	connectingWires = false

	// Connect wire
	if(wireConnectToHoverID != null) {
		const id = genID()
		connectWire(wireConnectFromID, wireConnectToHoverID, id)
		objectMap.get(id).inIndex = wireConnectFromIndex
		objectMap.get(id).valIndex = 0
		wireConnectToHoverID = null
	}

	wireConnectFromID = null
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

/*uploadConfirmButton.addEventListener("click", () => {
	if(confirm('Achtung: beim hochladen wird die jetzige Skizze gelöscht!')) {
		console.log('TODO: Upload file')
	}
})*/

rainbowToggle.addEventListener("click", () => {
	rainbow = !rainbow
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

let lastSelected = '1'

colorSchemeSelection.addEventListener("click", () => {
	let selected = colorSchemeSelection.options[colorSchemeSelection.selectedIndex].value
	if(selected != lastSelected) {
		if(selected != '0') {
			switch(parseInt(selected)) {
				case 1:
					selectedColorScheme = colorSchemes.dracula
					break
				case 2:
					selectedColorScheme = colorSchemes.bnw
					break
				case 3:
					selectedColorScheme = colorSchemes.chalkboard
					break
				case 4:
					selectedColorScheme = colorSchemes.blueprint
					break
			}
		} else {
			flashbangSprite.hidden = false
			flashbangSprite.position.x = -100
			flashbangSprite.position.y = 0
			flashbangSprite.velocity.x = 800
			flashbangSprite.velocity.rotation = 15
			flashbangSprite.acceleration.x = -300
			flashbangSprite.acceleration.y = 3000
			flashbangSprite.acceleration.rotation = -(Math.floor(Math.random() % 100) + 500) / 100
			grenadeLanded = false
		}
		updateMenu()
	}
	lastSelected = selected
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
	ctx.lineWidth = 2
	ctx.strokeStyle = selectedColorScheme.outline
	const studLen = 20
	switch(obj.type) {
	case WIRE:
		ctx.strokeStyle = selectedColorScheme.wireOffColor
		if(obj.powered) {
			ctx.strokeStyle = selectedColorScheme.wireOnColor
			if(rainbow) {
				ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
			}
		}
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
		ctx.fillStyle = selectedColorScheme.gateBackground
		const blockWidth = obj.size.x
		const blockHeight = obj.isSquare ? obj.size.x : obj.size.y
		ctx.fillRect(toScreenX(obj.position.x), toScreenY(obj.position.y), blockWidth, blockHeight)
		ctx.strokeStyle = selectedColorScheme.outline
		ctx.fillStyle = selectedColorScheme.textColor
		ctx.font = "32px Arial";
		ctx.fillText(obj.label, toScreenX(obj.position.x + obj.size.x / 2 - ctx.measureText(obj.label).width / 2), toScreenY(obj.position.y + obj.size.y / 2 + 10));
		//ctx.beginPath();
		//ctx.rect(toScreenX(obj.position.x), toScreenY(obj.position.y), blockWidth, blockHeight);
		//ctx.stroke()

		//TODO objects will be dragged and cancels wire connection; pls fix
		// Right studs
		if(obj.invertsOutput) {
			for(let i = 0; i < obj.output.length; i++) {
				ctx.strokeStyle = (obj.output[i] ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor)//'black' 
				if(obj.output[i] && rainbow) {
					ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
				}
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
					wireConnectFromHoverID = id
					wireFromPosition.x = obj.position.x + obj.size.x + sketchOffset.x + studLen
					wireFromPosition.y = obj.position.y + relY + sketchOffset.y
				}
			}
		} else {
			for(let i = 0; i < obj.output.length; i++) {
				ctx.strokeStyle = (obj.output[i] ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor)
				if(obj.output[i] && rainbow) {
					ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
				}
				let relY = (blockHeight / obj.output.length) * (i + 0.5)
				drawLine(obj.position.x + obj.size.x + sketchOffset.x, obj.position.y + relY + sketchOffset.y, toScreenX(obj.position.x) + obj.size.x + studLen, toScreenY(obj.position.y) + relY)
			
				if(getDistance(toScreenX(obj.position.x + obj.size.x - 10), toScreenY(obj.position.y + relY), mouseX, mouseY) < 20) {
					if(mouseDown && draggedObjectID == null)
						connectingWires = true
					ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 20, 0, 2 * Math.PI)
					ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'
					ctx.fill()
					ctx.strokeStyle = "black"
					wireConnectFromHoverID = id
					wireFromPosition.x = obj.position.x + obj.size.x + sketchOffset.x + studLen
					wireFromPosition.y = obj.position.y + relY + sketchOffset.y
				}
			}
		}
		// Left studs
		for(let i = 0; i < obj.input.length; i++) {
			ctx.strokeStyle = (obj.input[i] ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor) 
			if(obj.input[i] && rainbow) {
				ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
			}
			ctx.beginPath()
			let relY = (blockHeight / obj.input.length) * (i + 0.5)
			ctx.moveTo(toScreenX(obj.position.x), toScreenY(obj.position.y) + relY)
			ctx.lineTo(toScreenX(obj.position.x) - studLen, toScreenY(obj.position.y) + relY)
			ctx.stroke()

			if(getDistance(toScreenX(obj.position.x - 30), toScreenY(obj.position.y) + relY, mouseX, mouseY) < 20) {
				wireConnectToHoverID = id
				wireConnectFromIndex = i
				if(mouseDown && draggedObjectID == null)
					connectingWires = true
				ctx.arc(toScreenX(obj.position.x) - studLen/2, toScreenY(obj.position.y) + relY, 20, 0, 2 * Math.PI)
				ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'
				ctx.fill()
				ctx.strokeStyle = "black"
			}
		}

		if(id == draggedObjectID && !connectingWires) {
			ctx.strokeStyle = selectedColorScheme.dragOutline
		} else {
			ctx.strokeStyle = selectedColorScheme.outline
		}
		ctx.fillStyle = selectedColorScheme.textColor
		ctx.beginPath();
		ctx.rect(toScreenX(obj.position.x), toScreenY(obj.position.y), blockWidth, blockHeight);
		ctx.stroke()
		break
	case SWITCH:
		ctx.beginPath()
		ctx.arc(toScreenX(obj.position.x), toScreenY(obj.position.y), switchRadius, 0, 2 * Math.PI)
		ctx.fillStyle = (obj.powered ? "red" : 'rgb(200, 200, 200)')
		ctx.fill()
		ctx.strokeStyle = "black"
		ctx.stroke()
		
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

let lastExecution = new Date().getTime()

let flashAlpha = 0

function draw() {
	deltaTime = new Date().getTime() - lastExecution
	
	//console.log(`${wireConnectFromHoverID} : ${wireConnectFromID}`)

	wireHue = (wireHue + 5) % 360

	if(flashAlpha > 0) {
		flashAlpha -= 0.008
	}

	if(!connectingWires && draggedObjectID != null) {
		objectMap.get(draggedObjectID).position.x = (mouseX + draggedObjectMouseDiff.x) - ((mouseX + draggedObjectMouseDiff.x) % cellSize)
		objectMap.get(draggedObjectID).position.y = (mouseY + draggedObjectMouseDiff.y) - ((mouseY + draggedObjectMouseDiff.y) % cellSize)
	}

	// Update sprites
	if(flashbangSprite.position.y > canvas.height - 50) {
		flashbangSprite.velocity.y = -Math.abs(flashbangSprite.velocity.y * 0.65)
		if(flashbangSprite.velocity.y > -200) {
			flashbangSprite.velocity.y = 0
			
			if(!grenadeLanded) {
				grenadeLanded = true
				setTimeout(function() {
					let audio = new Audio('assets/flashbanggg.mp3');
					audio.play();
					flashAlpha = 1.8
					selectedColorScheme = colorSchemes.flashbang
					flashbangSprite.hidden = true
					updateMenu()
				}, 2000)
			}
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
	ctx.strokeStyle = selectedColorScheme.lineColor
	if(selectedColorScheme.dotted) {
		for(let i = -2 * cellSize; i <= canvas.width + cellSize; i += cellSize) {
			for(let j = -2 * cellSize; j <= canvas.height + 2 * cellSize; j += cellSize) {
				ctx.beginPath()
				ctx.arc(i + (sketchOffset.x % cellSize), j + (sketchOffset.y % cellSize), 2, 0, 2 * Math.PI)
				ctx.fillStyle = selectedColorScheme.lineColor
				ctx.fill()
			}
		}

	} else {
		ctx.lineWidth = 1
		for(let i = -2 * cellSize; i <= canvas.width + 2 * cellSize; i += cellSize) {
			ctx.beginPath()
			ctx.moveTo(i + (sketchOffset.x % cellSize), (sketchOffset.y % cellSize) - 100)
			ctx.lineTo(i + (sketchOffset.x % cellSize), canvas.height + (sketchOffset.y % cellSize) + 100)
			ctx.stroke()
		}
		for(let i = -2 * cellSize; i <= canvas.height + 2 * cellSize; i += cellSize) {
			ctx.beginPath()
			ctx.moveTo(sketchOffset.x % cellSize - 100, i + (sketchOffset.y % cellSize))
			ctx.lineTo(canvas.width + (sketchOffset.x % cellSize) + 100, i + (sketchOffset.y % cellSize))
			ctx.stroke()
		}
	}

	wireConnectFromIndex = null
	wireConnectFromHoverID = null
	wireConnectToHoverID = null
	for(let [key, obj] of objectMap) {
		drawObject(key)
		if(obj.type == BLOCK) {
				for(let i = 0; i < obj.input.length; i++) {
				obj.input[i] = false
			}
		}
	}

	if(wireConnectFromID != null) {
		ctx.strokeStyle = selectedColorScheme.wireOffColor
		drawWire(wireFromPosition.x, wireFromPosition.y, mouseX, mouseY)
	}
	
	updateAllOfType(WIRE)
	updateAllOfType(BLOCK)
		
	sketchName = document.getElementById("name").value
	
	// Render sprites
	flashbangSprite.draw()

	ctx.fillStyle = `rgb(255, 255, 255, ${flashAlpha})`
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	lastExecution = new Date().getTime()
	requestAnimationFrame(draw);
}

draw();

