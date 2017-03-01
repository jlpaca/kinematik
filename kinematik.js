////////////////////////////////////////////////////////////////////////////////
var KINEMATIK_JOINTTYPE_REVOLUTE = 1;
var KINEMATIK_JOINTTYPE_PRISMATIC = 2;

var kinematik = {};


// KinematicChain:	constructor for kinematic chain object.
//
//			members:
//
//			links:	an array of links belonging
//				to this kinematic chain.

kinematik.KinematicChain = function(){
	this.links = [];
	return this;
}

// pushlink:	appends a new link to the end of the current kinematic chain,
//		and sets its prev member appropriately. This is the advised
//		method to add links to the chain.

kinematik.KinematicChain.prototype.pushlink = function(){
	this.links.push(new kinematik.KinematicLink());

	this.links[this.links.length-1].prev = 
	this.links[this.links.length-2];
}

// poplink:	removes the last link from the kinematic chain. Note that this
//		function does not consider the representation of the link, and
//		visual_remove should be called on the link to be removed
//		before this function removes the data to prevent garbage from
//		remaining on the scene.

kinematik.KinematicChain.prototype.poplink = function(){
	this.links.pop();
}


// data_fromDH:	works pretty much the same way as KinematicLink.data_fromDH.
//		calls data_fromDH for each link in the correct sequence for
//		propagation of transformations. Optionally newDHlist, an
//		array of DenavitHartenberg objects, may be supplied, in which
//		case the function will pass the i-th element in that list as
//		the argument when calling KinematicLink.data_fromDH on the i-th
//		link.

kinematik.KinematicChain.prototype.data_fromDH = function(newDHlist){
	for (var i = 0; i < this.links.length; ++i) {
	this.links[i].data_fromDH(
		(newDHlist && newDHlist[i] instanceof DenavitHartenberg) ?
		newDHlist[i] : null
		);
	}	
}

// visual_init:	create objects to form visual representations of each link of
//		the kinematic chain.

kinematik.KinematicChain.prototype.visual_init = function(camera, renderer, scene){
	for (var i = 0; i < this.links.length; ++i) {
		this.links[i].visual_init(camera, renderer, scene);
	}
}

// visual_sync:	updates position and orientation of visual representation

kinematik.KinematicChain.prototype.visual_sync = function(){
	for (var i = 0; i < this.links.length; ++i) {
		this.links[i].visual_sync();
	}
}


kinematik.Kbcontrols = function(target){
	this.target = target;
	
	// increment and decrement triggers:
	// { e.which : (actuates) this.link[i] }
	this.actuate_state = {};
	for (var i = 1; i < 10; ++i) { this.actuate_state[i] = 0; }

	this.inc = {};
	for (var i = 1; i < 10; ++i) { this.inc[i+48] = i; }

	this.dec = {	65: 1, 83: 2, 68: 3, 70: 4, 71: 5,
			72: 6, 74: 7, 75: 8, 76: 9 };
	this.increment = 0.1; // default actuation increment per timestep

	this.attachhandlers();

}
// attachhandlers:	binds keys 1-9 and A-L to CCW and CW actuation of the
// 			first couple of joints.
kinematik.Kbcontrols.prototype.attachhandlers = function(){
	window.addEventListener("keydown", this.keydownhandler.bind(this));
	window.addEventListener("keyup", this.keyuphandler.bind(this));
}
kinematik.Kbcontrols.prototype.keydownhandler = function(e){
	// set state for relevant joint
	if (this.inc[e.which]) {
		this.actuate_state[this.inc[e.which]] = this.increment;
	} else if (this.dec[e.which]) {
		this.actuate_state[this.dec[e.which]] = -this.increment;
	}
}
kinematik.Kbcontrols.prototype.keyuphandler = function(e){
	// set state for relevant joint
	if (this.inc[e.which]) {
		this.actuate_state[this.inc[e.which]] = 
		Math.min(this.actuate_state[this.inc[e.which]], 0);
	} else if (this.dec[e.which]) {
		this.actuate_state[this.dec[e.which]] = 
		Math.max(this.actuate_state[this.dec[e.which]], 0);
	}
}
kinematik.Kbcontrols.prototype.update = function(e){
	for (var i = 1; i < 10; ++i) {
		if (this.actuate_state[i] && this.target.links[i]) {
		this.target.links[i].increment(this.actuate_state[i]);
		}
	}
}
kinematik.Kbcontrols.prototype.visual_sync = function(){ /* placeholder */ }



