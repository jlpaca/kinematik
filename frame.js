// some constants that determine the appearance of the webGL visual representation
// of the coordinate frame.

var FRAME_MATERIAL_R = new THREE.MeshBasicMaterial({ color: 0xff0000 });
var FRAME_MATERIAL_G = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
var FRAME_MATERIAL_B = new THREE.MeshBasicMaterial({ color: 0x0000ff });

var FRAME_GEOMETRY_AXIS_LENGTH = 1;
var FRAME_GEOMETRY_CONE_HEIGHT = FRAME_GEOMETRY_AXIS_LENGTH*0.4;
var FRAME_GEOMETRY_CONE_THICKNESS = FRAME_GEOMETRY_AXIS_LENGTH*0.07;
var FRAME_GEOMETRY_CYLINDER_HEIGHT = FRAME_GEOMETRY_AXIS_LENGTH-FRAME_GEOMETRY_CONE_HEIGHT;
var FRAME_GEOMETRY_CYLINDER_THICKNESS = FRAME_GEOMETRY_AXIS_LENGTH*0.02;

var FRAME_GEOMETRY_CONE = new THREE.ConeGeometry(
		FRAME_GEOMETRY_CONE_THICKNESS,
		FRAME_GEOMETRY_CONE_HEIGHT, 8);
var FRAME_GEOMETRY_CYLINDER = new THREE.CylinderGeometry(
		FRAME_GEOMETRY_CYLINDER_THICKNESS,
		FRAME_GEOMETRY_CYLINDER_THICKNESS,
		FRAME_GEOMETRY_CYLINDER_HEIGHT, 8);


// Frame:	constructor for Frame object.
//
//		o(4-vector) is the origin
//		axis(3-array of 4-vectors) are the basis vectors.
//
//		the members of axes are to be maintained by user effort
//		to always be a unit 3-vector and a 4th element 1.

function Frame(){
	this.o = [0, 0, 0, 1];
	this.axis = [
		[1, 0, 0, 1],
		[0, 1, 0, 1],
		[0, 0, 1, 1]
		];
	return this;	
}


// visual_init:	creates webGL objects to represent the frame in a webGL context
//		as specified by parameters passed in. (camera, renderer, and scene
//		are always passed, in that order, to functions that require any one
//		of those as parameters, for consistency).

Frame.prototype.visual_init = function(camera, renderer, scene){
	// guard against repeated calls to prevent leaving garbage objects in scene.
	if (this.visual !== undefined) {
		console.log("! repeated call to visual_init");
		return;
	}

	// naming convention: [object].[property] has [object].visual.[property] as
	// visual representation in scene. visual may contain more than one part.
	this.visual = {};
	this.visual.axis = [
		{ cone: new THREE.Mesh(FRAME_GEOMETRY_CONE, FRAME_MATERIAL_R),
		  cylinder: new THREE.Mesh(FRAME_GEOMETRY_CYLINDER, FRAME_MATERIAL_R) },
		{ cone: new THREE.Mesh(FRAME_GEOMETRY_CONE, FRAME_MATERIAL_G),
		  cylinder: new THREE.Mesh(FRAME_GEOMETRY_CYLINDER, FRAME_MATERIAL_G) },
		{ cone: new THREE.Mesh(FRAME_GEOMETRY_CONE, FRAME_MATERIAL_B),
		  cylinder: new THREE.Mesh(FRAME_GEOMETRY_CYLINDER, FRAME_MATERIAL_B) }
	];

	for (var i = 0; i < 3; ++i){
		scene.add(this.visual.axis[i].cone);
		scene.add(this.visual.axis[i].cylinder);
	}
	return;
}


// visual_sync: updates position and orientation of webGL representation to
//		reflect current origin and unit vectors.

Frame.prototype.visual_sync = function() {
	// guard against updates before the representations have been created.
	if (!this.visual) {
		console.log("! visual_sync called before visual_init");
		return;
	}
	var j = 0;
	var offsetcone = FRAME_GEOMETRY_CYLINDER_HEIGHT+FRAME_GEOMETRY_CONE_HEIGHT/2;
	var offsetcylinder = FRAME_GEOMETRY_CYLINDER_HEIGHT/2;
	for (var i = 0; i < 3; ++i) {
		j = (i+1 == 3) ? 0 : i+1;
		this.visual.axis[i].cone.position.set(
			this.o[0]+this.axis[i][0]*offsetcone,
			this.o[1]+this.axis[i][1]*offsetcone,
			this.o[2]+this.axis[i][2]*offsetcone);
		this.visual.axis[i].cone.up.fromArray(this.axis[i]);
		this.visual.axis[i].cone.lookAt(
			new THREE.Vector3(
			this.o[0]+(this.axis[j][0]+this.axis[i][0])*offsetcone,
			this.o[1]+(this.axis[j][1]+this.axis[i][1])*offsetcone,
			this.o[2]+(this.axis[j][2]+this.axis[i][2])*offsetcone));

		this.visual.axis[i].cylinder.position.set(
			this.o[0]+this.axis[i][0]*offsetcylinder,
			this.o[1]+this.axis[i][1]*offsetcylinder,
			this.o[2]+this.axis[i][2]*offsetcylinder);
		this.visual.axis[i].cylinder.up.fromArray(this.axis[i]);
		this.visual.axis[i].cylinder.lookAt(
			new THREE.Vector3(
			this.o[0]+(this.axis[j][0]+this.axis[i][0])*offsetcylinder,
			this.o[1]+(this.axis[j][1]+this.axis[i][1])*offsetcylinder,
			this.o[2]+(this.axis[j][2]+this.axis[i][2])*offsetcylinder)
			);
	}
}


// tansform_mat4push:	takes a 4*4 matrix and applies that transformation to
//			the frame. Note that repeated calls to this function
//			apply a series of transformations in sequence.

Frame.prototype.transform_mat4push = function(T) {
	var newo = numeric.dot(T, this.o);
	for (var i = 0; i < 3; ++i) {
	this.axis[i] = numeric.dot(T, v4add(this.o, this.axis[i])).v4sub(newo);
	}
	this.o = newo;
}


// transform_mat4set:	takes a 4*4 matrix set the frame to coincide with the
//			result of applying that transformation to the inertial
//			frame (origin 0 and standard unit basis).

Frame.prototype.transform_mat4set = function(T) {
	for (var j = 0; j < 3; ++j) { this.o[j] = T[j][3];
	for (var i = 0; i < 3; ++i) { this.axis[i][j] = T[j][i]; }}
}
