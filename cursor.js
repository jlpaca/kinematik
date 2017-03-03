// declarations for user interaction
function Cursor(camera, renderer, scene){

	this.camera = camera;
	this.renderer = renderer;

	this.cameradirection = v4fromTHREEVector3(this.camera.getWorldDirection());

	this.raycaster = new THREE.Raycaster();

	// current coordinates of the /mouse/ (not the 3d cursor)
	this.q2d = [0, 0];
	this.q3d = [0, 0, 0, 1];
	// coordinates at the beginning of tentative operations that will
	// be returned to if the operation is aborted.
	this.marker2d = [0, 0];
	this.marker3d = [0, 0, 0, 1];
	// keep record of the projected location of the origin of the frame
	this.rotationorigin = [0, 0];

	this.state = {
		translation: false,
		rotation: false,
		axis: null
	};

	this.frame = new Frame();
	this.prevframe = new Frame();

	this.visual = null;

	this.attachhandlers(camera, renderer, scene);

	return this;
}
Cursor.prototype.visual_init = function(camera, renderer, scene){
	// camera, renderer, scene are supplied for consistency, even
	// though the object has memory of camera & renderer upon
	// initialisation. If the parameters here are inconsistent with
	// the one supplied to the constructor, the class will calculate
	// the projection into one scene but draw the 3d cursor in another,
	// which is silly.

	if (this.visual !== null) {
		console.log("! repeated call to visual_init");
		return;
	}
	this.visual = {};
	
	// placeholder: sphere marks location of cursor.
	this.visual.centre = new THREE.Mesh(
			new THREE.SphereGeometry(0.01, 32, 32),
			new THREE.MeshBasicMaterial({color: 0x666666 })
			);
	scene.add(this.visual.centre);

	// also initalise visuals for associated frame
	this.frame.visual_init(camera, renderer, scene);
	//this.prevframe.visual_init(camera, renderer, scene);
}
Cursor.prototype.visual_sync = function(){
	if (this.visual === null) {
		console.log("! call to visual_sync without intialised visual");
		return;
	}
	this.visual.centre.position.fromArray(this.q3d);

	this.frame.visual_sync();
	//this.prevframe.visual_sync();
}
Cursor.prototype.q2d_fromevent = function(e){
	// 2d (screen space) coordinates from mouse event.
	//
	// we use the canvas convention of coordinates with origin
	// at centre of element & coordinates normalised to
	// (-1, 1) along both axes.
	var q2d = [
	e.clientX/e.target.clientWidth*2-1,
	-e.clientY/e.target.clientHeight*2+1
	];
	return q2d;
}
Cursor.prototype.q3d_fromevent = function(e, ref) {
	var q2d = [e.clientX/e.target.clientWidth*2-1,
	-e.clientY/e.target.clientHeight*2+1];

	// 3d (scene space) coordinates:
	//
	// a ray is cast from cursor coordinates, and this.q3d is
	// moved to the point on that ray that leaves its distance to
	// the camera, along the camera's viewing vector, unchanged.

	this.raycaster.setFromCamera(
			new THREE.Vector2().fromArray(ref),
			this.camera);

	var ray = v4fromTHREEVector3(this.raycaster.ray.direction);
	var origin = v4fromTHREEVector3(this.raycaster.ray.origin);

	this.cameradirection = v4fromTHREEVector3(this.camera.getWorldDirection());

	// the distance down the cast ray to the intersection with the normal plane.
	var scale = v4dot(this.cameradirection, v4sub(this.q3d, origin))/
	v4dot(this.cameradirection, ray);

	return v4add(origin, v4mul(scale, ray));
}
Cursor.prototype.q3d_setfromevent = function(e, ref){
	this.q3d = this.q3d_fromevent(e, ref);
}
Cursor.prototype.q2d_setfromevent = function(e){ this.q2d = this.q2d_fromevent(e); }


