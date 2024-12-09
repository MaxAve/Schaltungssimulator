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

let downloadButton = document.getElementById("download-button")
let renameButton = document.getElementById("rename-button")
let uploadConfirmButton = document.getElementById("upload-button")
let colorSchemeSelection = document.getElementById("colorscheme")
let rainbowToggle = document.getElementById("rainbow-button")
colorSchemeSelection.value = '1'
let cursorTool = document.getElementById("cursor-button")
let deleteTool = document.getElementById("delete-button")

let bnot = document.getElementById("bnot")
let band = document.getElementById("band")
let bor = document.getElementById("bor")
let bxor = document.getElementById("bxor")
let bnand = document.getElementById("bnand")
let bnor = document.getElementById("bnor")
let bxnor = document.getElementById("bxnor")
//let bkk = document.getElementById("bkk")
let bsch = document.getElementById("bsch")
let bgb = document.getElementById("bgb")

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

let currentCursorMode = 0

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
		dark: false,
		dotted: false,
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
	},
	dracula: {
		id: 1,
		dark: true,
		dotted: true,
		outline: 'hsl(323, 70%, 60%)',
		dragOutline: 'white',
		background: 'rgb(48, 48, 48)',
		gateBackground: 'rgb(38, 38, 38)',
		lineColor: 'rgb(70, 70, 70)',
		textColor: 'white',
		wireOnColor: 'rgb(249, 247, 121)',
		wireOffColor: 'rgb(86, 45, 165)',
		menuBackground: 'rgb(30, 30, 30)',
		menuTextColor: 'white',
		buttonColor: 'rgb(48, 48, 48)',
		borderColor: 'rgb(80, 80, 80)',
	},
	bnw: {
		id: 2,
		dark: true,
		dotted: true,
		outline: 'white',
		dragOutline: 'rgb(150, 150, 150)',
		background: 'black',
		gateBackground: 'black',
		lineColor: 'rgb(40, 40, 40)',
		textColor: 'white',
		wireOnColor: 'white',
		wireOffColor: 'rgb(60, 60, 60)',
		menuBackground: 'rgb(15, 15, 15)',
		menuTextColor: 'white',
		buttonColor: 'rgb(50, 50, 50)',
		borderColor: 'rgb(80, 80, 80)',
	},
	chalkboard: {
		id: 3,
		dark: true,
		dotted: false,
		outline: 'white',
		dragOutline: 'rgb(150, 150, 150)',
		background: 'rgb(31, 43, 37)',
		gateBackground: 'rgba(0, 0, 0, 0)',//'rgb(20, 36, 28)',
		lineColor: 'rgb(40, 56, 48)',
		textColor: 'white',
		wireOnColor: 'yellow',
		wireOffColor: 'white',
		menuBackground: '#181e1b',
		menuTextColor: 'white',
		buttonColor: '#222b26',
		borderColor: 'rgb(80, 80, 80)',
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

		if((tag == 'BUTTON' || tag == 'INPUT' || tag == 'IMG') && element.hasAttribute('src')) {
			if(selectedColorScheme.dark)
				element.setAttribute('src', element.getAttribute('src').split('dark').join('light'))
			else
				element.setAttribute('src', element.getAttribute('src').split('light').join('dark'))
		}
		
		if(selectedColorScheme.id == 3 && id == 'item-select') {
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

function createObject(type, id=null, label=null) {
	console.log(`Creating object of type ${type}`)
	const obj = JSON.parse(JSON.stringify((objectPresets[type])))
	if(obj.type > 0) {
		obj.position.x = canvas.width - blockSize.x - cellSize - sketchOffset.x//canvas.width / 2 + Math.floor(Math.random() * 40) - 20
		obj.position.y = Math.floor(400 + Math.random() * 100) - sketchOffset.y
	}
	if(label != null)
		obj.label = label
	if(id == null)
		id = genID()
	objectMap.set(id, obj)
}

function connectWire(from, to, objID=null) {
	let id
	if (objID == null)
		id = Math.floor(Math.random() * 999999999999999)
	else
		id = objID
	createObject('wire', id)
	objectMap.get(id).from = from
	objectMap.get(id).to = to
	/*if(objectMap.get(from).type == BLOCK) {
		objectMap.get(id).valIndex = objectMap.get(from).output.length - 1
	}*/
}

function update(id) {
	switch(objectMap.get(id).type) {
		case WIRE:
			if(objectMap.has(objectMap.get(id).from)) {
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
			} else {
				objectMap.get(id).powered = false
			}
			if(objectMap.get(id).powered)
				objectMap.get(objectMap.get(id).to).input[objectMap.get(id).inIndex] = true	
			break
		case BLOCK:
			objectMap.get(id).output[0] = objectMap.get(id).operation(objectMap.get(id).input)
			// TODO this causes	studs to not be rendered with the activation color
			for(let i = 0; i < objectMap.get(id).input.length; i++)
				objectMap.get(id).input[i] = false
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

function deleteObject(id) {
	console.log(`Deleting object ${id}`)
	const type = objectMap.get(id).type
	objectMap.delete(id)
	if(type != WIRE) {
		for(let [key, obj] of objectMap) {
			if(objectMap.get(key).type == WIRE && (objectMap.get(key).to == id || objectMap.get(key).from == id)) {
				deleteObject(key)
			}
		}
	}
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

canvas.addEventListener("wheel", (e)  => {
	// weird trackpad detection
	var isTrackpad = false;
	if (e.wheelDeltaY) {
		if (e.wheelDeltaY === (e.deltaY * -3)) {
			isTrackpad = true;
		}
	}
	else if (e.deltaMode === 0) {
		isTrackpad = true;
	}
	draggingSketch = true
	preDragMousePos.x = mouseX
	preDragMousePos.y = mouseY

	mouseX = mouseX - e.deltaX;
	mouseY = mouseY - e.deltaY;

	dragDiff.x = preDragMousePos.x - mouseX
	dragDiff.y = preDragMousePos.y - mouseY
	sketchOffset.x -= dragDiff.x
	sketchOffset.y -= dragDiff.y
	dragDiff.x = 0
	dragDiff.y = 0
	preDragMousePos.x = mouseX
	preDragMousePos.y = mouseY
	draggingSketch = false

	e.preventDefault();
});

canvas.addEventListener('mousedown', (event) => {
	mouseDown = true
	worldMouseX = (mouseX - sketchOffset.x) + cellSize + (mouseX - sketchOffset.x) % cellSize // TODO this is a temporary fix, find out problem (likely to do with the way objects are snapped into place)
	worldMouseY = (mouseY - sketchOffset.y) + cellSize + (mouseY - sketchOffset.y) % cellSize

	// Lengths of switch parts
	const rightSideLen = cellSize * 2
	const gapLen = cellSize * 3
	const switchLen = cellSize * 3.5
	
	switch (event.button) {
		case 0:
			draggingObject = false
		
			for(let [key, obj] of objectMap) {
				if(obj.type == 1 && worldMouseX >= obj.position.x && worldMouseY >= obj.position.y && worldMouseX <= (obj.position.x + obj.size.x) && worldMouseY <= (obj.position.y + obj.size.y)) {
					if(currentCursorMode == 0) {
						draggedObjectID = key
						draggedObjectMouseDiff.x = obj.position.x - mouseX
						draggedObjectMouseDiff.y = obj.position.y - mouseY
						draggingObject = true
					} else if(currentCursorMode == 1) {
						deleteObject(key)
					}
				} else if(obj.type == 2 && mouseX < toScreenX(obj.position.x - cellSize * 3) /*&& mouseX > toScreenX(obj.position.x - rightSideLen * 2 - gapLen)*/ && mouseY > toScreenY(obj.position.y - cellSize * 3) && mouseY < toScreenY(obj.position.y + cellSize / 2)/*getDistance(toScreenX(obj.position.x - rightSideLen - gapLen / 2), toScreenY(obj.position.y), mouseX, mouseY) < cellSize * 3*/) {
					//draggedObjectID = key
					//draggedObjectMouseDiff.x = obj.position.x - mouseX
					//draggedObjectMouseDiff.y = obj.position.y - mouseY
					//draggingObject = true
					if(currentCursorMode == 0) {
						draggedObjectID = key
						draggedObjectMouseDiff.x = obj.position.x - mouseX
						draggedObjectMouseDiff.y = obj.position.y - mouseY
						draggingObject = true
					} else if(currentCursorMode == 1) {
						deleteObject(key)
					}
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
				if(obj.type == 2 && mouseX < toScreenX(obj.position.x - 25) && /*mouseX > toScreenX(obj.position.x - rightSideLen * 2 - gapLen) &&*/ mouseY > toScreenY(obj.position.y - cellSize * 3) && mouseY < toScreenY(obj.position.y + cellSize / 2)/*getDistance(toScreenX(obj.position.x - rightSideLen - gapLen / 2), toScreenY(obj.position.y), mouseX, mouseY) < cellSize * 3*/) {
					obj.powered = !obj.powered
					break
				}
			}
			break
	}
	wireConnectFromID = wireConnectFromHoverID
});

let toDelete = null

canvas.addEventListener('mouseleave', (event) => {
	if(draggedObjectID != null) {
		//deleteObject(draggedObjectID)
		toDelete = draggedObjectID
		draggedObjectID = null
	}
})

canvas.addEventListener('mouseenter', (event) => {
	if(toDelete != null) {
		draggedObjectID = toDelete
		toDelete = null
	}
})

document.addEventListener('mouseup', (event) => {
	if(toDelete != null) {
		deleteObject(toDelete)	
		toDelete = null
	}
})

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

//bkk.addEventListener("click", () => {
//})

bsch.addEventListener("click", () => {
	createObject('switch')
})

bgb.addEventListener("click", () => {
})

cursorTool.addEventListener('click', () => {
	currentCursorMode = 0 // Cursor tool
})

deleteTool.addEventListener('click', () => {
	currentCursorMode = 1 // Delete tool	
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
			flashbangSprite.acceleration.x = -250
			flashbangSprite.acceleration.y = 3000
			flashbangSprite.acceleration.rotation = -(Math.floor(Math.random() % 100) + 500) / 100
			grenadeLanded = false
		}
		updateMenu()
	}
	lastSelected = selected
})

function mouseOverRect(x, y, w, h) {
	return mouseX >= toScreenX(x) && mouseX <= toScreenX(x + w) && mouseY >= toScreenY(y) && mouseY <= toScreenY(y + h)
}

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
	if(x1 < x2) {
		const half = xDis / 2
		drawLine(x1, y1, x1 + half, y1)
		drawLine(x1 + half, y1, x1 + half, y2)
		drawLine(x1 + half, y2, x2, y2)
	} else {
		const half = yDis / 2
		drawLine(x1, y1, x1 + cellSize, y1)
		drawLine(x1 + cellSize, y1, x1 + cellSize, y1 + half)
		drawLine(x1 + cellSize, y1 + half, x2 - cellSize, y1 + half)
		drawLine(x2 - cellSize, y1 + half, x2 - cellSize, y2)	
		drawLine(x2 - cellSize, y2, x2, y2)	
	}
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
		if(objectMap.has(obj.from)) {
			if(objectMap.get(obj.from).type == BLOCK) {
				let relY = (objectMap.get(obj.from).size.y / objectMap.get(obj.from).output.length) * (obj.valIndex + 0.5)
				rightStudPositions.push([objectMap.get(obj.from).position.x + objectMap.get(obj.from).size.x, objectMap.get(obj.from).position.y + relY])
				fromPos = [objectMap.get(obj.from).position.x + objectMap.get(obj.from).size.x + studLen, objectMap.get(obj.from).position.y + relY]
			} else if(objectMap.get(obj.from).type == WIRE) {
				fromPos = [objectMap.get(obj.from).position.x, objectMap.get(obj.from).position.y]
			} else if(objectMap.get(obj.from).type == SWITCH) {
				fromPos = [objectMap.get(obj.from).position.x, objectMap.get(obj.from).position.y]
			}
		}
		if(objectMap.has(obj.to)) {
			if(objectMap.get(obj.to).type == BLOCK) {
				let relY = (objectMap.get(obj.to).size.y / objectMap.get(obj.to).input.length) * (obj.inIndex + 0.5)
				leftStudPositions.push([objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY])
				toPos = [objectMap.get(obj.to).position.x - studLen, objectMap.get(obj.to).position.y + relY]
			} else if(objectMap.get(obj.to).type == WIRE) {
				toPos = [objectMap.get(obj.to).position.x, objectMap.get(obj.to).position.y]
			}
		}
		
		if(fromPos != null && toPos != null) {
			drawWire(toScreenX(fromPos[0]), toScreenY(fromPos[1]), toScreenX(toPos[0]), toScreenY(toPos[1]))
		}
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

				if(currentCursorMode == 0 && getDistance(toScreenX(obj.position.x + obj.size.x - 10), toScreenY(obj.position.y + relY), mouseX, mouseY) < 20) {
					if(mouseDown && draggedObjectID == null)
						connectingWires = true
					ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 20, 0, 2 * Math.PI)
					ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
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
			
				if(currentCursorMode == 0 && getDistance(toScreenX(obj.position.x + obj.size.x - 10), toScreenY(obj.position.y + relY), mouseX, mouseY) < 20) {
					if(mouseDown && draggedObjectID == null)
						connectingWires = true
					ctx.arc(toScreenX(obj.position.x + obj.size.x + 10), toScreenY(obj.position.y + relY), 20, 0, 2 * Math.PI)
					ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
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

			if(currentCursorMode == 0 && getDistance(toScreenX(obj.position.x - 30), toScreenY(obj.position.y) + relY, mouseX, mouseY) < 20) {
				if(mouseDown && draggedObjectID == null)
					connectingWires = true
				ctx.arc(toScreenX(obj.position.x) - studLen/2, toScreenY(obj.position.y) + relY, 20, 0, 2 * Math.PI)
				ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
				ctx.fill()
				ctx.strokeStyle = "black"
				wireConnectToHoverID = id
				wireConnectFromIndex = i
			}
		}

		if(currentCursorMode == 1 && mouseOverRect(obj.position.x - cellSize, obj.position.y, blockWidth, blockHeight)) { // dont ask why its obj.position.x - cellSize
			ctx.strokeStyle = 'red'
			drawLine(toScreenX(obj.position.x - cellSize), toScreenY(obj.position.y + 2*cellSize), toScreenX(obj.position.x + blockWidth + cellSize), toScreenY(obj.position.y + blockHeight - 2*cellSize))
			drawLine(toScreenX(obj.position.x + blockWidth + cellSize), toScreenY(obj.position.y + 2*cellSize), toScreenX(obj.position.x - cellSize), toScreenY(obj.position.y + blockHeight- 2*cellSize))
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
		const rightSideLen = cellSize * 2
		const gapLen = cellSize * 3
		const switchLen = cellSize * 3.5
		ctx.strokeStyle = obj.powered ? selectedColorScheme.wireOnColor : selectedColorScheme.wireOffColor
		if(obj.powered && rainbow)
			ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
		drawLine(toScreenX(obj.position.x), toScreenY(obj.position.y), toScreenX(obj.position.x - rightSideLen), toScreenY(obj.position.y))
		drawLine(toScreenX(obj.position.x - rightSideLen), toScreenY(obj.position.y), toScreenX(obj.position.x - rightSideLen), toScreenY(obj.position.y - studLen))
		
		ctx.strokeStyle = selectedColorScheme.wireOnColor
		ctx.fillStyle = selectedColorScheme.wireOnColor
		if(rainbow) {
			ctx.strokeStyle = `hsl(${wireHue}, 100%, 50%)`
			ctx.fillStyle = `hsl(${wireHue}, 100%, 50%)`
		}
		drawLine(toScreenX(obj.position.x - rightSideLen - gapLen), toScreenY(obj.position.y), -20/*toScreenX(obj.position.x - rightSideLen * 2 - gapLen)*/, toScreenY(obj.position.y))
		if(obj.powered) {
			drawLine(toScreenX(obj.position.x - rightSideLen - gapLen), toScreenY(obj.position.y), toScreenX(obj.position.x - rightSideLen - gapLen + Math.cos(0.18) * switchLen), toScreenY(obj.position.y - Math.sin(0.18) * switchLen))
		} else {
			drawLine(toScreenX(obj.position.x - rightSideLen - gapLen), toScreenY(obj.position.y), toScreenX(obj.position.x - rightSideLen - gapLen + Math.cos(0.79) * switchLen), toScreenY(obj.position.y - Math.sin(0.79) * switchLen))
		}

		ctx.beginPath()
		ctx.arc(toScreenX(obj.position.x - rightSideLen - gapLen), toScreenY(obj.position.y), cellSize / 4, 0, 2 * Math.PI)
		ctx.fill()

		// Wire connection prompt
		if(currentCursorMode == 0 && getDistance(toScreenX(obj.position.x), toScreenY(obj.position.y), mouseX + 20, mouseY) < 20) {
			if(mouseDown && draggedObjectID == null)
				connectingWires = true
			ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
			ctx.arc(toScreenX(obj.position.x), toScreenY(obj.position.y), 20, 0, 2 * Math.PI)
			ctx.fill()
			wireConnectFromHoverID = id
			wireFromPosition.x = toScreenX(obj.position.x) 
			wireFromPosition.y = toScreenY(obj.position.y)
		} /*else if(getDistance(toScreenX(obj.position.x - rightSideLen - gapLen / 2), toScreenY(obj.position.y), mouseX + 20, mouseY) < cellSize * 3) {
			// Hitbox outline
			//ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
			//ctx.arc(toScreenX(obj.position.x - rightSideLen - gapLen / 2), toScreenY(obj.position.y), cellSize * 2, 0, 2 * Math.PI)
			//ctx.fill()
			//ctx.fillRect(toScreenX(obj.position.x - rightSideLen - gapLen - cellSize), toScreenY(obj.position.y - gapLen), gapLen + cellSize * 2, gapLen * 1.5)
		}*/

		// Deletion
		if(currentCursorMode == 1 && mouseX < toScreenX(obj.position.x - cellSize * 3) && mouseY > toScreenY(obj.position.y - cellSize * 3) && mouseY < toScreenY(obj.position.y + cellSize / 2)) {
			ctx.strokeStyle = 'red'
			drawLine(toScreenX(obj.position.x - cellSize * 6), toScreenY(obj.position.y - cellSize * 2), toScreenX(obj.position.x), toScreenY(obj.position.y + cellSize))
			drawLine(toScreenX(obj.position.x), toScreenY(obj.position.y - cellSize * 2), toScreenX(obj.position.x - cellSize * 6), toScreenY(obj.position.y + cellSize))
		}
		break
	}
}

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

	
	updateAllOfType(BLOCK)
	updateAllOfType(WIRE)

	wireConnectFromIndex = null
	wireConnectFromHoverID = null
	wireConnectToHoverID = null
	for(let [key, obj] of objectMap) {
		if(obj.type != WIRE)
			drawObject(key)
		else if(!obj.powered)
			drawObject(key)
		/*if(obj.type == BLOCK) {
			for(let i = 0; i < obj.input.length; i++) {
				obj.input[i] = false
			}
		}*/
	}
	// Render active wires on top, so that overlapping wires are shown to be active if one of them is
	for(let [key, obj] of objectMap) {
		if(obj.type == WIRE && obj.powered)
			drawObject(key)
	}

	if(wireConnectFromID != null) {
		ctx.strokeStyle = selectedColorScheme.wireOffColor
		drawWire(wireFromPosition.x, wireFromPosition.y, mouseX, mouseY)
	}
		
	sketchName = document.getElementById("name").value
	
	// Render sprites
	flashbangSprite.draw()

	ctx.fillStyle = `rgb(255, 255, 255, ${flashAlpha})`
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	lastExecution = new Date().getTime()
	requestAnimationFrame(draw);
}

draw();

