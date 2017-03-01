kinematik.Ik = function(subject){
	this.subject = subject;
}

// DLS:	takes the target frame as an argument and attempts to solve the
// 	inverse kinematics problem numerically using the DLS method.
kinematik.Ik.prototype.DLS = function(targframe){
	var lambda = 0.05;
	var max_iter = 12;
	var it;
	for (it = 0; it < max_iter; ++it) {
		if (this.DLSstep(targframe, lambda)) { break; }
	}
	if (it == max_iter-1) {
		console.log("! DLS: failed to converge");
	}
}

kinematik.Ik.prototype.DLSstep = function(targframe, lambda){
	var delta = this.delta_fromframe(targframe);
	if (numeric.norm2Squared(delta) < 1e-5) {
		return 1;
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

	return 0;
}

// SDLS: solve inverse kinematics with SLDS.
kinematik.Ik.prototype.SDLS = function(targframe){
	var it = 0; var max_iter = 12;
	for (; it < max_iter; ++it) {
		if (this.SDLSstep(targframe)) { break; }
	}
	if (it == max_iter - 1) {
		console.log("! SDLS failed to converge");
	}

}
kinematik.Ik.prototype.SDLSstep = function(targframe){
	// error vector & jacobian
	var lambda = 0.05;
	var delta = this.delta_fromframe(targframe);
	var J = this.jacobian();
	var Jt = numeric.transpose(J);

	var r = this.subject.links.length-1;

	// perform the SVD decomposition: J = U S Vt
	var SVD = numeric.svd(J);
	
	var U = SVD.U;
	var Ut = numeric.transpose(SVD.U);

	var V = SVD.V;
	var Vt = numeric.transpose(SVD.V);

	var S = SVD.S;

	// sigma_1^r tau_i v_i (u_i)T
	//var DLSmatrix = numeric.sub(numeric.identity(r), numeric.identity(r));
	var DLSmatrix = [];
	for (var i = 0; i < r; ++i) { DLSmatrix[i] = [];
	for (var j = 0; j < 6; ++j) { DLSmatrix[i][j] = 0; }}

	for (var i = 0; i < r; ++i) {
		var tau_i = S[i]/(S[i]*S[i]+lambda*lambda);
		DLSmatrix = numeric.add(DLSmatrix,
		numeric.mul(tau_i,
		numeric.dot(numeric.transpose([Vt[i]]), [Ut[i]])))
	}

	var dth = numeric.dotMV(DLSmatrix, delta);
	// implement the actuations.
	for (var i = 0; i < this.subject.links.length-1; ++i) {
		var j = i + 1;
		this.subject.links[j].increment(dth[i]);
	}

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