// KinematicLink:	constructor for kinematic link object to be included
//			in a kinematic chain.
//
//			assuming it is the 0-indexed i-th link in chain, and
//			is therefore moved by the 1-indexed i-th joint, and
//			associated with	the 0-indexed i-th frame.
//
//			jointtype: either revolute or prismatic.
//
//			DH:	Denavit-Hartenberg parameters.
//
//			prev:	previous link. Maintained by user effort - it
//				is encouraged to always carry out operations
//				on level of the kinematicChain object level in
//				order to prevent this from breaking.
//
//			frame:	object representing frame i.
//
//			T:	the 4-matrix T_i gives the transformation
//				from the inertial frame at origin to frame i.
//
//			A:	the 4-matrix A_i, which gives transformation
//				from frame i-1 to frame i. Notice that we
//				have T_i = T_{i-1} A_i.
//

kinematik.KinematicLink = function(){
	this.jointtype = KINEMATIK_JOINTTYPE_REVOLUTE;

	this.prev = null;

	this.DH = new DenavitHartenberg();
	this.frame = new Frame();

	this.T = numeric.identity(4);
	this.A = numeric.identity(4);

	this.localjointlocation = [0, 0, 0, 1];

	this.visual = null;
	return this;
}


// data_fromDH:	sets the DH member to newDH if supplied. Then updates all the
//		other members to agree with DH.
//
//		this function requires the prev member to be properly set. also
//		notice that the method doesn't touch this.localjointlocation:
//		it is defaulted to the zero vector upon init and, if set with
//		data_fromjoint later on, will remain set when DH are updated.

kinematik.KinematicLink.prototype.data_fromDH = function(newDH){

	if (newDH instanceof DenavitHartenberg) { this.DH = newDH; }

	this.A = this.DH.tomat4();
	this.T = this.A;
	if (this.prev instanceof kinematik.KinematicLink) {
		this.T = numeric.dot(
		this.prev.T, this.A);
	}
	this.frame.transform_mat4set(this.T);
}


// data_fromjoint:	calculates the DH parameters from the location of the
//			joint, given in world coordinates, and information of
//			the previous joint; and then calls data_fromDH to
//			update everything else.

