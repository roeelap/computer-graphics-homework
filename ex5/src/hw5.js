import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
scene.background = new THREE.Color( 'ForestGreen' );

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Add here the rendering of your goal
class Ball {
	constructor(radius, color, x, y, z){
		this.radius = radius;
		this.color = color;
		this.x = x;
		this.y = y;
		this.z = z;
		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = new THREE.MeshPhongMaterial( {color: this.color} );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
	}

	render(){
		scene.add( this.mesh );
	}
}

class Goal {
	constructor(height, x, y, z, angleToBack, postRadius, postBaseRadius, netColor, postColor){
		this.height = height;
		this.width = this.height * 3;
		this.x = x;
		this.y = y;
		this.z = z;
		this.postRadius = postRadius;
		this.postBaseRadius = postBaseRadius;
		this.netColor = netColor;
		this.postColor = postColor;
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
			new RectangularNet(this.backHeight, this.width, this.x, this.fieldLevel, this.midBackMargin, this.angleToBack, this.netColor),
			new TriangularNet(
				new Float32Array([this.leftMargin, this.y, this.z,
				this.leftMargin, this.y + this.height, this.z, 
				this.leftMargin, this.y, this.backMargin]),
				this.netColor
			),
			new TriangularNet(
				new Float32Array([this.rightMargin, this.y, this.z,
				this.rightMargin, this.y + this.height, this.z, 
				this.rightMargin, this.y, this.backMargin]),
				this.netColor
			),
		];

		this.children.forEach(child => {
			this.group.add(child.mesh);
		});
	}

	shrink(){
        this.group.applyMatrix4(new THREE.Matrix4().makeTranslation(-this.x, -this.y, -this.z));
		this.group.applyMatrix4(new THREE.Matrix4().makeScale(0.95, 0.95, 0.95));
		this.group.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));

		this.height *= 0.95;
		this.width = this.height * 3;
		this.calculateMetrics();
	}

	expand(){
		this.group.applyMatrix4(new THREE.Matrix4().makeTranslation(-this.x, -this.y, -this.z));
		this.group.applyMatrix4(new THREE.Matrix4().makeScale(1 / 0.95, 1 / 0.95, 1 / 0.95));
		this.group.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));

		this.height /= 0.95;
		this.width = this.height * 3;
		this.calculateMetrics();
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
		this.color = color;
		this.geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
		this.material = new THREE.MeshPhongMaterial( {color: this.color} );
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
	constructor(vertices, color){
		this.color = color;
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices.length), 3));
        this.geometry.computeVertexNormals();

		this.material = new THREE.MeshPhongMaterial({color: this.color, side: THREE.DoubleSide});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	render(){
		scene.add( this.mesh );
	}
}

class RectangularNet {
	constructor(height, width, x, y, z, angleToBack, color){
		this.height = height;
		this.width = width;
		this.x = x;
		this.y = y;
		this.z = z;
		this.angleToBack = angleToBack;
		this.color = color;
		this.geometry = new THREE.PlaneGeometry(this.width, this.height);
		this.material = new THREE.MeshPhongMaterial( {color: this.color, side: THREE.DoubleSide});
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
		this.color = color;
		this.geometry = new THREE.TorusGeometry(this.radius, this.tubeRadius);
		this.material = new THREE.MeshPhongMaterial({ color: this.color });
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		
		this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(degrees_to_radians(-90)));
		this.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z));
	}

	render(){
		scene.add( this.mesh );
	}
}

class Field {
	constructor(height, width, color){
		this.height = height;
		this.width = width;
		this.color = color;
		this.geometry = new THREE.PlaneGeometry(this.width, this.height);
		this.material = new THREE.MeshPhongMaterial( {color: this.color} );
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(degrees_to_radians(-90)));
	}

	render(){
		scene.add( this.mesh );
	}
}

const BALL_RADIUS = 0.2;
const GOAL_HEIGHT = BALL_RADIUS * 16
const GOAL_ANGLE_TO_BACK = 45;
const FIELD_WIDTH = 50
const FIELD_HEIGHT = 100
const LIGHT_GRAY = new THREE.Color( 'LightGray' );
const WHITE = new THREE.Color( 'White' );
const LIGHT_GREEN = new THREE.Color( 'LightGreen' );

// Add a light source
const ambientLight = new THREE.AmbientLight(WHITE);
scene.add(ambientLight);

const field = new Field(FIELD_HEIGHT, FIELD_WIDTH, LIGHT_GREEN);
field.render();

const ball = new Ball(BALL_RADIUS, 0x000000, 0, BALL_RADIUS, 1);
ball.render();

const goal = new Goal(GOAL_HEIGHT, 0, 0, -1, GOAL_ANGLE_TO_BACK, BALL_RADIUS/4, BALL_RADIUS/3.5, LIGHT_GRAY, WHITE);
goal.render();

// This defines the initial distance of the camera
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0,1,5);
camera.applyMatrix4(cameraTranslate)

renderer.render( scene, camera );

const controls = new OrbitControls( camera, renderer.domElement );

let isOrbitEnabled = true;
let isWireframe = false;
let ballSpeed = 1;
let isAnimating1 = false
let isAnimating2 = false

const handleKeyDown = (e) => {
	switch (e.key) {
		case "o":
			isOrbitEnabled = !isOrbitEnabled;
			break;

		case "w":
			toggleWireframe();
			break;

		case "1":
			isAnimating1 = !isAnimating1;
			break;

		case "2":
			isAnimating2 = !isAnimating2;
			break;

		case "3":
			if (goal.height > 1) {
				goal.shrink();
			}
			break;

		case "4":
			if (goal.height < 15) {
				goal.expand();
			}
			break;

		case '+':
		case "ArrowUp":
			ballSpeed = Math.min(10, ballSpeed + 0.1);
			break;

		case '-':
		case "ArrowDown":
			ballSpeed = Math.max(0.1, ballSpeed - 0.1);
			break;

	}
}

document.addEventListener('keydown',(handleKeyDown))


function toggleWireframe() {
    isWireframe = !isWireframe;
    scene.traverse((object) => {
        if (object.isMesh) {
            object.material.wireframe = isWireframe;
        }
    });
}

function animateBall() {
	if (isAnimating1) {
		// translate to the origin
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(-goal.x, -goal.y, -goal.z));
		// rotate around x axis
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeRotationX(degrees_to_radians(-ballSpeed)));
		// translate back
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(goal.x, goal.y, goal.z));
	}

	if (isAnimating2) {
		// translate to the origin
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(-goal.x, -goal.y, -goal.z));
		// rotate around y axis
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeRotationY(degrees_to_radians(-ballSpeed)));
		// translate back
		ball.mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(goal.x, goal.y, goal.z));
	}
}

//controls.update() must be called after any manual changes to the camera's transform
controls.update();

function animate() {

	requestAnimationFrame( animate );

	controls.enabled = isOrbitEnabled;
	controls.update();

	animateBall();

	renderer.render( scene, camera );

}
animate()