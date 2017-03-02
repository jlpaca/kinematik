// SDLS: solve inverse kinematics with SLDS.
//
// TODO: INCOMPLETE IMPLEMENTATION. currently this is just a DLS with a
// 	 fancy SVD decomposition in the middle.
kinematik.Ik.prototype.SDLS = function(targframe){
	var lambda = 0.05;
	var max_iter = 12;
	var margin = 1e-5;

	for (var it = 0; it < max_iter; ++it) {
		var delta = this.delta_fromframe(targframe);
		if (numeric.norm2Squared(delta) < margin) { return; }

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

	console.log("! SDLS exited without convergence.");

}
