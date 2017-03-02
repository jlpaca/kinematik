// kinematik.ik:	inverse kinematics solver object.
kinematik.Ik = function(subject){
	this.subject = subject;
}

// delta:	returns the difference between the target location and the
// 		current position of the end effector, in terms of 6-coords.
kinematik.Ik.prototype.delta_fromframe = function(targframe){
	// endi is the index of the last link/joint, for convenience.
	
	var endi = this.subject.links.length-1;
	var endframe = this.subject.links[endi].frame;

	var delta = [];
	delta[0] = targframe.o[0] - endframe.o[0];
	delta[1] = targframe.o[1] - endframe.o[1];
	delta[2] = targframe.o[2] - endframe.o[2];

	// magically figure out the rotation components
	var targT = targframe.transform_mat4get();
	var endT = endframe.transform_mat4get();

	var nd = [targT[0][0], targT[1][0], targT[2][0], 1];
	var sd = [targT[0][1], targT[1][1], targT[2][1], 1];
	var ad = [targT[0][2], targT[1][2], targT[2][2], 1];

	var ne = [endT[0][0], endT[1][0], endT[2][0], 1];
	var se = [endT[0][1], endT[1][1], endT[2][1], 1];
	var ae = [endT[0][2], endT[1][2], endT[2][2], 1];

	var e = v4add(v4add(
	v4x(ne, nd), v4x(se, sd)), v4x(ae, ad)).v4mul(0.5);

	delta[3] = e[0];
	delta[4] = e[1];
	delta[5] = e[2];
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