kinematik.KinematicLink.prototype.data_fromjoint = function(newjoint){
	if (!newjoint) {
		console.log("! invalid joint object");
		return;
	}

	this.jointtype = newjoint.jointtype || KINEMATIK_JOINTTYPE_REVOLUTE;
	
	var prevframe = this.prev instanceof kinematik.KinematicLink ?
			this.prev.frame : new Frame();

	//console.log(newjoint.jointaxis.v4unit());

	// calculate D-H parameters
	var d = 0;
	var t = 0;
	var r = 0;
	var a = 0;
	newjoint.jointaxis.v4unit();

	// check for integrity of the specification for the new axis.
	if (newjoint.jointaxis.v4epsilon()) {
		console.log("! joint axis has zero norm");
		return;
	}

	// case : z_n-1 and z_n are parallel.
	//
	// -	the choice of d is arbitrary and we set it to 0.
	//
	// -	x_n is in the direction of the common normal, pointing from
	//	z_n to z_n-1 and t can be calculated accordingly. If the
	//	common normal vanishes, x_n = x_n-1 and t = 0;
	//
       	// -	r is calculated from the magnitude of the common normal.
	//
	// -	a is zero since z_n-1 // z_n.
	//

	if (v4x(prevframe.axis[2], newjoint.jointaxis).v4epsilon()) {
		console.log("parallel.");

		var normalvector = v4sub(
				newjoint.jointlocation,
				prevframe.o).v4projontoplane(
				prevframe.axis[2]);
		d = 0;
		if (normalvector.v4epsilon()) {
			t = 0;
			r = 0;
		} else {
			// notice the +PI on t and the sign on r:
			// we choose x_n such that it points /towards/
			// the previous link.
			t = Math.PI+v4ang(normalvector,
				prevframe.axis[0],
				prevframe.axis[2]);
			r = -normalvector.v4mag();
		}
		a = 0;
	}

	// case: z_n-1 and z_n are not parallel.
	//
	// -	d is the offset along z_n-1 to endpoint of common normal. This
	//	involves solving an equation for the endpoints.
	//
	// -	t is angle between x_n and x_n-1 about z_n-1.
	// -	r is calculated the magnitude from the common normal.
	// -	a is angle from z_n-1 to z_n about common normal.
	//
	// t is chosen such that the x axis points from child to parent. When
	// the common normal vanishes, t is chosen with z_n x z_n-1 as normal.
	// choice of a depends on that choice of normal as well.

	else {
		var diffvector = v4sub(newjoint.jointlocation, prevframe.o);
		var normaldirection = v4x(newjoint.jointaxis, prevframe.axis[2]).v4unit();
		var normalvector = v4projontovector(diffvector,
				normaldirection
				);	

		// solving the equations.
		// (diffvector + k z_n - d z_n-1) . z_n-1 = 0
		// (diffvector + k z_n - d z_n-1) . z_n   = 0
		// we need only d so matrix shenanigans will probably
		// be overkill.

		var z_n = newjoint.jointaxis;
		var z_0 = prevframe.axis[2];

		// so here. have a manual gaussian elimination.

		var factor = v4dot(z_n, z_0)/v4dot(z_n, z_n);
		d = (v4dot(diffvector, z_0) - factor*v4dot(diffvector, z_n))/
		(v4dot(z_0, z_0) - factor*v4dot(z_n, z_0));


		// if the normal vector vanishes, the two axes coincide.
		if (normalvector.v4epsilon()) {
			t = v4ang(normaldirection, prevframe.axis[0]);
			r = 0;
			a = v4ang(z_n, z_0);
		} else {
			t = v4ang(normalvector,
				prevframe.axis[0],
				prevframe.axis[2]);
			r = normalvector.v4mag();	
			a = v4ang(z_n, z_0, normalvector);
		}

	}



	var newDH = new DenavitHartenberg(d, t, r, a);

	this.data_fromDH(newDH);

	this.localjointlocation =
		this.frame.globaltolocal(newjoint.jointlocation);
}


// actuate:	updates appropriate joint parameter (theta for revolute, d for
//		prismatic joints) to jparam, and calls data_fromDH to update
//		all the data.

kinematik.KinematicLink.prototype.actuate = function(jparam){
	if (this.jointtype === KINEMATIK_JOINTTYPE_PRISMATIC) {
		this.DH.d = jparam;
	} else {
		// all joints that are any other type are defaulted to being
		// revolute.
		this.DH.t = jparam;
	}
	this.data_fromDH(null);	
}


// increment:	acts like actuate, except adds an increment/decrement to joint
//		parameter instead of setting it directcly.

kinematik.KinematicLink.prototype.increment = function(deltaj){
	if (this.jointtype === KINEMATIK_JOINTTYPE_PRISMATIC) {
		this.DH.d += deltaj;
	} else {
		this.DH.t += deltaj;
	}
	this.data_fromDH(null);
}


// some constants that determine the appearance of webGL visual representation
// of the links.

var KINEMATIK_KINEMATICLINK_MATERIAL_A =
	new THREE.MeshLambertMaterial({ color: 0xff4f00 });
