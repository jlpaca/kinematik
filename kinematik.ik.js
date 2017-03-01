kinematik.Ik = function(subject){
	this.subject = subject;
}

kinematik.Ik.prototype.DLS = function(target){
	var iter = 4;
	var lambda = 0.01;

	var delta = this.delta(target);
	if (numeric.norm2Squared(delta) < 1e-4) {
		return;
	}

	var J = this.jacobian();
	var Jt = numeric.transpose(J);

	var dth = numeric.dot(Jt,
	numeric.inv(
		numeric.add(
			numeric.dot(J, Jt),
			numeric.mul(lambda*lambda,
			numeric.identity(6))
		)
	));
	dth = numeric.dotMV(dth, delta);

	// implement the actuations.
	for (var i = 0; i < this.subject.links.length-1; ++i) {
		var j = i + 1;
		this.subject.links[j].increment(dth[i]);
	}

	// iterate.
	this.DLS(target);
}

// delta:	returns the difference between the target location and the
// 		current position of the end effector, in terms of 6-coords.
kinematik.Ik.prototype.delta = function(target){
	// endi is the index of the last link/joint, for convenience.
	var endi = this.subject.links.length-1;
	// endtip is the current location of the end effector.
	var endtip = this.subject.links[endi].frame.localtoglobal(
	this.subject.links[endi].localjointlocation);

	var delta = [];
	delta[0] = target[0] - endtip[0];
	delta[1] = target[1] - endtip[1];
	delta[2] = target[2] - endtip[2];

	// placeholder
	delta[3] = 0;
	delta[4] = 0;
	delta[5] = 0;

	return delta;
}

// jacobian:	returns the jacobian of the associated kinematic manipulator.
kinematik.Ik.prototype.jacobian = function(){
	var J = [[], [], [], [], [], []];

	// endi is the index of the last link/joint, for convenience.
	var endi = this.subject.links.length-1;
	// endtip is the current location of the end effector.
	var endtip = this.subject.links[endi].frame.localtoglobal(
	this.subject.links[endi].localjointlocation);

	// jacobian J has dimensions 6 x (# of joints);
	// J[i][j] is partial(coord.i)/partial(joint j)
	for (var i = 0; i < endi; ++i) { var j = i+1;
	
		if (this.subject.links[j].jointtype ==
		KINEMATIK_JOINTTYPE_REVOLUTE) {

			var zxd = v4x(this.subject.links[i].frame.axis[2],
				v4sub(endtip,
				this.subject.links[i].frame.o));

			J[0][i] = zxd[0]; J[1][i] = zxd[1]; J[2][i] = zxd[2];
			J[3][i] = this.subject.links[i].frame.axis[2][0];
			J[4][i] = this.subject.links[i].frame.axis[2][1];
			J[5][i] = this.subject.links[i].frame.axis[2][2];

		} else if (this.subject.links[i].jointtype ==
		KINEMATIK_JOINTTYPE_PRISMATIC) {

			J[0][i] = this.subject.links[i].frame.axis[2][0];
			J[1][i] = this.subject.links[i].frame.axis[2][1];
			J[2][i] = this.subject.links[i].frame.axis[2][2];
			J[3][i] = 0; J[4][i] = 0; J[5][i] = 0;
		}
	}

	return J;
}

