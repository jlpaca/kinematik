// kinematik.Kbcontrols:	keyboard controls for kinematik.KinematicChain
// 				
// 				listens for keypresses and releases, and
// 				actuates the joints accordingly.
//
kinematik.Kbcontrols = function(target){
	this.target = target;
	
	
	this.actuate_state = {};
	for (var i = 1; i < 10; ++i) { this.actuate_state[i] = 0; }

	// increment and decrement triggers:
	// { e.which : (actuates) this.link[i] }
	this.inc = {};
	for (var i = 1; i < 10; ++i) { this.inc[i+48] = i; }

	this.dec = {	65: 1, 83: 2, 68: 3, 70: 4, 71: 5,
			72: 6, 74: 7, 75: 8, 76: 9 };
	this.increment = 0.02; // default actuation increment per timestep

	this.attachhandlers();

}
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
	// each timestep, iterate over actuate_state, and inc/dec
	// each joint that exists & is currently being actuated.
	for (var i = 1; i < 10; ++i) {
		if (this.actuate_state[i] && this.target.links[i]) {
		this.target.links[i].increment(this.actuate_state[i]);
		}
	}
}
kinematik.Kbcontrols.prototype.visual_sync = function(){ /* placeholder */ }