var KINEMATIK_KINEMATICLINK_MATERIAL_B =
	new THREE.MeshLambertMaterial({ color: 0xffffff });

var KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS = 0.02;

var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_OUTER_RADIUS = 0.03;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_INNER_RADIUS = 0.017;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_OUTER_HEIGHT = 0.04;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_INNER_HEIGHT = 0.06;

var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_OUTER_RADIUS = 0.025;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_INNER_RADIUS = 0.017;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_OUTER_HEIGHT = 0.08;
var KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_INNER_HEIGHT = 0.12;
// visual_init:	creates webGL objects for visual representation of link and
//		adds them to the scene.

kinematik.KinematicLink.prototype.visual_init = function(camera, renderer, scene){
	if (this.visual !== null) {
		console.log("! repeated call to visual_init");
		return;
	}

	// representation depends on joint type.
	if (this.jointtype === KINEMATIK_JOINTTYPE_PRISMATIC) {
		// if the joint type is PRISMATIC:
		//
		// -	the shaft is broken into two segments, with one
		//	pointing along the actuation axis, and the other
		//	connecting it in a perpendicular direction to the
		//	following joint. This is to ensure that the graphic
		//	representation of the joint looks reasonable.
		//
		// -	the joint is drawn as a rectangular box with longer
		//	in the direction of the joint axis.

		this.visual = {
			shaft:	new THREE.Mesh(	new THREE.BoxGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS, 1),
		KINEMATIK_KINEMATICLINK_MATERIAL_A),

			shaft2:	new THREE.Mesh(	new THREE.BoxGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS, 1),
		KINEMATIK_KINEMATICLINK_MATERIAL_A),

			joint: new THREE.Group()
		};
		this.visual.joint.add(new THREE.Mesh( new THREE.BoxGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_OUTER_RADIUS*2,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_OUTER_HEIGHT,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_OUTER_RADIUS*2),
		KINEMATIK_KINEMATICLINK_MATERIAL_A));

		this.visual.joint.add(new THREE.Mesh( new THREE.BoxGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_INNER_RADIUS*2,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_INNER_HEIGHT,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_PRISMATIC_INNER_RADIUS*2),
		KINEMATIK_KINEMATICLINK_MATERIAL_A));

		scene.add(this.visual.shaft);
		scene.add(this.visual.shaft2);
		scene.add(this.visual.joint);

	} else {
		// if the joint type is anything else it is assumed to
		// be REVOLUTE.
		//
		// -	the shaft is just a bar connecting the joint with
		//	the previous link with the joint with the next link.
		//
		// -	the joint is drawn as a cylinder whose axis is
		//	parallel to the joint axis.

		this.visual = {
			shaft:	new THREE.Mesh(	new THREE.BoxGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS, 1),
		KINEMATIK_KINEMATICLINK_MATERIAL_A),

			joint: new THREE.Group()
		};
		this.visual.joint.add(new THREE.Mesh( new THREE.CylinderGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_OUTER_RADIUS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_OUTER_RADIUS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_OUTER_HEIGHT, 12),
		KINEMATIK_KINEMATICLINK_MATERIAL_A));

		this.visual.joint.add( new THREE.Mesh( new THREE.CylinderGeometry(
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_INNER_RADIUS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_INNER_RADIUS,
		KINEMATIK_KINEMATICLINK_GEOMETRY_JOINT_REVOLUTE_INNER_HEIGHT, 12),
		KINEMATIK_KINEMATICLINK_MATERIAL_A));

		scene.add(this.visual.shaft);
		scene.add(this.visual.joint);
	}

	// initialise visual for associated frame.
	this.frame.visual_init(camera, renderer, scene);
}

// visual_sync:	updates the position and orientation of visual representation
//		to reflect the sate of the link.

