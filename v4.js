// adds functions to Array object for vector arithmetic.
function v4add(u, v){ return [u[0]+v[0], u[1]+v[1], u[2]+v[2], 1]; }
function v4sub(u, v){ return [u[0]-v[0], u[1]-v[1], u[2]-v[2], 1]; }
function v4mul(a, v){ return [a*v[0], a*v[1], a*v[2], 1]; }

Array.prototype.v4add = function(v){
	this[0] += v[0]; this[1] += v[1];
	this[2] += v[2]; this[3] = 1;
	return this;
}
Array.prototype.v4sub = function(v){
	this[0] -= v[0]; this[1] -= v[1];
	this[2] -= v[2]; this[3] = 1;
	return this;
}
Array.prototype.v4mul = function(a){
	this[0] *= a; this[1] *= a;
	this[2] *= a; this[3] = 1;
	return this;
}
