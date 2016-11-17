//4-vector arithmetic
var VEC4 = {};
VEC4.EPSILON = 1e-15;

//debugging tools
VEC4.log = function(u, text){
console.log(text + ':(' + u[0] + ',' + u[1] + ','
                        + u[2] + ',' + u[3] + ')');};

//clone
VEC4.clone = function(u){ return [u[0], u[1], u[2], u[3]]; }

//addition, subtraction, scalar multiplication
VEC4.add = function(u, v){ return [u[0]+v[0], u[1]+v[1], u[2]+v[2], 1]; };
VEC4.sub = function(u, v){ return [u[0]-v[0], u[1]-v[1], u[2]-v[2], 1]; };
VEC4.mul = function(a, u){ return [u[0]*a, u[1]*a, u[2]*a, 1]; };

//sum an array of vectors
VEC4.sum = function(uArray){
  var u = [0, 0, 0, 1];
  for(var i = 0; i < uArray.length; ++i){
    u[0] += uArray[i][0];
    u[1] += uArray[i][1];
    u[2] += uArray[i][2];
  }
  return u;
}


//dot and cross products
VEC4.dot = function(u, v){ return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]; };
VEC4.x = function(u, v){ return [u[1]*v[2]-v[1]*u[2],
                                 u[2]*v[0]-v[2]*u[0],
                                 u[0]*v[1]-v[0]*u[1],
                                 1]; };

//magnitude and normalisation
VEC4.mag = function(u){ return Math.sqrt(u[0]*u[0]+u[1]*u[1]+u[2]*u[2]);};
VEC4.mag2 = function(u){ return u[0]*u[0]+u[1]*u[1]+u[2]*u[2];};
VEC4.unit = function(u){
  if(VEC4.zero(u)){ return false; }
  return VEC4.mul(1/VEC4.mag(u), u);
};

VEC4.zero = function(u){ return (VEC4.mag2(u) < VEC4.EPSILON);};

//direction'd angle between two vectors
//notice order of variables: angle is u to v wrt n
VEC4.ang = function(v, u, n){
  var maguv = Math.sqrt(VEC4.mag2(u)*VEC4.mag2(v));
  var theta = Math.acos(VEC4.dot(u, v)/maguv);
  var sign = VEC4.dot(VEC4.x(u, v), n) > 0 ? 1 : -1;
  return sign*theta;
};

//THREE.js specific conversions
VEC4.vec4toTHREEvector3 = function(v){
  return (new THREE.Vector3().set(v[0], v[1], v[2]));
};
VEC4.THREEvector3toVec4 = function(t){ return [t.x, t.y, t.z, 1]; };

//spherical coordinates
VEC4.sphq = function(){ return { o: [0, 0, 0, 1], r: 0, th: 0, phi: 0}};
VEC4.vec4toSphq = function(v, o){
  o = o || [0, 0, 0, 1];
  var r = VEC4.sub(v, o);
  var sphq = {};
  sphq.o = o;
  sphq.r = VEC4.mag(r);
  sphq.th = Math.acos(v[2]/sphq.r);
  sphq.phi = Math.atan2(v[1], v[0]);
  return sphq;
};
VEC4.sphqToVec4 = function(sphq){
  var v = [
  sphq.r*Math.sin(sphq.th)*Math.cos(sphq.phi) + sphq.o[0],
  sphq.r*Math.sin(sphq.th)*Math.sin(sphq.phi) + sphq.o[1],
  sphq.r*Math.cos(sphq.th)                    + sphq.o[2],
  1
  ];
  return v;
};

