// DLS:	takes the target frame as an argument and attempts to solve the
// 	inverse kinematics problem numerically using the DLS method.
kinematik.Ik.prototype.DLS = function(targframe){
	var lambda = 1;	// damping coefficient
	var max_iter = 12;	// maximum number of iterations
	var margin = 1e-5;	// accepted norm2squared of delta

	for (var it = 0; it < max_iter; ++it) {
		// one DLS iteration.

		var delta = this.delta_fromframe(targframe);
		var error = numeric.norm2Squared(delta);
		if (error < margin) { return; }
		console.log(lambda*error);
		var J = this.jacobian();
		var Jt = numeric.transpose(J);

		var dth = numeric.dot(Jt,
		numeric.inv(
			numeric.add(
				numeric.dot(J, Jt),
				numeric.mul(lambda*lambda*error*error,
				numeric.identity(6))
			)
		));
		dth = numeric.dotMV(dth, delta);

		// implement the actuations.
		for (var i = 0; i < this.subject.links.length-1; ++i) {
			var j = i + 1;
			this.subject.links[j].increment(dth[i]);
		}
	}
	// if the loop exits here, maximum # of iterations reached
	// without converence.
	console.log("! DLS exited without onvergence.");
}