kinematik.KinematicLink.prototype.visual_sync = function(){
	if (this.visual === null) {
		console.log("! call to visual_sync without initialised visual");
		return;
	}

	var prevframe = this.prev instanceof kinematik.KinematicLink ?
			this.prev.frame : new Frame();
	
	// calculate important vectors and locations for use later.
	var toe = this.prev instanceof kinematik.KinematicLink ?
		this.prev.frame.localtoglobal(this.prev.localjointlocation) :
		[0, 0, 0, 1];
	var tip = this.frame.localtoglobal(this.localjointlocation);
	var shaftvector = v4sub(tip, toe);

	// position and orient shaft.
	// 
	// -	for prismatic joints, the shaft is broken into two parts: one
	//	extending along the joint axis, and a second one that goes
	//	perpendicular to it to connect it to the next joint.
	//
	//	we do that by projecting the shaftvector (a variable shared by
	//	the 1st segment of prismatic joint shaft and only segment of
	//	revolute joint shaft) onto the joint axis if the joint is
	//	prismatic. Thus prismatic joints can share half the code with
	//	revolute joint, and we only need to deal specifically with
	//	the second segment.
	
	var shaft2vector;
	if (this.jointtype === KINEMATIK_JOINTTYPE_PRISMATIC) {
		shaftvector.v4projontovector(prevframe.axis[2]);
		shaft2vector = v4sub(tip, v4add(toe, shaftvector));

		// a joint thickness is added to the length of the shaft. The
		// purpose is both to ensure junctions look centred, and to
		// ensure the scaling factor is positive so that the matricies
		// don't break.

		this.visual.shaft2.scale.z = shaft2vector.v4mag()
			+ KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS;

		this.visual.shaft2.position.fromArray(
				v4sub(tip, v4mul(0.5, shaft2vector))
				);
		this.visual.shaft2.up.fromArray(this.frame.axis[0]);
		this.visual.shaft2.lookAt(new THREE.Vector3().fromArray(tip));
	}

	// here we position and orient the shaft.
	//
	// -	the centre of the shaft is sent to toe + 0.5 shaft vector
	// -	the shaft is pointed at toe
	// -	the shaft is rotated so that it doesn't rotate in the local
	//	coordinate frame.

	this.visual.shaft.scale.z = shaftvector.v4mag()
		+ KINEMATIK_KINEMATICLINK_GEOMETRY_SHAFT_THICKNESS;

	this.visual.shaft.position.fromArray(
			v4mul(0.5, shaftvector).v4add(toe)
			);

	// we want to consistently orient the shaft so that it doesn't spin
	// about arbitrarily on its axis. we choose from the x and z axes of
	// the present frame, whichever is numerically nicer.
	this.visual.shaft.up.fromArray(
			Math.abs(v4dot(this.frame.axis[2], shaftvector)) <
			Math.abs(v4dot(this.frame.axis[0], shaftvector)) ?
			this.frame.axis[2] : this.frame.axis[0]
	);
	
	this.visual.shaft.lookAt(new THREE.Vector3().fromArray(toe));

	// position and orient joint.
	//
	// the joint of link i is attached at the end of link i-1, which is
	// toe of shaftvector. The axis is aligned with z_i-1.

	this.visual.joint.visible =
	this.prev instanceof kinematik.KinematicLink;

	this.visual.joint.position.fromArray(toe);
	this.visual.joint.up.fromArray(prevframe.axis[2]);
	this.visual.joint.lookAt(new THREE.Vector3().fromArray(
			v4add(toe, prevframe.axis[0])));

	// finally, also sync the visual for the associated frame
	this.frame.visual_sync();
}


// visual_remove:	removes the visual representation from the scene,
//			deletes the relevant objects, and sets visual to null.

kinematik.KinematicLink.prototype.visual_remove = function(camera, renderer, scene){

	if (this.visual === null) {
		console.log("! call to visual_remove without initialised visual");
		return;
	}
	this.frame.visual_remove(camera, renderer, scene);


	scene.remove(this.visual.shaft);
	
	scene.remove(this.visual.joint);

	this.visual = null;
}