Cursor.prototype.keydownhandler = function(e){
	if (e.which == 27) { this.action_abort(); }		// ESC
	if (e.which == 82) { this.rotation_start(); }		// RKEY
	if (e.which == 84) { this.translation_start(); }	// TKEY

	// X, Y, Z keys set axis
	if (e.which == 88) {
		if (this.state.translation || this.state.rotation) {
		this.state.axis = this.frame.axis[0]; }
	}
	if (e.which == 89) {
		if (this.state.translation || this.state.rotation) {
		this.state.axis = this.frame.axis[1]; }
	}
	if (e.which == 90) {
		if (this.state.translation || this.state.rotation) {
		this.state.axis = this.frame.axis[2]; }
	}
}

Cursor.prototype.mousemovehandler = function(e){
	// always track where the mouse is, in both
	// screen and scene space.
	this.q2d_setfromevent(e);
	this.q3d_setfromevent(e, this.q2d);

	if (!(this.state.translation || this.state.rotation) &&
		e.which == 1) {
		this.frame.transform_set(this.q3d, null);
	}

	if (this.state.translation) { this.translation_sync(); }
	if (this.state.rotation) { this.rotation_sync(); }
}
Cursor.prototype.mousedownhandler = function(e){
	this.q2d_setfromevent(e);
	this.q3d_setfromevent(e, this.q2d);

	if (this.state.translation || this.state.rotation) { this.action_apply();
	} else {
		// no special state actions.
		// move the cursor upon LMB click.
		if (e.which == 1) {
			this.frame.transform_set(this.q3d, null);

		}
	}
	
}
Cursor.prototype.wheelhandler = function(e){
	this.q2d_fromevent(e);
}
Cursor.prototype.attachhandlers = function(camera, renderer, scene) {
	window.addEventListener("keydown",
			this.keydownhandler.bind(this));

	renderer.domElement.addEventListener("mousemove",
			this.mousemovehandler.bind(this));
	renderer.domElement.addEventListener("mousedown",
			this.mousedownhandler.bind(this));
	renderer.domElement.addEventListener("wheel",
			this.wheelhandler.bind(this));
}

Cursor.prototype.translation_start = function(){
	this.state.translation = true;
	this.state.rotation = false;

	this.marker2d = this.q2d;
	this.marker3d = this.q3d;
	this.prevframe.transform_frameset(this.frame);
}
Cursor.prototype.translation_sync = function(){
	var delta = v4sub(this.q3d, this.marker3d);
	if (this.state.axis) {
		delta = v4mul(
			v4dot(this.state.axis, delta),
			this.state.axis);
	}
	this.frame.transform_set(
	v4add(this.prevframe.o, delta),
	null);
}
Cursor.prototype.rotation_start = function(){
	this.state.translation = false;
	this.state.rotation = true;

	//this.state.axis = v4fromTHREEVector3(this.camera.getWorldDirection());
	this.state.axis = this.cameradirection;

	this.marker2d = this.q2d;
	this.marker3d = this.q3d;
	this.prevframe.transform_frameset(this.frame);

	var vcentre =
	(new THREE.Vector3()).fromArray(this.frame.o).project(camera);
	this.rotationorigin = [ vcentre.x, vcentre.y ];
}
Cursor.prototype.rotation_sync = function(){

	cameradirection = v4fromTHREEVector3(
		this.camera.getWorldDirection()).v4unit();

	var v1 = v4sub(this.q2d ,this.rotationorigin);
	v1[2] = 0; v1[3] = 1;
	var v2 = v4sub(this.marker2d ,this.rotationorigin);
	v2[2] = 0; v2[3] = 1;

	var theta = v4ang(v2, v1, [0, 0, 1, 1])*
	(v4dot(this.cameradirection, this.state.axis) < 0 ? -1 : 1);
	
	this.frame.transform_frameset(this.prevframe);
	this.frame.transform_push(
	null, v4mul(theta, this.state.axis));
}
Cursor.prototype.action_apply = function(){
	// remove all the state tags and leave the frame
	// in the state of the latest update.
	this.state.translation = false;
	this.state.rotation = false;
	this.state.axis = null;
}
Cursor.prototype.action_abort = function(){
	// restore configuration of frame
	this.frame.transform_frameset(this.prevframe);

	// reset state
	this.state.translation = false;
	this.state.rotation = false;
	this.state.axis = null;
}

Cursor.prototype.update = function(){

}
