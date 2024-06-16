// Scene Declaration
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
// This defines the initial distance of the camera, you may ignore this as the camera is expected to be dynamic
camera.applyMatrix4(new THREE.Matrix4().makeTranslation(-5, 30, 120));
camera.lookAt(1, -30, 20)

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


// helper function for later on
function degrees_to_radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

class Ball {
	constructor(radius, x, y, z, texture){
		this.radius = radius;
		this.x = x;
		this.y = y;
		this.z = z;
		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = new THREE.MeshPhongMaterial( {map: texture} );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
	}

	render(){
		scene.add( this.mesh );
	}
}

class Goal {
	constructor(height, x, y, z, angleToBack, postRadius, postBaseRadius, netColor, netOpacity, postColor){
		this.height = height;
		this.width = this.height * 3;
		this.x = x;
		this.y = y;
		this.z = z;
		this.postRadius = postRadius;
		this.postBaseRadius = postBaseRadius;
		this.netColor = netColor;
		this.postColor = postColor;
		this.netOpacity = netOpacity;
		this.angleToBack = degrees_to_radians(angleToBack);
		this.group = new THREE.Group();

		this.calculateMetrics();
		this.makeChildren();
	}

	calculateMetrics() {
		this.fieldLevel = this.y + this.height / 2
		this.leftMargin = this.x - this.width / 2;
		this.rightMargin = this.x + this.width / 2;
		this.midBackMargin = this.z - (Math.tan(this.angleToBack) * this.height / 2);
		this.backMargin = this.z - (Math.tan(this.angleToBack) * this.height);
		this.backHeight = this.height / Math.cos(this.angleToBack)
	}

	makeChildren() {
		this.children = [
			// side posts
			new GoalPost(this.postRadius, this.height, this.leftMargin, this.fieldLevel, this.z, 0, 0, this.postColor),
			new GoalPost(this.postRadius, this.height, this.rightMargin, this.fieldLevel, this.z, 0, 0, this.postColor),

			// crossbar
			new GoalPost(this.postRadius, this.width + this.postRadius, this.x, this.y + this.height, this.z, degrees_to_radians(90), degrees_to_radians(90), this.postColor),

			// back post			
			new GoalPost(this.postRadius, this.backHeight, this.leftMargin, this.fieldLevel, this.midBackMargin, this.angleToBack, 0, this.postColor),
			new GoalPost(this.postRadius, this.backHeight, this.rightMargin, this.fieldLevel, this.midBackMargin, this.angleToBack, 0, this.postColor),
		
			// post base			
			new PostBase(this.postBaseRadius, this.postRadius, this.leftMargin, this.y, this.z, this.postColor),
			new PostBase(this.postBaseRadius, this.postRadius, this.rightMargin, this.y, this.z, this.postColor),
			new PostBase(this.postBaseRadius, this.postRadius, this.leftMargin, this.y, this.backMargin, this.postColor),
			new PostBase(this.postBaseRadius, this.postRadius, this.rightMargin, this.y, this.backMargin, this.postColor),

			// net
			new RectangularNet(this.backHeight, this.width, this.x, this.fieldLevel, this.midBackMargin, this.angleToBack, this.netColor, this.netOpacity),
			new TriangularNet(
				new Float32Array([this.leftMargin, this.y, this.z,
				this.leftMargin, this.y + this.height, this.z, 
				this.leftMargin, this.y, this.backMargin]),
				this.netColor,
				this.netOpacity
			),
			new TriangularNet(
				new Float32Array([this.rightMargin, this.y, this.z,
				this.rightMargin, this.y + this.height, this.z, 
				this.rightMargin, this.y, this.backMargin]),
				this.netColor,
				this.netOpacity
			),
		];

		this.children.forEach(child => {
			this.group.add(child.mesh);
		});
	}

	render(){
		scene.add( this.group );
	}
}

class GoalPost {
	constructor(postRadius, height, x, y, z, xAngle, yAngle, color){
		this.radius = postRadius;
		this.height = height;
		this.x = x;
		this.y = y;
		this.z = z;
		this.xAngle = xAngle;
		this.yAngle = yAngle;
		this.geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
		this.material = new THREE.MeshPhongMaterial( {color: color} );
		this.mesh = new THREE.Mesh( this.geometry, this.material );

		if (this.xAngle != 0){
			this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(this.xAngle));
		}
		
		if (this.yAngle != 0){
			this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationY(this.yAngle));
		}

		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));
	}

	render(){
		scene.add( this.mesh );
	}
}

class TriangularNet {
	constructor(vertices, color, opacity){
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices.length), 3));
        this.geometry.computeVertexNormals();

		this.material = new THREE.MeshPhongMaterial({color: color, side: THREE.DoubleSide, transparent: true, opacity: opacity});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	render(){
		scene.add( this.mesh );
	}
}