//rotations and rotation matrices
VEC4.THETA_EPSILON = 1e-15;
VEC4.mat4SetTranslate = function(T, dq){
  T[0][3] = dq[0];
  T[1][3] = dq[1];
  T[2][3] = dq[2];
  return T;
}
VEC4.axangToMat4 = function(v, dq){
  //axis-angle to rotation 4-matrix
  //optional translation too
  dq = dq || [0, 0, 0, 1];
  var R = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
  var theta = VEC4.mag(v);
  //return identity matrix if there is no rotation
  if(theta < VEC4.THETA_EPSILON){ return R; }
  //otherwise, compute rotation
  var c = Math.cos(theta);
  var s = Math.sin(theta);
  var t = 1-c;
  v = VEC4.unit(v);
  var R = [
    [t*v[0]*v[0]+c, t*v[0]*v[1]-v[2]*s, t*v[0]*v[2]+v[1]*s, dq[0]],
    [t*v[0]*v[1]+v[2]*s, t*v[1]*v[1]+c, t*v[1]*v[2]-v[0]*s, dq[1]],
    [t*v[0]*v[2]-v[1]*s, t*v[1]*v[2]+v[0]*s, t*v[2]*v[2]+c, dq[2]],
    [0, 0, 0, 1]
  ];
  return R;
};
VEC4.mat4toAxang = function(T){
  var r = [
    T[2][1]-T[1][2],
    T[0][2]-T[2][0],
    T[1][0]-T[0][1], 1];

  if(VEC4.zero(r)){
    //singularity
    return [0, 0, 0, 1];
  }
  var th = Math.acos(0.5*(T[0][0]+T[1][1]+T[2][2]-1));
  r = VEC4.mul(th, VEC4.unit(r));
  return r;
};


//use with kinematik.Frame:
VEC4.toVec4inFrame = function(v, f){
  //express v in frame f
  var v = VEC4.sub(v, f.o);
  return [VEC4.dot(v, f.x),
          VEC4.dot(v, f.y),
          VEC4.dot(v, f.z), 1];
};
VEC4.fromVec4inFrame = function(v, f){
  //convert v in f to global frame
  return VEC4.sum([f.o, VEC4.mul(v[0], f.x),
  VEC4.mul(v[1], f.y), VEC4.mul(v[2], f.z)]);
};
//rotations and rotation matrices cont. :
//use with mat4
VEC4.framesToMat4 = function(f2, f1){ //UNTESTED
  //transformation from f1 to f2
  var deltao = VEC4.sub(f2.o, f1.o);
  var R = [
  [VEC4.dot(f2.x, f1.x), VEC4.dot(f2.y, f1.x), VEC4.dot(f2.z, f1.x), deltao[0]],
  [VEC4.dot(f2.x, f1.y), VEC4.dot(f2.y, f1.y), VEC4.dot(f2.z, f1.y), deltao[1]],
  [VEC4.dot(f2.x, f1.z), VEC4.dot(f2.y, f1.z), VEC4.dot(f2.z, f1.z), deltao[2]],
  [0, 0, 0, 1]
  ];
  return R;
};

//projections: use with THREE.js
VEC4.sceneToScreen = function(params){
  //converts from scene coordinates to pixel coordinates
  //params: {q,  camera, renderer}
  var qproj = new THREE.Vector3().fromArray(params.q);
  qproj.project(params.camera);
  var qret = [params.renderer.domElement.width*(qproj.x+1)/2,
              params.renderer.domElement.height*(1-qproj.y)/2];
  return qret;
};
VEC4.screenToScene = function(params){

};
VEC4.sceneBasis = function(params){
  //returns a basis in world space with
  //y parallel to up and x to the right wrt camera

  //params: { camera, renderer, distance (or) reference}
  var scaleFactor = 1;
  var distance;
  if(params.distance === undefined){
    distance = VEC4.dot(
      VEC4.THREEvector3toVec4(params.camera.getWorldDirection()),
      VEC4.sub(
        params.reference,
        VEC4.THREEvector3toVec4(params.camera.position)
      )
    )
  } else {
    distance = params.distance;
  }
  //given distance in world units:
  //work out basis vectors at corresponding scale.
  //1 px on screen is (scaleFactor) units in world at distance.
  scaleFactor = distance*
  2*Math.tan(params.camera.fov*Math.PI/360)
  /params.renderer.domElement.getBoundingClientRect().height;

  var z = VEC4.mul(scaleFactor, VEC4.unit(VEC4.THREEvector3toVec4(params.camera.getWorldDirection())));
  var y = VEC4.mul(scaleFactor, VEC4.unit(VEC4.THREEvector3toVec4(params.camera.up)));
  var x = VEC4.mul(scaleFactor, VEC4.unit(VEC4.x(z, y)));

  return {'x': x, 'y': y, 'z': z};
};
