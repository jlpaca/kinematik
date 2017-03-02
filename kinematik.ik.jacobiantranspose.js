// jacobiantranspose:	takes the target frame as an argument and attempts to
// 			solve the inverse kinematics problem numerically using
// 			the DLS method.
kinematik.Ik.prototype.jacobiantranspose = function(targframe){
	var max_iter = 24;	// maximum number of iterations
	var margin = 1e-5;	// accepted norm2squared of delta

	for (var it = 0; it < max_iter; ++it) {
		// one DLS iteration.

		var delta = this.delta_fromframe(targframe);
		var error = numeric.norm2Squared(delta);
		if (error < margin) { return; }

		var J = this.jacobian();
		var Jt = numeric.transpose(J);

		// calculate alpha, the scaling constant, by assuming change
		// in end effector position is exactly JJt*delta, and
		// minimising the final error.
		var JJtdelta = numeric.dot(
			numeric.dot(J, Jt), delta);
		var alpha = numeric.dot(delta, JJtdelta)/
			numeric.dot(JJtdelta, JJtdelta);

		var dth = numeric.dotMV(
			numeric.mul(alpha, Jt),
			delta);

		// implement the actuations.
		for (var i = 0; i < this.subject.links.length-1; ++i) {
			var j = i + 1;
			this.subject.links[j].increment(dth[i]);
		}
	}
	// if the loop exits here, maximum # of iterations reached
	// without converence.
	console.log("! Jacobian Transpose method exited without onvergence.");
}