class RectangularNet {
	constructor(height, width, x, y, z, angleToBack, color, opacity){
		this.height = height;
		this.width = width;
		this.x = x;
		this.y = y;
		this.z = z;
		this.angleToBack = angleToBack;
		this.geometry = new THREE.PlaneGeometry(this.width, this.height);
		this.material = new THREE.MeshPhongMaterial( {color: color, side: THREE.DoubleSide, transparent: true, opacity: opacity});
		this.mesh = new THREE.Mesh( this.geometry, this.material );

		if (this.angleToBack != 0){
			this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(this.angleToBack));
		}

		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));
	}

	render() {
		scene.add( this.mesh );
	}
}

class PostBase {
	constructor(radius, tubeRadius, x, y, z, color){
		this.radius = radius;
		this.tubeRadius = tubeRadius;
		this.x = x;
		this.y = y;
		this.z = z;
		this.geometry = new THREE.TorusGeometry(this.radius, this.tubeRadius);
		this.material = new THREE.MeshPhongMaterial({ color: color });
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		
		this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(degrees_to_radians(-90)));
		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));
	}

	render(){
		scene.add( this.mesh );
	}
}

class Card {
	constructor(width, height, depth, curveIndex, t, isRed){
		this.height = height;
		this.width = width;
		this.depth = depth;
		this.curveIndex = curveIndex;
		this.curve = curves[this.curveIndex];
		this.t = t;
		this.texture = isRed ? redCardTexture : yellowCardTexture;
		this.isRed = isRed;
		this.visible = true;
		
		this.geometry = new THREE.BoxGeometry(this.height, this.width, this.depth);
		this.material = new THREE.MeshPhongMaterial( {map: this.texture} );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		
		this.position = this.curve.getPointAt(this.t);
		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(this.position.x, this.position.y, this.position.z));
	}

	render(){
		scene.add( this.mesh );
	}
}


// Here we load the cubemap and pitch images, you may change it

const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
  'src/pitch/right.jpg',
  'src/pitch/left.jpg',
  'src/pitch/top.jpg',
  'src/pitch/bottom.jpg',
  'src/pitch/front.jpg',
  'src/pitch/back.jpg',
]);
scene.background = texture;

// Constants
const BALL_SPEED = 5000
const BALL_RADIUS = 2.5;

const GOAL_DISTANCE = 100;
const GOAL_HEIGHT = BALL_RADIUS * 16
const GOAL_ANGLE_TO_BACK = 45;
const GOAL_NET_OPACITY = 0.4;

const CARD_HEIGHT = BALL_RADIUS * 5;
const CARD_WIDTH = BALL_RADIUS * 3;
const CARD_DEPTH = 0.5

const LIGHT_GRAY = new THREE.Color( 'LightGray' );
const WHITE = new THREE.Color( 'White' );


// Texture Loading - loading the ball, and card textures
const textureLoader = new THREE.TextureLoader();
const ballTexture = textureLoader.load('src/textures/soccer_ball.jpg');
const yellowCardTexture = textureLoader.load('src/textures/yellow_card.jpg');
const redCardTexture = textureLoader.load('src/textures/red_card.jpg');


// Adding 2 directional lights, one from each side of the field, and one ambient light
const light1 = new THREE.DirectionalLight(0xffffff, 1);
light1.position.set(1, 0, 1);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-1, 0, -1);
scene.add(light2);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);


// Adding the goal and the ball
const goal = new Goal(GOAL_HEIGHT, 0, 0, -GOAL_DISTANCE, GOAL_ANGLE_TO_BACK, BALL_RADIUS/4, BALL_RADIUS/3.5, LIGHT_GRAY, GOAL_NET_OPACITY, WHITE);
goal.render();

const ball = new Ball(BALL_RADIUS, 0, 0, GOAL_DISTANCE, ballTexture);
ball.render();


// Bezier Curves - adding 3 quadratic bezier curves that the ball can follow
const leftCurve = new THREE.QuadraticBezierCurve3(
	ball.mesh.position.clone(),
	new THREE.Vector3(-30, 0, 50),
	new THREE.Vector3(-40, 5, -120)
);

const centerCurve = new THREE.QuadraticBezierCurve3(
	ball.mesh.position.clone(),
	new THREE.Vector3(20, 20, 50),
	new THREE.Vector3(5, 15, -120)
);

const rightCurve = new THREE.QuadraticBezierCurve3(
	ball.mesh.position.clone(),
	new THREE.Vector3(25, 0, 50),
	new THREE.Vector3(50, 30, -115)
);

const curves = [leftCurve, centerCurve, rightCurve];
const curveObjects = curves.map(curve => {
	const points = curve.getPoints(50);
	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	const material = new THREE.LineBasicMaterial({color: 0xff0000});
	return new THREE.Line(geometry, material);
});

let curveVisibility = false;
let pickedCurveIndex = 1;

