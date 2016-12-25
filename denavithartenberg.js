// returns a Denavit-Hartenberg param object.
function DenavitHartenberg(d, t, r, a){
	this.d = d || 0; this.t = t || 0;
	this.r = r || 0; this.a = a || 0;
	return this;
}
DenavitHartenberg.prototype.tomat4 = function(){
	return [
		[ Math.cos(this.t), -Math.sin(this.t)*Math.cos(this.a),
		  Math.sin(this.t)*Math.sin(this.a), this.r*Math.cos(this.t)],
		[ Math.sin(this.t),  Math.cos(this.t)*Math.cos(this.a),
		 -Math.cos(this.t)*Math.sin(this.a), this.r*Math.sin(this.t)],
		[0, Math.sin(this.a), Math.cos(this.a), this.d],
		[0, 0, 0, 1]
	];
}