function toggleCurveVisibility(isVisible){
	for (let i = 0; i < curveObjects.length; i++){
		const curveObject = curveObjects[i];
		if (isVisible && i === pickedCurveIndex){
			scene.add(curveObject);
		} else {
			scene.remove(curveObject);
		}
	}
}
	

function deleteAllCurves(){
	scene.children = scene.children.filter(child => !(child instanceof THREE.Line));
}


// animate the ball
let animating = false;
let timeOffset;

function animateBall(){
	const t = ((Date.now() - timeOffset) / BALL_SPEED) % 1;
	const currentBallPosition = ball.mesh.position.clone();
	const nextBallPosition = curves[pickedCurveIndex].getPointAt(t).clone();

	ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(-currentBallPosition.x, -currentBallPosition.y, -currentBallPosition.z));
	ball.mesh.applyMatrix4(new THREE.Matrix4().makeRotationY(0.1));
	ball.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(0.1));
	ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(nextBallPosition.x, nextBallPosition.y, nextBallPosition.z));	
	return t;
}


// Set the camera following the ball
function updateCameraToFollowBall(){
	const ballPosition = ball.mesh.position.clone();
	ballPosition.add(new THREE.Vector3(-5, 30, 50));
	camera.position.lerp(ballPosition, 0.1);
}


// Adding cards with textures, ordered by t value, with random t values, colors and curves
const cards = [
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 0, 0.15, false),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 2, 0.25, false),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 1, 0.35, true),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 2, 0.45, false),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 0, 0.55, true),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 1, 0.65, false),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 2, 0.75, true),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 1, 0.85, false),
	new Card(CARD_HEIGHT, CARD_WIDTH, CARD_DEPTH, 0, 0.95, false),
]
cards.forEach(card => card.render());

let numYellowCollisions = 0;
let numRedCollisions = 0;
let score = calculateScore(numYellowCollisions, numRedCollisions);
let highestScore = 0;

// collision detection
function detectCollision(){
	for (let card of cards){
		if (card.visible && card.curveIndex === pickedCurveIndex){
			const cardPosition = card.mesh.position.clone();
			const ballPosition = ball.mesh.position.clone();
			const distance = cardPosition.distanceTo(ballPosition);
			if (distance < BALL_RADIUS + CARD_DEPTH){
				card.visible = false;
				scene.remove(card.mesh);
				if (card.isRed){
					numRedCollisions++;
				} else {
					numYellowCollisions++;
				}
			}
		}
	}
}

function calculateScore(numYellowCollisions, numRedCollisions){
	return 100 * (2 ** ((numYellowCollisions + 10 * numRedCollisions) / -10));
}


function restart(){
	numYellowCollisions = 0;
	numRedCollisions = 0;
	score = calculateScore(numYellowCollisions, numRedCollisions);
	cards.forEach(card => {
		if (!card.visible) {
			card.mesh.material = new THREE.MeshPhongMaterial( {map: card.texture} );
			card.visible = true;
			scene.add(card.mesh);
		}
	});

	// reset the ball position
	ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(-ball.mesh.position.x, -ball.mesh.position.y, GOAL_DISTANCE - ball.mesh.position.z));
	camera.applyMatrix4(new THREE.Matrix4().makeTranslation(-5 - camera.position.x, 30 - camera.position.y, 120 - camera.position.z));
}


// Handling keyboard events
const handle_keydown = (e) => {
	switch(e.code){
		case 'ArrowLeft':
			pickedCurveIndex = Math.max(0, pickedCurveIndex - 1);
			if (curveVisibility) {
				deleteAllCurves();
				scene.add(curveObjects[pickedCurveIndex]);
			}
			break;
		
		case 'ArrowRight':
			pickedCurveIndex = Math.min(curves.length - 1, pickedCurveIndex + 1);
			if (curveVisibility) {
				deleteAllCurves();
				scene.add(curveObjects[pickedCurveIndex]);
			}
			break;
		
		case 'Space':
			if (!animating) {
				timeOffset = Date.now();
				animating = true;
			}
			break;

		case 'KeyT':
			curveVisibility = !curveVisibility;
			toggleCurveVisibility(curveVisibility);
			break;
	}
}
document.addEventListener('keydown', handle_keydown);


function update(){
	const t = animateBall();
	
	// Collision detection
	detectCollision();

	updateCameraToFollowBall();

	score = calculateScore(numYellowCollisions, numRedCollisions);

	return t;
}


function animate() {

	setTimeout( function() {

        requestAnimationFrame( animate );

    }, 1000 / 30 );

	if (animating) {
		let t = update();
		if (t > 0.99) {
			animating = false;
			highestScore = Math.max(highestScore, score);

			alert(`Your score: ${score.toFixed(3)}\nHighest score: ${highestScore.toFixed(3)}`);
			restart();
		}
	}
	
	renderer.render( scene, camera );

}
animate()